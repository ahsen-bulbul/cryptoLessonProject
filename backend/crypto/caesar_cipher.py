from .base_cipher import Cipher

class CaesarCipher(Cipher):
    def __init__(self, shift: int = 3):
        self.shift = shift

    def encrypt(self, text: str) -> str:
        result = ""
        for char in text:
            if char.isalpha():
                shift = 65 if char.isupper() else 97
                result += chr((ord(char) - shift + self.shift) % 26 + shift)
            else:
                result += char
        return result

    def decrypt(self, text: str) -> str:
        return CaesarCipher(-self.shift).encrypt(text)
