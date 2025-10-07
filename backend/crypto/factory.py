from .caesar_cipher import CaesarCipher
from .vigenere_cipher import VigenereCipher
from .playfair_cipher import PlayfairCipher
from .route_cipher import RouteCipher
from .railfence_cipher import RailFenceCipher

class CipherFactory:
    @staticmethod
    def get_cipher(name):
        if name.lower() == "caesar":
            return CaesarCipher()
        elif name.lower() == "vigenere":
            return VigenereCipher()
        elif name.lower() == "playfair":
            return PlayfairCipher()
        elif name.lower() == "route":
            return RouteCipher()
        elif name.lower() == "railfence":
            return RailFenceCipher()
        else:
            raise ValueError("Unknown cipher")

