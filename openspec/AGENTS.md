# OpenSpec Talimatları

OpenSpec ile spec-driven development için AI kodlama asistanlarına talimatlar.

## TL;DR Hızlı Kontrol Listesi

- Mevcut işleri ara: `openspec spec list --long`, `openspec list` (tam metin arama için sadece `rg` kullan)
- Kapsamı belirle: yeni yetenek vs mevcut yeteneği değiştir
- Benzersiz `change-id` seç: kebab-case, fiil öncelikli (`add-`, `update-`, `remove-`, `refactor-`)
- İskelet oluştur: `proposal.md`, `tasks.md`, `design.md` (sadece gerekirse), ve etkilenen yetenek başına delta spec'ler
- Delta'ları yaz: `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` kullan; gereksinim başına en az bir `#### Scenario:` dahil et
- Doğrula: `openspec validate [change-id] --strict` ve sorunları düzelt
- Onay iste: Öneri onaylanana kadar implementasyona başlama

## Üç Aşamalı İş Akışı

### Aşama 1: Değişiklik Oluşturma
Şu durumlarda öneri oluştur:
- Özellik veya işlevsellik ekleme
- Breaking değişiklikler yapma (API, şema)
- Mimari veya desenleri değiştirme
- Performans optimizasyonu (davranışı değiştiren)
- Güvenlik desenlerini güncelleme

Tetikleyiciler (örnekler):
- "Değişiklik önerisi oluşturmama yardım et"
- "Değişiklik planlamama yardım et"
- "Öneri oluşturmama yardım et"
- "Spec önerisi oluşturmak istiyorum"
- "Spec oluşturmak istiyorum"

Gevşek eşleştirme rehberi:
- Şunlardan birini içerir: `proposal`, `change`, `spec`
- Şunlardan biriyle: `create`, `plan`, `make`, `start`, `help`

Öneriyi atla:
- Bug düzeltmeleri (istenen davranışı geri yükleme)
- Yazım hataları, formatlama, yorumlar
- Bağımlılık güncellemeleri (breaking olmayan)
- Konfigürasyon değişiklikleri
- Mevcut davranış için testler

**İş Akışı**
1. Mevcut bağlamı anlamak için `openspec/project.md`, `openspec list`, ve `openspec list --specs`'i incele.
2. Benzersiz fiil öncelikli `change-id` seç ve `openspec/changes/<id>/` altında `proposal.md`, `tasks.md`, opsiyonel `design.md`, ve spec delta'larını iskelet oluştur.
3. Gereksinim başına en az bir `#### Scenario:` ile `## ADDED|MODIFIED|REMOVED Requirements` kullanarak spec delta'larını taslağa al.
4. Öneriyi paylaşmadan önce `openspec validate <id> --strict` çalıştır ve sorunları çöz.

### Aşama 2: Değişiklikleri Uygulama
Bu adımları TODO olarak takip et ve tek tek tamamla.
1. **proposal.md'yi oku** - Ne inşa edildiğini anla
2. **design.md'yi oku** (varsa) - Teknik kararları incele
3. **tasks.md'yi oku** - Uygulama kontrol listesini al
4. **Görevleri sırayla uygula** - Sırayla tamamla
5. **Tamamlamayı onayla** - Durumları güncellemeden önce `tasks.md`'deki her öğenin bittiğinden emin ol
6. **Kontrol listesini güncelle** - Tüm iş bittikten sonra, liste gerçeği yansıtsın diye her görevi `- [x]` olarak ayarla
7. **Onay kapısı** - Öneri incelenip onaylanana kadar uygulamaya başlama

### Aşama 3: Değişiklikleri Arşivleme
Deployment'tan sonra, ayrı PR oluştur:
- `changes/[name]/` → `changes/archive/YYYY-MM-DD-[name]/` taşı
- Yetenekler değiştiyse `specs/`'i güncelle
- Sadece araç değişiklikleri için `openspec archive [change] --skip-specs --yes` kullan
- Arşivlenen değişikliğin kontrolleri geçtiğini doğrulamak için `openspec validate --strict` çalıştır

