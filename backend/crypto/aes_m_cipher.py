import base64
import hashlib

try:
    from .base_cipher import Cipher
except ImportError:
    from base_cipher import Cipher


class AESMCipher(Cipher):
    block_size = 16

   
    S_BOX = [
        99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,
        202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,
        183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,
        4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,
        9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,
        83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,
        208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,
        81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,
        205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,
        96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,
        224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,
        231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,
        186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,
        112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,
        225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,
        140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22,
    ]

    
    INV_S_BOX = [
        82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,
        124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,
        84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,
        8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,
        114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,
        108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,
        144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,
        208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,
        58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,
        150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,
        71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,
        252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,
        31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,
        96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,
        160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,
        23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125,
    ]

    RCON = [
        0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1B,0x36
    ]

    def __init__(self, key: str):
        if not isinstance(key, str):
            raise ValueError("AES anahtari string olmali.")

        digest = hashlib.sha256(key.encode("utf-8")).digest()
        self._key = digest[:16]      # 128-bit key
        self._iv = digest[16:32]     # 128-bit IV
        self._round_keys = self._expand_key(self._key)

    @staticmethod
    def _pad(data: bytes) -> bytes:
        pad_len = AESMCipher.block_size - (len(data) % AESMCipher.block_size)
        return data + bytes([pad_len]) * pad_len

    @staticmethod
    def _unpad(data: bytes) -> bytes:
        pad_len = data[-1]
        if pad_len < 1 or pad_len > AESMCipher.block_size:
            raise ValueError("Invalid padding detected.")
        return data[:-pad_len]

    @staticmethod
    def _bytes_to_matrix(block: bytes):
        return [list(block[i:i+4]) for i in range(0, 16, 4)]

    @staticmethod
    def _matrix_to_bytes(matrix):
        return bytes(sum(matrix, []))

    @staticmethod
    def _add_round_key(state, round_key):
        for r in range(4):
            for c in range(4):
                state[r][c] ^= round_key[r][c]

    def _sub_bytes(self, state):
        for r in range(4):
            for c in range(4):
                state[r][c] = self.S_BOX[state[r][c]]

    def _inv_sub_bytes(self, state):
        for r in range(4):
            for c in range(4):
                state[r][c] = self.INV_S_BOX[state[r][c]]

    @staticmethod
    def _shift_rows(state):
        state[1] = state[1][1:] + state[1][:1]
        state[2] = state[2][2:] + state[2][:2]
        state[3] = state[3][3:] + state[3][:3]

    @staticmethod
    def _inv_shift_rows(state):
        state[1] = state[1][-1:] + state[1][:-1]
        state[2] = state[2][-2:] + state[2][:-2]
        state[3] = state[3][-3:] + state[3][:-3]

    @staticmethod
    def _gmul(a, b):
        p = 0
        for _ in range(8):
            if b & 1:
                p ^= a
            hi = a & 0x80
            a = (a << 1) & 0xFF
            if hi:
                a ^= 0x1B
            b >>= 1
        return p

    def _mix_columns(self, state):
        for c in range(4):
            a0, a1, a2, a3 = state[0][c], state[1][c], state[2][c], state[3][c]
            state[0][c] = self._gmul(a0, 2) ^ self._gmul(a1, 3) ^ a2 ^ a3
            state[1][c] = a0 ^ self._gmul(a1, 2) ^ self._gmul(a2, 3) ^ a3
            state[2][c] = a0 ^ a1 ^ self._gmul(a2, 2) ^ self._gmul(a3, 3)
            state[3][c] = self._gmul(a0, 3) ^ a1 ^ a2 ^ self._gmul(a3, 2)

    def _inv_mix_columns(self, state):
        for c in range(4):
            a0, a1, a2, a3 = state[0][c], state[1][c], state[2][c], state[3][c]
            state[0][c] = (self._gmul(a0, 14) ^ self._gmul(a1, 11) ^
                           self._gmul(a2, 13) ^ self._gmul(a3, 9))
            state[1][c] = (self._gmul(a0, 9) ^ self._gmul(a1, 14) ^
                           self._gmul(a2, 11) ^ self._gmul(a3, 13))
            state[2][c] = (self._gmul(a0, 13) ^ self._gmul(a1, 9) ^
                           self._gmul(a2, 14) ^ self._gmul(a3, 11))
            state[3][c] = (self._gmul(a0, 11) ^ self._gmul(a1, 13) ^
                           self._gmul(a2, 9) ^ self._gmul(a3, 14))

    def _expand_key(self, key: bytes):
        
        nk = 4
        nb = 4
        nr = 10

        key_columns = [list(key[i:i+4]) for i in range(0, 16, 4)]
        i = nk

        while len(key_columns) < nb * (nr + 1):
            temp = key_columns[-1].copy()

            if i % nk == 0:
                temp = temp[1:] + temp[:1]
                temp = [self.S_BOX[b] for b in temp]
                temp[0] ^= self.RCON[(i // nk) - 1]

            prev = key_columns[-nk]
            key_columns.append([p ^ t for p, t in zip(prev, temp)])
            i += 1

        round_keys = []
        for r in range(nr + 1):
            block = key_columns[r * 4:(r + 1) * 4]
            round_keys.append(block)
        return round_keys

    def _encrypt_block(self, block: bytes) -> bytes:
        state = self._bytes_to_matrix(block)

        self._add_round_key(state, self._round_keys[0])

        for rnd in range(1, 10):
            self._sub_bytes(state)
            self._shift_rows(state)
            self._mix_columns(state)
            self._add_round_key(state, self._round_keys[rnd])

        self._sub_bytes(state)
        self._shift_rows(state)
        self._add_round_key(state, self._round_keys[10])

        return self._matrix_to_bytes(state)

    def _decrypt_block(self, block: bytes) -> bytes:
        state = self._bytes_to_matrix(block)

        self._add_round_key(state, self._round_keys[10])
        self._inv_shift_rows(state)
        self._inv_sub_bytes(state)

        for rnd in range(9, 0, -1):
            self._add_round_key(state, self._round_keys[rnd])
            self._inv_mix_columns(state)
            self._inv_shift_rows(state)
            self._inv_sub_bytes(state)

        self._add_round_key(state, self._round_keys[0])
        return self._matrix_to_bytes(state)

    def encrypt(self, text: str) -> str:
        data = self._pad(text.encode("utf-8"))
        iv = bytearray(self._iv)
        out = bytearray()

        for i in range(0, len(data), self.block_size):
            block = bytearray(data[i:i + self.block_size])
            for j in range(self.block_size):
                block[j] ^= iv[j]
            enc = self._encrypt_block(bytes(block))
            out.extend(enc)
            iv = bytearray(enc)

        return base64.b64encode(bytes(out)).decode("utf-8")

    def decrypt(self, text: str) -> str:
        raw = base64.b64decode(text.encode("utf-8"))
        iv = bytearray(self._iv)
        out = bytearray()

        for i in range(0, len(raw), self.block_size):
            block = raw[i:i + self.block_size]
            dec = bytearray(self._decrypt_block(block))
            for j in range(self.block_size):
                dec[j] ^= iv[j]
            out.extend(dec)
            iv = bytearray(block)

        return self._unpad(bytes(out)).decode("utf-8")
