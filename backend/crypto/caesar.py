class CaesarCipher:
    def encrypt(self, text: str, key: str):
        try:
            shift = int(key)
        except:
            raise ValueError("Key must be an integer")
        result = ""
        for c in text:
            if c.isalpha():
                base = ord('A') if c.isupper() else ord('a')
                result += chr((ord(c) - base + shift) % 26 + base)
            else:
                result += c
        return result

    def decrypt(self, text: str, key: str):
        try:
            shift = int(key)
        except:
            raise ValueError("Key must be an integer")
        return self.encrypt(text, str(-shift))
