# PlaylistOrganizer

Bu proje, müzik çalma listelerinizi organize etmenize yardımcı olan bir uygulamadır. Proje iki ana bileşenden oluşmaktadır:

## Proje Yapısı

```
PlaylistOrganizer/
├── frontend/     # Angular tabanlı web uygulaması (Frontend)
└── py/          # Python tabanlı backend ve masaüstü uygulaması
```

## Bileşenler

### Web Uygulaması (frontend/)
- Modern ve kullanıcı dostu arayüz
- Çalma listesi yönetimi
- Müzik dosyası organizasyonu
- Gerçek zamanlı güncellemeler

Geliştirme için:
```bash
cd frontend
npm install
ng serve
```

### Backend ve Masaüstü Uygulaması (py/)
- FastAPI tabanlı REST API
- Clean Architecture ve Domain Driven Design
- pywebview tabanlı masaüstü uygulaması
  - Minimal ve hafif yapı
  - Tüm platformlarda native destek (ARM64 dahil)
  - Sistem kaynaklarını verimli kullanım
  - Kolay kurulum ve yapılandırma
- Yerel dosya sistemi entegrasyonu
- Müzik dosyası metadata işleme
- JSON tabanlı veri depolama

Geliştirme için:
```bash
cd py
poetry install
poetry run python -m py  # Masaüstü uygulaması için
poetry run python apiserver.py  # Backend API için
```

## Teknik Detaylar

### Masaüstü Uygulama Mimarisi
Uygulama başlangıçta Chromium Embedded Framework (CEF) kullanılarak geliştirildi, ancak daha sonra aşağıdaki avantajlar nedeniyle pywebview'a geçiş yapıldı:

- **Minimal Yapı**: pywebview, sistemin yerel web görüntüleyicisini kullanarak daha hafif ve verimli bir çözüm sunar
- **Platform Desteği**: Tüm platformlarda (Windows, macOS, Linux) ve mimarilerde (x86_64, ARM64) sorunsuz çalışır
- **Kolay Entegrasyon**: Basit API yapısı sayesinde hızlı geliştirme ve kolay bakım
- **Düşük Kaynak Kullanımı**: Native web görüntüleyici kullanımı sayesinde minimum sistem kaynağı tüketimi
- **Hızlı Başlangıç**: Küçük boyutlu bağımlılıklar ve basit kurulum süreci

## Geliştirme Ortamı Gereksinimleri

### Frontend Gereksinimleri
- Node.js 18+
- Angular CLI
- npm veya yarn
- Web tarayıcı (Chrome/Firefox önerilir)

### Backend Gereksinimleri
- Python 3.11+
- Poetry (Python paket yöneticisi)
- pip (Python paket yöneticisi)
- Sistem gereksinimleri:
  - macOS: Xcode Command Line Tools
  - Linux: python3-dev, build-essential
  - Windows: Visual C++ Build Tools

### IDE Önerileri
- Visual Studio Code
  - Python eklentisi
  - Angular Language Service
  - ESLint
  - Black Formatter
- PyCharm Professional (alternatif)

## Geliştirme Planı

1. Angular uygulamasının backend servislerinin geliştirilmesi
2. Eski Node.js backend'in Python'a taşınması
3. Masaüstü uygulamasının WebView entegrasyonu
4. Veri modellerinin senkronizasyonu

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik: Açıklama'`)
4. Branch'inizi push edin (`git push origin feature/yeniOzellik`)
5. Bir Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.
