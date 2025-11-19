# 🎵 Playlist Organizer - Desktop Application

**Versiyon:** 2.0 (Avalonia Desktop App)  
**Son Güncelleme:** 19 Kasım 2025  
**Durum:** 🚧 Aktif Geliştirme (Phase 2: Fix System)

## 📋 Genel Bakış

Müzik playlist'lerini ve track'leri yönetmek için modern, çapraz platform masaüstü uygulaması. Windows, macOS ve Linux desteği için Avalonia UI framework ile geliştirilmiştir.

**Güncel Odak:** Gelişmiş playlist yönetimi, track arama ve eksik dosya tespiti ile masaüstü öncelikli deneyim.

## 🏗️ Project Structure

```
PlaylistOrganizer-py-backup/
├── apps/
│   ├── avalonia/                    # Avalonia Desktop App (Active)
│   │   └── PlaylistOrganizerAvalonia/
│   │       ├── Application/          # Business logic & services
│   │       │   ├── Models/           # Data models
│   │       │   └── Services/        # PlaylistTreeService, VDJFolderParser, etc.
│   │       ├── Domain/               # Domain entities & enums
│   │       ├── Infrastructure/       # Database, file system, logging
│   │       ├── ViewModels/           # MVVM view models
│   │       └── Views/                # Avalonia UI views
│   └── old-nodejs-api/              # Legacy Node.js + Angular (Deprecated)
├── data/                            # Application data & cache
│   └── playlist-tree.json          # Playlist tree cache
├── docs/                           # Documentation
├── openspec/                       # Specification-driven development
└── PlaylistOrganizer.code-workspace # VS Code workspace
```

## 🚀 Hızlı Başlangıç

### Gereksinimler

- .NET 10.0 SDK veya üzeri
- Windows, macOS veya Linux işletim sistemi

### Uygulamayı Çalıştırma

```bash
cd apps/avalonia/PlaylistOrganizerAvalonia
dotnet run
```

### Production Build

```bash
# Windows
dotnet publish -c Release -r win-x64 --self-contained

# macOS
dotnet publish -c Release -r osx-x64 --self-contained

# Linux
dotnet publish -c Release -r linux-x64 --self-contained
```

## ✨ Mevcut Özellikler

### ✅ Tamamlanan Özellikler

- **📁 Playlist Yönetimi**

  - VirtualDJ klasör yapısı desteği (`.vdjfolder` dosyaları)
  - M3U/M3U8 playlist desteği
  - Klasör navigasyonu ile hiyerarşik tree view
  - Playlist track sayısı takibi
  - Boş playlist filtreleme

- **🔍 Track Arama ve Keşif**

  - Dosya sistemi tabanlı track yükleme
  - Eksik track tespiti
  - Track durum takibi (Bulundu/Eksik)
  - Gerçek zamanlı dosya varlık kontrolü

- **🌳 Tree View**

  - Hiyerarşik playlist yapısı
  - Genişletilebilir/daraltılabilir klasörler
  - Alfabetik sıralama (büyük/küçük harf duyarsız)
  - Hızlı yükleme için JSON cache (`data/playlist-tree.json`)
  - Manuel yenileme özelliği

- **📊 İstatistikler**

  - Toplam playlist sayısı
  - Toplam track sayısı
  - Bulunan track sayısı
  - Eksik track sayısı
  - Playlist bazlı istatistikler

- **🎯 Filtreleme**

  - Eksik track içeren playlist'leri filtreleme
  - Boş playlist'leri gizleme (0 track)
  - Özyinelemeli klasör filtreleme

- **💾 Veri Yönetimi**

  - Dosya sistemi tabanlı (veritabanı kaldırıldı - 19 Kasım 2025)
  - Tree yapısı için JSON cache (`data/playlist-tree.json`)
  - JSON + Memory Cache arama indexi (`word-index.json`)
  - Dosya sistemi tarama
  - Track detaylarının lazy loading ile yüklenmesi

