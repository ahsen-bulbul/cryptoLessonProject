from .base_cipher import Cipher

class RailFenceCipher(Cipher):
    def encrypt(self, text: str, key: str) -> str:
        key = int(key)
        rail = ['' for _ in range(key)]
        dir_down = False
        row = 0
        for c in text:
            rail[row] += c
            if row == 0 or row == key - 1:
                dir_down = not dir_down
            row += 1 if dir_down else -1
        return ''.join(rail)

    def decrypt(self, text: str, key: str) -> str:
        key = int(key)
        rail = [['\n' for _ in range(len(text))] for _ in range(key)]
        dir_down, row, col = None, 0, 0
        for i in range(len(text)):
            if row == 0:
                dir_down = True
            if row == key - 1:
                dir_down = False
            rail[row][col] = '*'
            col += 1
            row += 1 if dir_down else -1
        index = 0
        for i in range(key):
            for j in range(len(text)):
                if rail[i][j] == '*' and index < len(text):
                    rail[i][j] = text[index]
                    index += 1
        result = ''
        row, col = 0, 0
        for i in range(len(text)):
            if row == 0:
                dir_down = True
            if row == key - 1:
                dir_down = False
            result += rail[row][col]
            col += 1
            row += 1 if dir_down else -1
        return result
