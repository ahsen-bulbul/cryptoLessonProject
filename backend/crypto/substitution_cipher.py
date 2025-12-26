from .base_cipher import Cipher


class SubstitutionCipher(Cipher):
    def __init__(self, key: str):
        if not isinstance(key, str):
            raise ValueError("Substitution key 26 harfli string olmali.")
        letters = [c for c in key.upper() if c.isalpha()]
        if len(letters) != 26 or len(set(letters)) != 26:
            raise ValueError("Substitution key 26 farkli harf icermeli.")
        self.forward = {chr(ord("A") + i): letters[i] for i in range(26)}
        self.backward = {v: k for k, v in self.forward.items()}

    def encrypt(self, text: str) -> str:
        result = []
        for ch in text:
            if ch.isalpha():
                mapped = self.forward[ch.upper()]
                result.append(mapped if ch.isupper() else mapped.lower())
            else:
                result.append(ch)
        return "".join(result)

    def decrypt(self, text: str) -> str:
        result = []
        for ch in text:
            if ch.isalpha():
                mapped = self.backward[ch.upper()]
                result.append(mapped if ch.isupper() else mapped.lower())
            else:
                result.append(ch)
        return "".join(result)
