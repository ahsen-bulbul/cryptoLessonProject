from .cipher_base import Cipher

class PlayfairCipher(Cipher):
    def _generate_key_matrix(self, key: str):
        key = key.upper().replace("J", "I")
        matrix = []
        used = set()

        for char in key:
            if char.isalpha() and char not in used:
                matrix.append(char)
                used.add(char)

        for char in "ABCDEFGHIKLMNOPQRSTUVWXYZ":
            if char not in used:
                matrix.append(char)

        return [matrix[i:i+5] for i in range(0, 25, 5)]

    def _find_position(self, matrix, char):
        for i in range(5):
            for j in range(5):
                if matrix[i][j] == char:
                    return i, j
        return None

    def _prepare_text(self, text):
        text = text.upper().replace("J", "I")
        pairs = []
        i = 0
        while i < len(text):
            a = text[i]
            b = text[i + 1] if i + 1 < len(text) else 'X'
            if a == b:
                pairs.append(a + 'X')
                i += 1
            else:
                pairs.append(a + b)
                i += 2
        return pairs

    def encrypt(self, text: str, key: str) -> str:
        matrix = self._generate_key_matrix(key)
        pairs = self._prepare_text(text)
        result = ""

        for pair in pairs:
            a, b = pair
            row_a, col_a = self._find_position(matrix, a)
            row_b, col_b = self._find_position(matrix, b)

            if row_a == row_b:
                result += matrix[row_a][(col_a + 1) % 5]
                result += matrix[row_b][(col_b + 1) % 5]
            elif col_a == col_b:
                result += matrix[(row_a + 1) % 5][col_a]
                result += matrix[(row_b + 1) % 5][col_b]
            else:
                result += matrix[row_a][col_b]
                result += matrix[row_b][col_a]

        return result

    def decrypt(self, text: str, key: str) -> str:
        matrix = self._generate_key_matrix(key)
        pairs = self._prepare_text(text)
        result = ""

        for pair in pairs:
            a, b = pair
            row_a, col_a = self._find_position(matrix, a)
            row_b, col_b = self._find_position(matrix, b)

            if row_a == row_b:
                result += matrix[row_a][(col_a - 1) % 5]
                result += matrix[row_b][(col_b - 1) % 5]
            elif col_a == col_b:
                result += matrix[(row_a - 1) % 5][col_a]
                result += matrix[(row_b - 1) % 5][col_b]
            else:
                result += matrix[row_a][col_b]
                result += matrix[row_b][col_a]

        return result
