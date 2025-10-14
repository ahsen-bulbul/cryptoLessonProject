from .base_cipher import Cipher
import math

class RouteCipher(Cipher):
    def __init__(self, rows=4):
        self.rows = rows

    def encrypt(self, text: str) -> str:
        cols = math.ceil(len(text) / self.rows)
        matrix = [['' for _ in range(cols)] for _ in range(self.rows)]
        k = 0
        for i in range(self.rows):
            for j in range(cols):
                if k < len(text):
                    matrix[i][j] = text[k]
                    k += 1
        result = ""
        for j in range(cols):
            for i in range(self.rows):
                result += matrix[i][j]
        return result

    def decrypt(self, text: str) -> str:
        cols = math.ceil(len(text) / self.rows)
        matrix = [['' for _ in range(cols)] for _ in range(self.rows)]
        k = 0
        for j in range(cols):
            for i in range(self.rows):
                if k < len(text):
                    matrix[i][j] = text[k]
                    k += 1
        return ''.join(''.join(row) for row in matrix)
