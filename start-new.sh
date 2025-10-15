#!/bin/bash

# PlaylistOrganizer - Clean Architecture Start Script
# Version: 2.0
# Starts: api/ (backend) + frontend/ (Angular)

set -e  # Hata durumunda script'i durdur

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Log fonksiyonları
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

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Proje dizinleri
PROJECT_ROOT="/Users/koray/projects/PlaylistOrganizer-py"
BACKEND_DIR="$PROJECT_ROOT/api"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# PID dosyaları
BACKEND_PID_FILE="/tmp/playlist_organizer_api.pid"
FRONTEND_PID_FILE="/tmp/playlist_organizer_frontend.pid"

# Temizlik fonksiyonu
cleanup() {
    log "🧹 Temizlik başlatılıyor..."
    
    # Port 50001 temizliği
    PORT_50001_PID=$(lsof -ti:50001 2>/dev/null || true)
    if [ ! -z "$PORT_50001_PID" ]; then
        log "Port 50001 temizleniyor (PID: $PORT_50001_PID)..."
        kill -9 "$PORT_50001_PID" 2>/dev/null || true
    fi
    
    # Port 4200 temizliği
    PORT_4200_PID=$(lsof -ti:4200 2>/dev/null || true)
    if [ ! -z "$PORT_4200_PID" ]; then
        log "Port 4200 temizleniyor (PID: $PORT_4200_PID)..."
        kill -9 "$PORT_4200_PID" 2>/dev/null || true
    fi
    
    # Backend'i durdur
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            log "Backend durduruluyor (PID: $BACKEND_PID)..."
            kill -9 "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Frontend'i durdur
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log "Frontend durduruluyor (PID: $FRONTEND_PID)..."
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Süreç temizliği
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "ng serve" 2>/dev/null || true
    pkill -f "node.*api/server.js" 2>/dev/null || true
    
    sleep 1
    
    success "Temizlik tamamlandı"
}

# Hata yakalama
trap cleanup EXIT INT TERM

# Başlık
echo -e "${GREEN}"
echo "=========================================="
echo "  🎵 Playlist Organizer v2.0"
echo "  Clean Architecture - Development Mode"
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

# Port kontrolü
log "🔍 Port kontrolü yapılıyor..."

PORT_50001_PID=$(lsof -ti:50001 2>/dev/null || true)
if [ ! -z "$PORT_50001_PID" ]; then
    warning "Port 50001 kullanımda (PID: $PORT_50001_PID), durduruluyor..."
    kill -9 "$PORT_50001_PID" 2>/dev/null || true
    sleep 1
fi

PORT_4200_PID=$(lsof -ti:4200 2>/dev/null || true)
if [ ! -z "$PORT_4200_PID" ]; then
    warning "Port 4200 kullanımda (PID: $PORT_4200_PID), durduruluyor..."
    kill -9 "$PORT_4200_PID" 2>/dev/null || true
    sleep 1
fi

# Backend başlatma
log "🔧 Backend API başlatılıyor (Clean Architecture)..."
cd "$BACKEND_DIR"

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    error "Node.js bulunamadı! Lütfen Node.js kurun."
    exit 1
fi

# package.json kontrolü
if [ ! -f "package.json" ]; then
    error "package.json bulunamadı: $BACKEND_DIR"
    exit 1
fi

# node_modules kontrolü
if [ ! -d "node_modules" ]; then
    warning "node_modules bulunamadı, npm install çalıştırılıyor..."
    npm install
fi

# Backend'i başlat (nodemon ile hot reload)
log "Backend development server başlatılıyor (hot reload)..."
npm run dev 2>&1 | tee "$PROJECT_ROOT/logs/api_dev.log" &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

# Backend'in başladığını doğrula
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    error "Backend başlatılamadı!"
    exit 1
fi
success "Backend başlatıldı (PID: $BACKEND_PID)"

# Backend'in hazır olmasını bekle
log "⏳ Backend API hazır olması bekleniyor..."
for i in {1..30}; do
    if curl -s http://localhost:50001/api/health >/dev/null 2>&1; then
        success "Backend API hazır!"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Backend 30 saniye içinde hazır olmadı"
        exit 1
    fi
    sleep 1
done

success "Backend API: http://localhost:50001 (hot reload aktif)"

# Frontend başlatma
log "🎨 Frontend başlatılıyor (Angular 18)..."
cd "$FRONTEND_DIR"

# Angular CLI kontrolü
if ! command -v ng &> /dev/null; then
    warning "Angular CLI bulunamadı, global olarak kuruluyor..."
    npm install -g @angular/cli
fi

# Frontend package.json kontrolü
if [ ! -f "package.json" ]; then
    error "Frontend package.json bulunamadı: $FRONTEND_DIR"
    exit 1
fi

# Frontend node_modules kontrolü
if [ ! -d "node_modules" ]; then
    warning "Frontend node_modules bulunamadı, npm install çalıştırılıyor..."
    npm install
fi

# Frontend'i başlat
log "Frontend development server başlatılıyor (HMR)..."
ng serve --port 4200 --host 0.0.0.0 --open 2>&1 | tee "$PROJECT_ROOT/logs/frontend_dev.log" &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

# Angular'ın başladığını doğrula
sleep 2
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    error "Frontend başlatılamadı!"
    exit 1
fi
success "Frontend başlatıldı (PID: $FRONTEND_PID)"

# Frontend'in hazır olmasını bekle
log "⏳ Frontend hazır olması bekleniyor..."
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

success "Frontend: http://localhost:4200 (HMR aktif)"

# Başarı mesajı
echo -e "${GREEN}"
echo "=========================================="
echo "  🎉 Uygulama Başarıyla Başlatıldı!"
echo "=========================================="
echo -e "${NC}"
echo -e "Frontend:    ${BLUE}http://localhost:4200${NC} (tarayıcıda açıldı)"
echo -e "Backend API: ${BLUE}http://localhost:50001${NC}"
echo ""
echo -e "${PURPLE}🚀 Development Özellikleri:${NC}"
echo -e "  • Backend: Nodemon ile otomatik yeniden başlatma"
echo -e "  • Frontend: Angular HMR (Hot Module Replacement)"
echo -e "  • Dosya değişikliklerini otomatik algılama"
echo -e "  • Console log'ları: api/logs/"
echo ""
echo -e "${PURPLE}📚 Faydalı Komutlar:${NC}"
echo -e "  • Health check: curl http://localhost:50001/api/health"
echo -e "  • Database stats: cd api && node cli.js db:stats"
echo -e "  • Search: cd api && node cli.js search 'query'"
echo ""
echo -e "${YELLOW}Uygulamayı kapatmak için Ctrl+C tuşlayın${NC}"
echo ""

# Süreçleri izle
log "Development server'lar çalışıyor... (Ctrl+C ile kapatın)"

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