## Herhangi Bir Görevden Önce

**Bağlam Kontrol Listesi:**
- [ ] `specs/[capability]/spec.md`'deki ilgili spec'leri oku
- [ ] Çakışmalar için `changes/`'deki bekleyen değişiklikleri kontrol et
- [ ] Konvansiyonlar için `openspec/project.md`'yi oku
- [ ] Aktif değişiklikleri görmek için `openspec list` çalıştır
- [ ] Mevcut yetenekleri görmek için `openspec list --specs` çalıştır

**Spec Oluşturmadan Önce:**
- Her zaman yeteneğin zaten var olup olmadığını kontrol et
- Duplikat oluşturmak yerine mevcut spec'leri değiştirmeyi tercih et
- Mevcut durumu incelemek için `openspec show [spec]` kullan
- İstek belirsizse, iskelet oluşturmadan önce 1-2 açıklayıcı soru sor

### Arama Rehberi
- Spec'leri listele: `openspec spec list --long` (veya scriptler için `--json`)
- Değişiklikleri listele: `openspec list` (veya `openspec change list --json` - deprecated ama mevcut)
- Detayları göster:
  - Spec: `openspec show <spec-id> --type spec` (filtreler için `--json` kullan)
  - Değişiklik: `openspec show <change-id> --json --deltas-only`
- Tam metin arama (ripgrep kullan): `rg -n "Requirement:|Scenario:" openspec/specs`

## Hızlı Başlangıç

### CLI Komutları

```bash
# Temel komutlar
openspec list                  # Aktif değişiklikleri listele
openspec list --specs          # Spesifikasyonları listele
openspec show [item]           # Değişiklik veya spec'i göster
openspec diff [change]         # Spec farklarını göster
openspec validate [item]       # Değişiklikleri veya spec'leri doğrula
openspec archive [change] [--yes|-y]      # Deployment sonrası arşivle (etkileşimsiz çalıştırma için --yes ekle)

# Proje yönetimi
openspec init [path]           # OpenSpec'i başlat
openspec update [path]         # Talimat dosyalarını güncelle

# Etkileşimli mod
openspec show                  # Seçim için istem
openspec validate              # Toplu doğrulama modu

# Hata ayıklama
openspec show [change] --json --deltas-only
openspec validate [change] --strict
```

### Komut Bayrakları

- `--json` - Makine tarafından okunabilir çıktı
- `--type change|spec` - Öğeleri ayırt et
- `--strict` - Kapsamlı doğrulama
- `--no-interactive` - İstemleri devre dışı bırak
- `--skip-specs` - Spec güncellemeleri olmadan arşivle
- `--yes`/`-y` - Onay istemlerini atla (etkileşimsiz arşivleme)

## Dizin Yapısı

```
openspec/
├── project.md              # Proje konvansiyonları
├── specs/                  # Mevcut gerçek - ne İNŞA EDİLDİ
│   └── [capability]/       # Tek odaklı yetenek
│       ├── spec.md         # Gereksinimler ve senaryolar
│       └── design.md       # Teknik desenler
├── changes/                # Öneriler - ne DEĞİŞMELİ
│   ├── [change-name]/
│   │   ├── proposal.md     # Neden, ne, etki
│   │   ├── tasks.md        # Uygulama kontrol listesi
│   │   ├── design.md       # Teknik kararlar (opsiyonel; kriterlere bak)
│   │   └── specs/          # Delta değişiklikleri
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # Tamamlanan değişiklikler
```

## Değişiklik Önerileri Oluşturma

### Karar Ağacı

```
Yeni istek?
├─ Spec davranışını geri yükleyen bug düzeltmesi? → Doğrudan düzelt
├─ Yazım hatası/format/yorum? → Doğrudan düzelt  
├─ Yeni özellik/yetenek? → Öneri oluştur
├─ Breaking değişiklik? → Öneri oluştur
├─ Mimari değişiklik? → Öneri oluştur
└─ Belirsiz? → Öneri oluştur (daha güvenli)
```

