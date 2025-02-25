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
import webview
import uvicorn
import webbrowser
from threading import Event
from pathlib import Path
from multiprocessing import Process, freeze_support
from config import (
    IS_DEVELOPMENT,
    API_PORT,
    API_HOST,
    FRONTEND_DEV_URL,
    FRONTEND_PROD_URL,
    LOG_LEVEL,
    APP_NAME,
    WHATSAPP_CONTACT,
    DEFAULT_LANGUAGE,
    FRONTEND_URL,
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    WINDOW_TITLE,
    WINDOW_BACKGROUND_COLOR
)
from infrastructure.localization import get_text, set_language, get_current_language

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
    """API'nin hazır olup olmadığını kontrol et"""
    logger.info("API'nin hazır olması bekleniyor...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"http://127.0.0.1:{API_PORT}/health", timeout=2)
            if response.status_code == 200:
                logger.info("API hazır!")
                return True
        except requests.RequestException:
            pass
        
        time.sleep(0.5)
    
    logger.error(f"API {timeout} saniye içinde hazır olmadı!")
    return False

def run_backend():
    """Backend API'yi başlat"""
    try:
        logger.info("=" * 50)
        logger.info("API Başlatılıyor")
        logger.info(f"Çalışma Modu: {'Development' if IS_DEVELOPMENT else 'Production'}")
        logger.info(f"API Endpoint: http://{API_HOST}:{API_PORT}")
        logger.info(f"Log Seviyesi: {LOG_LEVEL}")

        if not IS_DEVELOPMENT:
            # Production modunda frontend dosyalarını serve et
            from fastapi.staticfiles import StaticFiles
            from apiserver import app
            
            static_path = get_resource_path('resources/web')
            logger.info(f"Frontend Klasörü: {static_path}")
            app.mount("/", StaticFiles(directory=static_path, html=True), name="frontend")
            logger.info("Frontend dosyaları yüklendi ve API ile birleştirildi")
        else:
            logger.info(f"Frontend Geliştirme Sunucusu: {FRONTEND_DEV_URL}")
        
        logger.info("=" * 50)
        
        # API'yi başlat
        from apiserver import app
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

class PlaylistOrganizer:
    """Playlist Organizer uygulaması"""
    
    def __init__(self):
        """Uygulama başlatılıyor"""
        self.api_process = None
        self.window = None
    
    def run(self):
        """Uygulamayı çalıştır"""
        try:
            logger.info("=" * 50)
            logger.info("PlaylistOrganizer Başlatılıyor")
            logger.info(f"Mod: {'Geliştirme' if IS_DEVELOPMENT else 'Üretim'}")
            logger.info("=" * 50)
            
            # Multiprocessing desteği (PyInstaller için gerekli)
            multiprocessing.freeze_support()
            
            # API sunucusunu ayrı bir süreçte başlat
            self.api_process = multiprocessing.Process(target=run_backend)
            self.api_process.daemon = True
            self.api_process.start()
            
            # API'nin hazır olmasını bekle
            if not wait_for_api():
                logger.error("API başlatılamadı, uygulama kapatılıyor.")
                self.cleanup()
                sys.exit(1)
            
            # GUI penceresini oluştur
            self.create_window()
            
            # Temizlik işlemleri
            self.cleanup()
            
        except Exception as e:
            logger.error(f"Uygulama çalıştırılırken hata: {e}")
            self.cleanup()
            sys.exit(1)
    
    def create_window(self):
        """GUI penceresini oluştur"""
        try:
            logger.info("GUI penceresi oluşturuluyor...")
            
            # API hazır değilse çık
            if not wait_for_api():
                logger.error("API hazır değil, pencere oluşturulamıyor.")
                return
            
            # Uygulama modunu logla
            logger.info("=" * 50)
            logger.info("Masaüstü Uygulaması Başlatıldı")
            logger.info(f"Frontend URL: {FRONTEND_URL}")
            logger.info(f"API Port: {API_PORT}")
            logger.info("=" * 50)
            
            # Menüyü oluştur
            menu_items = self.create_custom_menu()
            
            # Pencereyi oluştur
            self.window = webview.create_window(
                title=WINDOW_TITLE,
                url=FRONTEND_URL,
                width=WINDOW_WIDTH,
                height=WINDOW_HEIGHT,
                background_color=WINDOW_BACKGROUND_COLOR,
                resizable=True,
                min_size=(800, 600),
                text_select=True,
                confirm_close=True,
                js_api=None
            )
            
            logger.info("Pencere başarıyla oluşturuldu, webview.start çağrılıyor...")
            
            # Pencereyi göster - özel menüyü kullan
            webview.start(debug=IS_DEVELOPMENT, menu=menu_items)
            
        except Exception as e:
            logger.error(f"Pencere oluşturulurken hata: {e}")
            logger.exception("Pencere oluşturma hatası detayları:")
            raise
    
    def create_custom_menu(self):
        """Özel menüyü oluştur"""
        try:
            logger.info("Menü oluşturuluyor...")
            
            # Menu ve MenuAction sınıflarını import et
            from webview.menu import Menu, MenuAction, MenuSeparator
            
            # Ana menü
            menu_items = [
                Menu(
                    'Playlist Organizer',
                    [
                        MenuAction(get_text('menu.about'), self.show_about_dialog),
                        MenuAction(get_text('menu.fullscreen'), self.toggle_fullscreen),
                        MenuSeparator(),
                        MenuAction(get_text('menu.quit'), self.quit_app)
                    ]
                ),
                Menu(
                    get_text('menu.language'),
                    [
                        MenuAction(get_text('menu.language.turkish'), lambda: self.change_language('tr')),
                        MenuAction(get_text('menu.language.english'), lambda: self.change_language('en'))
                    ]
                ),
                Menu(
                    get_text('menu.contact'),
                    [
                        MenuAction(get_text('menu.contact.whatsapp'), self.open_whatsapp),
                        MenuAction(get_text('menu.contact.report'), self.show_report_form)
                    ]
                )
            ]
            
            logger.info("Menü başarıyla oluşturuldu")
            return menu_items
            
        except Exception as e:
            logger.error(f"Menü oluşturulurken hata: {e}")
            logger.exception("Menü oluşturma hatası detayları:")
            return []
    
    def show_about_dialog(self):
        """Hakkında dialogunu göster"""
        try:
            if webview.windows and len(webview.windows) > 0:
                webview.windows[0].create_confirmation_dialog(
                    get_text('dialog.about.title'),
                    get_text('dialog.about.content')
                )
                logger.info("Hakkında dialogu gösterildi")
            else:
                logger.error("Pencere bulunamadı, dialog gösterilemiyor")
        except Exception as e:
            logger.error(f"Hakkında dialogu gösterilirken hata: {e}")
            logger.exception("Dialog hatası detayları:")
    
    def quit_app(self):
        """Uygulamadan çık"""
        try:
            webview.windows[0].destroy()
        except Exception as e:
            logger.error(f"Uygulama kapatılırken hata: {e}")
            sys.exit(0)
    
    def change_language(self, lang):
        """Dili değiştir"""
        try:
            if set_language(lang):
                # Kullanıcıya bilgi ver
                if webview.windows and len(webview.windows) > 0:
                    webview.windows[0].create_confirmation_dialog(
                        get_text('dialog.language.title'),
                        get_text('dialog.language.changed')
                    )
                    logger.info(f"Dil değiştirildi: {lang}")
                else:
                    logger.error("Pencere bulunamadı, dialog gösterilemiyor")
            else:
                logger.warning(f"Dil değiştirilemedi: {lang}")
        except Exception as e:
            logger.error(f"Dil değiştirilirken hata: {e}")
            logger.exception("Dil değiştirme hatası detayları:")
    
    def open_whatsapp(self):
        """WhatsApp'ı aç"""
        try:
            # WhatsApp web URL'sini oluştur
            whatsapp_url = f"https://wa.me/{WHATSAPP_CONTACT}"
            
            # URL'yi varsayılan tarayıcıda aç
            webbrowser.open(whatsapp_url)
            
            logger.info(f"WhatsApp açıldı: {whatsapp_url}")
        except Exception as e:
            logger.error(f"WhatsApp açılırken hata: {e}")
            logger.exception("WhatsApp açma hatası detayları:")
            if webview.windows and len(webview.windows) > 0:
                webview.windows[0].create_confirmation_dialog(
                    get_text('dialog.contact.title'),
                    get_text('dialog.contact.error').format(str(e))
                )
    
    def toggle_fullscreen(self):
        """Tam ekran modunu aç/kapat"""
        try:
            if webview.windows and len(webview.windows) > 0:
                window = webview.windows[0]
                window.toggle_fullscreen()
                logger.info("Tam ekran modu değiştirildi")
            else:
                logger.error("Pencere bulunamadı, tam ekran değiştirilemiyor")
        except Exception as e:
            logger.error(f"Tam ekran değiştirilirken hata: {e}")
            logger.exception("Tam ekran hatası detayları:")
    
    def show_report_form(self):
        """Rapor formunu göster"""
        try:
            if webview.windows and len(webview.windows) > 0:
                result = webview.windows[0].create_file_dialog(
                    webview.SAVE_DIALOG,
                    directory='~',
                    save_filename='playlist_organizer_report.txt',
                    file_types=('Text Files (*.txt)',)
                )
                
                if result:
                    self.generate_report(result)
            else:
                logger.error("Pencere bulunamadı, dialog gösterilemiyor")
        except Exception as e:
            logger.error(f"Rapor formu gösterilirken hata: {e}")
            logger.exception("Rapor formu hatası detayları:")
    
    def generate_report(self, file_path):
        """Rapor oluştur"""
        try:
            # Sistem bilgilerini al
            import platform
            
            # Rapor içeriğini oluştur
            report_content = get_text('report.content').format(
                date=time.strftime("%Y-%m-%d %H:%M:%S"),
                version="1.0.0",
                os=platform.platform(),
                python=platform.python_version()
            )
            
            # Raporu dosyaya yaz
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            # Kullanıcıya bilgi ver
            if webview.windows and len(webview.windows) > 0:
                webview.windows[0].create_confirmation_dialog(
                    get_text('dialog.report.title'),
                    get_text('dialog.report.success').format(file_path)
                )
                logger.info(f"Rapor oluşturuldu: {file_path}")
            else:
                logger.error("Pencere bulunamadı, dialog gösterilemiyor")
        except Exception as e:
            logger.error(f"Rapor oluşturulurken hata: {e}")
            logger.exception("Rapor oluşturma hatası detayları:")
            if webview.windows and len(webview.windows) > 0:
                webview.windows[0].create_confirmation_dialog(
                    get_text('dialog.report.title'),
                    get_text('dialog.report.error').format(str(e))
                )
    
    def cleanup(self):
        """Temizlik işlemleri"""
        try:
            logger.info("Temizlik işlemleri yapılıyor...")
            
            # API sürecini sonlandır
            if self.api_process and self.api_process.is_alive():
                logger.info("API süreci sonlandırılıyor...")
                self.api_process.terminate()
                self.api_process.join(timeout=5)
                
                # Hala çalışıyorsa zorla sonlandır
                if self.api_process.is_alive():
                    logger.warning("API süreci zorla sonlandırılıyor...")
                    self.api_process.kill()
            
            logger.info("Temizlik işlemleri tamamlandı")
            
        except Exception as e:
            logger.error(f"Temizlik işlemleri sırasında hata: {e}")


def main():
    """Ana fonksiyon"""
    # Windows için multiprocessing desteği
    if sys.platform.startswith('win'):
        multiprocessing.freeze_support()
    
    # macOS için multiprocessing desteği
    if sys.platform == 'darwin':
        multiprocessing.set_start_method('spawn', force=True)
    
    try:
        app = PlaylistOrganizer()
        app.run()
        return 0  # Başarılı çıkış
    except Exception as e:
        logger.error(f"Ana uygulama hatası: {e}")
        logger.error("Ana uygulama hatası detayları:", exc_info=True)
        return 1  # Hatalı çıkış


if __name__ == "__main__":
    multiprocessing.freeze_support()  # PyInstaller için gerekli
    sys.exit(main()) 