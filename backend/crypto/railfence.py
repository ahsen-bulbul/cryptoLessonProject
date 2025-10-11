from .cipher_base import Cipher

class RailFenceCipher(Cipher):
    def encrypt(self, text: str, key: str) -> str:
        key = int(key)
        if key <= 1:
            return text

        rail = [''] * key
        row, direction = 0, 1

        for char in text:
            rail[row] += char
            row += direction
            if row == 0 or row == key - 1:
                direction *= -1

        return ''.join(rail)

    def decrypt(self, text: str, key: str) -> str:
        key = int(key)
        if key <= 1:
            return text

        # pattern oluşturma
        pattern = [[None for _ in range(len(text))] for _ in range(key)]
        row, direction = 0, 1
        for i in range(len(text)):
            pattern[row][i] = '*'
            row += direction
            if row == 0 or row == key - 1:
                direction *= -1

        # karakterleri pattern’e doldurma
        index = 0
        for i in range(key):
            for j in range(len(text)):
                if pattern[i][j] == '*' and index < len(text):
                    pattern[i][j] = text[index]
                    index += 1

        # çözülmüş metni oluşturma
        result = ""
        row, direction = 0, 1
        for i in range(len(text)):
            result += pattern[row][i]
            row += direction
            if row == 0 or row == key - 1:
                direction *= -1

        return result
