import base64
from typing import Tuple, Optional

try:
    from Crypto.PublicKey import RSA
    from Crypto.Cipher import PKCS1_OAEP
except ModuleNotFoundError as exc:
    raise ModuleNotFoundError(
        "RSA icin pycryptodome gerekir: 'pip install pycryptodome'"
    ) from exc


class RSACipher:
    """
    Symmetric key wrapping/unwrapping helper using RSA-OAEP.
    Encrypt/decrypt short secrets (AES/DES key) for transport, not bulk messages.
    """

    def __init__(self, public_key_pem: Optional[str] = None, private_key_pem: Optional[str] = None):
        if not public_key_pem and not private_key_pem:
            raise ValueError("Public veya private key PEM gerekli.")

        self._public_key = RSA.import_key(public_key_pem) if public_key_pem else None
        self._private_key = RSA.import_key(private_key_pem) if private_key_pem else None

        # Private key varsa, public'i de oradan türet.
        if self._private_key and not self._public_key:
            self._public_key = self._private_key.publickey()

    @staticmethod
    def generate_keypair(bits: int = 2048) -> Tuple[str, str]:
        if bits < 1024:
            raise ValueError("RSA key size en az 1024 bit olmali.")
        key = RSA.generate(bits)
        private_pem = key.export_key().decode("utf-8")
        public_pem = key.publickey().export_key().decode("utf-8")
        return private_pem, public_pem

    def wrap_key(self, symmetric_key: str) -> str:
        if not self._public_key:
            raise ValueError("Public key olmadan sarma yapilamaz.")
        cipher = PKCS1_OAEP.new(self._public_key)
        encrypted = cipher.encrypt(symmetric_key.encode("utf-8"))
        return base64.b64encode(encrypted).decode("utf-8")

    def unwrap_key(self, encrypted_key_b64: str) -> str:
        if not self._private_key:
            raise ValueError("Private key olmadan cozme yapilamaz.")
        cipher = PKCS1_OAEP.new(self._private_key)
        decoded = base64.b64decode(encrypted_key_b64.encode("utf-8"))
        plain = cipher.decrypt(decoded)
        return plain.decode("utf-8")
