from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crypto.factory import CipherFactory

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CryptoRequest(BaseModel):
    text: str
    key: str
    algorithm: str
    mode: str  # encrypt / decrypt

@app.post("/crypto")
def crypto_endpoint(req: CryptoRequest):
    cipher = CipherFactory.get_cipher(req.algorithm)
    if req.mode == "encrypt":
        result = cipher.encrypt(req.text, req.key)
    else:
        result = cipher.decrypt(req.text, req.key)
    return {"result": result}
