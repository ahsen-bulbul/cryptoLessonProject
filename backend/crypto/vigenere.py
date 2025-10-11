from .cipher_base import Cipher

class VigenereCipher(Cipher):
    def _format_key(self, text: str, key: str):
        key = key.upper()
        repeated = ""
        i = 0
        for char in text:
            if char.isalpha():
                repeated += key[i % len(key)]
                i += 1
            else:
                repeated += char
        return repeated

    def encrypt(self, text: str, key: str) -> str:
        text = text.upper()
        key = self._format_key(text, key)
        result = ""
        for t, k in zip(text, key):
            if t.isalpha():
                result += chr((ord(t) + ord(k) - 2 * ord('A')) % 26 + ord('A'))
            else:
                result += t
        return result

    def decrypt(self, text: str, key: str) -> str:
        text = text.upper()
        key = self._format_key(text, key)
        result = ""
        for t, k in zip(text, key):
            if t.isalpha():
                result += chr((ord(t) - ord(k) + 26) % 26 + ord('A'))
            else:
                result += t
        return result
