import React, { useRef, useEffect, useState } from 'react';

function WebcamWebRTC({ roomId, clientId, peerId }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const wsRef = useRef(null);
    const localStreamRef = useRef(null);
    const [remoteStream, setRemoteStream] = useState(null);

    const servers = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    useEffect(() => {
        wsRef.current = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

        wsRef.current.onopen = () => {
            console.log('WebSocket verbunden');
            startLocalStreamAndPeerConnection();
        };

        wsRef.current.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log('Signal-Nachricht empfangen:')
            if (message.to !== clientId) return;

            try {
                if (message.type === 'offer') {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: message.type, sdp: message.sdp }));
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    sendMessage({ ...answer, to: message.from });
                } else if (message.type === 'answer') {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: message.type, sdp: message.sdp }));
                } else if (message.type === 'candidate') {
                    // Hier ICE Candidate herausfiltern:
                    if (message.candidate && message.candidate.candidate !== '') {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
                    }
                }
            } catch (err) {
                console.error('Fehler bei WebRTC Signalisierung:', err);
            }
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket geschlossen');
        };

        return () => {
            wsRef.current.close();
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, []);

    const sendMessage = (message) => {
        wsRef.current.send(JSON.stringify({ ...message, from: clientId }));
    };

    const startLocalStreamAndPeerConnection = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            peerConnectionRef.current = new RTCPeerConnection(servers);

            stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));

            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    sendMessage({
                        type: 'candidate',
                        candidate: event.candidate,
                        to: peerId
                    });
                }
            };

            peerConnectionRef.current.ontrack = (event) => {
                console.log('Remote stream erhalten:', event.streams);
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };


            if (clientId < peerId) {
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);
                sendMessage({ ...offer, to: peerId });
            }
        } catch (error) {
            console.error('Fehler beim Zugriff auf Kamera oder beim Aufbau der Verbindung:', error);
        }
    };

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div>
            <div>
                <h3>Lokaler Stream (Client {clientId})</h3>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '320px', height: '240px', border: '1px solid black' }} />
            </div>
            <div>
                <h3>Remote Stream (Client {peerId})</h3>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '320px', height: '240px', border: '1px solid black' }} />
            </div>
        </div>
    );
}

export default WebcamWebRTC;
