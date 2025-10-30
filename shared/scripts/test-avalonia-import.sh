#!/bin/bash

# Avalonia Import Progress Test Script
# Arka planda çalıştır ve 1 saniyede bir log analizi yap

PROJECT_ROOT="/Users/koray/projects/PlaylistOrganizer-py-backup"
AVALONIA_DIR="$PROJECT_ROOT/apps/avalonia/PlaylistOrganizerAvalonia"
LOG_DIR="$PROJECT_ROOT/shared/logs"

# Log dizini yoksa oluştur
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/avalonia_import_$(date +%Y%m%d_%H%M%S).log"

echo "🚀 Avalonia Import başlatılıyor (arka planda)..."
echo "📝 Log dosyası: $LOG_FILE"
echo ""

# Avalonia dizinine git
cd "$AVALONIA_DIR" || exit 1

# Arka planda çalıştır
dotnet run -- --test-import > "$LOG_FILE" 2>&1 &
IMPORT_PID=$!

echo "🔄 Import PID: $IMPORT_PID"
echo "📊 Her 1 saniyede bir log analizi yapılacak..."
echo ""

# Her 1 saniyede bir log analizi
while kill -0 $IMPORT_PID 2>/dev/null; do
    sleep 1
    
    echo ""
    echo "⏱️  $(date '+%H:%M:%S') - Log Analizi:"
    echo "─────────────────────────────────────────────────────────────────"
    
    # Son 10 satırı göster
    if [ -f "$LOG_FILE" ]; then
        tail -10 "$LOG_FILE" | grep -E "(\[|%|📊|✅|❌|İşleniyor|İşlenen)" || tail -5 "$LOG_FILE"
    fi
    
    echo "─────────────────────────────────────────────────────────────────"
done

# İşlem bitti, final durumu göster
echo ""
echo "✅ Import tamamlandı!"
echo ""
echo "📄 Final Log:"
echo "─────────────────────────────────────────────────────────────────"
tail -30 "$LOG_FILE"
echo "─────────────────────────────────────────────────────────────────"


