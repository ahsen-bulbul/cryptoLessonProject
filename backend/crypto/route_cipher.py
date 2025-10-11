from .cipher_base import Cipher
import math

class RouteCipher(Cipher):
    def encrypt(self, text: str, key: str) -> str:
        cols = int(key)
        rows = math.ceil(len(text) / cols)
        grid = [[' ' for _ in range(cols)] for _ in range(rows)]
        for i, c in enumerate(text):
            grid[i // cols][i % cols] = c
        result = ''
        for c in range(cols):
            for r in range(rows):
                result += grid[r][c]
        return result.strip()

    def decrypt(self, text: str, key: str) -> str:
        cols = int(key)
        rows = math.ceil(len(text) / cols)
        num_shaded_boxes = (cols * rows) - len(text)
        grid = [['' for _ in range(cols)] for _ in range(rows)]
        col, row = 0, 0
        for symbol in text:
            grid[row][col] = symbol
            col += 1
            if (col == cols) or (col == cols - 1 and row >= rows - num_shaded_boxes):
                col = 0
                row += 1
        result = ''
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != '':
                    result += grid[r][c]
        return result
