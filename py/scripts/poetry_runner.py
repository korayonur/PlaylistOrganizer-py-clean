"""
Poetry komutlarını doğru klasörde çalıştırmak için yardımcı script.
"""

import os
import subprocess
from pathlib import Path
from typing import List


class PoetryRunner:
    """Poetry komutlarını yöneten sınıf"""

    def __init__(self, project_root: str = "/Users/koray/projects/PlaylistOrganizer-py/py"):
        self.project_root = Path(project_root)
        self.pyproject_path = self.project_root / "pyproject.toml"

    def verify_environment(self) -> bool:
        """Poetry ortamını doğrula"""
        if not self.pyproject_path.exists():
            raise FileNotFoundError(f"pyproject.toml dosyası bulunamadı: {self.pyproject_path}")
        return True

    def run_command(
        self, command: List[str], check: bool = True
    ) -> subprocess.CompletedProcess[str]:
        """Poetry komutunu çalıştır"""
        self.verify_environment()

        # Mevcut dizini kaydet
        original_dir = os.getcwd()

        try:
            # Poetry root dizinine geç
            os.chdir(self.project_root)

            # Komutu çalıştır
            result = subprocess.run(
                ["poetry"] + command, check=check, capture_output=True, text=True
            )
            return result

        finally:
            # Orijinal dizine geri dön
            os.chdir(original_dir)

    def run_black(self, check: bool = False) -> subprocess.CompletedProcess[str]:
        """Black formatlamasını çalıştır"""
        cmd = ["run", "black", ".", "--check"] if check else ["run", "black", "."]
        return self.run_command(cmd)

    def run_ruff(self, check: bool = False) -> subprocess.CompletedProcess[str]:
        """Ruff lint kontrolünü çalıştır"""
        cmd = ["run", "ruff", "check", "."]
        if not check:
            cmd.append("--fix")
        return self.run_command(cmd)

    def run_mypy(self) -> subprocess.CompletedProcess[str]:
        """Mypy type kontrolünü çalıştır"""
        return self.run_command(["run", "mypy", "."])

    def run_pytest(self) -> subprocess.CompletedProcess[str]:
        """Pytest testlerini çalıştır"""
        return self.run_command(["run", "pytest"])

    def install_dependencies(self) -> subprocess.CompletedProcess[str]:
        """Bağımlılıkları yükle"""
        return self.run_command(["install"])

    def update_dependencies(self) -> subprocess.CompletedProcess[str]:
        """Bağımlılıkları güncelle"""
        return self.run_command(["update"])

    def add_dependency(self, package: str, dev: bool = False) -> subprocess.CompletedProcess[str]:
        """Yeni bağımlılık ekle"""
        cmd = ["add", package, "--dev"] if dev else ["add", package]
        return self.run_command(cmd)

    def remove_dependency(self, package: str) -> subprocess.CompletedProcess[str]:
        """Bağımlılık kaldır"""
        return self.run_command(["remove", package])
