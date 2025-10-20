from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
import json

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}  # Räume speichern die WebSocket-Verbindungen

@app.get("/api/data")
async def get_data():
    return {"message": "Hallo vom Backend!"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    logging.debug(f"Neue WebSocket-Verbindung zu Raum: {room_id}")
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)
    logging.debug(f"Verbindungen im Raum {room_id}: {len(rooms[room_id])}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)                         # JSON Nachricht parsen
            logging.debug(f"Nachricht im Raum {room_id}: {message}")

            # Nachricht an alle anderen im Raum senden
            for conn in rooms[room_id]:
                if conn != websocket:
                    await conn.send_text(json.dumps(message))  # JSON zurück in Text umwandeln
    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        logging.debug(f"Verbindung im Raum {room_id} getrennt. Verbindungen jetzt: {len(rooms[room_id])}")
        if len(rooms[room_id]) == 0:
            del rooms[room_id]
