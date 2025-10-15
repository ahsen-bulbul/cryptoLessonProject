from .base_cipher import Cipher

class RailFenceCipher(Cipher):
    def __init__(self, rails=3):
        self.rails = int(rails)

    def encrypt(self, text: str) -> str:
        fence = [['' for _ in text] for _ in range(self.rails)]
        row, down = 0, False
        for i, char in enumerate(text):
            fence[row][i] = char
            if row == 0 or row == self.rails - 1:
                down = not down
            row += 1 if down else -1
        return ''.join(''.join(r) for r in fence)

    def decrypt(self, text: str) -> str:
        fence = [['' for _ in text] for _ in range(self.rails)]
        index, row, down = 0, 0, False
        for i in range(len(text)):
            fence[row][i] = '*'
            if row == 0 or row == self.rails - 1:
                down = not down
            row += 1 if down else -1

        for i in range(self.rails):
            for j in range(len(text)):
                if fence[i][j] == '*' and index < len(text):
                    fence[i][j] = text[index]
                    index += 1

        result, row, down = '', 0, False
        for i in range(len(text)):
            result += fence[row][i]
            if row == 0 or row == self.rails - 1:
                down = not down
            row += 1 if down else -1
        return result
