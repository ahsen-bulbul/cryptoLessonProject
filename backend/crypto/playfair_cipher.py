from .base_cipher import Cipher

class PlayfairCipher(Cipher):
    def __init__(self):
        self.size = 5

    def _generate_key_square(self, key):
        key = key.upper().replace("J", "I")
        result = []
        for c in key:
            if c not in result and c.isalpha():
                result.append(c)
        for c in "ABCDEFGHIKLMNOPQRSTUVWXYZ":
            if c not in result:
                result.append(c)
        return [result[i:i+self.size] for i in range(0, 25, self.size)]

    def _find_pos(self, square, letter):
        for i, row in enumerate(square):
            for j, c in enumerate(row):
                if c == letter:
                    return i, j
        return None, None

    def encrypt(self, text: str, key: str) -> str:
        text = text.upper().replace("J", "I")
        text = ''.join([c for c in text if c.isalpha()])
        if len(text) % 2 != 0:
            text += 'X'

        square = self._generate_key_square(key)
        result = ""

        for i in range(0, len(text), 2):
            a, b = text[i], text[i+1]
            ra, ca = self._find_pos(square, a)
            rb, cb = self._find_pos(square, b)
            if ra == rb:
                result += square[ra][(ca + 1) % 5]
                result += square[rb][(cb + 1) % 5]
            elif ca == cb:
                result += square[(ra + 1) % 5][ca]
                result += square[(rb + 1) % 5][cb]
            else:
                result += square[ra][cb]
                result += square[rb][ca]

        return result

    def decrypt(self, text: str, key: str) -> str:
        square = self._generate_key_square(key)
        result = ""

        for i in range(0, len(text), 2):
            a, b = text[i], text[i+1]
            ra, ca = self._find_pos(square, a)
            rb, cb = self._find_pos(square, b)
            if ra == rb:
                result += square[ra][(ca - 1) % 5]
                result += square[rb][(cb - 1) % 5]
            elif ca == cb:
                result += square[(ra - 1) % 5][ca]
                result += square[(rb - 1) % 5][cb]
            else:
                result += square[ra][cb]
                result += square[rb][ca]

        return result
