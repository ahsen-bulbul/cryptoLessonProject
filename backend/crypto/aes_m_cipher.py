import base64
import hashlib

try:
    from .base_cipher import Cipher
except ImportError:
    from base_cipher import Cipher


class AESMCipher(Cipher):
    block_size = 16
    RCON = [
        0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1B,0x36
    ]

    def __init__(self, key: str):
        if not isinstance(key, str):
            raise ValueError("AES anahtari string olmali.")

        digest = hashlib.sha256(key.encode("utf-8")).digest()
        self._key = digest[:16]      # 128-bit key
        self._iv = digest[16:32]     # 128-bit IV
        self._s_box, self._inv_s_box = self._generate_sboxes(digest)
        self._round_keys = self._expand_key(self._key)

    @staticmethod
    def _prng_bytes(seed: bytes, length: int) -> bytes:
        out = bytearray()
        counter = 0
        while len(out) < length:
            counter_bytes = counter.to_bytes(4, "big")
            out.extend(hashlib.sha256(seed + counter_bytes).digest())
            counter += 1
        return bytes(out[:length])

    def _generate_sboxes(self, seed: bytes):
        sbox = list(range(256))
        rand = self._prng_bytes(seed, 256)
        idx = 0
        for i in range(255, 0, -1):
            j = rand[idx] % (i + 1)
            idx += 1
            sbox[i], sbox[j] = sbox[j], sbox[i]
        inv = [0] * 256
        for i, val in enumerate(sbox):
            inv[val] = i
        return sbox, inv

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
                state[r][c] = self._s_box[state[r][c]]

    def _inv_sub_bytes(self, state):
        for r in range(4):
            for c in range(4):
                state[r][c] = self._inv_s_box[state[r][c]]

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
                temp = [self._s_box[b] for b in temp]
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
