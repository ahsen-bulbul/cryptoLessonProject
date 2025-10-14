from .base_cipher import Cipher
import hashlib

class HashCipher(Cipher):
    def encrypt(self, text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()

    def decrypt(self, text: str) -> str:
        return "Hash çözülemez."
