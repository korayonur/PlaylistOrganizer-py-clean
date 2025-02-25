"""
Dil desteği için yardımcı sınıf
"""

import os
import json
import logging
from pathlib import Path
from config import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

class Localization:
    """Dil desteği için yardımcı sınıf"""
    
    _instance = None
    _translations = {}
    _current_language = DEFAULT_LANGUAGE
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(Localization, cls).__new__(cls)
            cls._instance._load_translations()
        return cls._instance
    
    def _load_translations(self):
        """Dil dosyalarını yükle"""
        try:
            # Dil dosyalarının bulunduğu klasör
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            locales_dir = os.path.join(base_dir, 'resources', 'locales')
            
            # Desteklenen diller için çevirileri yükle
            for lang in SUPPORTED_LANGUAGES:
                lang_file = os.path.join(locales_dir, f"{lang}.json")
                
                if os.path.exists(lang_file):
                    with open(lang_file, 'r', encoding='utf-8') as f:
                        self._translations[lang] = json.load(f)
                    logger.info(f"Dil dosyası yüklendi: {lang}")
                else:
                    logger.warning(f"Dil dosyası bulunamadı: {lang}")
            
            # Varsayılan dil yüklü değilse hata ver
            if DEFAULT_LANGUAGE not in self._translations:
                logger.error(f"Varsayılan dil dosyası bulunamadı: {DEFAULT_LANGUAGE}")
                raise FileNotFoundError(f"Varsayılan dil dosyası bulunamadı: {DEFAULT_LANGUAGE}")
                
        except Exception as e:
            logger.error(f"Dil dosyaları yüklenirken hata: {e}")
            raise
    
    def get_text(self, key, lang=None, *args):
        """Belirtilen anahtara göre çeviriyi döndür"""
        try:
            # Dil belirtilmemişse mevcut dili kullan
            lang = lang or self._current_language
            
            # Dil desteklenmiyorsa varsayılan dili kullan
            if lang not in self._translations:
                logger.warning(f"Desteklenmeyen dil: {lang}, varsayılan dil kullanılıyor: {DEFAULT_LANGUAGE}")
                lang = DEFAULT_LANGUAGE
            
            # Önce tam anahtarı kontrol et (nokta notasyonu olmadan)
            if key in self._translations[lang]:
                value = self._translations[lang][key]
                return self._format_value(value, args)
            
            # Anahtarı nokta notasyonuna göre ayır (örn: "menu.about")
            parts = key.split('.')
            
            # İç içe yapıda ara
            current = self._translations[lang]
            for part in parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    # İç içe yapıda bulunamadı, düz anahtarı dene
                    flat_key = '.'.join(parts)
                    if flat_key in self._translations[lang]:
                        return self._format_value(self._translations[lang][flat_key], args)
                    
                    # Anahtar bulunamazsa varsayılan dilde ara
                    logger.warning(f"Çeviri anahtarı bulunamadı: {key}, dil: {lang}")
                    if lang != DEFAULT_LANGUAGE:
                        return self.get_text(key, DEFAULT_LANGUAGE, *args)
                    return key
            
            # Değer bulundu, format parametreleri varsa uygula
            return self._format_value(current, args)
            
        except Exception as e:
            logger.error(f"Çeviri alınırken hata: {e}, anahtar: {key}, dil: {lang}")
            return key
    
    def _format_value(self, value, args):
        """Çeviri değerini formatla"""
        if args and isinstance(value, str):
            return value.format(*args)
        return value
    
    def set_language(self, lang):
        """Mevcut dili değiştir"""
        if lang in SUPPORTED_LANGUAGES:
            self._current_language = lang
            logger.info(f"Dil değiştirildi: {lang}")
            return True
        else:
            logger.warning(f"Desteklenmeyen dil: {lang}")
            return False
    
    def get_current_language(self):
        """Mevcut dili döndür"""
        return self._current_language
    
    def get_supported_languages(self):
        """Desteklenen dilleri döndür"""
        return SUPPORTED_LANGUAGES


# Kolay erişim için yardımcı fonksiyonlar
_localization = Localization()

def get_text(key, *args):
    """Belirtilen anahtara göre çeviriyi döndür"""
    return _localization.get_text(key, None, *args)

def set_language(lang):
    """Mevcut dili değiştir"""
    return _localization.set_language(lang)

def get_current_language():
    """Mevcut dili döndür"""
    return _localization.get_current_language()

def get_supported_languages():
    """Desteklenen dilleri döndür"""
    return _localization.get_supported_languages() 