- **🔍 Advanced Search System** ✅ (Yeni - 19 Kasım 2025)

  - JSON + Memory Cache tabanlı arama sistemi
  - Tam eşleşme araması (normalize edilmiş dosya isimleri)
  - Benzerlik araması (hibrit algoritma: kelime + harf bazlı)
  - Geliştirilmiş puanlama sistemi (query coverage öncelikli)
  - 42,000+ dosya için 10-200ms arama süresi
  - Kısa kelime desteği (arama kalitesi için)

- **🔧 Fix Suggestions System** ✅ (Kısmen Tamamlandı - 19 Kasım 2025)

  - Eksik track'ler için fix önerileri
  - Benzer dosya adlarına göre arama
  - Confidence skoru ile sıralama
  - Tek tek fix uygulama
  - Playlist dosyalarını direkt güncelleme (VDJFolder, M3U)
  - UI otomatik güncelleme (track düzeltildiğinde)

### 🚧 Planlanan Özellikler (Henüz Uygulanmadı)

- **🔧 Fix Sistemi (Devam Ediyor)**

  - ✅ Tek tek fix önerileri (Tamamlandı)
  - ❌ Toplu fix işlemi (Yapılacak)
  - ❌ Filtrede sadece eksik dosya unique gösterim (Yapılacak)
  - ❌ Toplu işlemler (Yapılacak)
  - ❌ Duplicate tespiti ve kaldırma (Yapılacak)

- **💳 Ödeme ve Lisanslama Sistemi**

  - ❌ Ödeme linki entegrasyonu (Stripe/PayPal link)
  - ❌ Manuel lisans verme sistemi
  - ❌ Lisans anahtarı oluşturma ve doğrulama
  - ❌ Yerel lisans depolama
  - ❌ Lisansa göre özellik kilitleme

- **📦 Build ve Dağıtım**

  - ❌ Mac build ve test
  - ❌ Windows build ve test
  - ❌ Test dağıtımı (beta testers)
  - ❌ Otomatik güncelleme sistemi

## 🎯 Mimari

### MVVM Pattern

Uygulama Model-View-ViewModel (MVVM) mimarisini takip eder:

- **Models:** Domain entity'leri (`Playlist`, `Track`, `PlaylistTree`)
- **Views:** Avalonia XAML UI tanımları
- **ViewModels:** İş mantığı ve UI durum yönetimi (`MainWindowViewModel`)
- **Services:** Uygulama servisleri (`PlaylistTreeService`, `VDJFolderParserService`, `M3UParserService`)

### Ana Servisler

- **PlaylistTreeService:** Dosya sisteminden playlist tree oluşturur ve cache'ler
- **VDJFolderParserService:** VirtualDJ `.vdjfolder` dosyalarını parse eder
- **M3UParserService:** M3U/M3U8 playlist dosyalarını parse eder
- **FileScannerService:** Dosya sisteminde playlist dosyalarını tarar
- **JsonWordIndexService:** JSON + Memory Cache arama servisi
- **HybridSimilarityCalculator:** Benzerlik skoru hesaplama (kelime + harf bazlı)
- **TrackFixService:** Fix önerileri ve playlist güncelleme
- **StringNormalizationService:** Dosya isimlerini normalize etme

### Veri Akışı

1. **Tree Yükleme:**

   - JSON cache kontrolü (`data/playlist-tree.json`)
   - Cache yoksa/geçersizse, dosya sistemini tara
   - Playlist dosyalarını parse et ve hiyerarşik tree oluştur
   - Bir sonraki başlatma için cache'e kaydet

2. **Track Yükleme:**

   - Kullanıcı playlist seçer
   - Playlist dosyasını parse et (`.vdjfolder` veya `.m3u`)
   - Her track için dosya varlığını kontrol et
   - Track'leri durum ile göster (Bulundu/Eksik)

3. **Filtreleme:**
   - Tüm playlist'lerde eksik track'leri tara
   - Sadece eksik track içeren playlist'leri gösteren filtrelenmiş tree oluştur
   - Üst klasörleri özyinelemeli olarak filtrele

## 📊 Veri Depolama

**Veritabanı:** ❌ Kaldırıldı (19 Kasım 2025) - Artık dosya sistemi tabanlı çalışıyor

**JSON Cache:**

