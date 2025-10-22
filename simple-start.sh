#!/bin/bash

# Basit MAUI Başlatma Scripti
echo "🚀 PlaylistOrganizer MAUI Başlatılıyor..."

# .NET 8 PATH'ini ayarla
export PATH="$HOME/.dotnet:$PATH"
export DOTNET_ROOT="$HOME/.dotnet"
export MSBUILD_EXE_PATH="$HOME/.dotnet/sdk/8.0.400/MSBuild.dll"

# Proje dizinine git
cd "$(dirname "$0")"

echo "📋 .NET Versiyonu: $(dotnet --version)"

# Sadece MAUI projesini çalıştır (katman projeleri otomatik build olur)
echo "🎯 MAUI uygulaması başlatılıyor..."
echo "📱 Mac Catalyst'da debug mode'da çalışacak..."
echo "⏹️  Durdurmak için Ctrl+C tuşlayın."
echo ""

dotnet run --project src/dotnet/PlaylistOrganizer.Maui/PlaylistOrganizer.Maui.csproj -f net8.0-maccatalyst --configuration Debug
