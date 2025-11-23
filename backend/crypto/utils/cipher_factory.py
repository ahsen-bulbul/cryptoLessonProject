from crypto.caesar_cipher import CaesarCipher
from crypto.vigenere_cipher import VigenereCipher
from crypto.railfence_cipher import RailFenceCipher
from crypto.playfair_cipher import PlayfairCipher
from crypto.route_cipher import RouteCipher
from crypto.hash_cipher import HashCipher
from crypto.des_cipher import DESCipher
from crypto.aes_cipher import AESCipher
from crypto.des_m_cipher import DESMCipher


class CipherFactory:
    @staticmethod
    def get_cipher(name: str, key, mode="ECB"):
        normalized_mode = (mode or "ECB").upper()

        algorithms = {
            "caesar": lambda k: CaesarCipher(k),
            "vigenere": lambda k: VigenereCipher(k),
            "railfence": lambda k: RailFenceCipher(k),
            "playfair": lambda k: PlayfairCipher(k),
            "route": lambda k: RouteCipher(k),
            "hash": lambda k: HashCipher(k),
            "des_lib": lambda k: DESCipher(k),
            "des_manual": lambda k: DESMCipher(k, normalized_mode),
            "aes": lambda k: AESCipher(k),
        }

        if name in ("des_manual", "desm", "des-manual", "des"):
            name = "des_manual"
        elif name in ("des_lib", "deslib", "des-lib"):
            name = "des_lib"

        if name not in algorithms:
            raise ValueError("Geçersiz algoritma adı.")

        return algorithms[name](key)
