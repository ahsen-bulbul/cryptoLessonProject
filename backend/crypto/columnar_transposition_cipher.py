import math

from .base_cipher import Cipher


class ColumnarTranspositionCipher(Cipher):
    def __init__(self, key: str):
        if not isinstance(key, str) or not key.strip():
            raise ValueError("Columnar key bos olamaz.")
        self.key = key.replace(" ", "")
        self.order = self._column_order(self.key)

    @staticmethod
    def _column_order(key: str):
        indexed = list(enumerate(key))
        sorted_cols = sorted(indexed, key=lambda x: (x[1], x[0]))
        order = [0] * len(key)
        for rank, (idx, _) in enumerate(sorted_cols):
            order[idx] = rank
        return order

    def encrypt(self, text: str) -> str:
        cols = len(self.key)
        rows = math.ceil(len(text) / cols)
        padded = text.ljust(rows * cols, "X")
        grid = [padded[i:i + cols] for i in range(0, len(padded), cols)]
        result = []
        for order_idx in range(cols):
            col_idx = self.order.index(order_idx)
            for row in grid:
                result.append(row[col_idx])
        return "".join(result)

    def decrypt(self, text: str) -> str:
        cols = len(self.key)
        rows = math.ceil(len(text) / cols)
        total = rows * cols
        padded = text.ljust(total, "X")
        grid = [[""] * cols for _ in range(rows)]
        idx = 0
        for order_idx in range(cols):
            col_idx = self.order.index(order_idx)
            for row in range(rows):
                grid[row][col_idx] = padded[idx]
                idx += 1
        result = []
        for row in grid:
            result.extend(row)
        return "".join(result).rstrip("X")
