from fastapi import APIRouter, HTTPException
 
from ..utils.cipher_factory import CipherFactory
router = APIRouter(prefix="/decrypt", tags=["Decryption"])

@router.post("/")
def decrypt_text(data: dict):
    text = data.get("text")
    algorithm = data.get("algorithm")
    key = data.get("key", "")

    if not text or not algorithm:
        raise HTTPException(status_code=400, detail="Missing text or algorithm")

    try:
        cipher = CipherFactory.get_cipher(algorithm)
        decrypted = cipher.decrypt(text, key)
        return {"algorithm": algorithm, "decrypted_text": decrypted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
