from .base_cipher import Cipher

class VigenereCipher(Cipher):
    def encrypt(self, text: str, key: str) -> str:
        return ''.join(chr((ord(c) + ord(key[i % len(key)])) % 256) for i, c in enumerate(text))

    def decrypt(self, text: str, key: str) -> str:
        return ''.join(chr((ord(c) - ord(key[i % len(key)])) % 256) for i, c in enumerate(text))
