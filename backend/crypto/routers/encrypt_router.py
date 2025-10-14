from fastapi import APIRouter, HTTPException
from ..utils.cipher_factory import CipherFactory

router = APIRouter(prefix="/encrypt", tags=["Encryption"])

@router.post("/")
def encrypt_text(data: dict):
    text = data.get("text")
    algorithm = data.get("algorithm")
    key = data.get("key", "")

    if not text or not algorithm:
        raise HTTPException(status_code=400, detail="Missing text or algorithm")

    try:
        cipher = CipherFactory.get_cipher(algorithm)
        encrypted = cipher.encrypt(text, key)
        return {"algorithm": algorithm, "encrypted_text": encrypted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
