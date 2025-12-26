from math import gcd

from .base_cipher import Cipher


class HillCipher(Cipher):
    def __init__(self, key):
        self.matrix = self._parse_key(key)
        det = self._determinant(self.matrix) % 26
        if gcd(det, 26) != 1:
            raise ValueError("Hill key determinant ve 26 aralarinda asal olmali.")
        self.inv_matrix = self._inverse_matrix(det)

    @staticmethod
    def _parse_key(key):
        if isinstance(key, (list, tuple)) and len(key) in (4, 9, 16):
            nums = [int(v) for v in key]
        elif isinstance(key, str):
            parts = [p for p in key.replace(" ", ",").split(",") if p]
            if len(parts) not in (4, 9, 16):
                raise ValueError("Hill key format: 'a,b,c,d' or 3x3/4x4 flattened")
            nums = [int(v) for v in parts]
        else:
            raise ValueError("Hill key format: 'a,b,c,d' or 3x3/4x4 flattened")
        size = int(len(nums) ** 0.5)
        return [
            [nums[i * size + j] % 26 for j in range(size)]
            for i in range(size)
        ]

    @staticmethod
    def _modinv(a, m):
        for x in range(1, m):
            if (a * x) % m == 1:
                return x
        raise ValueError("Mod inverse bulunamadi.")

    def _minor(self, matrix, row, col):
        return [
            [matrix[i][j] for j in range(len(matrix)) if j != col]
            for i in range(len(matrix)) if i != row
        ]

    def _determinant(self, matrix):
        size = len(matrix)
        if size == 1:
            return matrix[0][0]
        if size == 2:
            return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
        det = 0
        for col in range(size):
            sign = -1 if col % 2 else 1
            det += sign * matrix[0][col] * self._determinant(self._minor(matrix, 0, col))
        return det

    def _adjugate(self, matrix):
        size = len(matrix)
        cofactors = []
        for row in range(size):
            cofactor_row = []
            for col in range(size):
                sign = -1 if (row + col) % 2 else 1
                cofactor_row.append(sign * self._determinant(self._minor(matrix, row, col)))
            cofactors.append(cofactor_row)
        return [list(row) for row in zip(*cofactors)]

    def _inverse_matrix(self, det):
        inv_det = self._modinv(det, 26)
        adj = self._adjugate(self.matrix)
        size = len(self.matrix)
        return [
            [(adj[i][j] * inv_det) % 26 for j in range(size)]
            for i in range(size)
        ]

    def _prepare_text(self, text: str) -> str:
        letters = [ch.upper() for ch in text if ch.isalpha()]
        block = len(self.matrix)
        while len(letters) % block != 0:
            letters.append("X")
        return "".join(letters)

    def _process(self, text: str, matrix):
        cleaned = self._prepare_text(text)
        result = []
        size = len(matrix)
        for i in range(0, len(cleaned), size):
            vec = [ord(ch) - ord("A") for ch in cleaned[i:i + size]]
            for row in range(size):
                val = 0
                for col in range(size):
                    val += matrix[row][col] * vec[col]
                result.append(chr(ord("A") + (val % 26)))
        return "".join(result)

    def encrypt(self, text: str) -> str:
        return self._process(text, self.matrix)

    def decrypt(self, text: str) -> str:
        return self._process(text, self.inv_matrix)
