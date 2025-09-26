# 🎵 Playlist Organizer - Full Stack Music Management System

## 📋 Proje Açıklaması
Müzik dosyalarını organize eden, M3U playlist'lerini düzenleyen ve VirtualDJ ile entegre çalışan full-stack uygulama.

## 🏗️ Proje Yapısı
```
PlaylistOrganizer-py/
├── package.json                 # Workspace ana yapılandırması
├── node_modules/               # Workspace bağımlılıkları
├── musicfiles.db              # Ana SQLite veritabanı
├── frontend/                   # Angular Frontend
│   ├── package.json
│   ├── node_modules/
│   └── src/
├── nodejs-api/                 # Node.js Backend API
│   ├── package.json
│   ├── node_modules/
│   ├── server-modular.js
│   └── modules/
└── docs/                       # Dokümantasyon
```

## 🚀 Hızlı Başlangıç

### Tüm Sistemi Başlat
```bash
npm run start:all
```

### Sadece Backend
```bash
npm start
# veya
npm run start:backend
```

### Sadece Frontend
```bash
npm run start:frontend
```

### Development Mode
```bash
npm run dev:all
```

## 📊 Sistem Durumu
```bash
npm run status
```

## 🔧 Geliştirme

### Bağımlılıkları Yükle
```bash
npm run install:all
```

### Temizle
```bash
npm run clean
```

## 🌐 Erişim
- **Backend API:** http://localhost:50001
- **Frontend:** http://localhost:4200
- **Health Check:** http://localhost:50001/api/health

## 📚 API Endpoints
- `/api/health` - Sistem durumu
- `/api/database/status` - Veritabanı durumu
- `/api/similarity/suggestions` - Benzerlik önerileri
- `/api/import/sessions` - Import oturumları

## 🗄️ Veritabanı
- **SQLite:** `musicfiles.db`
- **Tablo:** `music_files`, `tracks`, `similarity_fix_suggestions`
- **Views:** Optimize edilmiş eşleşme view'ları

## 🛠️ Teknolojiler
- **Frontend:** Angular 18
- **Backend:** Node.js + Express
- **Veritabanı:** SQLite3
- **Package Manager:** npm (Workspace)

## 📝 Notlar
- Workspace yapısı sayesinde tüm projeler tek yerden yönetilir
- Her alt proje kendi bağımlılıklarını korur
- Ana klasörden tüm komutlar çalıştırılabilir
