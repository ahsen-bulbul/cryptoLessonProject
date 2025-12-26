from .base_cipher import Cipher


class PigpenCipher(Cipher):
    def __init__(self, key=None):
        symbols = [
            "!", "@", "#", "$", "%", "^", "&", "*", "(", ")",
            "-", "+", "=", "{", "}", "[", "]", ":", ";", "<",
            ">", "?", "/", "\\", "|", "~",
        ]
        self.forward = {chr(ord("A") + i): symbols[i] for i in range(26)}
        self.backward = {v: k for k, v in self.forward.items()}

    def encrypt(self, text: str) -> str:
        result = []
        for ch in text:
            if ch.isalpha():
                result.append(self.forward[ch.upper()])
            elif ch.isspace():
                result.append(" ")
            else:
                result.append(ch)
        return "".join(result)

    def decrypt(self, text: str) -> str:
        result = []
        for ch in text:
            if ch in self.backward:
                result.append(self.backward[ch])
            elif ch.isspace():
                result.append(" ")
            else:
                result.append(ch)
        return "".join(result)
