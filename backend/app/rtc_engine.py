import logging
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, VideoStreamTrack
from aiortc.contrib.media import MediaRelay
import cv2
from av import VideoFrame
from aiohttp import web

logging.getLogger('aiortc').setLevel(logging.INFO)
logging.basicConfig(level=logging.INFO)

pcs = set()  # Menge aller aktiven PeerConnections

# Räume: room_id -> client_id -> PeerConnection
rooms = {}

relay = MediaRelay()  # Für Multipoint-Streaming


async def display_video(track):
    while True:
        try:
            frame: VideoFrame = await track.recv()
            image = frame.to_ndarray(format="bgr24")
            cv2.imshow('frame', image)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        except asyncio.CancelledError:
            break


async def handle_sdp_offer(offer_sdp, offer_type, room_id, client_id, send_offer_callback=None):
    pc = RTCPeerConnection()
    pcs.add(pc)

    if room_id not in rooms:
        rooms[room_id] = {}
    rooms[room_id][client_id] = pc

    logging.info(f"Neue PeerConnection für Client {client_id} in Raum {room_id}, Clients im Raum: {len(rooms[room_id])}")



    @pc.on('iceconnectionstatechange')
    def on_iceconnectionstatechange():
        logging.error(f"Client {client_id} has changed: {pc.iceConnectionState}")

    @pc.on("track")
    def on_track(track):
        logging.error(f"Track empfangen: {track.kind} von Client {client_id}")

        if track.kind == "video":
            asyncio.create_task(display_video(track))


        relayed_track = relay.subscribe(track)

        for other_client_id, other_pc in rooms[room_id].items():
            if other_client_id != client_id:
                try:
                    existing_tracks = [sender.track for sender in other_pc.getSenders()]
                    if relayed_track not in existing_tracks:
                        other_pc.addTrack(relayed_track)
                        logging.debug(f"Track an Client {other_client_id} weitergeleitet.")
                except Exception as e:
                    logging.error(f"Fehler bei Weiterleitung an Client {other_client_id}: {e}")

        @track.on("ended")
        async def on_ended():
            logging.info(f"Track {track.kind} von Client {client_id} beendet")

    @pc.on("negotiationneeded")
    async def on_negotiationneeded():
        logging.debug(f"Verhandlung benötigt bei Client {client_id} in Raum {room_id}")
        try:
            offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            if send_offer_callback:
                await send_offer_callback(pc.localDescription, client_id)
            else:
                logging.warning("send_offer_callback nicht gesetzt, kein SDP-Offer gesendet")
        except Exception as e:
            logging.error(f"Fehler bei Verhandlung: {e}")

    try:
        offer = RTCSessionDescription(sdp=offer_sdp, type=offer_type)
        pc.addTransceiver('video', 'recvonly')
        pc.addTransceiver('audio', 'recvonly')
        await pc.setRemoteDescription(offer)
        logging.debug("Remote SDP gesetzt.")

        existing_tracks = [sender.track for sender in pc.getSenders()]
        for other_client_id, other_pc in rooms[room_id].items():
            if other_client_id != client_id:
                for sender in other_pc.getSenders():
                    if sender.track and sender.track not in existing_tracks:
                        pc.addTrack(sender.track)
                        existing_tracks.append(sender.track)

        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        logging.debug("Lokale SDP erstellt und gesetzt.")

        return pc.localDescription, pc

    except Exception as e:
        logging.error(f"Fehler bei SDP-Verarbeitung: {e}")
        raise

async def cleanup_peerconnections():
    logging.info("Starte PeerConnection-Garbage-Collector.")
    while True:
        closed_pcs = {pc for pc in pcs if pc.connectionState in ("closed", "failed")}
        if closed_pcs:
            logging.info(f"Lösche {len(closed_pcs)} geschlossene PeerConnections.")
            for pc in closed_pcs:
                pcs.discard(pc)
                for room_id, room in list(rooms.items()):
                    to_delete = [cid for cid, pconn in room.items() if pconn is not None and pconn == pc]
                    for cid in to_delete:
                        del room[cid]
                    if len(room) == 0:
                        del rooms[room_id]
        await asyncio.sleep(120)