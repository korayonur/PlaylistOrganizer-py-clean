# Arama Sistemi - Kapsamlı Dokümantasyon

## 🎯 Genel Bakış

PlaylistOrganizer uygulaması, eksik müzik dosyalarını bulmak için **JSON + Memory Cache** tabanlı bir arama sistemi kullanır. Sistem, dosya sistemindeki tüm müzik dosyalarını indexler ve hızlı arama yapılmasını sağlar.

### Temel Özellikler

- ✅ **JSON + Memory Cache:** Disk'te JSON, memory'de cache
- ✅ **Tam Eşleşme Araması:** Normalize edilmiş dosya isimlerinin tam eşleşmesi
- ✅ **Benzerlik Araması:** Eşleşme yoksa hibrit benzerlik algoritması
- ✅ **Kısa Kelime Desteği:** Arama sırasında tüm kelimeler kullanılır (filtre yok)
- ✅ **Yüksek Performans:** HashSet ile O(1) lookup, 10-200ms arama süresi

---

## 📊 Veri Yapısı

### JSON Dosya Yapısı

**Dosya:** `word-index.json` (bin/Debug/net10.0/ klasöründe)

```json
{
  "metadata": {
    "version": "1.0",
    "totalFiles": 42419,
    "exportDate": "2025-11-19T12:00:00.000000Z",
    "musicFolderPath": "/Users/koray/Music/KorayMusics"
  },
  "files": [
    {
      "path": "/Users/koray/Music/KorayMusics/Dimitri Vegas & Like Mike - Fuego.mp3",
      "fileName": "Dimitri Vegas & Like Mike - Fuego.mp3",
      "normalizedFileName": "dimitri vegas like mike fuego",
      "words": ["dimitri", "vegas", "like", "mike", "fuego"]
    }
  ]
}
```

**ÖNEMLİ:**
- `words[]` → **TÜM kelimeler** (kısa kelimeler dahil, kısıtlama yok)
- Her dosya için: `path`, `fileName`, `normalizedFileName`, `words[]`
- Sadece **dosya adı** indexlenir, path dahil edilmez

### C# Model Yapısı

```csharp
public class WordIndexJson
{
    public Metadata? Metadata { get; set; }
    public List<FileInfo> Files { get; set; }
}

public class FileInfo
{
    public string Path { get; set; }
    public string FileName { get; set; }
    public string NormalizedFileName { get; set; }
    public List<string> Words { get; set; } // JSON'dan List olarak gelir
}

// Memory'de cache'lenirken HashSet kullanılır (O(1) lookup)
public class CachedFileInfo
{
    public string Path { get; set; }
    public string FileName { get; set; }
    public string NormalizedFileName { get; set; }
    public HashSet<string> Words { get; set; } // Memory'de HashSet
}
```

---

## 🏗️ Mimari

### Sistem Bileşenleri

1. **InMemoryWordIndex** → Dosya sisteminden index oluşturur ve JSON'a export eder
2. **JsonWordIndexService** → JSON'dan yükler ve memory'de cache'ler
3. **HybridSimilarityCalculator** → Benzerlik skorunu hesaplar
4. **StringNormalizationService** → Dosya isimlerini normalize eder

### Çalışma Akışı

#### Startup (Uygulama Başlangıcı)

```
1. InMemoryWordIndex → Dosya sisteminden tüm müzik dosyalarını tara
2. InMemoryWordIndex → word-index.json dosyasına export et
3. JsonWordIndexService → word-index.json'dan yükle (memory cache)
```

#### Arama (Kullanıcı Arama Yaptığında)

```
1. TrackFixService.FindSimilarFilesAsync()
   ↓
2. JsonWordIndexService.Search()
   ↓
3. Tam eşleşme kontrolü (normalize edilmiş string'lerin tam eşleşmesi)
   ├─ Eşleşme VAR → Sonuçları döndür (Similarity: 1.0)
   └─ Eşleşme YOK → Benzerlik araması yap
      └─ HybridSimilarityCalculator ile skor hesapla
         └─ Similarity > 0.3 olanları döndür
```

---

## 🔍 Arama Algoritması

### Adım 1: Tam Eşleşme Araması

