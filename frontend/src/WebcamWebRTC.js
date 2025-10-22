import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

function WebcamWebRTC({ roomId, clientId }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const wsRef = useRef(null);
    const localStreamRef = useRef(null);

    const [remoteStream, setRemoteStream] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [streamActive, setStreamActive] = useState(false);
    const [clientsInRoom, setClientsInRoom] = useState([]);
    const [offerCreated, setOfferCreated] = useState(false);

    const servers = useMemo(() => ({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    }), []);

    const sendMessage = useCallback(
        (message) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ ...message, from: clientId }));
                console.log("Nachricht senden:", message);
            }
        },
        [clientId]
    );

    const startLocalStreamAndPeerConnection = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            peerConnectionRef.current = new RTCPeerConnection(servers);

            stream.getTracks().forEach((track) =>
                peerConnectionRef.current.addTrack(track, stream)
            );

            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    sendMessage({
                        type: 'candidate',
                        candidate: event.candidate,
                    });
                }
            };

            const remoteStream = new MediaStream();
            peerConnectionRef.current.ontrack = (event) => {
                remoteStream.addTrack(event.track);
                setRemoteStream(remoteStream);
            };

            setStreamActive(true);
            console.log('Stream und PeerConnection gestartet');
        } catch (error) {
            console.error('Fehler beim Zugriff auf Kamera oder beim Aufbau der Verbindung:', error);
        }
    }, [servers, sendMessage]);

    const createOffer = useCallback(async () => {
        if (!peerConnectionRef.current || offerCreated) return;

        try {
            console.log("Erstelle offer...");
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            sendMessage({ type: 'offer', sdp: offer.sdp });
            setOfferCreated(true);
            console.log("Offer gesendet");
        } catch (error) {
            console.error('Fehler beim Erstellen des Angebots:', error);
        }
    }, [sendMessage, offerCreated]);

    const stopLocalStreamAndPeerConnection = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        setRemoteStream(null);
        setStreamActive(false);
        setOfferCreated(false);
        console.log('Stream und PeerConnection gestoppt');
    }, []);

    useEffect(() => {
        const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsHost = window.location.hostname + ":8000";

        wsRef.current = new WebSocket(`${wsProtocol}://${wsHost}/ws/${roomId}/${clientId}`);

        wsRef.current.onopen = () => {
            console.log('WebSocket verbunden');
            startLocalStreamAndPeerConnection();
        };

        wsRef.current.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log("WebSocket Nachricht empfangen:", message);

            if (message.from === clientId) return;

            if (message.type === "client-list") {
                console.log("Clientliste erhalten:", message.clients);
                setClientsInRoom(message.clients);
                return;
            }

            if (message.type === 'chat') {
                setChatMessages((prev) => [...prev, { from: message.from, text: message.text }]);
                return;
            }

            try {
                if (message.type === 'offer') {
                    await peerConnectionRef.current.setRemoteDescription(
                        new RTCSessionDescription({ type: message.type, sdp: message.sdp })
                    );
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    sendMessage({ type: 'answer', sdp: answer.sdp });
                } else if (message.type === 'answer') {
                    await peerConnectionRef.current.setRemoteDescription(
                        new RTCSessionDescription({ type: message.type, sdp: message.sdp })
                    );
                } else if (message.type === 'candidate') {
                    if (message.candidate && message.candidate.candidate !== '') {
                        await peerConnectionRef.current.addIceCandidate(
                            new RTCIceCandidate(message.candidate)
                        );
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
            stopLocalStreamAndPeerConnection();
        };
    }, [roomId, clientId, sendMessage, startLocalStreamAndPeerConnection, stopLocalStreamAndPeerConnection]);

    useEffect(() => {
        console.log("RemoteStream updated:", remoteStream);
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Triggert nur einmal OFFER nach Streamstart und Clientsliste
    useEffect(() => {
        if (clientsInRoom.length > 0 && streamActive && !offerCreated) {
            const sortedClients = [...clientsInRoom].sort();
            if (clientId === sortedClients[0]) {
                console.log("ClientsInRoom geändert – sende offer");
                createOffer();
            }
        }
    }, [clientsInRoom, clientId, streamActive, offerCreated, createOffer]);

    const handleSendMessage = () => {
        if (newMessage.trim() === '') return;
        sendMessage({ type: 'chat', text: newMessage });
        setChatMessages((prev) => [...prev, { from: clientId, text: newMessage }]);
        setNewMessage('');
    };

    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            <div>
                <h3>Lokaler Stream (Client {clientId})</h3>
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '320px', height: '240px', border: '1px solid black' }}
                />
                <h3>Remote Stream(s) (andere Clients im Raum)</h3>
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{ width: '320px', height: '240px', border: '1px solid black' }}
                />
                <div style={{ marginTop: '10px' }}>
                    <button onClick={streamActive ? stopLocalStreamAndPeerConnection : startLocalStreamAndPeerConnection}>
                        {streamActive ? 'Stream beenden' : 'Stream starten'}
                    </button>
                </div>
            </div>
            <div
                style={{
                    width: '250px',
                    border: '1px solid gray',
                    padding: '10px',
                    height: '520px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <h3>Chat</h3>
                <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '10px' }}>
                    {chatMessages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                marginBottom: '6px',
                                fontWeight: msg.from === clientId ? 'bold' : 'normal',
                            }}
                        >
                            <span>{msg.from}: </span>
                            <span>{msg.text}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        style={{ flexGrow: 1 }}
                    />
                    <button onClick={handleSendMessage}>Senden</button>
                </div>
            </div>
        </div>
    );
}

export default WebcamWebRTC;
