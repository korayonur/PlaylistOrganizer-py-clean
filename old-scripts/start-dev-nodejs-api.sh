#!/bin/bash

# PlaylistOrganizer Full Development Mode Başlatma Script'i
# Backend (Node.js + Nodemon) ve Frontend (Angular) development server'larını başlatır

set -e  # Hata durumunda script'i durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Proje dizinlerini tanımla
PROJECT_ROOT="/Users/koray/projects/PlaylistOrganizer-py"
BACKEND_DIR="$PROJECT_ROOT/nodejs-api"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# PID dosyaları
BACKEND_PID_FILE="/tmp/playlist_organizer_api_dev.pid"
FRONTEND_PID_FILE="/tmp/playlist_organizer_frontend_dev.pid"

# Temizlik fonksiyonu
cleanup() {
    log "🧹 Development süreçleri temizleniyor..."
    
    # Port 50001 (Backend API) temizliği
    PORT_50001_PID=$(lsof -ti:50001 2>/dev/null || true)
    if [ ! -z "$PORT_50001_PID" ]; then
        log "Port 50001'de çalışan süreç bulundu (PID: $PORT_50001_PID), durduruluyor..."
        kill -9 "$PORT_50001_PID" 2>/dev/null || true
        sleep 1
    fi
    
    # Port 4200 (Frontend) temizliği
    PORT_4200_PID=$(lsof -ti:4200 2>/dev/null || true)
    if [ ! -z "$PORT_4200_PID" ]; then
        log "Port 4200'de çalışan süreç bulundu (PID: $PORT_4200_PID), durduruluyor..."
        kill -9 "$PORT_4200_PID" 2>/dev/null || true
        sleep 1
    fi
    
    # Backend'i durdur
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            log "Backend development server durduruluyor (PID: $BACKEND_PID)..."
            kill -9 "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Frontend'i durdur
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log "Frontend development server durduruluyor (PID: $FRONTEND_PID)..."
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Nodemon ve ng serve süreçlerini temizle
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "ng serve" 2>/dev/null || true
    pkill -f "@angular/cli" 2>/dev/null || true
    
    # PlaylistOrganizer ile ilgili tüm Node.js süreçlerini temizle
    pkill -f "node.*server-modular" 2>/dev/null || true
    pkill -f "node.*PlaylistOrganizer" 2>/dev/null || true
    pkill -f "node.*playlist" 2>/dev/null || true
    pkill -f "node.*music" 2>/dev/null || true
    
    # Proje dizininde çalışan tüm Node.js süreçlerini temizle
    pkill -f "node.*$PROJECT_ROOT" 2>/dev/null || true
    pkill -f "node.*$BACKEND_DIR" 2>/dev/null || true
    pkill -f "node.*$FRONTEND_DIR" 2>/dev/null || true
    
    # 2 saniye bekle
    sleep 2
    
    # Son kontrol - hala çalışan süreçler var mı?
    REMAINING_50001=$(lsof -ti:50001 2>/dev/null || true)
    REMAINING_4200=$(lsof -ti:4200 2>/dev/null || true)
    
    if [ ! -z "$REMAINING_50001" ]; then
        warning "Port 50001 hala kullanımda (PID: $REMAINING_50001), zorla durduruluyor..."
        kill -9 "$REMAINING_50001" 2>/dev/null || true
    fi
    
    if [ ! -z "$REMAINING_4200" ]; then
        warning "Port 4200 hala kullanımda (PID: $REMAINING_4200), zorla durduruluyor..."
        kill -9 "$REMAINING_4200" 2>/dev/null || true
    fi
    
    # Nodemon süreçlerini son kontrol et
    REMAINING_NODEMON_PIDS=$(pgrep -f "nodemon" 2>/dev/null || true)
    if [ ! -z "$REMAINING_NODEMON_PIDS" ]; then
        warning "Kalan Nodemon süreçleri bulundu: $REMAINING_NODEMON_PIDS"
        for pid in $REMAINING_NODEMON_PIDS; do
            warning "Nodemon süreci zorla durduruluyor (PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
        done
    fi
    
    # ng serve süreçlerini son kontrol et
    REMAINING_NG_PIDS=$(pgrep -f "ng serve" 2>/dev/null || true)
    if [ ! -z "$REMAINING_NG_PIDS" ]; then
        warning "Kalan Angular CLI süreçleri bulundu: $REMAINING_NG_PIDS"
        for pid in $REMAINING_NG_PIDS; do
            warning "Angular CLI süreci zorla durduruluyor (PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
        done
    fi
    
    success "Development süreçleri temizlendi"
}