```csharp
// Kullanıcı input: "Dale Don Dale"

// 1. Normalize et
var normalized = StringNormalizationService.NormalizeFileName("Dale Don Dale");
// → "dale don dale"

// 2. Tam eşleşme kontrolü (normalize edilmiş string'lerin tam eşleşmesi)
var exactMatches = _cachedFiles
    .Where(file => file.NormalizedFileName == normalized)
    .ToList();

// 3. Eğer tam eşleşme varsa, %100 benzerlik ile döndür
if (exactMatches.Count > 0)
{
    return exactMatches.Select(f => new SearchResult
    {
        Path = f.Path,
        FileName = f.FileName,
        Similarity = 1.0, // Tam eşleşme = %100
        MatchType = "exact"
    }).ToList();
}
```

**Örnek:**
- Arama: "dale don dale"
- Dosya 1: "dale don dale" → ✅ Tam eşleşme (Similarity: 1.0)
- Dosya 2: "dale don novella" → ❌ Tam eşleşme değil

---

### Adım 2: Benzerlik Araması (Eşleşme Yoksa)

Tam eşleşme yoksa, `HybridSimilarityCalculator` kullanılarak benzerlik skoru hesaplanır.

#### Benzerlik Hesaplama Algoritması

**Hibrit Yaklaşım:**
- **Kelime bazlı (70%):** Tam eşleşen kelimeler, fuzzy eşleşmeler, kelime sırası
- **Harf bazlı (30%):** Levenshtein distance, karakter benzerliği

```csharp
public double CalculateSimilarity(string str1, string str2)
{
    // Normalize et
    var normalized1 = StringNormalizationService.NormalizeFileName(str1);
    var normalized2 = StringNormalizationService.NormalizeFileName(str2);

    if (normalized1 == normalized2)
        return 1.0;

    // Kelimelere ayır
    var words1 = normalized1.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
    var words2 = normalized2.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();

    // 1. KELİME BAZLI EŞLEŞME (70% ağırlık)
    var wordScore = CalculateWordLevelSimilarity(words1, words2);

    // 2. HARF BAZLI EŞLEŞME (30% ağırlık)
    var charScore = CalculateCharacterLevelSimilarity(normalized1, normalized2);

    // Weighted average
    return (wordScore * 0.7) + (charScore * 0.3);
}
```

#### Kelime Seviyesinde Benzerlik

**Geliştirilmiş Puanlama Sistemi:**

```csharp
private double CalculateWordLevelSimilarity(List<string> words1, List<string> words2)
{
    // 1. Query'deki unique kelimeleri bul
    var uniqueWords1 = words1.Distinct().ToList();
    var uniqueWords2 = words2.Distinct().ToList();
    
    // 2. Eşleşen kelimeleri bul
    var exactMatches = uniqueWords1.Intersect(uniqueWords2).Count();
    
    // 3. Query coverage: Query'deki kelimelerin ne kadarının dosyada olduğu
    var queryCoverage = uniqueWords1.Count > 0 
        ? (double)exactMatches / uniqueWords1.Count 
        : 0;
    
    // 4. File coverage: Dosyadaki kelimelerin ne kadarının query'de olduğu
    var fileCoverage = uniqueWords2.Count > 0 
        ? (double)exactMatches / uniqueWords2.Count 
        : 0;
    
    // 5. Weighted average (query coverage daha önemli)
    var exactRatio = (queryCoverage * 0.7) + (fileCoverage * 0.3);
    
    // 6. Bonus: Query'deki TÜM kelimeler dosyada varsa +%15 bonus
    if (queryCoverage >= 1.0 && uniqueWords1.Count >= 2)
    {
        exactRatio = Math.Min(1.0, exactRatio + 0.15);
    }

    // 7. Fuzzy word matches, word order, consecutive bonus...
    // (detaylar için HybridSimilarityCalculator.cs dosyasına bakın)
    
    return finalScore;
}
```

**Örnek Puanlama:**

