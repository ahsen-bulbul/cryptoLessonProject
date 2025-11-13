from crypto.caesar_cipher import CaesarCipher
from crypto.vigenere_cipher import VigenereCipher
from crypto.railfence_cipher import RailFenceCipher
from crypto.playfair_cipher import PlayfairCipher
from crypto.route_cipher import RouteCipher
from crypto.hash_cipher import HashCipher
from crypto.des_cipher import DESCipher
from crypto.aes_cipher import AESCipher


class CipherFactory:
    @staticmethod
    def get_cipher(name: str, key):
        """
        Cipher instance'ı key ile oluşturur
        """
        algorithms = {
            "caesar": lambda k: CaesarCipher(k),
            "vigenere": lambda k: VigenereCipher(k),
            "railfence": lambda k: RailFenceCipher(k),
            "playfair": lambda k: PlayfairCipher(k),
            "route": lambda k: RouteCipher(k),
            "hash": lambda k: HashCipher(k),
            "des": lambda k: DESCipher(k),
            "aes": lambda k: AESCipher(k),
        }
        if name not in algorithms:
            raise ValueError("Geçersiz algoritma adı.")
        
        # Key ile instance oluştur
        return algorithms[name](key)
