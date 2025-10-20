import React, { useRef } from 'react';

function WebcamStream() {
    const videoRef = useRef(null);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            alert('Fehler beim Zugriff auf Webcam/Mikrofon: ' + err.message);
        }
    };

    return (
        <div>
            <h2>Webcam Stream</h2>
            <video ref={videoRef} autoPlay playsInline width="640" height="480" />
            <button onClick={startWebcam}>Webcam starten</button>
        </div>
    );
}

export default WebcamStream;
