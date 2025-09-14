#!/bin/bash

# PlaylistOrganizer Uygulaması Başlatma Script'i
# Hem backend hem frontend'i çalıştırır ve Angular uygulamasını açar

set -e  # Hata durumunda script'i durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonu
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Proje dizinlerini tanımla
PROJECT_ROOT="/Users/koray/projects/PlaylistOrganizer-py"
BACKEND_DIR="$PROJECT_ROOT/py"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# PID dosyaları
BACKEND_PID_FILE="/tmp/playlist_organizer_backend.pid"
FRONTEND_PID_FILE="/tmp/playlist_organizer_frontend.pid"

# Temizlik fonksiyonu
cleanup() {
    log "Temizlik işlemleri başlatılıyor..."
    
    # Backend'i durdur
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            log "Backend durduruluyor (PID: $BACKEND_PID)..."
            kill "$BACKEND_PID" 2>/dev/null || true
            sleep 2
            kill -9 "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Frontend'i durdur
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log "Frontend durduruluyor (PID: $FRONTEND_PID)..."
            kill "$FRONTEND_PID" 2>/dev/null || true
            sleep 2
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Ng serve süreçlerini temizle
    pkill -f "ng serve" 2>/dev/null || true
    pkill -f "python apiserver.py" 2>/dev/null || true
    
    success "Temizlik tamamlandı"
}

# Hata yakalama
trap cleanup EXIT INT TERM

# Başlık
echo -e "${GREEN}"
echo "=========================================="
echo "  PlaylistOrganizer Uygulaması Başlatılıyor"
echo "=========================================="
echo -e "${NC}"

# Dizin kontrolü
if [ ! -d "$BACKEND_DIR" ]; then
    error "Backend dizini bulunamadı: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    error "Frontend dizini bulunamadı: $FRONTEND_DIR"
    exit 1
fi

# Önceki süreçleri temizle
log "Önceki süreçler temizleniyor..."
cleanup

# Backend başlatma
log "Backend başlatılıyor..."
cd "$BACKEND_DIR"

# Virtual environment kontrolü
if [ ! -d ".venv" ]; then
    error "Virtual environment bulunamadı. Lütfen önce 'python -m venv .venv' çalıştırın."
    exit 1
fi

# Virtual environment'ı aktifleştir
source .venv/bin/activate

# Backend'i arka planda başlat
log "Backend API sunucusu başlatılıyor..."
python apiserver.py > /tmp/playlist_organizer_backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

# Backend'in hazır olmasını bekle
log "Backend'in hazır olması bekleniyor..."
for i in {1..30}; do
    if curl -s http://localhost:50001/api/port >/dev/null 2>&1; then
        success "Backend hazır!"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Backend 30 saniye içinde hazır olmadı"
        exit 1
    fi
    sleep 1
done

success "Backend port 50001'de çalışıyor"

# Frontend başlatma
log "Frontend başlatılıyor..."
cd "$FRONTEND_DIR"

# Node modules kontrolü
if [ ! -d "node_modules" ]; then
    warning "node_modules bulunamadı, npm install çalıştırılıyor..."
    npm install
fi

# Angular build
log "Angular uygulaması build ediliyor..."
ng build --configuration development

# Frontend'i arka planda başlat
log "Frontend development server başlatılıyor..."
ng serve --port 4200 > /tmp/playlist_organizer_frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

# Frontend'in hazır olmasını bekle
log "Frontend'in hazır olması bekleniyor..."
for i in {1..60}; do
    if curl -s http://localhost:4200 >/dev/null 2>&1; then
        success "Frontend hazır!"
        break
    fi
    if [ $i -eq 60 ]; then
        error "Frontend 60 saniye içinde hazır olmadı"
        exit 1
    fi
    sleep 1
done

# Başarı mesajı
echo -e "${GREEN}"
echo "=========================================="
echo "  Uygulama Başarıyla Başlatıldı!"
echo "=========================================="
echo -e "${NC}"
echo -e "Backend API: ${BLUE}http://localhost:50001${NC}"
echo -e "Frontend:    ${BLUE}http://localhost:4200${NC}"
echo -e "API Port:    ${BLUE}50001${NC}"
echo ""
echo -e "${YELLOW}Uygulamayı kapatmak için Ctrl+C tuşlayın${NC}"
echo ""

# Tarayıcıyı aç
log "Tarayıcı açılıyor..."
if command -v open >/dev/null 2>&1; then
    # macOS
    open "http://localhost:4200"
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "http://localhost:4200"
elif command -v start >/dev/null 2>&1; then
    # Windows
    start "http://localhost:4200"
else
    warning "Tarayıcı otomatik açılamadı. Lütfen http://localhost:4200 adresini manuel olarak açın."
fi

# Süreçleri izle
log "Uygulama çalışıyor... (Ctrl+C ile kapatın)"
while true; do
    # Backend kontrolü
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
            error "Backend beklenmedik şekilde durdu"
            break
        fi
    fi
    
    # Frontend kontrolü
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
            error "Frontend beklenmedik şekilde durdu"
            break
        fi
    fi
    
    sleep 5
done

# Temizlik
cleanup
