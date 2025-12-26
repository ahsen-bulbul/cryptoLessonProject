from .base_cipher import Cipher


class PolybiusCipher(Cipher):
    def __init__(self, key: str = ""):
        alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ"
        key_letters = []
        for ch in key.upper():
            if ch.isalpha():
                ch = "I" if ch == "J" else ch
                if ch not in key_letters:
                    key_letters.append(ch)
        for ch in alphabet:
            if ch not in key_letters:
                key_letters.append(ch)
        self.square = key_letters
        self.pos = {}
        for idx, ch in enumerate(self.square):
            row = idx // 5 + 1
            col = idx % 5 + 1
            self.pos[ch] = f"{row}{col}"

    def encrypt(self, text: str) -> str:
        tokens = []
        for ch in text:
            if ch.isalpha():
                ch = "I" if ch.upper() == "J" else ch.upper()
                tokens.append(self.pos[ch])
            elif ch.isspace():
                tokens.append("/")
            else:
                tokens.append(ch)
        return " ".join(tokens)

    def decrypt(self, text: str) -> str:
        result = []
        tokens = text.split()
        for token in tokens:
            if token == "/":
                result.append(" ")
            elif len(token) == 2 and token.isdigit():
                row = int(token[0]) - 1
                col = int(token[1]) - 1
                idx = row * 5 + col
                if 0 <= idx < len(self.square):
                    result.append(self.square[idx])
            else:
                result.append(token)
        return "".join(result)