### Öneri Yapısı

1. **Dizin oluştur:** `changes/[change-id]/` (kebab-case, fiil öncelikli, benzersiz)

2. **proposal.md yaz:**
```markdown
## Neden
[Problem/fırsat hakkında 1-2 cümle]

## Ne Değişiyor
- [Değişikliklerin madde listesi]
- [Breaking değişiklikleri **BREAKING** ile işaretle]

## Etki
- Etkilenen spec'ler: [yetenekleri listele]
- Etkilenen kod: [ana dosyalar/sistemler]
```

3. **Spec delta'ları oluştur:** `specs/[capability]/spec.md`
```markdown
## ADDED Requirements
### Requirement: Yeni Özellik
Sistem şunları SAĞLAMALIDIR...

#### Scenario: Başarı durumu
- **WHEN** kullanıcı eylem gerçekleştirir
- **THEN** beklenen sonuç

## MODIFIED Requirements
### Requirement: Mevcut Özellik
[Tam değiştirilmiş gereksinim]

## REMOVED Requirements
### Requirement: Eski Özellik
**Sebep**: [Neden kaldırılıyor]
**Geçiş**: [Nasıl ele alınacak]
```
Birden fazla yetenek etkileniyorsa, `changes/[change-id]/specs/<capability>/spec.md` altında birden fazla delta dosyası oluştur—yetenek başına bir tane.

4. **tasks.md oluştur:**
```markdown
## 1. Uygulama
- [ ] 1.1 Veritabanı şeması oluştur
- [ ] 1.2 API endpoint'i uygula
- [ ] 1.3 Frontend bileşeni ekle
- [ ] 1.4 Testler yaz
```

5. **Gerektiğinde design.md oluştur:**
Aşağıdakilerden herhangi biri geçerliyse `design.md` oluştur; aksi takdirde atla:
- Çapraz kesen değişiklik (birden fazla servis/modül) veya yeni mimari desen
- Yeni dış bağımlılık veya önemli veri modeli değişiklikleri
- Güvenlik, performans veya geçiş karmaşıklığı
- Teknik kararlardan önce belirsizlik faydalı olacaksa

Minimal `design.md` iskeleti:
```markdown
## Bağlam
[Arka plan, kısıtlamalar, paydaşlar]

## Hedefler / Hedef Olmayanlar
- Hedefler: [...]
- Hedef Olmayanlar: [...]

## Kararlar
- Karar: [Ne ve neden]
- Değerlendirilen alternatifler: [Seçenekler + gerekçe]

## Riskler / Ödünler
- [Risk] → Azaltma

## Geçiş Planı
[Adımlar, geri alma]

## Açık Sorular
- [...]
```

## Spec Dosya Formatı

### Kritik: Senaryo Formatlaması

