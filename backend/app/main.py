import os
import logging
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .rtc_engine import handle_sdp_offer, cleanup_peerconnections
import asyncio
from aiortc import RTCSessionDescription, RTCIceCandidate
from aioice import Candidate
from aiortc.rtcicetransport import candidate_from_aioice


logging.basicConfig(level=logging.DEBUG)
#asyncio.create_task(cleanup_peerconnections())

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Speicher für WebSockets und PeerConnections
peer_connections = {}  # room_id -> client_id -> RTCPeerConnection
rooms = {}             # room_id -> client_id -> WebSocket

# Sendet die Clientliste an alle Clients im Raum
async def broadcast_client_list(room_id: str):
    clients = list(rooms.get(room_id, {}).keys())
    clients.sort()
    message = json.dumps({"type": "client-list", "clients": clients})
    for ws in rooms.get(room_id, {}).values():
        try:
            await ws.send_text(message)
        except Exception as e:
            logging.error(f"Fehler beim Senden der Clientliste: {e}")

@app.get("/")
async def root():
    return {"message": "Hello there!"}

@app.get("/api/data")
async def get_data():
    return {"message": "Hallo vom Backend!"}

# Neuer SDP-Offer vom Client wird hier verarbeitet
@app.post("/api/rtc/offer")
async def rtc_offer(request: Request):
    params = await request.json()
    offer_sdp = params['sdp']
    offer_type = params['type']
    room_id = params.get('room_id', 'default_room')
    client_id = params.get('client_id', 'default_client')

    async def send_offer_to_all_others(offer, sender_client_id):
        for other_client_id in rooms.get(room_id, {}):
            if other_client_id != sender_client_id:
                ws = rooms[room_id][other_client_id]
                if ws:
                    await ws.send_json({
                        "type": "new-offer",
                        "sdp": offer.sdp,
                        "client_id": other_client_id
                    })

    try:
        answer, pc = await handle_sdp_offer(
            offer_sdp,
            offer_type,
            room_id,
            client_id,
            send_offer_callback=None  # Senden manuell weiter unten
        )

        if room_id not in peer_connections:
            peer_connections[room_id] = {}
        peer_connections[room_id][client_id] = pc

        # Informiere alle anderen Clients im Raum über das neue Angebot
        await send_offer_to_all_others(pc.localDescription, client_id)

        return JSONResponse(content={'sdp': answer.sdp, 'type': answer.type})
    except Exception as e:
        logging.error(f"Fehler beim Bearbeiten des SDP-Offers: {e}")
        return JSONResponse(status_code=500, content={'error': str(e)})

# WebSocket-Endpunkt zum Signalisieren
@app.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    logging.debug(f"WebSocket verbunden: Raum={room_id}, Client={client_id}")
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = {}
    rooms[room_id][client_id] = websocket

    logging.debug(f"Clients im Raum {room_id}: {list(rooms[room_id].keys())}")

    await broadcast_client_list(room_id)

    try:
        while True:
            rawmessage = await websocket.receive()
            if rawmessage["type"] == "websocket.disconnect":
                logging.info(f"{client_id} getrennt.")
                break

            elif "text" in rawmessage and rawmessage["text"] is not None:
                try:
                    message = json.loads(rawmessage["text"])
                    message['from'] = client_id

                    if message.get('type') == 'chat':
                        for other_client, ws in rooms.get(room_id, {}).items():
                            if other_client != client_id:
                                try:
                                    await ws.send_text(json.dumps(message))
                                except Exception as e:
                                    logging.error(f"Fehler zu senden an {other_client}: {e}")

                    elif message.get("type") == "candidate":
                        cdict = message.get("candidate") or {}
                        if not cdict.get("candidate"):
                            return  # end-of-candidates

                        a = Candidate.from_sdp(cdict["candidate"])
                        rtc_cand = candidate_from_aioice(a)
                        rtc_cand.sdpMid = cdict.get("sdpMid")
                        rtc_cand.sdpMLineIndex = cdict.get("sdpMLineIndex")

                        pc = peer_connections.get(room_id, {}).get(client_id)
                        if pc:
                            await pc.addIceCandidate(rtc_cand)


                    elif message.get('type') == 'new-answer':
                        sdp = message.get('sdp')
                        pc = peer_connections.get(room_id, {}).get(client_id)
                        if pc and sdp:
                            try:
                                if pc.signalingState != 'stable':
                                    await pc.setRemoteDescription(
                                        RTCSessionDescription(sdp=sdp, type='answer')
                                    )
                                else:
                                    logging.warning(f"SDP-Answer kann nicht gesetzt werden, SignalingState ist stable für Client {client_id}")
                            except Exception as e:
                                logging.error(f"Fehler beim Setzen der neuen SDP-Answer für {client_id}: {e}")

                    elif message.get('type') == 'new-offer':
                        sdp = message.get('sdp')
                        pc = peer_connections.get(room_id, {}).get(client_id)
                        if pc and sdp:
                            try:
                                await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type='offer'))
                                answer = await pc.createAnswer()
                                await pc.setLocalDescription(answer)

                                await rooms[room_id][client_id].send_json({
                                    'type': 'new-answer',
                                    'sdp': pc.localDescription.sdp,
                                    'client_id': client_id
                                })
                            except Exception as e:
                                logging.error(f"Fehler bei Bearbeitung eines neuen Angebots für {client_id}: {e}")


                except json.JSONDecodeError:
                    logging.warning(f"Ungültige Textnachricht von {client_id}: {rawmessage['text'][:80]}")

        # elif "bytes" in rawmessage and rawmessage["bytes"] is not None:
        #await handle_binary_message(rawmessage["bytes"], client_id)
        #logging.error(data)


    except WebSocketDisconnect:
        logging.debug(f"WebSocket getrennt: Raum={room_id}, Client={client_id}")
        if client_id in rooms.get(room_id, {}):
            del rooms[room_id][client_id]

        pc = peer_connections.get(room_id, {}).pop(client_id, None)
        if pc:
            await pc.close()

        if room_id in rooms and len(rooms[room_id]) == 0:
            del rooms[room_id]
            if room_id in peer_connections:
                del peer_connections[room_id]
        else:
            logging.debug(f"Verbleibende Clients im Raum {room_id}: {list(rooms.get(room_id, {}).keys())}")
            await broadcast_client_list(room_id)