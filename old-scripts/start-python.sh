#!/bin/bash

# PlaylistOrganizer - Hızlı Başlatma Script'i
# Kullanım: ./start.sh

echo "🚀 PlaylistOrganizer başlatılıyor..."
echo ""

# Mevcut süreçleri temizle
echo "🧹 Önceki süreçler temizleniyor..."
pkill -f "ng serve" 2>/dev/null || true
pkill -f "python apiserver.py" 2>/dev/null || true

# Backend başlat
echo "🔧 Backend başlatılıyor..."
cd /Users/koray/projects/PlaylistOrganizer-py/py
source .venv/bin/activate
python apiserver.py &
BACKEND_PID=$!

# Backend'in hazır olmasını bekle
echo "⏳ Backend hazır olması bekleniyor..."
for i in {1..30}; do
    if curl -s http://localhost:50001/api/port >/dev/null 2>&1; then
        echo "✅ Backend port 50001'de çalışıyor"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend başlatılamadı"
        exit 1
    fi
    sleep 1
done

# Frontend başlat
echo "🎨 Frontend başlatılıyor..."
cd /Users/koray/projects/PlaylistOrganizer-py/frontend
ng serve --port 4200 --proxy-config proxy.conf.json &
FRONTEND_PID=$!

# Frontend'in hazır olmasını bekle
echo "⏳ Frontend hazır olması bekleniyor..."
sleep 10

# Tarayıcıyı aç
echo "🌐 Tarayıcı açılıyor..."
open "http://localhost:4200"

echo ""
echo "🎉 Uygulama başarıyla başlatıldı!"
echo "📱 Frontend: http://localhost:4200"
echo "🔧 Backend API: http://localhost:50001"
echo ""
echo "💡 Uygulamayı kapatmak için Ctrl+C tuşlayın"

# Süreçleri izle
trap "echo '🛑 Uygulama kapatılıyor...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
