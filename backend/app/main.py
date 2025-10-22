from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
import json

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

origins = [
    "http://0.0.0.0:3000",
    "http://0.0.0.0:8080",
    "http://0.0.0.0:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}  # Räume speichern die WebSocket-Verbindungen als dict (client_id = key)

# zum Aushandeln des 1. offers braucht der client eine liste der clients:
async def broadcast_client_list(room_id: str):
    clients = list(rooms[room_id].keys())
    clients.sort()
    message = json.dumps({"type": "client-list", "clients": clients})
    for conn in rooms[room_id].values():
        try:
            await conn.send_text(message)
        except Exception as e:
            logging.error(f"Fehler beim Senden der Clientliste: {e}")

@app.get("/")
async def root():
    return {"message": "Hello there!"}

@app.get("/api/data")
async def get_data():
    return {"message": "Hallo vom Backend!"}

@app.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    logging.debug(f"Websocket verbunden: Raum= {room_id}, Client={client_id}")
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = {}
    rooms[room_id][client_id] = websocket
    logging.debug(f"Clients im Raum {room_id}: {list(rooms[room_id].keys())}")

    # Initial die Clientsliste senden
    await broadcast_client_list(room_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)  # JSON Nachricht parsen
            logging.debug(f"Nachricht im Raum {room_id}: {message}")

            # Sender-ID in Nachricht setzen (optional, falls nicht schon vorhanden)
            message['from'] = client_id

            # Broadcast an alle anderen Clients im Raum
            for other_client, conn in rooms[room_id].items():
                if other_client != client_id:
                    try:
                        await conn.send_text(json.dumps(message))
                        logging.debug(f"Nachricht an {other_client} gesendet: {message}")
                    except Exception as e:
                        logging.error(f"Fehler beim Senden an {other_client}: {e}")
    except WebSocketDisconnect:
        logging.debug(f"WebSocket getrennt: Raum={room_id}, Client={client_id}")
        del rooms[room_id][client_id]

        if len(rooms[room_id]) == 0:
            del rooms[room_id]
        else:
            logging.debug(f"Verbleibende Clients im Raum {room_id}: {list(rooms[room_id].keys())}")
            await broadcast_client_list(room_id)