# Hata yakalama
trap cleanup EXIT INT TERM

# Başlık
echo -e "${GREEN}"
echo "=========================================="
echo "  PlaylistOrganizer Full Development Mode"
echo "  🚀 Backend + Frontend (Hot Reload)"
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
log "Önceki development süreçleri temizleniyor..."
cleanup

# Ek güvenlik - port kontrolü yap
log "🔍 Port kontrolü yapılıyor..."

# Port 50001 (Backend) kontrolü
PORT_50001_PID=$(lsof -ti:50001 2>/dev/null || true)
if [ ! -z "$PORT_50001_PID" ]; then
    warning "Port 50001'de çalışan süreç bulundu (PID: $PORT_50001_PID), durduruluyor..."
    kill -9 "$PORT_50001_PID" 2>/dev/null || true
    sleep 2
fi

# Port 4200 (Frontend) kontrolü
PORT_4200_PID=$(lsof -ti:4200 2>/dev/null || true)
if [ ! -z "$PORT_4200_PID" ]; then
    warning "Port 4200'de çalışan süreç bulundu (PID: $PORT_4200_PID), durduruluyor..."
    kill -9 "$PORT_4200_PID" 2>/dev/null || true
    sleep 2
fi

# API development başlatma
log "🔧 API development server başlatılıyor (Node.js + nodemon)..."
cd "$BACKEND_DIR"

# Node.js ve npm kontrolü
if ! command -v node &> /dev/null; then
    error "Node.js bulunamadı. Lütfen Node.js'i kurun."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    error "npm bulunamadı. Lütfen npm'i kurun."
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

# Nodemon kurulu mu kontrol et
if ! command -v nodemon &> /dev/null; then
    warning "Nodemon bulunamadı, global olarak kuruluyor..."
    npm install -g nodemon
fi

# Nodemon konfigürasyonu zaten mevcut (modüler yapı için)
log "🔧 Nodemon konfigürasyonu kontrol ediliyor..."
if [ ! -f "$BACKEND_DIR/nodemon.json" ]; then
    error "nodemon.json bulunamadı! Modüler yapı için gerekli."
    exit 1
fi
success "Nodemon konfigürasyonu mevcut"

# API'yi development modunda başlat (nodemon ile)
log "API development server başlatılıyor (hot reload)..."
# Console çıktılarını ekranda göster, aynı zamanda log dosyasına da yaz
# Nodemon'u konfigürasyon dosyası ile başlat (modüler server)
nodemon 2>&1 | tee "$PROJECT_ROOT/logs/api_dev.log" &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

# Nodemon'un başladığını doğrula
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    error "Nodemon başlatılamadı!"
    exit 1
fi
success "Nodemon başlatıldı (PID: $BACKEND_PID)"

# API'nin hazır olmasını bekle
log "⏳ API development server'ın hazır olması bekleniyor..."
for i in {1..30}; do
    if curl -s http://localhost:50001/api/health >/dev/null 2>&1; then
        success "API development server hazır!"
        break
    fi
    if [ $i -eq 30 ]; then
        error "API development server 30 saniye içinde hazır olmadı"
        exit 1
    fi
    sleep 1
done

success "Backend development server port 50001'de çalışıyor (hot reload aktif)"

# ============================================================
# FRONTEND BAŞLATMA (Angular)
# ============================================================
log "🎨 Frontend development server başlatılıyor (Angular)..."
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

