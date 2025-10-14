from .base_cipher import Cipher

class VigenereCipher(Cipher):
    def __init__(self, key="KEY"):
        self.key = key.upper()

    def encrypt(self, text: str) -> str:
        text = text.upper()
        result = ""
        key_index = 0
        for char in text:
            if char.isalpha():
                shift = (ord(self.key[key_index % len(self.key)]) - 65)
                result += chr((ord(char) - 65 + shift) % 26 + 65)
                key_index += 1
            else:
                result += char
        return result

    def decrypt(self, text: str) -> str:
        text = text.upper()
        result = ""
        key_index = 0
        for char in text:
            if char.isalpha():
                shift = (ord(self.key[key_index % len(self.key)]) - 65)
                result += chr((ord(char) - 65 - shift) % 26 + 65)
                key_index += 1
            else:
                result += char
        return result