**DOĞRU** (#### başlıkları kullan):
```markdown
#### Scenario: Kullanıcı giriş başarısı
- **WHEN** geçerli kimlik bilgileri sağlanır
- **THEN** JWT token döndür
```

**YANLIŞ** (madde işaretleri veya kalın yazı kullanma):
```markdown
- **Scenario: Kullanıcı girişi**  ❌
**Scenario**: Kullanıcı girişi     ❌
### Scenario: Kullanıcı girişi      ❌
```

Her gereksinim EN AZ BİR senaryoya sahip OLMALIDIR.

### Gereksinim Kelime Seçimi
- Normatif gereksinimler için SHALL/MUST kullan (kasıtlı olarak normatif olmayan durumlar dışında should/may'dan kaçın)

### Delta İşlemleri

- `## ADDED Requirements` - Yeni yetenekler
- `## MODIFIED Requirements` - Değişen davranış
- `## REMOVED Requirements` - Kullanımdan kaldırılan özellikler
- `## RENAMED Requirements` - İsim değişiklikleri

Başlıklar `trim(header)` ile eşleştirilir - boşluklar göz ardı edilir.

#### ADDED vs MODIFIED ne zaman kullanılır
- ADDED: Tek başına durabilen yeni bir yetenek veya alt-yetenek tanıtır. Değişiklik ortogonal olduğunda (örn. "Slash Command Configuration" ekleme) ADDED'i tercih et, mevcut gereksinimin semantiğini değiştirmek yerine.
- MODIFIED: Mevcut gereksinimin davranışını, kapsamını veya kabul kriterlerini değiştirir. Her zaman tam, güncellenmiş gereksinim içeriğini yapıştır (başlık + tüm senaryolar). Arşivleyici tüm gereksinimi burada sağladığınla değiştirecek; kısmi delta'lar önceki detayları kaybedecek.
- RENAMED: Sadece isim değiştiğinde kullan. Davranışı da değiştiriyorsan, RENAMED (isim) artı MODIFIED (içerik) kullan, yeni isme referans vererek.

Yaygın tuzak: Önceki metni dahil etmeden MODIFIED kullanarak yeni bir endişe eklemek. Bu arşivleme zamanında detay kaybına neden olur. Mevcut gereksinimi açıkça değiştirmiyorsan, bunun yerine ADDED altında yeni gereksinim ekle.

MODIFIED gereksinimi doğru şekilde yazma:
1) Mevcut gereksinimi `openspec/specs/<capability>/spec.md`'de bul.
2) Tüm gereksinim bloğunu kopyala (`### Requirement: ...`'dan senaryolarına kadar).
3) `## MODIFIED Requirements` altına yapıştır ve yeni davranışı yansıtacak şekilde düzenle.
4) Başlık metninin tam olarak eşleştiğinden emin ol (boşluk duyarsız) ve en az bir `#### Scenario:` tut.

RENAMED için örnek:
```markdown
## RENAMED Requirements
- FROM: `### Requirement: Login`
- TO: `### Requirement: User Authentication`
```

## Sorun Giderme

### Yaygın Hatalar

**"Değişiklik en az bir delta'ya sahip olmalı"**
- `changes/[name]/specs/`'in .md dosyalarıyla var olduğunu kontrol et
- Dosyaların işlem öneklerine sahip olduğunu doğrula (## ADDED Requirements)

**"Gereksinim en az bir senaryoya sahip olmalı"**
- Senaryoların `#### Scenario:` formatını kullandığını kontrol et (4 hashtag)
- Senaryo başlıkları için madde işaretleri veya kalın yazı kullanma

**Sessiz senaryo ayrıştırma hataları**
- Kesin format gerekli: `#### Scenario: İsim`
- `openspec show [change] --json --deltas-only` ile hata ayıkla

### Doğrulama İpuçları

```bash
# Kapsamlı kontroller için her zaman strict modu kullan
openspec validate [change] --strict

# Delta ayrıştırmasını hata ayıkla
openspec show [change] --json | jq '.deltas'

# Belirli gereksinimi kontrol et
openspec show [spec] --json -r 1
```

## Mutlu Yol Scripti

```bash
# 1) Mevcut durumu keşfet
openspec spec list --long
openspec list
# Opsiyonel tam metin arama:
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) Değişiklik id'si seç ve iskelet oluştur
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Neden\n...\n\n## Ne Değişiyor\n- ...\n\n## Etki\n- ...\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Uygulama\n- [ ] 1.1 ...\n" > openspec/changes/$CHANGE/tasks.md

# 3) Delta'ları ekle (örnek)
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: İki Faktörlü Kimlik Doğrulama
Kullanıcılar giriş sırasında ikinci bir faktör sağlamalıdır.

#### Scenario: OTP gerekli
- **WHEN** geçerli kimlik bilgileri sağlanır
- **THEN** OTP meydan okuması gerekir
EOF

# 4) Doğrula
openspec validate $CHANGE --strict
```

