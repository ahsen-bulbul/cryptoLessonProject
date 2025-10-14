from .base_cipher import Cipher

class PlayfairCipher(Cipher):
    def __init__(self, key="KEYWORD"):
        self.key = key.upper()
        self.matrix = self._generate_matrix()

    def _generate_matrix(self):
        alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ"
        matrix_key = "".join(sorted(set(self.key + alphabet), key=lambda x: (self.key + alphabet).index(x)))
        return [list(matrix_key[i:i+5]) for i in range(0, 25, 5)]

    def _find_position(self, char):
        for i, row in enumerate(self.matrix):
            for j, val in enumerate(row):
                if val == char:
                    return i, j
        return None, None

    def _prepare_text(self, text):
        text = text.upper().replace("J", "I")
        prepared = ""
        i = 0
        while i < len(text):
            a = text[i]
            b = text[i+1] if i+1 < len(text) else 'X'
            if a == b:
                prepared += a + 'X'
                i += 1
            else:
                prepared += a + b
                i += 2
        if len(prepared) % 2 != 0:
            prepared += 'X'
        return prepared

    def encrypt(self, text: str) -> str:
        text = self._prepare_text(text)
        result = ""
        for i in range(0, len(text), 2):
            a, b = text[i], text[i+1]
            r1, c1 = self._find_position(a)
            r2, c2 = self._find_position(b)
            if r1 == r2:
                result += self.matrix[r1][(c1+1)%5] + self.matrix[r2][(c2+1)%5]
            elif c1 == c2:
                result += self.matrix[(r1+1)%5][c1] + self.matrix[(r2+1)%5][c2]
            else:
                result += self.matrix[r1][c2] + self.matrix[r2][c1]
        return result

    def decrypt(self, text: str) -> str:
        result = ""
        for i in range(0, len(text), 2):
            a, b = text[i], text[i+1]
            r1, c1 = self._find_position(a)
            r2, c2 = self._find_position(b)
            if r1 == r2:
                result += self.matrix[r1][(c1-1)%5] + self.matrix[r2][(c2-1)%5]
            elif c1 == c2:
                result += self.matrix[(r1-1)%5][c1] + self.matrix[(r2-1)%5][c2]
            else:
                result += self.matrix[r1][c2] + self.matrix[r2][c1]
        return result
