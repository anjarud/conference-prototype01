import React, { useState } from 'react';
import WebcamWebRTC from './WebcamWebRTC';

function App() {
    const [roomId, setRoomId] = useState('');
    const [clientId, setClientId] = useState('');
    const [peerId, setPeerId] = useState('');
    const [connected, setConnected] = useState(false);

    const connect = () => {
        if(roomId && clientId && peerId) {
            setConnected(true);
        } else {
            alert('Bitte alle Felder ausfüllen!');
        }
    };

    if (!connected) {
        return (
            <div>
                <h1>WebRTC Video-Chat verbinden</h1>
                <input placeholder="Raum-ID" value={roomId} onChange={e => setRoomId(e.target.value)} />
                <input placeholder="Deine Client-ID (z.B. 1)" value={clientId} onChange={e => setClientId(e.target.value)} />
                <input placeholder="Peer-ID (z.B. 2)" value={peerId} onChange={e => setPeerId(e.target.value)} />
                <button onClick={connect}>Verbinden</button>
            </div>
        );
    }

    return (
        <div>
            <h1>WebRTC Video-Chat</h1>
            <WebcamWebRTC roomId={roomId} clientId={clientId} peerId={peerId} />
        </div>
    );
}

export default App;
