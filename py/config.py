"""
PlaylistOrganizer konfigürasyon dosyası
"""

import os
from pathlib import Path

# Environment kontrolü
IS_DEVELOPMENT = os.getenv("PLAYLIST_ORGANIZER_ENV", "production").lower() == "development"

# API Port ayarları
API_PORT = 5000 if IS_DEVELOPMENT else 3000
API_HOST = "localhost"

# Frontend URL'leri
FRONTEND_DEV_URL = f"http://localhost:4200"  # Angular dev server
FRONTEND_PROD_URL = f"http://{API_HOST}:{API_PORT}"  # Production/Embedded

# VirtualDJ playlist klasörleri
VIRTUALDJ_ROOT = "/Users/koray/Library/Application Support/VirtualDJ"
PLAYLISTS_FOLDERS = os.path.join(VIRTUALDJ_ROOT, "Folders")  # VirtualDJ klasör yapısı
PLAYLISTS_MYLISTS = os.path.join(VIRTUALDJ_ROOT, "MyLists")  # VirtualDJ playlist dosyaları

# Sabit yollar
PLAYLISTS_ROOT = PLAYLISTS_FOLDERS  # Geriye uyumluluk için
MUSIC_ROOT = "/Users/koray/Music/KorayMusics"
DB_PATH = Path(__file__).parent / "musicfiles.db.json"

# CORS ayarları
CORS_ORIGINS = ["*"]  # Tüm origin'lere izin ver

# Log ayarları
LOG_LEVEL = "debug" if IS_DEVELOPMENT else "error"

# Uygulama ayarları
APP_NAME = "Playlist Organizer"
APP_VERSION = "1.0.0"
APP_WINDOW_SIZE = {
    "width": 1280,
    "height": 800,
    "min_width": 800,
    "min_height": 600
} 