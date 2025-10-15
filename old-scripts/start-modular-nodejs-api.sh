#!/bin/bash

# PlaylistOrganizer Modüler Server Başlatma Scripti
# Versiyon: 2.0.0

echo "🎵 PlaylistOrganizer Modüler Server v2.0.0"
echo "=========================================="

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonksiyonlar
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    print_error "Node.js bulunamadı! Lütfen Node.js'i yükleyin."
    exit 1
fi

# NPM kontrolü
if ! command -v npm &> /dev/null; then
    print_error "NPM bulunamadı! Lütfen NPM'i yükleyin."
    exit 1
fi

# Proje dizinine geç
cd "$(dirname "$0")/nodejs-api"

# Bağımlılıkları kontrol et
if [ ! -d "node_modules" ]; then
    print_status "Node modülleri yükleniyor..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "NPM install başarısız!"
        exit 1
    fi
    print_success "Node modülleri yüklendi"
fi

# Nodemon kontrolü
if ! command -v npx &> /dev/null || ! npx nodemon --version &> /dev/null; then
    print_warning "Nodemon bulunamadı, yükleniyor..."
    npm install nodemon --save-dev
fi

# Veritabanı kontrolü
if [ ! -f "musicfiles.db" ]; then
    print_warning "Veritabanı dosyası bulunamadı, oluşturuluyor..."
    # Veritabanı otomatik oluşturulacak
fi

# Port kontrolü
PORT=${PORT:-50001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port $PORT zaten kullanımda, farklı port denenecek..."
    PORT=$((PORT + 1))
fi

# Environment değişkenlerini ayarla
export NODE_ENV=development
export PORT=$PORT

print_status "Modüler server başlatılıyor..."
print_status "Port: $PORT"
print_status "Environment: $NODE_ENV"
print_status "Nodemon ile otomatik yeniden başlatma aktif"

echo ""
echo "🚀 Server başlatılıyor..."
echo "📊 API Endpoints:"
echo "   - Health: http://localhost:$PORT/api/health"
echo "   - Version: http://localhost:$PORT/api/version"
echo "   - History: http://localhost:$PORT/api/history/*"
echo "   - Import: http://localhost:$PORT/api/import/*"
echo "   - Playlist: http://localhost:$PORT/api/playlist/*"
echo "   - VirtualDJ: http://localhost:$PORT/api/virtualdj/*"
echo "   - Search: http://localhost:$PORT/api/search/*"
echo "   - Analytics: http://localhost:$PORT/api/analytics/*"
echo ""
echo "🔄 Kod değişikliklerinde otomatik yeniden başlatma aktif"
echo "⏹️  Durdurmak için Ctrl+C"
echo ""

# Nodemon ile server'ı başlat
npx nodemon

# Hata durumunda
if [ $? -ne 0 ]; then
    print_error "Server başlatılamadı!"
    exit 1
fi
