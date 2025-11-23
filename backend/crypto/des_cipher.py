import base64
import hashlib

try:
    from .base_cipher import Cipher
except ImportError:  
    from base_cipher import Cipher 

try:
    from Crypto.Cipher import DES
except ModuleNotFoundError as exc: 
    raise ModuleNotFoundError(
        "kütüphane yok knk 'pip install pycryptodome'."
    ) from exc


class DESCipher(Cipher):
    block_size = 8

    def __init__(self, key: str):
        if not isinstance(key, str):
            raise ValueError("DES anahtari string olcak.")

        digest = hashlib.sha256(key.encode("utf-8")).digest()
        self._key = digest[: self.block_size]
        self._iv = digest[self.block_size : 2 * self.block_size]

    @staticmethod
    def _pad(data: bytes) -> bytes:
        padding_len = DESCipher.block_size - (len(data) % DESCipher.block_size)
        return data + bytes([padding_len] * padding_len)

    @staticmethod
    def _unpad(data: bytes) -> bytes:
        padding_len = data[-1]
        if padding_len < 1 or padding_len > DESCipher.block_size:
            raise ValueError("Invalid padding detected.")
        return data[:-padding_len]

    def encrypt(self, text: str) -> str:
        cipher = DES.new(self._key, DES.MODE_CBC, iv=self._iv)#burda kütüphanenin içinde tüm işlemleri yapıyo sbox pbox vs
        padded = self._pad(text.encode("utf-8"))
        encrypted = cipher.encrypt(padded)
        return base64.b64encode(encrypted).decode("utf-8")

    def decrypt(self, text: str) -> str:
        cipher = DES.new(self._key, DES.MODE_CBC, iv=self._iv)
        decoded = base64.b64decode(text.encode("utf-8"))
        decrypted = cipher.decrypt(decoded)
        return self._unpad(decrypted).decode("utf-8")