- **Arama:** "Dale Don Dale" (unique: ["dale", "don"])
- **Dosya 1:** "Don Omar - Dale Don Dale (BROSS Re-Drum)" (unique: ["don", "omar", "dale", "bross", "redrum"])
  - Query coverage: 2/2 = 1.0 (query'deki tüm kelimeler var!)
  - File coverage: 2/5 = 0.4
  - Exact ratio: 1.0 * 0.7 + 0.4 * 0.3 = 0.82
  - Bonus: +0.15 (tüm kelimeler eşleşti)
  - **Final skor: ~0.97 (%97)** ✅

- **Dosya 2:** "Mina - Don Bana" (unique: ["mina", "don", "bana"])
  - Query coverage: 1/2 = 0.5 (sadece "don" var)
  - File coverage: 1/3 = 0.33
  - Exact ratio: 0.5 * 0.7 + 0.33 * 0.3 = 0.45
  - **Final skor: ~0.35 (%35)** ✅

**Sonuç:** "Dale Don Dale" içeren dosyalar artık daha yüksek skor alır ve üstte görünür!

---

## ⚡ Performans

### Memory Kullanımı

```
JSON Dosyası: ~30-50 MB (disk'te)
Memory Cache: ~30-50 MB (yüklendikten sonra)
```

### Arama Süresi

| Arama Türü      | Süre      | Açıklama                               |
| --------------- | --------- | -------------------------------------- |
| **Tam Eşleşme** | 10-50 ms  | Normalize edilmiş string karşılaştırması |
| **Benzerlik**   | 50-200 ms | Tüm dosyalar için similarity hesaplama |

### Optimizasyonlar

1. **HashSet Kullanımı:**
   ```csharp
   public HashSet<string> Words { get; set; } // O(1) lookup
   ```

2. **Early Exit:**
   ```csharp
   // Tam eşleşme varsa, benzerlik araması yapma
   if (exactMatches.Count > 0)
       return exactMatches;
   ```

3. **Similarity Threshold:**
   ```csharp
   .Where(x => x.Similarity > 0.3) // Minimum %30 benzerlik eşiği
   ```

---

## 📝 Kullanım Örnekleri

### Örnek 1: Tam Eşleşme

```csharp
var service = new JsonWordIndexService(similarityCalculator);
await service.LoadFromJsonAsync("word-index.json");

// Arama
var results = service.Search("Dale Don Dale");

// Sonuç:
// [
//   { 
//     Path: "...", 
//     FileName: "Dale Don Dale.m4a", 
//     Similarity: 1.0, 
//     MatchType: "exact" 
//   }
// ]
```

### Örnek 2: Benzerlik Araması

```csharp
// Arama (tam eşleşme yok)
var results = service.Search("Dale Don"); // Kısmi arama

// Sonuç (benzerlik araması):
// [
//   { 
//     Path: "...", 
//     FileName: "Don Omar - Dale Don Dale.mp3", 
//     Similarity: 0.97, 
//     MatchType: "similar" 
//   },
//   { 
//     Path: "...", 
//     FileName: "Dale Don Novella.mp3", 
//     Similarity: 0.85, 
//     MatchType: "similar" 
//   }
// ]
```

### Örnek 3: Kısa Kelimeler

```csharp
// Arama (kısa kelimeler dahil)
var results = service.Search("DJ A");

// Sonuç:
// [
//   { 
//     Path: "...", 
//     FileName: "DJ A - Song.mp3", 
//     Similarity: 1.0, 
//     MatchType: "exact" 
//   }
// ]
// ✅ "a" kelimesi de kullanıldı (kısıtlama yok)
```

---

## 🎯 Arama Akış Diyagramı

```
┌─────────────────────────────────────────────────────────┐
│  Kullanıcı Input: "Dale Don Dale"                     │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  1. Normalize Et                                        │
│     "Dale Don Dale" → "dale don dale"                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  2. Tam Eşleşme Kontrolü                               │
│     file.NormalizedFileName == "dale don dale"        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌───────────────┐      ┌───────────────┐
    │ Eşleşme VAR   │      │ Eşleşme YOK   │
    │ (Count > 0)   │      │ (Count == 0)   │
    └───────────────┘      └───────────────┘
            │                       │
            ▼                       ▼
    ┌───────────────┐      ┌───────────────┐
    │ Sonuçları Döndür│      │ Benzerlik Araması│
    │ (Similarity: 1.0)│      │ (Similarity > 0.3)│
    └───────────────┘      └───────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │ HybridSimilarity│
                            │ Calculator     │
                            │ (Kelime + Harf)│
                            └───────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │ Similarity'ye │
                            │ Göre Sırala   │
                            │ (Top 50)      │
                            └───────────────┘
```

---

## 🔧 Servisler ve Sınıflar

### JsonWordIndexService

**Dosya:** `Application/Services/JsonWordIndexService.cs`

**Sorumluluklar:**
- JSON dosyasından index yükleme
- Memory'de cache'leme (HashSet ile)
- Tam eşleşme ve benzerlik araması

**Ana Metodlar:**
- `LoadFromJsonAsync(string jsonPath)` → JSON'dan yükle
- `Search(string searchText, int maxResults = 50)` → Arama yap

### HybridSimilarityCalculator

**Dosya:** `Application/Services/HybridSimilarityCalculator.cs`

**Sorumluluklar:**
- İki string arasındaki benzerlik skorunu hesaplama
- Kelime bazlı (70%) + Harf bazlı (30%) hibrit algoritma
- Geliştirilmiş puanlama sistemi (query coverage öncelikli)

**Ana Metodlar:**
- `CalculateSimilarity(string str1, string str2)` → Benzerlik skoru (0.0 - 1.0)

### StringNormalizationService

**Dosya:** `Shared/Services/StringNormalizationService.cs`

**Sorumluluklar:**
- Dosya isimlerini normalize etme
- Özel karakterleri dönüştürme (Türkçe, Fransızca, vb.)
- Uzantıları kaldırma

**Ana Metodlar:**
- `NormalizeFileName(string fileName)` → Normalize edilmiş dosya adı

### InMemoryWordIndex

**Dosya:** `Application/Services/InMemoryWordIndex.cs`

**Sorumluluklar:**
- Dosya sisteminden müzik dosyalarını tarama
- Index oluşturma
- JSON'a export etme

**Ana Metodlar:**
- `LoadFromFileSystemAsync()` → Dosya sisteminden yükle
- `ExportToSearchJsonAsync(string outputPath)` → JSON'a export et

---

## 📄 İlgili Dosyalar

### Kod Dosyaları

- `Application/Services/JsonWordIndexService.cs` → Ana arama servisi
- `Application/Services/HybridSimilarityCalculator.cs` → Benzerlik hesaplama
- `Application/Services/InMemoryWordIndex.cs` → Index oluşturma ve export
- `Application/Services/TrackFixService.cs` → Fix önerileri (JsonWordIndexService kullanır)
- `Shared/Services/StringNormalizationService.cs` → Normalizasyon

### JSON Dosyaları

- `word-index.json` → Ana arama index dosyası (bin/Debug/net10.0/)
- `word-index-debug.json` → Debug için özet istatistikler (opsiyonel)
- `word-index-full-debug.json` → İlk 100 kayıt (opsiyonel)

---

## ✅ Özet ve Öneriler

### Temel Prensipler

1. ✅ **JSON + Memory Cache:** Disk'te JSON, memory'de cache
2. ✅ **Tam Eşleşme Öncelikli:** Önce tam eşleşme, sonra benzerlik
3. ✅ **Kısa Kelime Filtresi YOK:** Arama sırasında tüm kelimeler kullanılır
4. ✅ **HashSet Kullanımı:** O(1) lookup performansı
5. ✅ **Similarity Threshold:** Minimum %30 benzerlik
6. ✅ **Geliştirilmiş Puanlama:** Query coverage öncelikli, bonus sistemi

### Avantajlar

- ✅ **Hızlı:** Tam eşleşme 10-50 ms, benzerlik 50-200 ms
- ✅ **Doğru:** Geliştirilmiş puanlama sistemi ile daha doğru sonuçlar
- ✅ **Esnek:** Typo'lar ve kısmi eşleşmeler bulunur
- ✅ **Memory Verimli:** ~30-50 MB (önceden ~111 MB)
- ✅ **Taşınabilir:** JSON dosyası kolayca paylaşılabilir

### Kullanım Senaryoları

1. **Tam Eşleşme:** "Dale Don Dale" → Anında sonuç (10-50 ms)
2. **Kısmi Eşleşme:** "Dale Don" → Benzerlik araması (50-200 ms)
3. **Typo:** "Dale Don Dale" (yazım hatası) → Benzerlik araması (50-200 ms)
4. **Kısa Kelime:** "DJ A" → Tam eşleşme (10-50 ms)

---

**Sonuç:** JSON + Memory Cache + Geliştirilmiş Puanlama = **En İyi Çözüm!** 🎯

