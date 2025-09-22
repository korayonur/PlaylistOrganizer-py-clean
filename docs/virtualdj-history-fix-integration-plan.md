# VirtualDJ History Fix & Entegrasyon Planı (Güncel)

## 🎯 Amaç
VirtualDJ History klasöründeki `.m3u` dosyalarını Node.js tabanlı altyapı ile tarayıp, bulunamayan parçaları mevcut `music_files` veritabanına dayanarak tespit etmek ve otomatik/manuel düzeltme akışları sağlamak. Tüm işlevler artık yalnızca Node.js + Angular stack'i üzerinde çalışacak.

## 🧱 Mimari Özeti
- **Backend:** `nodejs-api/` altında Express + SQLite (`musicfiles.db`) ve yeni `history` servisleri.
- **Veri Kaynağı:** `music_files` tablosu (path, fileName, normalizedFileName), mevcut indeksler, `SimpleSQLiteDatabase` fonksiyonları.
- **Benzerlik Motoru:** Dosya adı bazlı eşleşme; artist/title ayrıştırması yapılmaz. `searchExact`, `searchProgressive` ve Levenshtein tabanlı skor hesapları kullanılacak.
- **Frontend:** Angular History modülü üzerinden tarama, öneri ve fix akışlarının yönetimi.

## 📂 History İşleme Katmanları

### 1. HistoryScanner
- `History/` ağacını (yıl → ay → dosya) recursive tarar.
- Her `.m3u` dosyasını satır satır okuyup `#EXTVDJ` metadata bloklarını ayırır.
- Track DTO: `{ historyFileId, originalPath, normalizedName, meta?: RawExtVDJBlock }`. Metadata yalnızca görüntüleme/audit amaçlı tutulur; eşleşmede kullanılmaz.
- `.vdjcache`, boş satırlar ve desteklenmeyen formatlar isteğe göre filtrelenir.
- Her `.m3u` güncellemesinden önce `.bak` yedeği alınır.

### 2. HistoryRepository (SQLite)
- Yeni tablolar:
  - `virtualdj_history` (dosya düzeyi durum/istatistikler)
  - `history_tracks` (her parça, tarama durumu, eşleşme sonucu)
  - `history_missing` (bulunamayan veya onay bekleyen kayıtlar)
  - `history_fix_log` (audit ve rollback)
