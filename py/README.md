# Playlist Organizer Benzerlik Analiz Test Sistemi

Bu sistem, Playlist Organizer uygulamasındaki benzerlik algoritmasını test etmek ve iyileştirmek için geliştirilmiştir.

## Kurulum

```bash
poetry install
```

## Kullanım

### Temel Benzerlik Testi

```bash
poetry run similarity-test
```

Bu komut, eksik müzik dosyalarını tarar ve sadece benzerlik sorunlu olanları test eder. Sonuçları `similarity_test_report.json` dosyasına yazar.

### Detaylı Benzerlik Analizi

```bash
poetry run similarity-analysis
```

Bu komut, daha detaylı bir analiz yapar ve benzerlik algoritmasının performansını ölçer.

## Test Süreci

1. Playlistlerdeki eksik dosyalar taranır
2. Sadece benzerlik problemi olan dosyalar seçilir
3. API'deki benzerlik algoritması kullanılarak testler yapılır
4. Sonuçlar raporlanır ve iyileştirme önerileri sunulur

## İyileştirme Yöntemleri

### 1. İndeksleme
- Veritabanındaki dosyaları önceden indeksleyerek arama süresini kısaltabiliriz
- Kelime bazlı indeksler oluşturarak doğrudan eşleşmeleri daha hızlı bulabiliriz

### 2. Algoritma Optimizasyonu
- Benzerlik hesaplama algoritmasını daha verimli hale getirebiliriz
- Paralel işleme kullanarak çoklu dosya aramalarını hızlandırabiliriz

### 3. Eşik Değeri Ayarlama
- Eşik değerini dinamik olarak ayarlayarak daha iyi sonuçlar elde edebiliriz
- Farklı dosya türleri için farklı eşik değerleri kullanabiliriz

### 4. Kelime Çıkarma İyileştirmesi
- Dosya adı ve klasör adından daha etkili kelime çıkarma yöntemleri uygulayabiliriz
- Sanatçı ve şarkı adı gibi özel alanları ayrı ayrı işleyebiliriz

## Rapor Formatı

Test sonuçları aşağıdaki formatta bir JSON dosyasına yazılır:

```json
{
  "test_summary": {
    "total_files_tested": 100,
    "found_count": 85,
    "not_found_count": 15,
    "exact_match_count": 60,
    "similarity_match_count": 25,
    "success_rate": 85.0,
    "average_similarity": 0.75,
    "average_process_time_ms": 45.2
  },
  "match_details": {
    "tamYolEsleme": {"count": 30, "time": 1200, "algoritmaYontemi": "Tam Yol Eşleşme"},
    "ayniKlasorFarkliUzanti": {"count": 15, "time": 600, "algoritmaYontemi": "Aynı Klasör Farklı Uzantı"},
    "farkliKlasor": {"count": 15, "time": 600, "algoritmaYontemi": "Farklı Klasör Aynı Ad"},
    "farkliKlasorveUzanti": {"count": 10, "time": 400, "algoritmaYontemi": "Farklı Klasör Farklı Uzantı"},
    "benzerDosya": {"count": 25, "time": 1125, "algoritmaYontemi": "Benzerlik Bazlı Arama"}
  },
  "recommendations": [
    "Benzerlik skoru düşük. Eşik değeri (threshold) 0.3'ün altında olabilir.",
    "Ortalama işlem süresi yüksek. İndeksleme veya algoritma optimizasyonu gerekebilir."
  ]
}
```