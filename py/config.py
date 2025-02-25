"""
PlaylistOrganizer konfigürasyon dosyası
"""

import os
import platform
import json
from pathlib import Path

# Environment kontrolü
IS_DEVELOPMENT = os.environ.get('PLAYLIST_ORGANIZER_DEV', '0') == '1'

# API Port ayarları
# NOT: Bu port numaraları sabit olmalıdır, değiştirilmemelidir!
API_PORT = 3000 if IS_DEVELOPMENT else 5000  # Development: 3000, Production: 5000
API_HOST = "localhost" 

# Frontend URL'leri
FRONTEND_DEV_URL = f"http://{API_HOST}:4200"  # Angular geliştirme sunucusu
FRONTEND_PROD_URL = f"http://{API_HOST}:{API_PORT}"  # Production modunda API ile aynı port
FRONTEND_URL = FRONTEND_DEV_URL if IS_DEVELOPMENT else FRONTEND_PROD_URL

# Pencere ayarları
WINDOW_TITLE = "Playlist Organizer"
WINDOW_WIDTH = 1024
WINDOW_HEIGHT = 768
WINDOW_BACKGROUND_COLOR = "#FFFFFF"

# Dil ayarları
DEFAULT_LANGUAGE = "tr"
SUPPORTED_LANGUAGES = ["tr", "en"]

# WhatsApp iletişim numarası (uluslararası format, + işareti olmadan)
WHATSAPP_CONTACT = "905510861519"

# VirtualDJ playlist klasörlerini otomatik tespit et
def get_virtualdj_root():
    system = platform.system()
    home = Path.home()
    
    if system == "Darwin":  # macOS
        # Normal macOS yolu
        vdj_path = home / "Library" / "Application Support" / "VirtualDJ"
        
        # Container yapısı için alternatif yol kontrolü
        container_path = home / "Library" / "Containers" / "com.virtualdj.virtualdj" / "Data" / "Library" / "Application Support" / "VirtualDJ"
        
        if container_path.exists():
            return str(container_path)
        elif vdj_path.exists():
            return str(vdj_path)
    
    elif system == "Windows":
        # Windows için tipik yol
        vdj_path = home / "Documents" / "VirtualDJ"
        appdata_path = Path(os.getenv("APPDATA", "")) / "VirtualDJ"
        
        if vdj_path.exists():
            return str(vdj_path)
        elif appdata_path.exists():
            return str(appdata_path)
    
    elif system == "Linux":
        # Linux için tipik yol
        vdj_path = home / ".virtualdj"
        
        if vdj_path.exists():
            return str(vdj_path)
    
    # Varsayılan yol veya çevre değişkeni ile belirtilen yol
    default_path = os.getenv("VIRTUALDJ_PATH", "")
    if default_path and Path(default_path).exists():
        return default_path
    
    # Hiçbir yol bulunamazsa None döndür
    return None

VIRTUALDJ_ROOT = get_virtualdj_root()
# VirtualDJ klasörü bulunamazsa uyarı logla ve varsayılan değeri kullan
if not VIRTUALDJ_ROOT:
    print("UYARI: VirtualDJ klasörü otomatik olarak bulunamadı. VIRTUALDJ_PATH çevre değişkeni ile manuel olarak belirtebilirsiniz.")
    VIRTUALDJ_ROOT = os.getenv("VIRTUALDJ_PATH", "/Users/koray/Library/Application Support/VirtualDJ")

PLAYLISTS_FOLDERS = os.path.join(VIRTUALDJ_ROOT, "Folders")  # VirtualDJ klasör yapısı
PLAYLISTS_MYLISTS = os.path.join(VIRTUALDJ_ROOT, "MyLists")  # VirtualDJ playlist dosyaları

# Sabit yollar
PLAYLISTS_ROOT = PLAYLISTS_FOLDERS  # Geriye uyumluluk için
MUSIC_ROOT = "/Users/koray/Music/KorayMusics"
DB_PATH = Path(__file__).parent / "musicfiles.db.json"

# CORS ayarları
CORS_ORIGINS = ["*"]  # Tüm origin'lere izin ver

# Log ayarları
LOG_LEVEL = "debug" if IS_DEVELOPMENT else "info"

# Uygulama ayarları
APP_NAME = "Playlist Organizer"
APP_VERSION = "1.0.0"
APP_WINDOW_SIZE = {
    "width": 1024,
    "height": 768,
    "min_width": 800,
    "min_height": 600
}

# İletişim bilgileri
CONTACT_WHATSAPP = "+905510861519" 