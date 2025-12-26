import base64
import json
from typing import Optional, Tuple

from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import HKDF
from Crypto.PublicKey import ECC
from Crypto.Random import get_random_bytes


class ECCCipher:
    """
    ECIES-style key wrapping using ECDH + AES-GCM.
    """

    def __init__(self, public_key_pem: Optional[str] = None, private_key_pem: Optional[str] = None):
        if not public_key_pem and not private_key_pem:
            raise ValueError("Public veya private key PEM gerekli.")
        self._public_key = ECC.import_key(public_key_pem) if public_key_pem else None
        self._private_key = ECC.import_key(private_key_pem) if private_key_pem else None
        if self._private_key and not self._public_key:
            self._public_key = self._private_key.public_key()

    @staticmethod
    def generate_keypair() -> Tuple[str, str]:
        key = ECC.generate(curve="P-256")
        private_pem = key.export_key(format="PEM")
        public_pem = key.public_key().export_key(format="PEM")
        return private_pem, public_pem

    @staticmethod
    def _derive_key(private_key: ECC.EccKey, public_key: ECC.EccKey) -> bytes:
        shared_point = public_key.pointQ * private_key.d
        x_bytes = int(shared_point.x).to_bytes(32, "big")
        return HKDF(x_bytes, 32, b"", SHA256)

    def wrap_key(self, symmetric_key: str) -> str:
        if not self._public_key:
            raise ValueError("Public key olmadan sarma yapilamaz.")
        ephemeral = ECC.generate(curve="P-256")
        shared = self._derive_key(ephemeral, self._public_key)
        nonce = get_random_bytes(12)
        cipher = AES.new(shared, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(symmetric_key.encode("utf-8"))
        payload = {
            "ephemeral_pub": base64.b64encode(ephemeral.public_key().export_key(format="DER")).decode("utf-8"),
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "tag": base64.b64encode(tag).decode("utf-8"),
            "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        }
        payload_json = json.dumps(payload, separators=(",", ":"))
        return base64.b64encode(payload_json.encode("utf-8")).decode("utf-8")

    def unwrap_key(self, wrapped_key_b64: str) -> str:
        if not self._private_key:
            raise ValueError("Private key olmadan cozme yapilamaz.")
        decoded = base64.b64decode(wrapped_key_b64.encode("utf-8")).decode("utf-8")
        payload = json.loads(decoded)
        eph_der = base64.b64decode(payload["ephemeral_pub"])
        eph_pub = ECC.import_key(eph_der)
        shared = self._derive_key(self._private_key, eph_pub)
        nonce = base64.b64decode(payload["nonce"])
        tag = base64.b64decode(payload["tag"])
        ciphertext = base64.b64decode(payload["ciphertext"])
        cipher = AES.new(shared, AES.MODE_GCM, nonce=nonce)
        plain = cipher.decrypt_and_verify(ciphertext, tag)
        return plain.decode("utf-8")
