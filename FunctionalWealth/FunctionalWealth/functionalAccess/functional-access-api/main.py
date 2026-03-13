from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ai_engine.processor import SignLanguageProcessor
import json
import uuid
import asyncio
from pydantic import BaseModel
from deep_translator import GoogleTranslator

app = FastAPI(title="FunctionalAccess API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Room Manager — tracks participants per room
# ──────────────────────────────────────────────

class RoomManager:
    def __init__(self):
        # room_id -> { client_id: {"ws": WebSocket, "name": str} }
        self.rooms: dict[str, dict[str, dict]] = {}

    def _ensure_room(self, room_id: str):
        if room_id not in self.rooms:
            self.rooms[room_id] = {}

    async def connect(self, room_id: str, client_id: str, name: str, ws: WebSocket):
        await ws.accept()
        self._ensure_room(room_id)
        self.rooms[room_id][client_id] = {"ws": ws, "name": name}
        await self._broadcast_participants(room_id)

    async def disconnect(self, room_id: str, client_id: str):
        if room_id in self.rooms and client_id in self.rooms[room_id]:
            del self.rooms[room_id][client_id]
            if not self.rooms[room_id]:
                del self.rooms[room_id]
            else:
                await self._broadcast_participants(room_id)

    async def broadcast_transcript(self, room_id: str, sender_id: str, payload: dict):
        """Relay a transcript to everyone else in the room."""
        if room_id not in self.rooms:
            return
        msg = json.dumps(payload)
        for cid, client in self.rooms[room_id].items():
            if cid != sender_id:
                try:
                    await client["ws"].send_text(msg)
                except Exception:
                    pass

    async def _broadcast_participants(self, room_id: str):
        """Send updated participants list to everyone in the room."""
        if room_id not in self.rooms:
            return
        participants = [
            {"id": cid, "name": c["name"]}
            for cid, c in self.rooms[room_id].items()
        ]
        msg = json.dumps({"type": "participants", "participants": participants})
        for client in self.rooms[room_id].values():
            try:
                await client["ws"].send_text(msg)
            except Exception:
                pass


room_manager = RoomManager()


# ──────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "message": "FunctionalAccess API is running"}


# ──────────────────────────────────────────────
# Translation API
# ──────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    target_lang: str

@app.post("/api/translate")
async def translate_text(req: TranslateRequest):
    if not req.text.strip():
        return {"translatedText": req.text}

    try:
        # Run synchronous translation in a background thread
        translator = GoogleTranslator(source='auto', target=req.target_lang)
        translated = await asyncio.to_thread(translator.translate, req.text)
        return {"translatedText": translated}
    except Exception as e:
        print(f"Translation error: {e}")
        return {"translatedText": req.text}


# ──────────────────────────────────────────────
# Room signalling WebSocket
# ──────────────────────────────────────────────

@app.websocket("/ws/room/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str):
    client_id = str(uuid.uuid4())
    name = f"User-{client_id[:4].upper()}"   # default; overridden by join message

    await websocket.accept()

    try:
        # Wait for the initial "join" message to get the display name
        raw = await websocket.receive_text()
        data = json.loads(raw)
        if data.get("type") == "join":
            name = data.get("name", name)

        # Register participant and broadcast updated list
        room_manager._ensure_room(room_id)
        room_manager.rooms[room_id][client_id] = {"ws": websocket, "name": name}
        await room_manager._broadcast_participants(room_id)

        # Listen for messages
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "transcript":
                payload = {
                    "type": "transcript",
                    "sender": name,
                    "text": data.get("text", ""),
                    "kind": data.get("kind", "speech"),   # "speech" | "sign"
                    "confidence": data.get("confidence"),
                }
                await room_manager.broadcast_transcript(room_id, client_id, payload)

            elif data.get("type") == "rename":
                new_name = data.get("name", "").strip()
                if new_name and room_id in room_manager.rooms and client_id in room_manager.rooms[room_id]:
                    name = new_name
                    room_manager.rooms[room_id][client_id]["name"] = name
                    await room_manager._broadcast_participants(room_id)

    except WebSocketDisconnect:
        pass
    finally:
        await room_manager.disconnect(room_id, client_id)


# ──────────────────────────────────────────────
# Sign-language frame translation WebSocket (unchanged)
# ──────────────────────────────────────────────

@app.websocket("/ws/translate")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    processor = SignLanguageProcessor()
    try:
        while True:
            data = await websocket.receive_text()
            prediction, confidence = processor.process_frame(data)
            if prediction:
                response = {
                    "type": "translation",
                    "text": prediction,
                    "confidence": confidence
                }
                await websocket.send_text(json.dumps(response))
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        processor.cleanup()
