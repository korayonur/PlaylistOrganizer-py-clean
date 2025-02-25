#!/usr/bin/env python3
"""
PlaylistOrganizer DMG oluşturma scripti
"""

import os
import sys
import subprocess
import dmgbuild
import shutil
from pathlib import Path

# Proje dizini
PROJECT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST_DIR = PROJECT_DIR / "dist"
BUILD_DIR = PROJECT_DIR / "build"
APP_PATH = str(DIST_DIR / "PlaylistOrganizer.app")  # Path nesnesi yerine string kullan
DMG_PATH = str(DIST_DIR / "PlaylistOrganizer-1.0.0.dmg")  # Path nesnesi yerine string kullan

# DMG ayarları
DMG_SETTINGS = {
    "format": "UDBZ",  # bzip2 sıkıştırma
    "size": "750M",
    "files": [APP_PATH],
    "symlinks": {"Applications": "/Applications"},
    "icon_size": 128,
    "background": None,  # Arkaplan resmi eklemek isterseniz burada belirtin
    "icon_locations": {
        "PlaylistOrganizer.app": (150, 150),
        "Applications": (350, 150)
    },
    "window_rect": ((100, 100), (500, 400)),
    "default_view": "icon-view",
    "show_icon_preview": False,
    "include_icon_view_settings": True,
    "include_list_view_settings": False,
    "arrange_by": None,
    "grid_offset": (0, 0),
    "grid_spacing": 100,
    "scroll_position": (0, 0),
    "show_status_bar": False,
    "show_tab_view": False,
    "show_toolbar": False,
    "show_pathbar": False,
    "show_sidebar": False,
    "sidebar_width": 180,
    "code_sign": {
        "identity": None,  # Sertifika kimliğiniz varsa buraya ekleyin
        "deep": True,
        "options": "--timestamp"
    },
}


def clean_build_dirs():
    """Eski build ve dist klasörlerini temizle"""
    print("Eski build ve dist klasörleri temizleniyor...")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)
    print("Temizlik tamamlandı.")


def build_app():
    """PyInstaller ile uygulamayı derle"""
    print("Uygulama derleniyor...")
    os.chdir(PROJECT_DIR)
    
    # Önce spec dosyasını güncelleyelim
    update_spec_file()
    
    result = subprocess.run(
        ["pyinstaller", "playlist_organizer.spec", "--clean"],
        check=True,
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print(f"UYARI: {result.stderr}")
    
    app_path_obj = Path(APP_PATH)
    if not app_path_obj.exists():
        print(f"HATA: {APP_PATH} oluşturulamadı!")
        sys.exit(1)
    
    print("Uygulama başarıyla derlendi.")


def update_spec_file():
    """Spec dosyasındaki __file__ değişkenini düzelt"""
    spec_path = PROJECT_DIR / "playlist_organizer.spec"
    if not spec_path.exists():
        print(f"HATA: {spec_path} bulunamadı!")
        sys.exit(1)
    
    print("Spec dosyası güncelleniyor...")
    
    # Spec dosyasını oku
    with open(spec_path, 'r') as f:
        spec_content = f.read()
    
    # __file__ değişkenini düzelt
    if "os.path.abspath('__file__')" in spec_content:
        spec_content = spec_content.replace(
            "os.path.abspath('__file__')", 
            "os.path.abspath(__file__)"
        )
        
        # Güncellenmiş içeriği yaz
        with open(spec_path, 'w') as f:
            f.write(spec_content)
        
        print("Spec dosyası güncellendi.")
    else:
        print("Spec dosyası zaten güncel.")


def build_dmg():
    """DMG dosyasını oluştur"""
    print("DMG dosyası oluşturuluyor...")
    try:
        dmgbuild.build_dmg(
            filename=DMG_PATH,
            volume_name="Playlist Organizer",
            settings=DMG_SETTINGS
        )
        print(f"DMG dosyası başarıyla oluşturuldu: {DMG_PATH}")
    except Exception as e:
        print(f"DMG oluşturma hatası: {e}")
        sys.exit(1)


def verify_dmg():
    """DMG dosyasını doğrula"""
    dmg_path_obj = Path(DMG_PATH)
    if dmg_path_obj.exists():
        size_mb = dmg_path_obj.stat().st_size / (1024 * 1024)
        print(f"DMG dosyası doğrulandı: {DMG_PATH} ({size_mb:.2f} MB)")
        return True
    else:
        print(f"HATA: DMG dosyası bulunamadı: {DMG_PATH}")
        return False


def main():
    """Ana fonksiyon"""
    print("=" * 50)
    print("PlaylistOrganizer DMG Oluşturma Aracı")
    print("=" * 50)
    
    # Temizlik
    clean_build_dirs()
    
    # Uygulamayı derle
    build_app()
    
    # DMG oluştur
    build_dmg()
    
    # Doğrula
    if verify_dmg():
        print("=" * 50)
        print("İşlem başarıyla tamamlandı!")
        print(f"DMG dosyası: {DMG_PATH}")
        print("=" * 50)
        return 0
    else:
        print("=" * 50)
        print("DMG oluşturma başarısız!")
        print("=" * 50)
        return 1


if __name__ == "__main__":
    sys.exit(main()) 