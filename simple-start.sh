#!/bin/bash

# SwiftUI PlaylistOrganizer Başlatma Scripti
echo "🚀 PlaylistOrganizer SwiftUI Başlatılıyor..."

# Proje dizinine git
cd "$(dirname "$0")"

# Xcode projesi dizinine git
cd xcode/PlaylistOrganizer

echo "📋 Xcode Projesi: PlaylistOrganizer"
echo "🖥️  macOS uygulaması başlatılıyor..."
echo "⏹️  Durdurmak için Ctrl+C tuşlayın."
echo ""

# Xcode projesini build ve run et
echo "🔨 Proje build ediliyor..."
xcodebuild -project PlaylistOrganizer.xcodeproj -scheme PlaylistOrganizer -configuration Debug build

if [ $? -eq 0 ]; then
    echo "✅ Build başarılı!"
    echo "🎯 Uygulama başlatılıyor..."
    
    # Build edilen uygulamayı bul ve çalıştır
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "PlaylistOrganizer.app" -path "*/Build/Products/Debug/*" -exec test -f {}/Contents/MacOS/PlaylistOrganizer \; -print | head -1)
    
    if [ -n "$APP_PATH" ]; then
        echo "📱 Uygulama bulundu: $APP_PATH"
        echo "🚀 Uygulama başlatılıyor..."
        open "$APP_PATH"
        echo "✅ Uygulama başlatıldı! Pencere açılmalı."
    else
        echo "❌ Uygulama bulunamadı!"
        echo "🔍 Manuel olarak Xcode'da çalıştırabilirsiniz:"
        echo "   xcodebuild -project PlaylistOrganizer.xcodeproj -scheme PlaylistOrganizer -configuration Debug -destination 'platform=macOS' run"
    fi
else
    echo "❌ Build başarısız!"
    exit 1
fi