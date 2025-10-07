from .base_cipher import Cipher

class CaesarCipher(Cipher):
    def encrypt(self, text: str, key: str) -> str:
        shift = int(key)
        return ''.join(chr((ord(c) + shift) % 256) for c in text)

    def decrypt(self, text: str, key: str) -> str:
        shift = int(key)
        return ''.join(chr((ord(c) - shift) % 256) for c in text)