# Frontend'i development modunda başlat
log "Frontend development server başlatılıyor (hot reload)..."
ng serve --port 4200 --host 0.0.0.0 --open 2>&1 | tee "$PROJECT_ROOT/logs/frontend_dev.log" &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

# Angular'ın başladığını doğrula
sleep 2
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    error "Angular development server başlatılamadı!"
    exit 1
fi
success "Angular development server başlatıldı (PID: $FRONTEND_PID)"

# Frontend'in hazır olmasını bekle
log "⏳ Frontend development server'ın hazır olması bekleniyor..."
for i in {1..60}; do
    if curl -s http://localhost:4200 >/dev/null 2>&1; then
        success "Frontend development server hazır!"
        break
    fi
    if [ $i -eq 60 ]; then
        error "Frontend development server 60 saniye içinde hazır olmadı"
        exit 1
    fi
    sleep 1
done

success "Frontend development server port 4200'de çalışıyor (hot reload aktif)"

# Başarı mesajı
echo -e "${GREEN}"
echo "=========================================="
echo "  🎉 Full Development Mode Başarıyla Başlatıldı!"
echo "=========================================="
echo -e "${NC}"
echo -e "Frontend:    ${BLUE}http://localhost:4200${NC} (hot reload, tarayıcıda açıldı)"
echo -e "Backend API: ${BLUE}http://localhost:50001${NC} (hot reload)"
echo ""
echo -e "${PURPLE}🚀 Development Özellikleri:${NC}"
echo -e "  • Backend: Node.js + Nodemon ile otomatik yeniden başlatma"
echo -e "  • Frontend: Angular CLI ile hot module replacement"
echo -e "  • Dosya değişikliklerini otomatik algılama"
echo -e "  • Geliştirici konsolu logları aktif"
echo -e "  • Backend manuel yeniden başlatma: 'rs' yazıp Enter"
echo ""
echo -e "${YELLOW}Uygulamayı kapatmak için Ctrl+C tuşlayın${NC}"
echo ""

# Süreçleri izle
log "Development server'lar çalışıyor... (Ctrl+C ile kapatın)"
log "💡 Backend: Nodemon - dosya değişikliklerini otomatik algılar"
log "💡 Frontend: Angular CLI - hot module replacement aktif"
log "💡 Backend manuel yeniden başlatma için: 'rs' yazıp Enter'a basın"

while true; do
    # Backend kontrolü
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
            error "Backend development server beklenmedik şekilde durdu"
            break
        fi
    fi
    
    # Frontend kontrolü
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
            error "Frontend development server beklenmedik şekilde durdu"
            break
        fi
    fi
    
    # Nodemon durumunu kontrol et
    NODEMON_PID=$(pgrep -f "nodemon" 2>/dev/null || true)
    if [ -z "$NODEMON_PID" ]; then
        warning "Nodemon durdu, yeniden başlatılıyor..."
        cd "$BACKEND_DIR"
        nodemon 2>&1 | tee "$PROJECT_ROOT/logs/api_dev.log" &
        NEW_BACKEND_PID=$!
        echo $NEW_BACKEND_PID > "$BACKEND_PID_FILE"
        success "Nodemon yeniden başlatıldı (PID: $NEW_BACKEND_PID)"
    fi
    
    # Angular CLI durumunu kontrol et
    NG_PID=$(pgrep -f "ng serve" 2>/dev/null || true)
    if [ -z "$NG_PID" ]; then
        warning "Angular CLI durdu, yeniden başlatılıyor..."
        cd "$FRONTEND_DIR"
        ng serve --port 4200 --host 0.0.0.0 2>&1 | tee "$PROJECT_ROOT/logs/frontend_dev.log" &
        NEW_FRONTEND_PID=$!
        echo $NEW_FRONTEND_PID > "$FRONTEND_PID_FILE"
        success "Angular CLI yeniden başlatıldı (PID: $NEW_FRONTEND_PID)"
    fi
    
    sleep 5
done

# Temizlik
cleanup
