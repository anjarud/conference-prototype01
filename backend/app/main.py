from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}  #Dictionary zum Speichern verbundener WebSockets pro Raum
@app.get("/api/data")
async def get_data():
    return {"message": "Hallo von deinem Backend!"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    logging.debug(f"Neue WebSocket-Verbindung zu Raum: {room_id}")
    await websocket.accept()
    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)
    logging.debug(f"Anzahl Verbindungen im Raum {room_id}: {len(rooms[room_id])}")
    try:
        while True:
            data = await websocket.receive_text()
            logging.debug(f"Nachricht im Raum {room_id}: {data[:50]}")
            for conn in rooms[room_id]:
                if conn != websocket:
                    await conn.send_text(data)
    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        logging.debug(f"Verbindung aus Raum {room_id} getrennt. Verbindungen: {len(rooms.get(room_id, []))}")
        if len(rooms.get(room_id, [])) == 0:
            del rooms[room_id]