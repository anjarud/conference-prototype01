import React, { useState, useEffect, useRef } from 'react';

function VideoStreamClient({ roomId, clientId }) {
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);
    const wsRef = useRef(null);
    const pcRef = useRef(null); // PeerConnection-Referenz
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [connected, setConnected] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [videoChatStarted, setVideoChatStarted] = useState(false);

    useEffect(() => {
        if (!roomId || !clientId) return;

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${protocol}://${window.location.hostname}:8000/ws/${roomId}/${clientId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket verbunden");
            setConnected(true);

            pcRef.current = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            pcRef.current.ontrack = (event) => {
                console.log("ontrack Event ausgelöst:", event);

                // Ignoriere Track, wenn er zum lokalen Stream gehört (Eigenes Video nicht als remote anzeigen)
                //if (localStream && localStream.getTracks().some(t => t.id === event.track.id)) {
                //    console.log("Ignoriere lokalen Track im ontrack Event");
                //    return;
                //}


                if (event.streams && event.streams.length > 0) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    console.log("Remote-Stream gesetzt");
                } else {
                    //const inboundStream = new MediaStream();
                    //inboundStream.addTrack(event.track);
                    //remoteVideoRef.current.srcObject = inboundStream;
                    //console.log("Remote-Track gesetzt via MediaStream");
                    console.error("Kein Remote Stream gefunden")
                }
            };

            pcRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("ICE-Kandidat gesendet:", event.candidate);
                    wsRef.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, from: clientId }));
                }
            };
        };

        ws.onmessage = async (event) => {
            console.log("WebSocket-Nachricht empfangen:", event.data);
            const msg = JSON.parse(event.data);
            console.log("Empfangene Nachricht:", msg)
            if (msg.type === "chat") {
                setChatMessages(prev => [...prev, { from: msg.from, text: msg.text }]);
            } else if (msg.type === "candidate") {
                console.log("ICE-Kandidat empfangen:", msg.candidate);
                try {
                    await pcRef.current.addIceCandidate(msg.candidate);
                } catch (e) {
                    console.error("Fehler beim Hinzufügen des ICE-Kandidaten", e);
                }
            } else if (msg.type === "new-offer") {
                // Neuer SDP-Offer vom Backend bei onnegotiationneeded
                try {
                    console.log("Neue SDP-Offer empfangen, antworte mit SDP-Answer");
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription({ sdp: msg.sdp, type: 'offer' }));

                    const answer = await pcRef.current.createAnswer();
                    await pcRef.current.setLocalDescription(answer);
                    console.log("Lokale SDP für Antwort gesetzt:", pcRef.current.localDescription);

                    // Neue SDP-Answer zurück an Backend senden
                    wsRef.current.send(JSON.stringify({
                        type: "new-answer",
                        sdp: pcRef.current.localDescription.sdp,
                        typeSdp: pcRef.current.localDescription.type,
                        from: clientId
                    }));
                } catch (err) {
                    console.error("Fehler bei Verarbeitung der neuen SDP-Offer:", err);
                }
            } else if (msg.type === "new-answer") {
                console.log("Neue SDP-Answer empfangen:", msg);
                try {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription({ sdp: msg.sdp, type: 'answer' }));
                    console.log("Remote SDP-Answer gesetzt");
                } catch (e) {
                    console.error("Fehler beim Setzen der SDP-Answer:", e);
                }
            }
        };

        ws.onclose = () => {
            console.log("WebSocket-Verbindung geschlossen");
            setConnected(false);
            stopVideoChat();
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };

        return () => {
            ws.close();
            stopVideoChat();
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };
    }, [roomId, clientId]);

    const startVideoChat = async () => {
        if (videoChatStarted) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            // Lokalen Stream zur PeerConnection hinzufügen
            stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));

            // SDP-Offer neu erstellen und ans Backend senden
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            console.log("Lokaler SDP-Offer gesetzt:", pcRef.current.localDescription);

            const response = await fetch(`https://${window.location.hostname}:8000/api/rtc/offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sdp: offer.sdp, type: offer.type, room_id: roomId, client_id: clientId })
            });

            const answer = await response.json();
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("Remote SDP-Answer vom Server gesetzt");

            setVideoChatStarted(true);
            console.log("Videochat gestartet und SDP-Antwort gesetzt");
        } catch (err) {
            console.error("Fehler beim Starten des Videochats:", err);
        }
    };

    const stopVideoChat = () => {
        if (!localStream) return;

        // Alle lokalen Tracks anhalten
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setVideoChatStarted(false);

        // Entferne alle Sender aus PeerConnection
        const senders = pcRef.current.getSenders();
        senders.forEach(sender => {
            pcRef.current.removeTrack(sender);
        });

        console.log("Videochat gestoppt und lokale Medien freigegeben");
    };

    const sendMessage = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !newMessage.trim()) return;
        wsRef.current.send(JSON.stringify({ type: "chat", text: newMessage, from: clientId }));
        setChatMessages(prev => [...prev, { from: clientId, text: newMessage }]);
        setNewMessage('');
    };

    useEffect(() => {
        // Lokalen Stream im eigenen Videoelement anzeigen
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    return (
        <div>
            {!videoChatStarted ? (
                <button onClick={startVideoChat}>Videochat starten</button>
            ) : (
                <button onClick={stopVideoChat}>Videochat stoppen</button>
            )}

            <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '160px', height: '120px', border: '1px solid black', marginBottom: '8px' }}
            />
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: '320px', height: '240px', border: '1px solid black' }}
            />
            <div>
                <h3>Chat</h3>
                <div style={{ height: '150px', overflowY: 'scroll', border: '1px solid gray', marginBottom: '8px' }}>
                    {chatMessages.map((m, i) => (
                        <div key={i} style={{ fontWeight: m.from === clientId ? 'bold' : 'normal' }}>
                            {m.from}: {m.text}
                        </div>
                    ))}
                </div>
                <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                    placeholder="[Nachricht schreiben...]"
                    style={{ width: '70%', marginRight: '8px' }}
                />
                <button onClick={sendMessage}>Senden</button>
            </div>
        </div>
    );
}

export default VideoStreamClient;