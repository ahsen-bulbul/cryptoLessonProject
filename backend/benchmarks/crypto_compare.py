import argparse
import os
import statistics
import sys
import time


BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from crypto.aes_cipher import AESCipher  # noqa: E402
from crypto.des_cipher import DESCipher  # noqa: E402
from crypto.rsa_cipher import RSACipher  # noqa: E402


def _time_it(fn, iterations: int):
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        fn()
        times.append((time.perf_counter() - start) * 1000.0)
    return times


def _summarize(label: str, times):
    avg = statistics.mean(times)
    med = statistics.median(times)
    p95 = statistics.quantiles(times, n=100)[94]
    print(f"{label}: avg={avg:.3f} ms, median={med:.3f} ms, p95={p95:.3f} ms")


def main():
    parser = argparse.ArgumentParser(description="AES/DES/RSA encrypt timing")
    parser.add_argument("--iterations", type=int, default=200)
    parser.add_argument("--message-size", type=int, default=1024)
    parser.add_argument("--rsa-key-size", type=int, default=2048)
    args = parser.parse_args()

    message = "A" * args.message_size

    aes = AESCipher("abcdefghijklmnop")
    des = DESCipher("abcdefgh")

    rsa_private, rsa_public = RSACipher.generate_keypair(args.rsa_key_size)
    rsa = RSACipher(public_key_pem=rsa_public)
    symmetric_key = "aes-benchmark-key"

    _summarize("AES encrypt", _time_it(lambda: aes.encrypt(message), args.iterations))
    _summarize("DES encrypt", _time_it(lambda: des.encrypt(message), args.iterations))
    _summarize("RSA wrap (key encrypt)", _time_it(lambda: rsa.wrap_key(symmetric_key), args.iterations))


if __name__ == "__main__":
    main()
