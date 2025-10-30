#!/bin/bash

# Import progress test script
# Arka planda çalıştır ve 1 saniyede bir log analizi yap

cd "$(dirname "$0")/PlaylistOrganizerAvalonia" || exit 1

LOG_FILE="../logs/import_progress_$(date +%Y%m%d_%H%M%S).log"

echo "🚀 Import başlatılıyor (arka planda)..."
echo "📝 Log dosyası: $LOG_FILE"
echo ""

# Arka planda çalıştır
dotnet run --test-import-progress > "$LOG_FILE" 2>&1 &
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

