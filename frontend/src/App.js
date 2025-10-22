import React, { useState } from 'react';
import WebcamWebRTC from './WebcamWebRTC';

function App() {
    const [roomId, setRoomId] = useState('');
    const [clientId, setClientId] = useState('');
    const [connected, setConnected] = useState(false);

    const connect = () => {
        if (roomId && clientId) {
            setConnected(true);
        } else {
            alert('Bitte Raum-ID und Client-ID ausfüllen!');
        }
    };

    if (!connected) {
        return (
            <div>
                <h1>WebRTC Video-Chat verbinden</h1>
                <input placeholder="Raum-ID" value={roomId} onChange={e => setRoomId(e.target.value)} />
                <input placeholder="Deine Client-ID (z.B. 1)" value={clientId} onChange={e => setClientId(e.target.value)} />
                <button onClick={connect}>Verbinden</button>
            </div>
        );
    }

    return (
        <div>
            <h1>WebRTC Video-Chat</h1>
            <WebcamWebRTC roomId={roomId} clientId={clientId} />
        </div>
    );
}

export default App;
