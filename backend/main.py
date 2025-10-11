from fastapi import FastAPI, WebSocket
from backend.crypto.factory import CipherFactory
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

clients = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    await websocket.send_text("Client connected!")
    try:
        while True:
            data = await websocket.receive_json()
            text, key, algorithm, mode = data["text"], data["key"], data["algorithm"], data["mode"]
            cipher = CipherFactory.get_cipher(algorithm)
            result = cipher.encrypt(text, key) if mode=="encrypt" else cipher.decrypt(text, key)
            for client in clients:
                await client.send_json({"result": result})
    except:
        clients.remove(websocket)