## Çoklu Yetenek Örneği

```
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: İki Faktörlü Kimlik Doğrulama
    └── notifications/
        └── spec.md   # ADDED: OTP email bildirimi
```

auth/spec.md
```markdown
## ADDED Requirements
### Requirement: İki Faktörlü Kimlik Doğrulama
...
```

notifications/spec.md
```markdown
## ADDED Requirements
### Requirement: OTP Email Bildirimi
...
```

## En İyi Uygulamalar

### Basitlik Önce
- Varsayılan olarak <100 satır yeni kod
- Yetersiz olduğu kanıtlanana kadar tek dosya uygulamaları
- Net gerekçe olmadan framework'lerden kaçın
- Sıkıcı, kanıtlanmış desenleri seç

### Karmaşıklık Tetikleyicileri
Sadece şu durumlarda karmaşıklık ekle:
- Mevcut çözümün çok yavaş olduğunu gösteren performans verisi
- Somut ölçek gereksinimleri (>1000 kullanıcı, >100MB veri)
- Soyutlama gerektiren birden fazla kanıtlanmış kullanım durumu

### Net Referanslar
- Kod konumları için `file.ts:42` formatını kullan
- Spec'leri `specs/auth/spec.md` olarak referans ver
- İlgili değişiklikleri ve PR'ları bağla

### Yetenek İsimlendirme
- Fiil-isim kullan: `user-auth`, `payment-capture`
- Yetenek başına tek amaç
- 10 dakikalık anlaşılabilirlik kuralı
- Açıklama "VE" gerektiriyorsa böl

### Değişiklik ID İsimlendirme
- Kebab-case, kısa ve açıklayıcı kullan: `add-two-factor-auth`
- Fiil öncelikli önekleri tercih et: `add-`, `update-`, `remove-`, `refactor-`
- Benzersizliği sağla; alınmışsa `-2`, `-3` vb. ekle

## Araç Seçim Rehberi

| Görev | Araç | Neden |
|-------|------|-------|
| Dosyaları desene göre bul | Glob | Hızlı desen eşleştirme |
| Kod içeriğini ara | Grep | Optimize edilmiş regex arama |
| Belirli dosyaları oku | Read | Doğrudan dosya erişimi |
| Bilinmeyen kapsamı keşfet | Task | Çok adımlı araştırma |

## Hata Kurtarma

### Değişiklik Çakışmaları
1. Aktif değişiklikleri görmek için `openspec list` çalıştır
2. Çakışan spec'leri kontrol et
3. Değişiklik sahipleriyle koordine et
4. Önerileri birleştirmeyi düşün

### Doğrulama Hataları
1. `--strict` bayrağıyla çalıştır
2. JSON çıktısını detaylar için kontrol et
3. Spec dosya formatını doğrula
4. Senaryoların düzgün formatlandığından emin ol

### Eksik Bağlam
1. Önce project.md'yi oku
2. İlgili spec'leri kontrol et
3. Son arşivleri incele
4. Açıklama iste

## Hızlı Referans

### Aşama Göstergeleri
- `changes/` - Önerilen, henüz inşa edilmemiş
- `specs/` - İnşa edilmiş ve dağıtılmış
- `archive/` - Tamamlanan değişiklikler

### Dosya Amaçları
- `proposal.md` - Neden ve ne
- `tasks.md` - Uygulama adımları
- `design.md` - Teknik kararlar
- `spec.md` - Gereksinimler ve davranış

### CLI Temelleri
```bash
openspec list              # Ne devam ediyor?
openspec show [item]       # Detayları görüntüle
openspec diff [change]     # Ne değişiyor?
openspec validate --strict # Doğru mu?
openspec archive [change] [--yes|-y]  # Tamamlandı olarak işaretle (otomasyon için --yes ekle)
```

Hatırla: Spec'ler gerçektir. Değişiklikler önerilerdir. Senkronize tut.
