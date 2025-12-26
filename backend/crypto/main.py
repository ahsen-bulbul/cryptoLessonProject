from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import asyncio 


try:
    from .utils.cipher_factory import CipherFactory
except:
    from utils.cipher_factory import CipherFactory

app = FastAPI(title="Crypto Server")

connected_clients: List[WebSocket] = []
received_keys: List[dict] = []


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EncryptRequest(BaseModel):
    message: str
    cipher_type: str
    key: str | int
    mode: str = "ECB"
    encrypted_key: str | None = None  # RSA ile sarilmis simetrik anahtar (opsiyonel)
    already_encrypted: bool = False

class DecryptRequest(BaseModel):
    encrypted_message: str
    cipher_type: str
    key: str | int
    mode: str = "ECB"

class KeyDistributionRequest(BaseModel):
    symmetric_key: str
    sender_id: str | None = None
    receiver_mac: str | None = None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}")
    
    try:
       
        while True:
            await websocket.receive_text() 
            
    except WebSocketDisconnect:
        
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")


@app.get("/")
def root():
    return {"message": "Crypto Server is running", "connected_clients": len(connected_clients)}

@app.get("/health")
def health():
    return {"status": "online", "connected_clients": len(connected_clients)}


async def _encrypt_and_broadcast(request: EncryptRequest):
    print(f"*** HTTP POST istegi alindi! Mesaj: {request.message[:20]}...")

    try:
        if request.already_encrypted:
            encrypted = request.message
            key = ""
        else:
            key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
            cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key, request.mode)
            encrypted = cipher.encrypt(request.message)

        broadcast_tasks = []
        clients_to_remove = []

        key_value = "" if request.encrypted_key else str(request.key)
        message_to_send = {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "key": key_value,
            "original_message": "" if request.already_encrypted else request.message,
            "mode": request.mode,
            "encrypted_key": request.encrypted_key,
            "already_encrypted": request.already_encrypted,
        }

        for client in connected_clients:
            try:
                task = client.send_json(message_to_send)
                broadcast_tasks.append(task)
            except RuntimeError:
                clients_to_remove.append(client)

        await asyncio.gather(*broadcast_tasks, return_exceptions=True)

        for client in clients_to_remove:
            if client in connected_clients:
                connected_clients.remove(client)

        print(f"Sifrelenen mesaj broadcast edildi. Toplam client: {len(connected_clients)}")

        return {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "status": "success",
            "broadcasted_to": len(connected_clients),
            "encrypted_key": request.encrypted_key,
        }
    except Exception as e:
        print(f"HATA: Sifreleme veya Broadcast hatasi: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/encrypt")
async def encrypt_message(request: EncryptRequest):
    return await _encrypt_and_broadcast(request)


@app.post("/decrypt")
async def decrypt_message(request: DecryptRequest):
    try:
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key, request.mode)
        decrypted = cipher.decrypt(request.encrypted_message)

        payload = {
            "event": "decrypt_result",
            "cipher_type": request.cipher_type,
            "encrypted_message": request.encrypted_message,
            "decrypted_message": decrypted,
            "mode": request.mode,
        }
        broadcast_tasks = []
        clients_to_remove = []
        for client in connected_clients:
            try:
                task = client.send_json(payload)
                broadcast_tasks.append(task)
            except RuntimeError:
                clients_to_remove.append(client)
        await asyncio.gather(*broadcast_tasks, return_exceptions=True)
        for client in clients_to_remove:
            if client in connected_clients:
                connected_clients.remove(client)

        return {
            "decrypted_message": decrypted,
            "cipher_type": request.cipher_type,
            "mode": request.mode,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# RSA key wrapping endpoints (AES/DES anahtari güvenli tasimak icin)
@app.post("/key-distribution")
def receive_key_distribution(request: KeyDistributionRequest):
    received_keys.append(
        {
            "symmetric_key": request.symmetric_key,
            "sender_id": request.sender_id,
            "receiver_mac": request.receiver_mac,
        }
    )
    return {"status": "success"}


@app.get("/key-distribution/latest")
def get_latest_key_distribution():
    if not received_keys:
        return {"status": "empty"}
    return {"status": "success", "data": received_keys[-1]}