- Migration dosyası: `nodejs-api/history/history-migrations.js` (server start'ında çalıştırılır).

### 3. HistoryMatchService
- Mevcut `SimpleSQLiteDatabase` fonksiyon zinciri ile tamamen dosya adı ve klasör bilgisi üzerinden çalışır:
  1. **Tam Yol Eşleşmesi:** `music_files.path = originalPath`.
  2. **Aynı Klasör + Aynı Dosya Adı:** klasör path normalizasyonu + `.stem` eşleştirme.
  3. **Aynı Dosya Adı Farklı Uzantı:** `normalizedFileName` eşitliği.
  4. **Benzerlik Araması:** `searchProgressive(normalizedFileName, limit)` → aday listesi → `SimpleWordMatcher.calculateFileNameSimilarity` ile skor.
- Her deneme metodu ve skor bilgisi `history_tracks` satırına işlenir; artist/title ayrıştırması yapılmaz.

### 4. HistoryFixService
- `history_missing` kayıtlarını skorlarına göre önceliklendirir (tam eşleşme > klasör+uzantı > benzerlik).
- `applyFix` akışı:
  1. Seçilen aday yolu `.m3u` dosyasında güncelle.
  2. SQLite'da `fixed_path`, `fix_method`, `similarity_score` alanlarını güncelle.
  3. `history_fix_log` tablosuna audit kaydı ekle.
- `rollbackFix` ile log tabanlı geri alma desteklenecek.

## 🔌 API Tasarımı (Express)
```
POST   /api/history/scan            # History klasörünü tarar, DB'yi günceller
GET    /api/history/files           # Tarama sonuçlarını (dosya bazında) listeler
GET    /api/history/missing         # Eksik/parçalanmış kayıtları filtre + sayfalama ile getirir
GET    /api/history/missing/:id     # Tek kayıt + aday önerileri
POST   /api/history/fix             # Tek kayıt için fix uygular
POST   /api/history/fix/bulk        # Toplu fix (aynı yöntemle) uygular
POST   /api/history/ignore          # Kayıt görmezden gelinir (bilinçli silinenler)
```
- İstek/yanıt şemaları TypeScript interface'leriyle (`history/types.ts`).
- Uzun süren taramalar için ilk aşamada basit state store (`HistoryScanState`); gerekirse SSE/WebSocket ileride eklenebilir.

## 🖥️ Frontend – History UI
- Yeni Angular modülü: `frontend/src/app/history/` (lazy load, route `/history`).
- **Bileşenler:**
  - `history-dashboard`: Tarama tetikleme, son tarama zamanı, toplam missing sayısı.
  - `history-missing-table`: Material table + filtreler (dosya adı, yıl/ay, öneri durumu).
  - `history-fix-panel`: Seçilen kayıt için aday listesi, similarity skorları, path diff.
  - `history-fix-bulk-dialog`: Çoklu seçim → en yüksek skor adayla hızlı düzeltme.
- **UX Notları:**
  - Tarama sırasında progress bar ve log akışı.
  - Fix sonrası VirtualDJ'in yeniden başlatılması gerektiği bilgisi.
  - `history/ignored` sekmesiyle yok sayılan kayıtların yönetimi.

## 🧮 Benzerlik Hesaplama
- **Normalizasyon:** `SimpleWordMatcher.normalizeText` → uzantı çıkarma → küçük harfe çevirme.
- **Skor Katmanları:**
  - Tam yol eşleşmesi (`score = 1.0`).
  - Aynı klasör + dosya adı (`score = 0.95`).
  - Aynı dosya adı farklı uzantı (`score = 0.9`).
  - `searchProgressive` sonucundaki adaylar için Levenshtein tabanlı skor (`calculateFileNameSimilarity`).
- **Eşikler:** 0.85+ otomatik fix adayı, 0.6–0.85 manuel onay, <0.6 sadece öneri listesinde.
- **Metaveri Kullanımı:** Artist/title vb. bilgiler saklanabilir ancak eşleşme algoritmasında kullanılmaz.

## 📊 Örnek History Dosyaları Analizi (10 Dosya)
Aşağıdaki özet 2014–2025 arasında seçilen 10 `.m3u` dosyasının otomatik incelemesinden alınmıştır:

| Dosya | Parça Sayısı | Öne Çıkan Uzantılar | External Volume | VDJ Cache | Genel Gözlemler |
|-------|--------------|---------------------|-----------------|-----------|-----------------|
| `2014/05/2014-05-29.m3u` | 18 | `.mp3` (17), `.m4a` (1) | 0 | 0 | Tüm yollar `~/Music/KorayMusics`; dosya adıyla eşleşme yeterli. |
| `2015/12/2015-12-31.m3u` | 110 | `.mp3`, `.mkv`, `.wma` | 80 | 0 | `/Volumes/DJKORAY` ağırlıklı; farklı klasör ve uzantı kombinasyonları kritik. |
| `2016/05/2016-05-28.m3u` | 64 | `.mp3`, `.mkv`, `.mp4` | 13 | 0 | Yerel + external karışık; dosya adları tutarlı. |
| `2017/06/2017-06-01.m3u` | 48 | `.mp3`, `.mkv` | 0 | 0 | Tamamı yerel `KorayMusics`; metadata kullanılmayacak. |
| `2018-11-24.m3u` | 30 | `.mp4`, `.mkv`, `.flv` | 0 | 0 | Video ağırlıklı, tek klasör. |
| `2019/03/2019-03-01.m3u` | 13 | `.vdjcache` (11), `.mkv` | 0 | 11 | Cache dosyaları yoğun; otomatik ignore kuralı gerekli. |
| `2020/01/2020-01-01.m3u` | 34 | `.mp4`, `.ogg`, `.mp3` | 16 | 0 | `/Volumes/DJKORAY` ve uzun klasör isimleri; normalize path kritik. |
| `2021/05/2021-05-11.m3u` | 47 | `.m4a` çoğunlukta | 0 | 0 | Yerel klasör + `Desktop/coptekiler`; dosya adları belirleyici. |
| `2024/07/2024-07-07.m3u` | 66 | `.m4a`, `.mp3`, `.flac` | 0 | 0 | Desktop ve Downloads kaynaklı; dosya adları benzersiz. |
| `2025-09-15.m3u` | 88 | `.m4a`, `.mp3` | 0 | 0 | En yeni kayıtlar; büyük çoğunluk tek klasörde. |

**Çıkarımlar:**
- Dosya adları yıllar boyunca tutarlı, bu yüzden artist/title ayrıştırmasına gerek yok.
- External volume (`/Volumes/DJKORAY`) özellikle eski yıllarda baskın; disk takılı değilse eşleşme başarısız olabilir → benzerlik araması ve alternatif path üretimi şart.
- `.vdjcache` dosyaları 2019 döneminde öne çıkıyor; bunları otomatik olarak "ignore" kategorisine almak faydalı.
- Yeni yıllarda (2024–2025) dosyaların çoğu yerel klasörlerde; fix işlemleri büyük oranda aynı isimli dosyayı bulup path güncellemekten ibaret.

## 🧹 Kod Tabanı Durumu
- Python tabanlı katman tamamen kaldırıldı; `py/` klasörü ve bağlı tüm dosyalar silindi.
- Belgeler ve yardımcı scriptler Node.js + Angular yaklaşımını referans alacak şekilde güncelleniyor.

## 🗺️ Yol Haritası
1. History tabloları & migration kodu (`nodejs-api/history/history-migrations.js`).
2. HistoryScanner + Repository implementasyonu ve testleri.
3. HistoryMatchService: dosya adı bazlı eşleşme stratejilerinin uygulanması.
4. API katmanı: REST uçları ve request/response doğrulamaları.
5. Frontend History modülü: bileşenler, state yönetimi, UX detayları.
6. Gerçek `.m3u` dosyalarıyla uçtan uca test, rollback senaryoları ve backup doğrulaması.

Bu planla, tüm geliştirme Node.js + Angular ekosisteminde ilerleyecek ve eşleşme algoritması yalnızca dosya adı/klasör bilgisine dayanacaktır.