- `data/playlist-tree.json` - Playlist tree cache
- `word-index.json` - Arama indexi (42,000+ dosya için)

**Dosya Sistemi:**

- Playlist dosyaları direkt okunuyor (`.vdjfolder`, `.m3u`)
- Track bilgileri playlist dosyalarından parse ediliyor
- Fix işlemleri playlist dosyalarını direkt güncelliyor

## 🛠️ Geliştirme

### Proje Yapısı

```
PlaylistOrganizerAvalonia/
├── Application/
│   ├── Models/              # Veri transfer objeleri
│   └── Services/            # İş mantığı servisleri
├── Domain/
│   ├── Entities/            # Domain entity'leri
│   └── Enums/               # Enum'lar
├── Infrastructure/
│   └── Services/            # Altyapı servisleri
├── ViewModels/              # MVVM view model'leri
└── Views/                   # Avalonia XAML view'ları
```

### Ana Teknolojiler

- **.NET 10.0** - Runtime ve framework
- **Avalonia UI** - Çapraz platform UI framework
- **System.Text.Json** - JSON serileştirme
- **Microsoft.Extensions.Logging** - Logging framework
- **HashSet<string>** - O(1) lookup için memory cache

## 📈 Yol Haritası

> **Geliştirme Hızı:** Bu proje Cursor IDE ve GenAI modeli kullanılarak geliştirilmektedir. Geleneksel yazılım geliştirme sürelerinden çok daha hızlı ilerlemektedir.

### Phase 1: Temel Özellikler ✅ (Tamamlandı)

**Süre (GenAI Destekli):** ~25-30 saat (3-4 gün)  
**Süre (Geleneksel):** ~40-50 saat (5-6 gün)  
**Durum:** ✅ Tamamlandı

- [x] Playlist tree view (~8 saat)
- [x] Track loading and display (~6 saat)
- [x] Missing track detection (~8 saat)
- [x] File system scanning (~6 saat)
- [x] JSON cache system (~4 saat)
- [x] Alphabetical sorting (~3 saat)
- [x] Filtering system (~5 saat)

### Phase 2: Fix Sistemi 🚧 (Devam Ediyor - %40 Tamamlandı)

**Başlangıç:** 30 Ekim 2025  
**Durum:** 🚧 Aktif Geliştirme  
**Tamamlanan:** Tek tek fix önerileri ve uygulama  
**Kalan:** Toplu fix, unique gösterim, build & test

**Tamamlanan Özellikler:**

- ✅ JSON + Memory Cache arama sistemi (~8 saat)
- ✅ Fix önerileri sistemi (~6 saat)
- ✅ Tek tek fix uygulama (~4 saat)
- ✅ Playlist dosyalarını direkt güncelleme (~3 saat)
- ✅ Geliştirilmiş puanlama sistemi (~2 saat)

**Yapılacak Özellikler:**

