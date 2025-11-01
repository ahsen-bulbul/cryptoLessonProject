from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import asyncio 

# Cipher factory import
# Klasör yapınıza göre uygun import satırını kullanın:
try:
    from .utils.cipher_factory import CipherFactory
except:
    from utils.cipher_factory import CipherFactory

app = FastAPI(title="Crypto Server")

# Bağlı WebSocket client'ları (Yayın listesi)
connected_clients: List[WebSocket] = []

# CORS ayarları
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
    # Bağlantıyı kabul et ve listeye ekle
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}")
    
    try:
        # Bağlantıyı açık tutar ve kapatma sinyalini bekler.
        # Client'tan ham mesaj gelmesi beklenmediği için, sadece dinlemede kalır.
        while True:
            await websocket.receive_text() 
            
    except WebSocketDisconnect:
        # Bağlantı koptuğunda listeden çıkar
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")

# Health check
@app.get("/")
def root():
    return {"message": "Crypto Server is running", "connected_clients": len(connected_clients)}

@app.get("/health")
def health():
    return {"status": "online", "connected_clients": len(connected_clients)}

# Encrypt endpoint (HTTP POST)
@app.post("/encrypt")
async def encrypt_message(request: EncryptRequest):
    print(f"*** HTTP POST İsteği Alındı! Mesaj: {request.message[:20]}...")
    
    try:
        # Key'i ayarla
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
        # Şifrele
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key)
        encrypted = cipher.encrypt(request.message)
        
        # Tüm bağlı Client'lara gönder (WebSocket Broadcast)
        broadcast_tasks = []
        clients_to_remove = []
        
        message_to_send = {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "key": str(request.key),
            "original_message": request.message
        }
        
        for client in connected_clients:
            try:
                task = client.send_json(message_to_send)
                broadcast_tasks.append(task)
            except RuntimeError:
                clients_to_remove.append(client)
        
        # Yayın görevlerinin tamamlanmasını bekle
        await asyncio.gather(*broadcast_tasks, return_exceptions=True)

        # Kapanan client'ları listeden temizle
        for client in clients_to_remove:
            if client in connected_clients:
                connected_clients.remove(client)

        print(f"Şifrelenen mesaj broadcast edildi. Toplam client: {len(connected_clients)}")

        # HTTP POST yanıtını döndür
        return {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "status": "success",
            "broadcasted_to": len(connected_clients)
        }
    except Exception as e:
        print(f"HATA: Şifreleme veya Broadcast hatası: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Decrypt endpoint
@app.post("/decrypt")
def decrypt_message(request: DecryptRequest):
    try:
        # Key'i ayarla
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key)
        decrypted = cipher.decrypt(request.encrypted_message)
        
        # HTTP yanıtını döndür
        return {
            "decrypted_message": decrypted,
            "cipher_type": request.cipher_type,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
