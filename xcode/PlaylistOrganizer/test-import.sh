#!/bin/bash

# Import Test Script
echo "🧪 PlaylistOrganizer Import Test"
echo "================================="
echo "📅 Test Date: $(date)"
echo ""

# Test dosyaları oluştur
echo "📁 Test dosyaları oluşturuluyor..."
TEST_DIR="/tmp/playlist_organizer_test"
mkdir -p "$TEST_DIR"

# Test müzik dosyaları oluştur (dummy files)
echo "🎵 Test müzik dosyaları oluşturuluyor..."
for i in {1..5}; do
    echo "Test Track $i" > "$TEST_DIR/test_track_$i.mp3"
    echo "Test Artist $i" > "$TEST_DIR/test_artist_$i.wav"
    echo "Test Electronic $i" > "$TEST_DIR/test_electronic_$i.flac"
done

# Test playlist dosyaları oluştur
echo "📋 Test playlist dosyaları oluşturuluyor..."
echo "#EXTM3U" > "$TEST_DIR/test_playlist.m3u"
echo "#EXTINF:123,Test Track 1" >> "$TEST_DIR/test_playlist.m3u"
echo "/path/to/test_track_1.mp3" >> "$TEST_DIR/test_playlist.m3u"
echo "#EXTINF:456,Test Track 2" >> "$TEST_DIR/test_playlist.m3u"
echo "/path/to/test_track_2.mp3" >> "$TEST_DIR/test_playlist.m3u"

echo "<?xml version=\"1.0\"?>" > "$TEST_DIR/test_vdjfolder.vdjfolder"
echo "<VirtualDJ_Folder>" >> "$TEST_DIR/test_vdjfolder.vdjfolder"
echo "  <Entry Name=\"Test Track 1\" FileName=\"test_track_1.mp3\" />" >> "$TEST_DIR/test_vdjfolder.vdjfolder"
echo "  <Entry Name=\"Test Track 2\" FileName=\"test_track_2.mp3\" />" >> "$TEST_DIR/test_vdjfolder.vdjfolder"
echo "</VirtualDJ_Folder>" >> "$TEST_DIR/test_vdjfolder.vdjfolder"

echo "✅ Test dosyaları oluşturuldu: $TEST_DIR"
echo ""

# Veritabanı durumunu kontrol et
echo "📊 Veritabanı durumu kontrol ediliyor..."
DB_PATH="$HOME/Library/Containers/com.djkoray01.PlaylistOrganizer/Data/Documents/playlist_organizer_swiftui.db"

if [ -f "$DB_PATH" ]; then
    echo "✅ Veritabanı dosyası mevcut: $DB_PATH"
    
    # Tablo sayılarını kontrol et
    MUSIC_FILES_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM music_files;" 2>/dev/null || echo "0")
    TRACKS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM tracks;" 2>/dev/null || echo "0")
    PLAYLISTS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM playlists;" 2>/dev/null || echo "0")
    
    # M3U ve VDJFolder sayılarını kontrol et
    M3U_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM playlists WHERE type = 'm3u';" 2>/dev/null || echo "0")
    VDJFOLDER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM playlists WHERE type = 'vdjfolder';" 2>/dev/null || echo "0")
    
    echo "📈 Mevcut veri sayıları:"
    echo "   - Music Files: $MUSIC_FILES_COUNT"
    echo "   - Tracks: $TRACKS_COUNT"
    echo "   - Playlists: $PLAYLISTS_COUNT"
    echo "   - M3U Playlists: $M3U_COUNT"
    echo "   - VDJFolder Playlists: $VDJFOLDER_COUNT"
else
    echo "❌ Veritabanı dosyası bulunamadı: $DB_PATH"
    echo "   Uygulama henüz çalışmamış olabilir"
fi

echo ""
echo "🎯 Import testi için:"
echo "1. Uygulamayı açın"
echo "2. 'Müzik Dosyaları Import Et' butonuna tıklayın"
echo "3. Test dosyalarını seçin: $TEST_DIR"
echo "4. Import işlemini tamamlayın"
echo "5. Bu scripti tekrar çalıştırın: ./test-import.sh"
echo ""

# Test dosyalarını listele
echo "📋 Test dosyaları:"
ls -la "$TEST_DIR"
echo ""

echo "⏳ Import işlemi tamamlandıktan sonra 'y' yazın ve Enter'a basın..."
read -p "Import tamamlandı mı? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Import sonrası veritabanı durumu kontrol ediliyor..."
    
    if [ -f "$DB_PATH" ]; then
        NEW_MUSIC_FILES_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM music_files;" 2>/dev/null || echo "0")
        NEW_TRACKS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM tracks;" 2>/dev/null || echo "0")
        NEW_PLAYLISTS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM playlists;" 2>/dev/null || echo "0")
        NEW_M3U_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM playlists WHERE type = 'm3u';" 2>/dev/null || echo "0")
        NEW_VDJFOLDER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM playlists WHERE type = 'vdjfolder';" 2>/dev/null || echo "0")
        
        echo "📈 Yeni veri sayıları:"
        echo "   - Music Files: $NEW_MUSIC_FILES_COUNT"
        echo "   - Tracks: $NEW_TRACKS_COUNT"
        echo "   - Playlists: $NEW_PLAYLISTS_COUNT"
        echo "   - M3U Playlists: $NEW_M3U_COUNT"
        echo "   - VDJFolder Playlists: $NEW_VDJFOLDER_COUNT"
        echo ""
        
        # Karşılaştırma
        echo "📊 Karşılaştırma:"
        echo "   - Music Files: $MUSIC_FILES_COUNT → $NEW_MUSIC_FILES_COUNT (+$((NEW_MUSIC_FILES_COUNT - MUSIC_FILES_COUNT)))"
        echo "   - Tracks: $TRACKS_COUNT → $NEW_TRACKS_COUNT (+$((NEW_TRACKS_COUNT - TRACKS_COUNT)))"
        echo "   - Playlists: $PLAYLISTS_COUNT → $NEW_PLAYLISTS_COUNT (+$((NEW_PLAYLISTS_COUNT - PLAYLISTS_COUNT)))"
        echo "   - M3U Playlists: $M3U_COUNT → $NEW_M3U_COUNT (+$((NEW_M3U_COUNT - M3U_COUNT)))"
        echo "   - VDJFolder Playlists: $VDJFOLDER_COUNT → $NEW_VDJFOLDER_COUNT (+$((NEW_VDJFOLDER_COUNT - VDJFOLDER_COUNT)))"
        
        if [ "$NEW_MUSIC_FILES_COUNT" -gt "$MUSIC_FILES_COUNT" ]; then
            echo "✅ Import başarılı! Yeni veriler eklendi."
        else
            echo "⚠️  Import sonucu belirsiz. Veri artışı görülmedi."
        fi
    else
        echo "❌ Veritabanı dosyası hala bulunamadı"
    fi
else
    echo "⏳ Import işlemi devam ediyor..."
fi

echo ""
echo "🧹 Test dosyaları temizleniyor..."
rm -rf "$TEST_DIR"
echo "✅ Test tamamlandı!"
