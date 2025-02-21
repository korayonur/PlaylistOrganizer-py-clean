"""
PlaylistOrganizer

VirtualDJ playlist dosyalarındaki bozuk veya hatalı dosya yollarını
tespit edip düzelten bir araç.
"""

import logging
import multiprocessing
import os
import sys
import time
import requests
from pathlib import Path
from multiprocessing import Process, Event

import uvicorn
import webview
from fastapi.staticfiles import StaticFiles
from apiserver import app
from config import (
    IS_DEVELOPMENT,
    API_PORT,
    API_HOST,
    FRONTEND_DEV_URL,
    FRONTEND_PROD_URL,
    LOG_LEVEL,
    APP_NAME,
    APP_WINDOW_SIZE
)

# Log formatını ve seviyesini ayarla
logging.basicConfig(
    level=logging.DEBUG if IS_DEVELOPMENT else logging.INFO,
    format='%(asctime)s - [%(name)s] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_resource_path(relative_path):
    """Kaynak dosyaların yolunu belirle"""
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def wait_for_api(timeout=30):
    """API'nin hazır olmasını bekle"""
    api_url = f"http://{API_HOST}:{API_PORT}/api/test"
    start_time = time.time()
    logger.info(f"API hazır olma kontrolü başlatıldı - Endpoint: {api_url}")
    
    while True:
        try:
            logger.debug(f"API'ye bağlantı deneniyor: {api_url}")
            response = requests.get(api_url)
            if response.status_code == 200:
                logger.info("API başarıyla başlatıldı ve hazır")
                logger.debug(f"API yanıtı: {response.json()}")
                return True
        except requests.RequestException as e:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                logger.error(f"API {timeout} saniye içinde başlatılamadı")
                logger.error(f"Son hata: {str(e)}")
                return False
            time.sleep(0.5)
            logger.debug(f"API'nin hazır olması bekleniyor... (geçen süre: {elapsed:.1f}s)")

def run_backend(api_ready_event):
    """Backend API'yi başlat"""
    try:
        logger.info("=" * 50)
        logger.info("API Başlatılıyor")
        logger.info(f"Çalışma Modu: {'Development' if IS_DEVELOPMENT else 'Production'}")
        logger.info(f"Entegrasyon: {'Bağımsız API' if IS_DEVELOPMENT else 'Masaüstü ile Birleşik'}")
        logger.info(f"API Endpoint: http://{API_HOST}:{API_PORT}")
        logger.info(f"Log Seviyesi: {LOG_LEVEL}")

        if not IS_DEVELOPMENT:
            # Production modunda frontend dosyalarını serve et
            static_path = get_resource_path('resources/web')
            logger.info(f"Frontend Klasörü: {static_path}")
            app.mount("/", StaticFiles(directory=static_path, html=True), name="frontend")
            logger.info("Frontend dosyaları yüklendi ve API ile birleştirildi")
        else:
            logger.info(f"Frontend Geliştirme Sunucusu: {FRONTEND_DEV_URL}")
        
        logger.info("=" * 50)
        
        # API'yi başlat
        uvicorn.run(
            app, 
            host=API_HOST, 
            port=API_PORT, 
            log_level=LOG_LEVEL,
            access_log=IS_DEVELOPMENT
        )
    except Exception as e:
        logger.error(f"Backend başlatılamadı: {e}")
        logger.error("API başlatma hatası detayları:", exc_info=True)
    finally:
        api_ready_event.clear()


class PlaylistOrganizer:
    """Ana uygulama sınıfı"""

    def __init__(self):
        self.window = None
        self.backend_process = None
        self.api_ready_event = Event()

    def on_loaded(self):
        """Sayfa yüklendiğinde çağrılır"""
        try:
            # Geliştirici araçlarını aç
            self.window.evaluate_js("""
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.debug) {
                    window.webkit.messageHandlers.debug.postMessage('');
                }
            """)
            logger.info("Geliştirici araçları aktifleştirildi")
        except Exception as e:
            logger.error(f"Geliştirici araçları açılırken hata: {e}")

    def create_window(self):
        """Pencereyi oluştur"""
        try:
            # Development veya production moduna göre URL belirle
            app_url = FRONTEND_DEV_URL if IS_DEVELOPMENT else FRONTEND_PROD_URL
            
            # API'nin hazır olmasını bekle
            logger.info("API'nin hazır olması bekleniyor...")
            if not wait_for_api():
                raise Exception("API başlatılamadı")
            
            # Pencereyi oluştur
            self.window = webview.create_window(
                APP_NAME,
                url=app_url,
                width=APP_WINDOW_SIZE["width"],
                height=APP_WINDOW_SIZE["height"],
                resizable=True,
                fullscreen=False,
                min_size=(APP_WINDOW_SIZE["min_width"], APP_WINDOW_SIZE["min_height"]),
                background_color="#FFF",
                text_select=True,
                js_api=self
            )

            # Sayfa yüklendiğinde çağrılacak fonksiyonu ayarla
            self.window.events.loaded += self.on_loaded

            logger.info("=" * 50)
            logger.info("Masaüstü Uygulaması Başlatıldı")
            logger.info(f"Çalışma Modu: {'Development' if IS_DEVELOPMENT else 'Production'}")
            logger.info(f"Entegrasyon: {'Bağımsız Uygulama' if IS_DEVELOPMENT else 'API ile Birleşik'}")
            logger.info(f"Frontend URL: {app_url}")
            logger.info(f"API Port: {API_PORT}")
            if not IS_DEVELOPMENT:
                logger.info(f"Frontend Klasörü: {get_resource_path('resources/web')}")
            logger.info("=" * 50)
        except Exception as e:
            logger.error(f"Pencere oluşturma hatası: {e}")
            logger.error("Pencere oluşturma hatası detayları:", exc_info=True)
            raise

    def run(self):
        """Uygulamayı çalıştır"""
        try:
            logger.info("=" * 50)
            logger.info("PlaylistOrganizer Başlatılıyor")
            logger.info(f"Mod: {'Development' if IS_DEVELOPMENT else 'Production'}")
            logger.info("=" * 50)

            # Backend'i başlat
            self.backend_process = Process(target=run_backend, args=(self.api_ready_event,))
            self.backend_process.start()

            # Pencereyi oluştur
            self.create_window()

            # GUI'yi başlat (debug modu her zaman aktif)
            webview.start(debug=True)

        except Exception as e:
            logger.error(f"Uygulama çalıştırma hatası: {e}")
            logger.error("Uygulama hatası detayları:", exc_info=True)
            raise
        finally:
            # Temizlik işlemleri
            self.cleanup()

    def cleanup(self):
        """Uygulama kaynaklarını temizle"""
        try:
            logger.info("=" * 50)
            logger.info("Uygulama Kapatılıyor")
            
            # Backend'i kapat
            if self.backend_process:
                self.backend_process.terminate()
                logger.info("Backend servisi sonlandırıldı")
            
            logger.info("Temizlik işlemleri tamamlandı")
            logger.info("=" * 50)

        except Exception as e:
            logger.error(f"Temizleme hatası: {e}")
            logger.error("Temizleme hatası detayları:", exc_info=True)


def main():
    """Ana fonksiyon"""
    try:
        app = PlaylistOrganizer()
        app.run()
    except Exception as e:
        logger.error(f"Ana uygulama hatası: {e}")
        logger.error("Ana uygulama hatası detayları:", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
