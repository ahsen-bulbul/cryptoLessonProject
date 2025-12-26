import json
import os
import ssl
import urllib.request
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from crypto.rsa_cipher import RSACipher
    from crypto.ecc_cipher import ECCCipher
except Exception:
    from ..crypto.rsa_cipher import RSACipher
    from ..crypto.ecc_cipher import ECCCipher


app = FastAPI(title="RSA Key Distribution Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RSAKeyStore:
    def __init__(self, private_key: str, public_key: str) -> None:
        self.private_key = private_key
        self.public_key = public_key


class ECCKeyStore:
    def __init__(self, private_key: str, public_key: str) -> None:
        self.private_key = private_key
        self.public_key = public_key


def default_client_keys_path() -> str:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(repo_root, "client_front", "public", "rsa_keys.json")


def resolve_keys_path() -> str:
    return os.getenv("CLIENT_KEYS_FILE") or os.getenv("RSA_KEYS_FILE") or default_client_keys_path()


def default_client_ecc_keys_path() -> str:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(repo_root, "client_front", "public", "ecc_keys.json")


def resolve_ecc_keys_path() -> str:
    return os.getenv("CLIENT_ECC_KEYS_FILE") or os.getenv("ECC_KEYS_FILE") or default_client_ecc_keys_path()


def save_keypair_to_file(path: str, private_key: str, public_key: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump({"private_key": private_key, "public_key": public_key}, handle)


def load_keypair() -> RSAKeyStore:
    key_path = resolve_keys_path()
    if key_path and os.path.exists(key_path):
        try:
            with open(key_path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            private_key = data.get("private_key")
            public_key = data.get("public_key")
            if private_key and public_key:
                return RSAKeyStore(private_key=private_key, public_key=public_key)
        except Exception:
            pass
    private_key, public_key = RSACipher.generate_keypair(2048)
    if key_path:
        save_keypair_to_file(key_path, private_key, public_key)
    return RSAKeyStore(private_key=private_key, public_key=public_key)


RSA_KEYS = load_keypair()


def load_ecc_keypair() -> ECCKeyStore:
    key_path = resolve_ecc_keys_path()
    if key_path and os.path.exists(key_path):
        try:
            with open(key_path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            private_key = data.get("private_key")
            public_key = data.get("public_key")
            if private_key and public_key:
                return ECCKeyStore(private_key=private_key, public_key=public_key)
        except Exception:
            pass
    private_key, public_key = ECCCipher.generate_keypair()
    if key_path:
        save_keypair_to_file(key_path, private_key, public_key)
    return ECCKeyStore(private_key=private_key, public_key=public_key)


ECC_KEYS = load_ecc_keypair()


class RSAKeygenRequest(BaseModel):
    key_size: int = 2048


class RSAKeygenSaveRequest(BaseModel):
    key_size: int = 2048


class RSAWrapRequest(BaseModel):
    symmetric_key: str
    public_key: Optional[str] = None


class RSAUnwrapRequest(BaseModel):
    encrypted_key: str
    private_key: Optional[str] = None


class RSAKeyDistributionRequest(BaseModel):
    encrypted_key: str
    receiver_url: Optional[str] = None
    receiver_host: Optional[str] = None
    receiver_port: Optional[int] = None
    receiver_path: str = "/key-distribution"
    receiver_mac: Optional[str] = None
    sender_id: Optional[str] = None
    use_https: bool = False
    verify_tls: bool = True


class ECCWrapRequest(BaseModel):
    symmetric_key: str
    public_key: Optional[str] = None


class ECCUnwrapRequest(BaseModel):
    encrypted_key: str
    private_key: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "online"}


@app.get("/rsa/public-key")
def get_public_key():
    return {"public_key": RSA_KEYS.public_key}


@app.post("/rsa/generate")
def get_keypair(_: RSAKeygenRequest):
    return {"private_key": RSA_KEYS.private_key, "public_key": RSA_KEYS.public_key}


@app.post("/rsa/generate-and-save")
def generate_and_save_keypair(request: RSAKeygenSaveRequest):
    if request.key_size < 1024:
        raise HTTPException(status_code=400, detail="RSA key size en az 1024 bit olmali.")
    private_key, public_key = RSACipher.generate_keypair(request.key_size)
    key_path = resolve_keys_path()
    if key_path:
        save_keypair_to_file(key_path, private_key, public_key)
    global RSA_KEYS
    RSA_KEYS = RSAKeyStore(private_key=private_key, public_key=public_key)
    return {
        "status": "success",
        "saved_to": key_path,
        "public_key": public_key,
        "private_key": private_key,
    }


@app.post("/rsa/wrap-key")
def wrap_symmetric_key(request: RSAWrapRequest):
    try:
        rsa = RSACipher(public_key_pem=request.public_key or RSA_KEYS.public_key)
        encrypted_key = rsa.wrap_key(request.symmetric_key)
        return {"encrypted_key": encrypted_key, "status": "success"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/rsa/unwrap-key")
def unwrap_symmetric_key(request: RSAUnwrapRequest):
    try:
        rsa = RSACipher(private_key_pem=request.private_key or RSA_KEYS.private_key)
        symmetric_key = rsa.unwrap_key(request.encrypted_key)
        return {"symmetric_key": symmetric_key, "status": "success"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/ecc/public-key")
def get_ecc_public_key():
    return {"public_key": ECC_KEYS.public_key}


@app.post("/ecc/generate")
def get_ecc_keypair():
    return {"private_key": ECC_KEYS.private_key, "public_key": ECC_KEYS.public_key}


@app.post("/ecc/generate-and-save")
def generate_and_save_ecc_keypair():
    private_key, public_key = ECCCipher.generate_keypair()
    key_path = resolve_ecc_keys_path()
    if key_path:
        save_keypair_to_file(key_path, private_key, public_key)
    global ECC_KEYS
    ECC_KEYS = ECCKeyStore(private_key=private_key, public_key=public_key)
    return {
        "status": "success",
        "saved_to": key_path,
        "public_key": public_key,
        "private_key": private_key,
    }


@app.post("/ecc/wrap-key")
def ecc_wrap_symmetric_key(request: ECCWrapRequest):
    try:
        ecc = ECCCipher(public_key_pem=request.public_key or ECC_KEYS.public_key)
        encrypted_key = ecc.wrap_key(request.symmetric_key)
        return {"encrypted_key": encrypted_key, "status": "success"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/ecc/unwrap-key")
def ecc_unwrap_symmetric_key(request: ECCUnwrapRequest):
    try:
        ecc = ECCCipher(private_key_pem=request.private_key or ECC_KEYS.private_key)
        symmetric_key = ecc.unwrap_key(request.encrypted_key)
        return {"symmetric_key": symmetric_key, "status": "success"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


def build_receiver_url(request: RSAKeyDistributionRequest) -> str:
    if request.receiver_url:
        return request.receiver_url
    if not request.receiver_host or not request.receiver_port:
        raise ValueError("receiver_host and receiver_port required when receiver_url is empty")
    scheme = "https" if request.use_https else "http"
    path = request.receiver_path or "/key-distribution"
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{scheme}://{request.receiver_host}:{request.receiver_port}{path}"


@app.post("/rsa/distribute-key")
def distribute_key(request: RSAKeyDistributionRequest):
    try:
        rsa = RSACipher(private_key_pem=RSA_KEYS.private_key)
        symmetric_key = rsa.unwrap_key(request.encrypted_key)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"unwrap failed: {exc}")

    target_url = None
    try:
        target_url = build_receiver_url(request)
        payload = {
            "symmetric_key": symmetric_key,
            "sender_id": request.sender_id,
            "receiver_mac": request.receiver_mac,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            target_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        context = None
        if request.use_https and not request.verify_tls:
            context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=8, context=context) as resp:
            status = resp.status
        return {"status": "success", "delivered_to": target_url, "http_status": status}
    except Exception as exc:
        detail = f"delivery failed to {target_url}: {exc}"
        raise HTTPException(status_code=400, detail=detail)


@app.post("/ecc/distribute-key")
def distribute_key_ecc(request: RSAKeyDistributionRequest):
    try:
        ecc = ECCCipher(private_key_pem=ECC_KEYS.private_key)
        symmetric_key = ecc.unwrap_key(request.encrypted_key)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"unwrap failed: {exc}")

    target_url = None
    try:
        target_url = build_receiver_url(request)
        payload = {
            "symmetric_key": symmetric_key,
            "sender_id": request.sender_id,
            "receiver_mac": request.receiver_mac,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            target_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        context = None
        if request.use_https and not request.verify_tls:
            context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=8, context=context) as resp:
            status = resp.status
        return {"status": "success", "delivered_to": target_url, "http_status": status}
    except Exception as exc:
        detail = f"delivery failed to {target_url}: {exc}"
        raise HTTPException(status_code=400, detail=detail)
