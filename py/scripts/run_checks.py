"""
Kod kalitesi kontrollerini çalıştıran script.
"""

import sys

from .poetry_runner import PoetryRunner


def main() -> int:
    """Ana fonksiyon"""
    try:
        runner = PoetryRunner()

        print("Black formatlaması çalıştırılıyor...")
        black_result = runner.run_black()
        if black_result.returncode != 0:
            print("Black formatlaması başarısız!")
            print(black_result.stderr)
            return 1

        print("\nRuff lint kontrolü çalıştırılıyor...")
        ruff_result = runner.run_ruff()
        if ruff_result.returncode != 0:
            print("Ruff lint kontrolü başarısız!")
            print(ruff_result.stderr)
            return 1

        print("\nMypy type kontrolü çalıştırılıyor...")
        mypy_result = runner.run_mypy()
        if mypy_result.returncode != 0:
            print("Mypy type kontrolü başarısız!")
            print(mypy_result.stderr)
            return 1

        print("\nPytest testleri çalıştırılıyor...")
        pytest_result = runner.run_pytest()
        if pytest_result.returncode != 0:
            print("Pytest testleri başarısız!")
            print(pytest_result.stderr)
            return 1

        print("\nTüm kontroller başarıyla tamamlandı!")
        return 0

    except Exception as e:
        print(f"Hata: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
