from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel

# Cipher factory import
try:
    from .utils.cipher_factory import CipherFactory
except:
    from utils.cipher_factory import CipherFactory

app = FastAPI(title="Crypto Server")

# Bağlı WebSocket client'ları
connected_clients: List[WebSocket] = []

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class EncryptRequest(BaseModel):
    message: str
    cipher_type: str
    key: str | int

class DecryptRequest(BaseModel):
    encrypted_message: str
    cipher_type: str
    key: str | int

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}")
    
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")

# Health check
@app.get("/")
def root():
    return {"message": "Crypto Server is running", "connected_clients": len(connected_clients)}

@app.get("/health")
def health():
    return {"status": "online", "connected_clients": len(connected_clients)}

# Encrypt endpoint
@app.post("/encrypt")
async def encrypt_message(request: EncryptRequest):
    try:
        # Key'i int'e çevir (caesar için)
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
        # Cipher instance oluştur
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key)
        encrypted = cipher.encrypt(request.message)
        
        # Tüm bağlı Server Frontend'lere gönder
        for client in connected_clients:
            try:
                await client.send_json({
                    "encrypted_message": encrypted,
                    "cipher_type": request.cipher_type,
                    "key": str(request.key),
                    "original_message": request.message
                })
                print(f"Sent to client: {encrypted}")
            except:
                connected_clients.remove(client)
        
        return {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "status": "success",
            "broadcasted_to": len(connected_clients)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Decrypt endpoint
@app.post("/decrypt")
def decrypt_message(request: DecryptRequest):
    try:
        # Key'i int'e çevir (caesar için)
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key)
        decrypted = cipher.decrypt(request.encrypted_message)
        
        return {
            "decrypted_message": decrypted,
            "cipher_type": request.cipher_type,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))