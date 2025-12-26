import argparse
import os
import statistics
import sys
import time

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from crypto.rsa_cipher import RSACipher
from crypto.ecc_cipher import ECCCipher


def _time_it(fn, iterations):
    timings = []
    for _ in range(iterations):
        start = time.perf_counter()
        fn()
        timings.append(time.perf_counter() - start)
    return timings


def _print_stats(label, timings):
    avg = statistics.mean(timings) * 1000
    med = statistics.median(timings) * 1000
    p95 = statistics.quantiles(timings, n=20)[-1] * 1000
    print(f"{label}: avg={avg:.3f} ms, median={med:.3f} ms, p95={p95:.3f} ms")


def run_benchmark(iterations, key_size, include_keygen):
    symmetric_key = "abcdefghijklmnop"

    if include_keygen:
        rsa_keygen_times = _time_it(lambda: RSACipher.generate_keypair(key_size), iterations)
        ecc_keygen_times = _time_it(ECCCipher.generate_keypair, iterations)
        _print_stats("RSA keygen", rsa_keygen_times)
        _print_stats("ECC keygen", ecc_keygen_times)

    rsa_private, rsa_public = RSACipher.generate_keypair(key_size)
    rsa_pub_cipher = RSACipher(public_key_pem=rsa_public)
    rsa_priv_cipher = RSACipher(private_key_pem=rsa_private)

    ecc_private, ecc_public = ECCCipher.generate_keypair()
    ecc_pub_cipher = ECCCipher(public_key_pem=ecc_public)
    ecc_priv_cipher = ECCCipher(private_key_pem=ecc_private)

    rsa_wrap_times = _time_it(lambda: rsa_pub_cipher.wrap_key(symmetric_key), iterations)
    _print_stats("RSA wrap", rsa_wrap_times)

    rsa_sample = rsa_pub_cipher.wrap_key(symmetric_key)
    rsa_unwrap_times = _time_it(lambda: rsa_priv_cipher.unwrap_key(rsa_sample), iterations)
    _print_stats("RSA unwrap", rsa_unwrap_times)

    ecc_wrap_times = _time_it(lambda: ecc_pub_cipher.wrap_key(symmetric_key), iterations)
    _print_stats("ECC wrap", ecc_wrap_times)

    ecc_sample = ecc_pub_cipher.wrap_key(symmetric_key)
    ecc_unwrap_times = _time_it(lambda: ecc_priv_cipher.unwrap_key(ecc_sample), iterations)
    _print_stats("ECC unwrap", ecc_unwrap_times)


def main():
    parser = argparse.ArgumentParser(description="Benchmark RSA vs ECC key wrapping")
    parser.add_argument("--iterations", type=int, default=200, help="number of iterations per test")
    parser.add_argument("--rsa-bits", type=int, default=2048, help="RSA key size in bits")
    parser.add_argument("--include-keygen", action="store_true", help="also time key generation")
    args = parser.parse_args()

    run_benchmark(args.iterations, args.rsa_bits, args.include_keygen)


if __name__ == "__main__":
    main()
