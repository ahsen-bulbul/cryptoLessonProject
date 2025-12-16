from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import asyncio 


try:
    from .utils.cipher_factory import CipherFactory
    from .rsa_cipher import RSACipher
except:
    from utils.cipher_factory import CipherFactory
    from rsa_cipher import RSACipher

app = FastAPI(title="Crypto Server")

connected_clients: List[WebSocket] = []


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

class DecryptRequest(BaseModel):
    encrypted_message: str
    cipher_type: str
    key: str | int
    mode: str = "ECB"

class RSAKeygenRequest(BaseModel):
    key_size: int = 2048

class RSAWrapRequest(BaseModel):
    public_key: str
    symmetric_key: str

class RSAUnwrapRequest(BaseModel):
    private_key: str
    encrypted_key: str


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


@app.post("/encrypt")
async def encrypt_message(request: EncryptRequest):
    print(f"*** HTTP POST İsteği Alındı! Mesaj: {request.message[:20]}...")
    
    try:
        
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
       
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key, request.mode)
        encrypted = cipher.encrypt(request.message)
        
       
        broadcast_tasks = []
        clients_to_remove = []
        
        message_to_send = {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "key": str(request.key),
            "original_message": request.message,
            "mode": request.mode,
            "encrypted_key": request.encrypted_key,
        }
        
        for client in connected_clients:
            try:
                task = client.send_json(message_to_send)
                broadcast_tasks.append(task)
            except RuntimeError:
                clients_to_remove.append(client)
        
       
        await asyncio.gather(*broadcast_tasks, return_exceptions=True)

        # Kapanan client'ları listeden temizle
        for client in clients_to_remove:
            if client in connected_clients:
                connected_clients.remove(client)

        print(f"Şifrelenen mesaj broadcast edildi. Toplam client: {len(connected_clients)}")

      
        return {
            "encrypted_message": encrypted,
            "cipher_type": request.cipher_type,
            "status": "success",
            "broadcasted_to": len(connected_clients),
            "encrypted_key": request.encrypted_key,
        }
    except Exception as e:
        print(f"HATA: Şifreleme veya Broadcast hatası: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/decrypt")
def decrypt_message(request: DecryptRequest):
    try:
       
        key = int(request.key) if request.cipher_type.lower() == "caesar" else request.key
        
        cipher = CipherFactory.get_cipher(request.cipher_type.lower(), key, request.mode)
        decrypted = cipher.decrypt(request.encrypted_message)
        
      
        return {
            "decrypted_message": decrypted,
            "cipher_type": request.cipher_type,
            "mode": request.mode,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# RSA key wrapping endpoints (AES/DES anahtari güvenli tasimak icin)
@app.post("/rsa/generate")
def generate_rsa_keys(request: RSAKeygenRequest):
    try:
        private_key, public_key = RSACipher.generate_keypair(request.key_size)
        return {"private_key": private_key, "public_key": public_key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/rsa/wrap-key")
def wrap_symmetric_key(request: RSAWrapRequest):
    try:
        rsa = RSACipher(public_key_pem=request.public_key)
        encrypted_key = rsa.wrap_key(request.symmetric_key)
        return {"encrypted_key": encrypted_key, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/rsa/unwrap-key")
def unwrap_symmetric_key(request: RSAUnwrapRequest):
    try:
        rsa = RSACipher(private_key_pem=request.private_key)
        symmetric_key = rsa.unwrap_key(request.encrypted_key)
        return {"symmetric_key": symmetric_key, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
