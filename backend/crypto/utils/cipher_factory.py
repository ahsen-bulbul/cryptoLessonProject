from crypto.caesar_cipher import CaesarCipher
from crypto.vigenere_cipher import VigenereCipher
from crypto.railfence_cipher import RailFenceCipher
from crypto.playfair_cipher import PlayfairCipher
from crypto.route_cipher import RouteCipher
from crypto.hash_cipher import HashCipher
from crypto.des_cipher import DESCipher
from crypto.aes_cipher import AESCipher
from crypto.des_m_cipher import DESMCipher
from crypto.aes_m_cipher import AESMCipher
from crypto.affine_cipher import AffineCipher
from crypto.substitution_cipher import SubstitutionCipher
from crypto.polybius_cipher import PolybiusCipher
from crypto.pigpen_cipher import PigpenCipher
from crypto.columnar_transposition_cipher import ColumnarTranspositionCipher
from crypto.hill_cipher import HillCipher


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
            "aes_manual": lambda k: AESMCipher(k),
            "affine": lambda k: AffineCipher(k),
            "substitution": lambda k: SubstitutionCipher(k),
            "polybius": lambda k: PolybiusCipher(k),
            "pigpen": lambda k: PigpenCipher(k),
            "columnar": lambda k: ColumnarTranspositionCipher(k),
            "columnar_transposition": lambda k: ColumnarTranspositionCipher(k),
            "hill": lambda k: HillCipher(k),
        }

        if name in ("des_manual", "desm", "des-manual", "des"):
            name = "des_manual"
        elif name in ("des_lib", "deslib", "des-lib"):
            name = "des_lib"
        elif name in ("aes_manual", "aesm", "aes-manual"):
            name = "aes_manual"

        if name not in algorithms:
            raise ValueError("Geçersiz algoritma adı.")

        return algorithms[name](key)
