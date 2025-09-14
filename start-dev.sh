#!/bin/bash

# PlaylistOrganizer Development Mode Başlatma Script'i
# Node.js backend + Angular frontend development modunda çalıştırır (hot reload + nodemon)

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
BACKEND_PID_FILE="/tmp/playlist_organizer_backend_dev.pid"
FRONTEND_PID_FILE="/tmp/playlist_organizer_frontend_dev.pid"

# Temizlik fonksiyonu
cleanup() {
    log "🧹 Development süreçleri temizleniyor..."
    
    # Önce tüm ilgili süreçleri bul ve öldür
    log "Tüm ilgili süreçler taranıyor..."
    
    # Port 50001'de çalışan süreçleri bul ve öldür
    PORT_50001_PID=$(lsof -ti:50001 2>/dev/null || true)
    if [ ! -z "$PORT_50001_PID" ]; then
        log "Port 50001'de çalışan süreç bulundu (PID: $PORT_50001_PID), durduruluyor..."
        kill -9 "$PORT_50001_PID" 2>/dev/null || true
        sleep 1
    fi
    
    # Port 4200'de çalışan süreçleri bul ve öldür
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
    
    # Tüm ilgili süreçleri temizle (sadece Node.js)
    log "İlgili süreçler temizleniyor..."
    pkill -f "ng serve" 2>/dev/null || true
    
    # Node.js süreçlerini temizle
    pkill -f "node.*ng" 2>/dev/null || true
    pkill -f "node.*angular" 2>/dev/null || true
    pkill -f "nodemon.*server.js" 2>/dev/null || true
    # NOT: node.*server.js asla sonlandırma - nodemon sistemi
    
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
    
    success "Development süreçleri temizlendi"
}

# Hata yakalama
trap cleanup EXIT INT TERM

# Başlık
echo -e "${GREEN}"
echo "=========================================="
echo "  PlaylistOrganizer Development Mode"
echo "  🚀 Node.js + Angular + Nodemon"
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

# Backend development başlatma
log "🔧 Backend development server başlatılıyor (Node.js + nodemon)..."
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

# Backend'i development modunda başlat (nodemon ile)
log "Backend API development server başlatılıyor (hot reload)..."
nodemon server.js > "$PROJECT_ROOT/logs/backend_dev.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

# Backend'in hazır olmasını bekle
log "⏳ Backend development server'ın hazır olması bekleniyor..."
for i in {1..30}; do
    if curl -s http://localhost:50001/api/health >/dev/null 2>&1; then
        success "Backend development server hazır!"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Backend development server 30 saniye içinde hazır olmadı"
        exit 1
    fi
    sleep 1
done

success "Backend development server port 50001'de çalışıyor (hot reload aktif)"

# Frontend development başlatma
log "🎨 Frontend development server başlatılıyor (hot reload)..."
cd "$FRONTEND_DIR"

# Node modules kontrolü
if [ ! -d "node_modules" ]; then
    warning "node_modules bulunamadı, npm install çalıştırılıyor..."
    npm install
fi

# Frontend'i development modunda başlat (hot reload ile)
log "Frontend development server başlatılıyor (hot reload)..."
ng serve --port 4200 --host 0.0.0.0 --live-reload --watch --proxy-config proxy.conf.json > "$PROJECT_ROOT/logs/frontend_dev.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

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

# Başarı mesajı
echo -e "${GREEN}"
echo "=========================================="
echo "  🎉 Development Mode Başarıyla Başlatıldı!"
echo "=========================================="
echo -e "${NC}"
echo -e "Backend API: ${BLUE}http://localhost:50001${NC} (hot reload)"
echo -e "Frontend:    ${BLUE}http://localhost:4200${NC} (hot reload)"
echo -e "API Port:    ${BLUE}50001${NC}"
echo ""
echo -e "${PURPLE}🚀 Development Özellikleri:${NC}"
echo -e "  • Backend: Node.js + Nodemon ile otomatik yeniden başlatma"
echo -e "  • Frontend: Angular hot reload"
echo -e "  • Dosya değişikliklerini otomatik algılama"
echo -e "  • Geliştirici konsolu logları aktif"
echo -e "  • Python kodu tamamen kaldırıldı - sadece Node.js"
echo ""
echo -e "${YELLOW}Uygulamayı kapatmak için Ctrl+C tuşlayın${NC}"
echo ""

# Tarayıcıyı aç
log "🌐 Tarayıcı açılıyor..."
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
log "Development server'lar çalışıyor... (Ctrl+C ile kapatın)"
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
    
    sleep 5
done

# Temizlik
cleanup
