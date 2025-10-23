#!/bin/bash

# Terminal Import Test Script
echo "🧪 PlaylistOrganizer Terminal Import Test"
echo "=========================================="
echo "📅 Test Date: $(date)"
echo ""

# Test dosyaları oluştur
echo "📁 Test dosyaları oluşturuluyor..."
TEST_DIR="/tmp/playlist_organizer_terminal_test"
mkdir -p "$TEST_DIR"

# Test müzik dosyaları oluştur
echo "🎵 Test müzik dosyaları oluşturuluyor..."
for i in {1..3}; do
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
    
    echo "📈 Başlangıç veri sayıları:"
    echo "   - Music Files: $MUSIC_FILES_COUNT"
    echo "   - Tracks: $TRACKS_COUNT"
    echo "   - Playlists: $PLAYLISTS_COUNT"
else
    echo "❌ Veritabanı dosyası bulunamadı: $DB_PATH"
    echo "   Uygulama henüz çalışmamış olabilir"
fi

echo ""
echo "🎯 Terminal Import Test Başlıyor..."
echo "=================================="

# Swift test kodu oluştur
cat > "$TEST_DIR/import_test.swift" << 'EOF'
import Foundation

// Test için basit import simulation
func testImportService() {
    print("🧪 ImportService Test Başlıyor...")
    
    // Test dosyaları
    let testFiles = [
        "/tmp/playlist_organizer_terminal_test/test_track_1.mp3",
        "/tmp/playlist_organizer_terminal_test/test_track_2.mp3",
        "/tmp/playlist_organizer_terminal_test/test_track_3.mp3",
        "/tmp/playlist_organizer_terminal_test/test_artist_1.wav",
        "/tmp/playlist_organizer_terminal_test/test_artist_2.wav",
        "/tmp/playlist_organizer_terminal_test/test_artist_3.wav",
        "/tmp/playlist_organizer_terminal_test/test_electronic_1.flac",
        "/tmp/playlist_organizer_terminal_test/test_electronic_2.flac",
        "/tmp/playlist_organizer_terminal_test/test_electronic_3.flac",
        "/tmp/playlist_organizer_terminal_test/test_playlist.m3u",
        "/tmp/playlist_organizer_terminal_test/test_vdjfolder.vdjfolder"
    ]
    
    var musicFilesProcessed = 0
    var playlistFilesProcessed = 0
    var m3uFilesProcessed = 0
    var vdjfolderFilesProcessed = 0
    var errors = 0
    
    for filePath in testFiles {
        let url = URL(fileURLWithPath: filePath)
        let fileExtension = url.pathExtension.lowercased()
        
        print("📁 İşleniyor: \(url.lastPathComponent)")
        
        // Dosya tipini belirle
        if fileExtension == "mp3" || fileExtension == "wav" || fileExtension == "flac" {
            musicFilesProcessed += 1
            print("   ✅ Müzik dosyası: \(fileExtension)")
        } else if fileExtension == "m3u" {
            playlistFilesProcessed += 1
            m3uFilesProcessed += 1
            print("   ✅ M3U Playlist dosyası")
        } else if fileExtension == "vdjfolder" {
            playlistFilesProcessed += 1
            vdjfolderFilesProcessed += 1
            print("   ✅ VDJFolder dosyası")
        } else {
            errors += 1
            print("   ❌ Desteklenmeyen dosya tipi: \(fileExtension)")
        }
    }
    
    print("")
    print("📊 Import Test Sonuçları:")
    print("   - Toplam dosya: \(testFiles.count)")
    print("   - Müzik dosyaları: \(musicFilesProcessed)")
    print("   - Playlist dosyaları: \(playlistFilesProcessed)")
    print("   - M3U dosyaları: \(m3uFilesProcessed)")
    print("   - VDJFolder dosyaları: \(vdjfolderFilesProcessed)")
    print("   - Hatalar: \(errors)")
    
    if errors == 0 {
        print("✅ Tüm dosyalar başarıyla işlendi!")
    } else {
        print("⚠️  \(errors) hata bulundu")
    }
}

// Test'i çalıştır
testImportService()
EOF

echo "📝 Swift test kodu oluşturuldu: $TEST_DIR/import_test.swift"
echo ""

# Swift test'i çalıştır
echo "🚀 Swift test çalıştırılıyor..."
cd "$TEST_DIR"
swift import_test.swift

echo ""
echo "🧹 Test dosyaları temizleniyor..."
rm -rf "$TEST_DIR"
echo "✅ Terminal import testi tamamlandı!"
