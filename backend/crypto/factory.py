from .caesar import CaesarCipher
from .vigenere import VigenereCipher
from .playfair import PlayfairCipher
from .route_cipher import RouteCipher
from .railfence import RailFenceCipher

class CipherFactory:
    @staticmethod
    def get_cipher(name: str):
        name = name.lower()
        if name == "caesar":
            return CaesarCipher()
        elif name == "vigenere":
            return VigenereCipher()
        elif name == "playfair":
            return PlayfairCipher()
        elif name == "route":
            return RouteCipher()
        elif name == "railfence":
            return RailFenceCipher()
        else:
            raise ValueError("Unknown cipher")
