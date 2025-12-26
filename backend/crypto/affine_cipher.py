from math import gcd

from .base_cipher import Cipher


class AffineCipher(Cipher):
    def __init__(self, key):
        self.a, self.b = self._parse_key(key)
        if gcd(self.a, 26) != 1:
            raise ValueError("Affine cipher icin a ve 26 aralarinda asal olmali.")

    @staticmethod
    def _parse_key(key):
        if isinstance(key, (tuple, list)) and len(key) == 2:
            return int(key[0]), int(key[1])
        if isinstance(key, str):
            parts = [p for p in key.replace(":", ",").replace(" ", ",").split(",") if p]
            if len(parts) == 2:
                return int(parts[0]), int(parts[1])
        raise ValueError("Affine key format: 'a,b'")

    @staticmethod
    def _modinv(a, m):
        for x in range(1, m):
            if (a * x) % m == 1:
                return x
        raise ValueError("Mod inverse bulunamadi.")

    def encrypt(self, text: str) -> str:
        result = []
        for ch in text:
            if ch.isalpha():
                base = ord("A") if ch.isupper() else ord("a")
                x = ord(ch) - base
                y = (self.a * x + self.b) % 26
                result.append(chr(base + y))
            else:
                result.append(ch)
        return "".join(result)

    def decrypt(self, text: str) -> str:
        inv_a = self._modinv(self.a % 26, 26)
        result = []
        for ch in text:
            if ch.isalpha():
                base = ord("A") if ch.isupper() else ord("a")
                y = ord(ch) - base
                x = (inv_a * (y - self.b)) % 26
                result.append(chr(base + x))
            else:
                result.append(ch)
        return "".join(result)
