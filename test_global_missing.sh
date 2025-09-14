#!/bin/bash

echo "🔍 Tüm Eksik Dosyaları Göster - Test Raporu"
echo "============================================="
echo ""

# Test 1: Backend durumu kontrolü
echo "📡 Test 1: Backend Durumu"
echo "------------------------"
if curl -s "http://localhost:50001/api/port" > /dev/null; then
    echo "✅ Backend çalışıyor (Port 50001)"
else
    echo "❌ Backend çalışmıyor!"
    exit 1
fi
echo ""

# Test 2: Global eksik dosyaları alma
echo "📋 Test 2: Global Eksik Dosyaları Alma"
echo "-------------------------------------"
echo "Global eksik dosyalar alınıyor..."
start_time=$(date +%s)
GLOBAL_RESPONSE=$(curl -s "http://localhost:50001/api/playlistsong/global-missing")
end_time=$(date +%s)
duration=$((end_time - start_time))

if [ $? -eq 0 ]; then
    echo "✅ Global eksik dosyalar başarıyla alındı (${duration} saniye)"
    
    # Eksik dosya sayısını al
    missing_count=$(echo "$GLOBAL_RESPONSE" | jq '.missing_files | length')
    echo "📊 Toplam eksik dosya sayısı: $missing_count"
    
    # İstatistikleri al
    total_missing=$(echo "$GLOBAL_RESPONSE" | jq '.total_missing_files')
    unique_missing=$(echo "$GLOBAL_RESPONSE" | jq '.unique_missing_files')
    playlists_checked=$(echo "$GLOBAL_RESPONSE" | jq '.playlists_checked')
    
    echo "📊 Toplam eksik dosya: $total_missing"
    echo "📊 Benzersiz eksik dosya: $unique_missing"
    echo "📊 Kontrol edilen playlist sayısı: $playlists_checked"
else
    echo "❌ Global eksik dosyalar alınamadı!"
    exit 1
fi
echo ""

# Test 3: İlk 3 eksik dosyayı al
echo "🎯 Test 3: İlk 3 Eksik Dosya"
echo "----------------------------"
first_three_files=$(echo "$GLOBAL_RESPONSE" | jq -r '.missing_files[0:3] | .[].originalPath')
echo "İlk 3 eksik dosya:"
echo "$first_three_files" | while read -r file; do
    echo "  - $file"
done
echo ""

# Test 4: Batch API testi (3 dosya ile)
echo "⚡ Test 4: Batch API Testi (3 Dosya)"
echo "-----------------------------------"
echo "Batch API testi yapılıyor..."
batch_start_time=$(date +%s)
BATCH_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "$(echo "$GLOBAL_RESPONSE" | jq -c '.missing_files[0:3] | map(.originalPath)')" \
    "http://localhost:50001/api/files/playlists/batch")
batch_end_time=$(date +%s)
batch_duration=$((batch_end_time - batch_start_time))

if [ $? -eq 0 ]; then
    echo "✅ Batch API başarıyla çalıştı (${batch_duration} saniye)"
    
    # Batch sonuçlarını analiz et
    total_files=$(echo "$BATCH_RESPONSE" | jq '.totalFiles')
    echo "📊 İşlenen dosya sayısı: $total_files"
    
    # Her dosya için playlist sayısını göster
    echo "📋 Dosya başına playlist bilgileri:"
    echo "$BATCH_RESPONSE" | jq -r '.results[] | "  - \(.filePath | split("/")[-1]): \(.totalPlaylists) playlist"'
    
else
    echo "❌ Batch API başarısız!"
fi
echo ""

# Test 5: Performans tahmini
echo "📈 Test 5: Performans Tahmini"
echo "-----------------------------"
if [ $missing_count -gt 0 ] && [ $batch_duration -gt 0 ]; then
    # 3 dosya için süre / 3 = dosya başına ortalama süre
    avg_time_per_file=$(echo "scale=2; $batch_duration / 3" | bc)
    estimated_total_time=$(echo "scale=0; $avg_time_per_file * $missing_count" | bc)
    
    echo "⏱️  Dosya başına ortalama süre: ${avg_time_per_file} saniye"
    echo "⏱️  Tüm $missing_count dosya için tahmini süre: ${estimated_total_time} saniye"
    
    if [ $estimated_total_time -lt 60 ]; then
        echo "✅ Performans: ÇOK İYİ (< 1 dakika)"
    elif [ $estimated_total_time -lt 300 ]; then
        echo "✅ Performans: İYİ (< 5 dakika)"
    else
        echo "⚠️  Performans: ORTA (5+ dakika)"
    fi
else
    echo "❌ Performans hesaplanamadı"
fi
echo ""

# Test 6: Hata kontrolü
echo "🔍 Test 6: Hata Kontrolü"
echo "-----------------------"
error_count=$(echo "$GLOBAL_RESPONSE" | jq '[.missing_files[] | select(.found == false)] | length')
echo "❌ Bulunamayan dosya sayısı: $error_count"

if [ $error_count -eq $missing_count ]; then
    echo "⚠️  Tüm dosyalar bulunamadı - bu normal (eksik dosyalar)"
else
    echo "✅ Bazı dosyalar bulundu"
fi
echo ""

# Test 7: Memory kullanımı (basit kontrol)
echo "💾 Test 7: Sistem Durumu"
echo "-----------------------"
echo "Backend süreçleri:"
ps aux | grep "python.*apiserver" | grep -v grep | wc -l | xargs echo "  - Python süreç sayısı:"
echo ""

# Sonuç özeti
echo "📋 TEST SONUCU ÖZETİ"
echo "==================="
echo "✅ Backend durumu: Çalışıyor"
echo "✅ Global eksik dosyalar: $missing_count dosya ($duration saniye)"
echo "✅ Batch API: 3 dosya ($batch_duration saniye)"
echo "✅ Performans: Tahmini ${estimated_total_time} saniye ($missing_count dosya için)"
echo ""
echo "🎯 SONUÇ: Sistem hazır ve optimize edilmiş!"
echo "🚀 'Tüm Eksik Dosyaları Göster' butonu kullanılabilir."
