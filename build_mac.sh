#!/bin/bash

# PlaylistOrganizer macOS M1 Build Script

echo ".playlistOrganizer macOS M1 Build Script"
echo "======================================"

# Renk tanımları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hata kontrol fonksiyonu
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Hata oluştu: $1${NC}"
        exit 1
    fi
}

# Gerekli araçların kontrolü
echo -e "${YELLOW}Gerekli araçlar kontrol ediliyor...${NC}"

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo -e "${RED}Hata: Node.js bulunamadı. Lütfen Node.js 18+ yükleyin.${NC}"
    exit 1
fi

# Python kontrolü
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Hata: Python3 bulunamadı. Lütfen Python 3.11+ yükleyin.${NC}"
    exit 1
fi

echo -e "${GREEN}Tüm gerekli araçlar mevcut.${NC}"

# Frontend build
echo -e "${YELLOW}Frontend build ediliyor...${NC}"
cd frontend
npm run build
check_error "Frontend build başarısız oldu"

# Web klasörünü temizle ve oluştur
echo -e "${YELLOW}Web klasörü temizleniyor ve oluşturuluyor...${NC}"
cd ../py
rm -rf resources/web
mkdir -p resources/web

# Angular.json dosyasında belirtilen output path'e göre build yapılır
# Ancak bazen bu doğru çalışmıyor, bu yüzden manuel kopyalama yapıyoruz
echo -e "${YELLOW}Frontend dosyaları kopyalanıyor...${NC}"
cd ../frontend
# Dist klasörünü bul ve web klasörüne kopyala
if [ -d "dist" ]; then
    cp -r dist/* ../py/resources/web/
elif [ -d "dist/playlist-organizer" ]; then
    cp -r dist/playlist-organizer/* ../py/resources/web/
else
    echo -e "${YELLOW}Dist klasörü bulunamadı, build çıktısını kontrol edin${NC}"
fi

cd ../py

# PyInstaller kontrolü
if ! python3 -c "import PyInstaller" &> /dev/null; then
    echo -e "${RED}Hata: PyInstaller bulunamadı. Lütfen 'python3 -m pip install pyinstaller' komutunu çalıştırın.${NC}"
    exit 1
fi

# Gerekli Python paketlerinin kontrolü
echo -e "${YELLOW}Gerekli Python paketleri kontrol ediliyor...${NC}"
python3 -c "import webview" &> /dev/null || { echo -e "${RED}webview paketi bulunamadı. Lütfen 'pip install pywebview' komutunu çalıştırın.${NC}"; exit 1; }
python3 -c "import fastapi" &> /dev/null || { echo -e "${RED}fastapi paketi bulunamadı. Lütfen 'pip install fastapi' komutunu çalıştırın.${NC}"; exit 1; }
python3 -c "import uvicorn" &> /dev/null || { echo -e "${RED}uvicorn paketi bulunamadı. Lütfen 'pip install uvicorn' komutunu çalıştırın.${NC}"; exit 1; }

# İkon dosyası kontrolü
if [ ! -f "resources/icons/app.icns" ]; then
    echo -e "${YELLOW}İkon dosyası bulunamadı, ikon olmadan devam ediliyor...${NC}"
    # Çalıştırılabilir dosyayı oluştur (ikon olmadan)
    python3 -m PyInstaller --noconfirm --onefile \
        --name "PlaylistOrganizer" \
        --windowed \
        --add-data="resources/web:resources/web" \
        --add-data="resources/locales:resources/locales" \
        --hidden-import="pywebview" \
        --hidden-import="webview" \
        --hidden-import="fastapi" \
        --hidden-import="uvicorn" \
        --hidden-import="aiofiles" \
        --hidden-import="xmltodict" \
        --hidden-import="python_Levenshtein" \
        --hidden-import="rapidfuzz" \
        --hidden-import="loguru" \
        --hidden-import="requests" \
        main.py
else
    # Çalıştırılabilir dosyayı oluştur (ikon ile)
    python3 -m PyInstaller --noconfirm --onefile \
        --name "PlaylistOrganizer" \
        --windowed \
        --icon="resources/icons/app.icns" \
        --add-data="resources/web:resources/web" \
        --add-data="resources/locales:resources/locales" \
        --hidden-import="pywebview" \
        --hidden-import="webview" \
        --hidden-import="fastapi" \
        --hidden-import="uvicorn" \
        --hidden-import="aiofiles" \
        --hidden-import="xmltodict" \
        --hidden-import="python_Levenshtein" \
        --hidden-import="rapidfuzz" \
        --hidden-import="loguru" \
        --hidden-import="requests" \
        main.py
fi

check_error "Çalıştırılabilir dosya oluşturulamadı"

# Build tamamlandı
echo -e "${GREEN}Build tamamlandı!${NC}"
echo -e "${GREEN}Çalıştırılabilir dosya: dist/PlaylistOrganizer${NC}"

# Uyarı mesajı
echo -e "${YELLOW}"
echo "======================================"
echo "Önemli Uyarı:"
echo "1. Uygulama dist/ klasöründe oluşturuldu"
echo "2. İlk çalıştırmada güvenlik uyarısı alabilirsiniz"
echo "3. Uygulamayı çalıştırmak için:"
echo "   - System Preferences > Security & Privacy > General"
echo "   - 'Open Anyway' seçeneğini kullanın"
echo "======================================"
echo -e "${NC}"