- [ ] **Toplu Fix İşlemi** (~4-6 saat)

  - Tüm eksik track'leri toplu olarak düzeltme
  - Progress tracking ve cancel desteği
  - Batch fix UI (seçili track'ler için)
  - Success/failure raporlama

- [ ] **Unique Gösterim** (~2-3 saat)

  - Filtrede sadece eksik dosya unique gösterim
  - Aynı dosya birden fazla playlist'te varsa tek gösterim
  - Toplu fix için seçim yapılabilir liste

- [ ] **Build & Test** (~4-6 saat)

  - Mac build ve test
  - Windows build ve test
  - Cross-platform test senaryoları
  - Build otomasyonu

- [ ] **Test Dağıtımı** (~2-3 saat)
  - Beta testers için dağıtım hazırlığı
  - Installer oluşturma (Mac/Windows)
  - Test senaryoları dokümantasyonu

### Phase 3: Ödeme ve Lisanslama 🚧 (Planlandı)

**Tahmini Süre (GenAI Destekli):** ~12-18 saat (1.5-2.5 gün)  
**Tahmini Süre (Geleneksel):** ~20-30 saat (2.5-4 gün)  
**Başlangıç:** Phase 2 tamamlandıktan sonra  
**Yaklaşım:** Link ile ödeme + Manuel lisans verme (basitleştirilmiş)

**Yapılacak Özellikler:**

- [ ] **Ödeme Linki Entegrasyonu** (~4-6 saat)

  - Stripe/PayPal ödeme linki oluşturma
  - Ödeme tamamlandığında webhook/email bildirimi
  - Ödeme durumu takibi

- [ ] **Manuel Lisans Verme Sistemi** (~4-6 saat)

  - Ödeme tamamlandıktan sonra manuel lisans anahtarı oluşturma
  - Lisans anahtarı oluşturma (benzersiz, güvenli)
  - Email ile lisans anahtarı gönderme
  - Lisans anahtarı doğrulama sistemi

- [ ] **Lisans Yönetimi** (~3-4 saat)

  - Yerel lisans depolama (şifreli)
  - Lisans aktivasyonu/deaktivasyonu
  - Lisans sona erme kontrolü
  - Lisansa göre özellik kilitleme

- [ ] **UI Entegrasyonu** (~1-2 saat)
  - Lisans aktivasyon dialog'u
  - Ödeme linki butonu
  - Lisans durumu gösterimi
  - Özellik açma/kilit mekanizması

### Phase 4: Gelişmiş Özellikler 📋 (Gelecek)

**Tahmini Süre (GenAI Destekli):** ~12-18 saat (1.5-2.5 gün)  
**Tahmini Süre (Geleneksel):** ~20-30 saat (2.5-4 gün)  
**Başlangıç:** Phase 3 tamamlandıktan sonra  
**Tahmini Bitiş:** 3-4 hafta içinde

- [ ] Playlist düzenleme (~4-6 saat)

  - Sürükle-bırak track yeniden sıralama
  - Track ekleme/çıkarma
  - Playlist metadata düzenleme

- [ ] Track metadata düzenleme (~3-4 saat)

  - ID3 tag düzenleme
  - Toplu metadata güncellemeleri
  - Metadata doğrulama

- [ ] Export/Import işlevselliği (~4-6 saat)

  - M3U/VirtualDJ formatına export
  - Çeşitli formatlardan import
  - Format dönüştürme

- [ ] Yedekleme ve geri yükleme (~3-4 saat)

  - Otomatik yedekleme zamanlama
  - Manuel yedekleme/geri yükleme
  - Yedek dosya yönetimi

- [ ] Çoklu dil desteği (~6-8 saat)
  - i18n implementasyonu
  - Dil değiştirme
  - Çeviri yönetimi

## 📅 Proje Takvimi ve İlerleme

### 📊 Genel Durum

**Proje Başlangıç:** 30 Ekim 2025  
**Son Güncelleme:** 19 Kasım 2025  
**Geçen Süre:** ~20 gün  
**GenAI Destekli Geliştirme:** ✅ Aktif (Cursor IDE)

### ⏱️ Tamamlanma Tahmini (GenAI Destekli)

**Phase 2 (Kalan İşler):** ~12-18 saat (1.5-2.5 gün)

- Toplu fix işlemi: 4-6 saat
- Unique gösterim: 2-3 saat
- Build & test: 4-6 saat
- Test dağıtımı: 2-3 saat

**Phase 3 (Ödeme ve Lisanslama):** ~12-18 saat (1.5-2.5 gün)

- Ödeme linki entegrasyonu: 4-6 saat
- Manuel lisans verme: 4-6 saat
- Lisans yönetimi: 3-4 saat
- UI entegrasyonu: 1-2 saat

**Toplam Kalan Süre:** ~24-36 saat (3-4.5 gün, günde 8 saat çalışma ile)

### 📈 İlerleme Durumu

| Phase                              | Durum           | Tamamlanma | Kalan Süre | Tahmini Bitiş    |
| ---------------------------------- | --------------- | ---------- | ---------- | ---------------- |
| Phase 1: Temel Özellikler         | ✅ Tamamlandı   | 100%       | -          | 30 Ekim 2025     |
| Phase 2: Fix Sistemi               | 🚧 Devam Ediyor | ~40%       | 12-18 saat | 21-22 Kasım 2025 |
| Phase 3: Ödeme ve Lisanslama       | 📋 Planlandı    | 0%         | 12-18 saat | 23-24 Kasım 2025 |
| Phase 4: Gelişmiş Özellikler       | 📋 Gelecek      | 0%         | -          | -                |

### 🎯 Tahmini Bitiş Tarihi

**GenAI Destekli (Günde 8 saat çalışma ile):**

- **Minimum (yoğun çalışma):** 21-22 Kasım 2025 (2-3 gün)
- **Ortalama (normal tempo):** 23-24 Kasım 2025 (4-5 gün)
- **Maksimum (part-time çalışma):** 27-28 Kasım 2025 (8-9 gün)

**Not:** Bu tahminler Phase 2 ve Phase 3 için geçerlidir. Phase 4 (Gelişmiş Özellikler) ayrı planlanacaktır.

### 📝 Yapılacak Ana Maddeler (Öncelik Sırasına Göre)

#### 🔴 Yüksek Öncelik (Phase 2 - Devam Ediyor)

1. **Toplu Fix İşlemi** (~4-6 saat)

   - Tüm eksik track'leri toplu olarak düzeltme
   - Progress tracking ve cancel desteği
   - Batch fix UI
   - Success/failure raporlama

2. **Unique Gösterim** (~2-3 saat)

   - Filtrede sadece eksik dosya unique gösterim
   - Aynı dosya birden fazla playlist'te varsa tek gösterim
   - Toplu fix için seçim yapılabilir liste

3. **Build & Test** (~4-6 saat)

   - Mac build ve test
   - Windows build ve test
   - Cross-platform test senaryoları

4. **Test Dağıtımı** (~2-3 saat)
   - Beta testers için dağıtım hazırlığı
   - Installer oluşturma (Mac/Windows)

#### 🟡 Orta Öncelik (Phase 3 - Planlandı)

5. **Ödeme Linki Entegrasyonu** (~4-6 saat)

   - Stripe/PayPal ödeme linki
   - Webhook/email bildirimi

6. **Manuel Lisans Verme** (~4-6 saat)

   - Lisans anahtarı oluşturma
   - Email ile lisans gönderme

7. **Lisans Yönetimi** (~3-4 saat)
   - Yerel lisans depolama
   - Özellik kilitleme

#### 🟢 Düşük Öncelik (Phase 4 - Gelecek)

8. Playlist düzenleme
9. Track metadata düzenleme
10. Export/Import işlevselliği
11. Çoklu dil desteği

### 💡 Önemli Notlar

- **GenAI Tasarrufu:** Geleneksel yöntemlere göre %40-50 daha hızlı
- **Test Süresi:** Build ve test süreleri tahminlere dahil
- **Beklenmedik Durumlar:** Debugging ve kullanıcı geri bildirimleri süreleri etkileyebilir
- **Ödeme Modeli:** Basitleştirilmiş yaklaşım (link + manuel lisans) ile süre kısaldı

## 💡 Pazarlama Stratejisi Önerileri

### Hedef Kitle

1. **DJ'ler ve Müzik Profesyonelleri**

   - Büyük müzik kütüphanelerini yöneten VirtualDJ kullanıcıları
   - Eksik dosyaları takip etme ve playlist'leri organize etme ihtiyacı
   - Değer: Zaman tasarrufu, güvenilirlik

2. **Müzik Tutkunları**

   - Büyük kişisel müzik koleksiyonları
   - Çoklu playlist formatları (M3U, VirtualDJ)
   - Değer: Organizasyon, keşif

3. **Müzik Kütüphaneleri ve Koleksiyonlar**
   - Radyo istasyonları, kulüpler, mekanlar
   - Merkezi playlist yönetimi ihtiyacı
   - Değer: Profesyonel araçlar, toplu işlemler

### Fiyatlandırma Stratejisi

**Freemium Model:**

- **Ücretsiz Seviye:**

  - Temel playlist görüntüleme
  - Eksik track tespiti (100 playlist ile sınırlı)
  - Topluluk desteği

- **Pro Seviye ($9.99/ay veya $99/yıl):**

  - Sınırsız playlist
  - Gelişmiş filtreleme
  - Fix sistemi (otomatik düzeltmeler)
  - Öncelikli destek
  - Bulut yedekleme

- **Kurumsal Seviye (Özel fiyatlandırma):**
  - Çoklu kullanıcı lisansları
  - API erişimi
  - Özel entegrasyonlar
  - Özel destek

### Pazarlama Kanalları

1. **İçerik Pazarlama**

   - Playlist yönetimi hakkında blog yazıları
   - DJ'ler için YouTube eğitimleri
   - Müzik profesyonellerinden vaka çalışmaları

2. **Topluluk Oluşturma**

   - Discord/Slack topluluğu
   - Kullanıcı forumları
   - Özellik isteği oylama

3. **Ortaklıklar**

   - VirtualDJ plugin marketplace
   - Müzik yazılımı inceleme siteleri
   - DJ ekipman perakendecileri

4. **Sosyal Medya**

   - Güncellemeler için Twitter/X
   - Görsel içerik için Instagram
   - B2B iletişim için LinkedIn

5. **Product Hunt Lansmanı**
   - Product Hunt'ta lansman
   - Erken benimseyenlerle etkileşim
   - Geri bildirim ve referanslar toplama

### Piyasaya Çıkış Stratejisi

**Faz 1: Beta Lansman (1-2. Aylar)**

- Sadece davetli beta (50-100 kullanıcı)
- Geri bildirim toplama ve kritik sorunları düzeltme
- Vaka çalışmaları ve referanslar oluşturma

**Faz 2: Halka Açık Lansman (3. Ay)**

- Product Hunt lansmanı
- Ücretsiz seviye mevcut
- İçerik pazarlama kampanyası
- Sosyal medya varlığı

**Faz 3: Büyüme (4-6. Aylar)**

- Ücretli seviye lansmanı
- Ortaklık geliştirme
- Topluluk oluşturma
- Geri bildirime göre özellik genişletme

**Faz 4: Ölçeklendirme (7-12. Aylar)**

- Kurumsal özellikler
- API geliştirme
- Uluslararası genişleme
- Gelişmiş özellikler (fix sistemi, bulut senkronizasyonu)

## 🐛 Bilinen Sınırlamalar

- ✅ Fix sistemi kısmen tamamlandı (tek tek fix var, toplu fix yok)
- ❌ Ödeme sistemi henüz uygulanmadı
- ❌ Bulut senkronizasyonu yok
- ✅ Yerel dosya sistemi ile sınırlı (tasarım gereği)
- ❌ Playlist düzenleme yok (sadece görüntüleme)
- ❌ Mac/Windows build henüz test edilmedi
- ❌ Otomatik güncelleme sistemi yok

## 📝 Geçiş Notu

**Eski Sistem:** `apps/old-nodejs-api/` klasöründeki eski Node.js API + Angular frontend kullanımdan kaldırıldı ve artık bakımı yapılmıyor. Proje tamamen Avalonia masaüstü uygulamasına geçti.

## 📖 Dokümantasyon

- **OpenSpec:** `openspec/` - Spesifikasyon odaklı geliştirme
- **Arama Sistemi:** `apps/avalonia/PlaylistOrganizerAvalonia/SEARCH_SYSTEM.md` - Arama sistemi dokümantasyonu
- **Geçiş Planları:** `docs/current/` - Mevcut geçiş planları
- **Avalonia Geçişi:** `openspec/changes/api-to-avalonia-migration/`

## 🤝 Katkıda Bulunma

Bu şu anda özel bir projedir. Katkılar ve geri bildirimler issue'lar ve tartışmalar aracılığıyla memnuniyetle karşılanır.

## 🔒 Lisans

MIT (veya lisansınızı belirtin)

## 👤 Yazar

Koray

## 🎉 Teşekkürler

Şunlarla geliştirildi:

- Clean Architecture prensipleri
- MVVM pattern
- Modern .NET en iyi uygulamaları
- Avalonia UI framework

---

**Not:** Bu proje aktif olarak geliştirilmektedir. "Planlandı" olarak işaretlenen özellikler henüz uygulanmadı ancak yol haritasında yer almaktadır.
