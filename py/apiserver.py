import json
import logging
import os
import time
import unicodedata

# Logging ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import unquote

import aiofiles
import xmltodict
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
from contextlib import asynccontextmanager
import hashlib

# Konfigürasyonu import et
from config import (
    CORS_ORIGINS,
    PLAYLISTS_ROOT,
    PLAYLISTS_FOLDERS,
    PLAYLISTS_MYLISTS,
    MUSIC_ROOT,
    DB_PATH,
    API_HOST,
    API_PORT
)

# Ayarlar dosyası yolu
SETTINGS_PATH = Path(__file__).parent / "settings.json"

# Ayarlar modeli
class Settings(BaseModel):
    music_folder: str
    virtualdj_root: str
    last_updated: Optional[str] = None

# FastAPI uygulamasını oluştur
app = FastAPI()

# CORS ayarları - her zaman aktif
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for the API"""
    return {"status": "ok", "message": "API is healthy", "timestamp": time.time()}

# Port bilgisi endpoint'i
@app.get("/api/port")
async def get_port_info():
    """API port bilgisini döndür"""
    return {
        "status": "ok", 
        "port": API_PORT,
        "host": API_HOST,
        "apiUrl": f"http://{API_HOST}:{API_PORT}/api"
    }

# Desteklenen formatlar
SUPPORTED_FORMATS = {
    "audio": [
        "mp3",
        "wav",
        "cda",
        "wma",
        "asf",
        "ogg",
        "m4a",
        "aac",
        "aif",
        "aiff",
        "flac",
        "mpc",
        "ape",
        "weba",
        "opus",
    ],
    "video": [
        "mp4",
        "ogm",
        "ogv",
        "avi",
        "mpg",
        "mpeg",
        "wmv",
        "vob",
        "mov",
        "divx",
        "m4v",
        "mkv",
        "flv",
        "webm",
    ],
    "vdj": ["vdj", "vdjcache", "vdjedit", "vdjsample", "vdjcachev"],
    "image": ["apng"],
}

# Tüm desteklenen formatları birleştir
ALL_SUPPORTED_FORMATS = [ext for formats in SUPPORTED_FORMATS.values() for ext in formats]

# MIME tipleri
MIME_TYPES = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "cda": "application/x-cdf",
    "m4a": "audio/x-m4a; codecs='mp4a.40.2'",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "wma": "audio/x-ms-wma",
    "flac": "audio/flac",
    "mp4": "video/mp4",
    "avi": "video/x-msvideo",
    "mkv": "video/x-matroska",
    "webm": "video/webm"
    # ... diğer MIME tipleri eklenecek
}

# Karakter dönüşüm haritası (Node.js'deki CHAR_MAP ile aynı)
CHAR_MAP = {
    # Latin Alfabesi Genişletilmiş
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "ç": "c", "ć": "c", "č": "c", "ď": "d", "è": "e", "é": "e", "ê": "e", "ë": "e",
    "ì": "i", "í": "i", "î": "i", "ï": "i", "ð": "d", "ñ": "n", "ò": "o", "ó": "o",
    "ô": "o", "õ": "o", "ö": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u", "ü": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ğ": "g", "ı": "i", "İ": "I", "ş": "s",
    "Š": "S", "ž": "z", "ß": "ss"
}


# Veritabanı sınıfı
class Database:
    _instance = None
    _lock = asyncio.Lock()
    _data_lock = asyncio.Lock()
    _file_lock = asyncio.Lock()
    _cache: Dict[str, Any] = {}
    _last_write: float = 0
    _cache_ttl: int = 300  # 5 dakika
    data = None
    _path_index = {}  # Tam yol indeksi
    _name_index = {}  # Dosya adı indeksi
    _normalized_name_index = {}  # Normalize edilmiş ad indeksi
    _dir_index = {}  # Klasör indeksi
    _search_cache = {}  # Arama önbelleği
    _search_cache_ttl = 600  # 10 dakika

    def __init__(self):
        """Initialize locks"""
        pass  # Lock'lar artık sınıf değişkeni olarak tanımlandı

    @classmethod
    @asynccontextmanager
    async def get_data_lock(cls):
        """Context manager for data access"""
        instance = await cls.get_instance()
        if instance.data is None:
            await instance.load()
        try:
            await instance._data_lock.acquire()
            yield instance.data
        finally:
            instance._data_lock.release()

    @classmethod
    async def get_instance(cls):
        """Thread-safe singleton instance getter"""
        if not cls._instance:
            async with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance

    @classmethod
    async def load(cls) -> Optional[Dict]:
        """Load database with file lock"""
        instance = await cls.get_instance()
        try:
            async with instance._file_lock:
                if DB_PATH.exists():
                    async with aiofiles.open(DB_PATH, "r", encoding="utf-8") as f:
                        content = await f.read()
                        instance.data = json.loads(content)
                        # İndeksleri oluştur
                        await instance._build_indexes()
                else:
                    instance.data = {
                        "version": "1.0",
                        "lastUpdate": datetime.now().isoformat(),
                        "encoding": "utf-8",
                        "musicFiles": [],
                        "stats": {
                            "totalFiles": 0,
                            "lastIndexDuration": 0,
                            "indexingProgress": 0,
                            "status": "initial",
                        },
                    }
                    await instance.save()
                return instance.data
        except Exception as e:
            logging.error(f"Database load error: {e}")
            return None

    @classmethod
    async def _build_indexes(cls):
        """Veritabanı indekslerini oluştur"""
        instance = await cls.get_instance()
        if not instance.data or "musicFiles" not in instance.data:
            return
        
        # İndeksleri temizle
        instance._path_index = {}
        instance._name_index = {}
        instance._normalized_name_index = {}
        instance._dir_index = {}
        
        # İndeksleri oluştur
        for file in instance.data["musicFiles"]:
            # Tam yol indeksi
            if "path" in file and file["path"] is not None:
                instance._path_index[file["path"]] = file
            
            # Dosya adı indeksi
            if "path" in file and file["path"] is not None:
                file_name = Path(file["path"]).stem
                if file_name not in instance._name_index:
                    instance._name_index[file_name] = []
                instance._name_index[file_name].append(file)
            
            # Normalize edilmiş ad indeksi
            if "normalizedName" in file and file["normalizedName"] is not None:
                if file["normalizedName"] not in instance._normalized_name_index:
                    instance._normalized_name_index[file["normalizedName"]] = []
                instance._normalized_name_index[file["normalizedName"]].append(file)
            
            # Klasör indeksi
            if "path" in file and file["path"] is not None:
                dir_path = str(Path(file["path"]).parent)
                normalized_dir = normalize_path(dir_path)
                if normalized_dir not in instance._dir_index:
                    instance._dir_index[normalized_dir] = []
                instance._dir_index[normalized_dir].append(file)
        
        logging.info(f"Veritabanı indeksleri oluşturuldu: {len(instance._path_index)} dosya")

    @classmethod
    async def save(cls) -> None:
        """Save database with file lock"""
        instance = await cls.get_instance()
        if instance.data is not None:
            async with instance._file_lock:
                async with aiofiles.open(DB_PATH, "w", encoding="utf-8") as f:
                    await f.write(json.dumps(instance.data, indent=2))
                # İndeksleri güncelle
                await instance._build_indexes()

    @classmethod
    async def get_search_cache(cls, cache_key: str) -> Optional[Dict]:
        """Arama önbelleğinden veri al"""
        instance = await cls.get_instance()
        current_time = time.time()
        
        if cache_key in instance._search_cache:
            cache_entry = instance._search_cache[cache_key]
            if current_time - cache_entry["timestamp"] < instance._search_cache_ttl:
                logging.info(f"Önbellek kullanıldı: {cache_key}")
                return cache_entry["data"]
            else:
                # Süresi dolmuş önbellek girişini temizle
                del instance._search_cache[cache_key]
        
        return None

    @classmethod
    async def set_search_cache(cls, cache_key: str, data: Dict) -> None:
        """Arama önbelleğine veri kaydet"""
        instance = await cls.get_instance()
        instance._search_cache[cache_key] = {
            "timestamp": time.time(),
            "data": data
        }
        
        # Önbellek boyutunu kontrol et ve gerekirse temizle
        if len(instance._search_cache) > 1000:  # Maksimum 1000 önbellek girişi
            # En eski girişleri temizle
            sorted_cache = sorted(
                instance._search_cache.items(),
                key=lambda x: x[1]["timestamp"]
            )
            # İlk 200 girişi sil (en eski olanlar)
            for key, _ in sorted_cache[:200]:
                del instance._search_cache[key]


# Yardımcı fonksiyonlar
def normalize_text(text: str, options: Dict[str, bool] = None) -> str:
    """
    Tüm uygulama için merkezi string normalizasyon fonksiyonu
    """
    if options is None:
        options = {}

    keep_spaces = options.get("keepSpaces", True)
    keep_special_chars = options.get("keepSpecialChars", False)
    keep_case = options.get("keepCase", False)
    keep_diacritics = options.get("keepDiacritics", False)

    if not isinstance(text, str):
        raise TypeError("Input must be a string")

    normalized = text

    if not keep_diacritics:
        # NFKC normalizasyonu ve CHAR_MAP dönüşümü
        normalized = unicodedata.normalize("NFKC", normalized)
        normalized = "".join(CHAR_MAP.get(c.lower(), c) for c in normalized)

    if not keep_case:
        normalized = normalized.lower()

    if not keep_special_chars:
        normalized = "".join(c for c in normalized if c.isalnum() or c.isspace())

    if not keep_spaces:
        normalized = "_".join(normalized.split())

    return normalized.strip()


def normalize_file_name(text: str) -> str:
    """Dosya adı normalizasyonu"""
    return normalize_text(text, {"keepSpaces": True, "keepSpecialChars": True})


def normalize_path(text: str) -> str:
    """Yol normalizasyonu"""
    return normalize_text(text, {"keepSpaces": True, "keepSpecialChars": True, "keepCase": False})


def count_nodes(tree: List[Dict]) -> int:
    """Playlist ağacındaki toplam düğüm sayısını hesapla"""
    return sum(1 + (count_nodes(node["children"]) if "children" in node else 0) for node in tree)


def count_by_type(tree: List[Dict], type_name: str) -> int:
    """Playlist ağacında belirli tipteki düğümleri say"""
    return sum(
        (1 if node.get("type") == type_name else 0)
        + (count_by_type(node["children"], type_name) if "children" in node else 0)
        for node in tree
    )


def extract_normalized_words(file_name: str, file_path: str = "") -> List[str]:
    """Dosya adını ve klasör yolunu kelimelere ayırıp normalize et"""
    folder_parts = [
        p for p in Path(file_path).parent.parts 
        if p and p != "." and not p.startswith("/")
    ]
    relevant_folders = folder_parts[-2:] if len(folder_parts) >= 2 else folder_parts
    file_name_parts = [part.strip() for part in file_name.split("-")]
    all_parts = [*relevant_folders, *file_name_parts]

    words = " ".join(all_parts).split()
    return [normalize_text(word) for word in words if len(word) > 1]


def calculate_two_stage_similarity(words1: List[str], words2: List[str]) -> float:
    """İki aşamalı benzerlik hesapla"""
    if not words1 or not words2:
        return 0.0

    # Tam kelime eşleşmesi
    exact_matches = sum(1 for word in words1 if word in words2)
    exact_match_score = exact_matches / max(len(words1), len(words2))

    # Kısmi kelime eşleşmesi
    partial_matches = sum(
        1
        for word in words1
        if any((len(word) > 3 and word in w) or (len(w) > 3 and w in word) for w in words2)
    )
    partial_match_score = partial_matches / max(len(words1), len(words2))

    return (exact_match_score * 0.7) + (partial_match_score * 0.3)


def extract_improved_words(file_name: str, file_path: str = "") -> Dict[str, List[str]]:
    """Geliştirilmiş kelime çıkarma - klasör ve dosya adını ayırır"""
    folder_parts = [
        p for p in Path(file_path).parent.parts 
        if p and p != "." and not p.startswith("/")
    ]
    
    # Sadece son 1 klasörü al (önceden 2 idi)
    relevant_folders = folder_parts[-1:] if len(folder_parts) >= 1 else []
    
    # Dosya adını daha iyi parse et - sanatçı ve şarkı adını ayır
    file_name_without_ext = Path(file_name).stem
    file_name_parts = [part.strip() for part in file_name_without_ext.split("-")]
    
    # Klasör kelimelerini normalize et
    folder_words = []
    for folder in relevant_folders:
        folder_words.extend([normalize_text(word) for word in folder.split() if len(word) > 1])
    
    # Dosya adı kelimelerini normalize et
    file_words = []
    artist_words = []
    song_words = []
    
    if len(file_name_parts) >= 2:
        # İlk kısım numara olabilir, sanatçı adını bul
        artist_part = ""
        song_part = ""
        
        # İlk kısım sadece numara ise, ikinci kısım sanatçı adı
        if file_name_parts[0].strip().isdigit() and len(file_name_parts) >= 3:
            artist_part = file_name_parts[1]
            song_part = " ".join(file_name_parts[2:])
        else:
            # Normal durum: ilk kısım sanatçı, ikinci kısım şarkı
            artist_part = file_name_parts[0]
            song_part = " ".join(file_name_parts[1:])
        
        artist_words = [normalize_text(word) for word in artist_part.split() if len(word) > 1]
        song_words = [normalize_text(word) for word in song_part.split() if len(word) > 1]
        
        # Tüm dosya kelimeleri
        for part in file_name_parts:
            file_words.extend([normalize_text(word) for word in part.split() if len(word) > 1])
    else:
        # Tek kısım varsa tümünü dosya kelimeleri olarak al
        for part in file_name_parts:
            file_words.extend([normalize_text(word) for word in part.split() if len(word) > 1])
    
    # Genel kelimeler (filtreleme için)
    common_words = {
        'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
        'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
        'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
        'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
        've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
        'müzik', 'şarkı', 'parça',
        # Video ve medya terimleri
        'mv', 'clip', 'trailer', 'teaser', 'preview', 'behind', 'scenes', 'making', 'of'
    }
    
    # Anlamlı kelimeler (genel kelimeler filtrelenmiş)
    meaningful_words = [w for w in file_words if w not in common_words]
    meaningful_artist_words = [w for w in artist_words if w not in common_words]
    meaningful_song_words = [w for w in song_words if w not in common_words]
    
    result = {
        'folder_words': folder_words,
        'file_words': file_words,
        'artist_words': artist_words,
        'song_words': song_words,
        'all_words': folder_words + file_words,
        'meaningful_words': meaningful_words,
        'meaningful_artist_words': meaningful_artist_words,
        'meaningful_song_words': meaningful_song_words
    }
    
    # DEBUG: Dr Alban aramaları için detaylı log
    if "Dr Alban" in file_name or "Away From Home" in file_name:
        logging.info(f"🔍 EXTRACT DEBUG - File name: {file_name}")
        logging.info(f"🔍 EXTRACT DEBUG - File path: {file_path}")
        logging.info(f"🔍 EXTRACT DEBUG - File name parts: {file_name_parts}")
        logging.info(f"🔍 EXTRACT DEBUG - Artist words: {artist_words}")
        logging.info(f"🔍 EXTRACT DEBUG - Song words: {song_words}")
        logging.info(f"🔍 EXTRACT DEBUG - Meaningful words: {meaningful_words}")
        logging.info(f"🔍 EXTRACT DEBUG - Common words filtered: {[w for w in file_words if w in common_words]}")
    
    return result


def calculate_improved_similarity(search_words: Dict[str, List[str]], 
                                target_words: Dict[str, List[str]]) -> float:
    """MÜKEMMEL BENZERLİK ALGORİTMASI - Geliştirilmiş versiyon"""
    if not search_words['all_words'] or not target_words['all_words']:
        return 0.0
    
    # DEBUG: Dr Alban aramaları için detaylı log
    if "dr" in search_words.get('all_words', []) and "alban" in search_words.get('all_words', []):
        logging.info(f"🔍 SIMILARITY DEBUG - Search words: {search_words}")
        logging.info(f"🔍 SIMILARITY DEBUG - Target words: {target_words}")
    
    # Genel kelimeler (filtreleme için)
    common_words = {
        'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
        'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
        'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
        'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
        've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
        'müzik', 'şarkı', 'parça',
        # Video ve medya terimleri
        'mv', 'clip', 'trailer', 'teaser', 'preview', 'behind', 'scenes', 'making', 'of'
    }
    
    # 1. GENEL KELİME FİLTRESİ - meaningful_words kullan
    meaningful_search = search_words.get('meaningful_words', [])
    meaningful_target = target_words.get('meaningful_words', [])
    
    # Eğer anlamlı kelime yoksa, çok düşük skor ver
    if not meaningful_search or not meaningful_target:
        if not search_words['file_words'] or not target_words['file_words']:
            return 0.0
        exact_matches = sum(1 for word in search_words['file_words'] if word in target_words['file_words'])
        return (exact_matches / max(len(search_words['file_words']), len(target_words['file_words']))) * 0.3
    
    # 2. ANLAMLI KELİME EŞLEŞMESİ (Ana skor)
    exact_meaningful_matches = sum(1 for word in meaningful_search if word in meaningful_target)
    meaningful_score = exact_meaningful_matches / max(len(meaningful_search), len(meaningful_target))
    
    # 2.5. SANATÇI ADI ZORUNLU KONTROLÜ - İlk kelime (sanatçı) eşleşmeli (KALDIRILDI)
    # if meaningful_search and meaningful_target:
    #     first_word_search = meaningful_search[0].lower() if meaningful_search else ""
    #     first_word_target = meaningful_target[0].lower() if meaningful_target else ""
    #     
    #     # Sanatçı adı tamamen farklıysa eşleşme yapma (daha gevşek kontrol)
    #     if first_word_search and first_word_target and len(first_word_search) >= 4 and len(first_word_target) >= 4:
    #         # İlk 4 karakter eşleşmiyorsa farklı sanatçı (daha gevşek)
    #         if first_word_search[:4] != first_word_target[:4]:
    #             return 0.0  # Farklı sanatçı, eşleşme yok
    
    # 2.6. ŞARKI ADI ZORUNLU KONTROLÜ - En az 1 anlamlı kelime eşleşmeli (gevşetildi)
    if exact_meaningful_matches < 1:
        return 0.0  # Hiç eşleşme yoksa direkt 0 döndür
    
    # 2.6. ŞARKI ADI ZORUNLU KONTROLÜ - Şarkı adı kelimeleri eşleşmeli (KALDIRILDI)
    # meaningful_song_search = search_words.get('meaningful_song_words', [])
    # meaningful_song_target = target_words.get('meaningful_song_words', [])
    
    # if meaningful_song_search and meaningful_song_target:
    #     # Şarkı adı kelimelerinden en az biri eşleşmeli
    #     song_matches = sum(1 for word in meaningful_song_search if word in meaningful_song_target)
    #     if song_matches == 0:
    #         return 0.0  # Şarkı adı eşleşmiyorsa direkt 0 döndür
    
    # 3. KELİME UZUNLUK BONUSU (Uzun kelimeler daha önemli)
    long_word_matches = sum(1 for word in meaningful_search if word in meaningful_target and len(word) >= 4)
    long_word_bonus = long_word_matches / max(len(meaningful_search), len(meaningful_target)) * 0.2
    
    # 4. SANATÇI ADI BONUSU (İlk kelime) - Azaltıldı
    artist_bonus = 0.0
    if meaningful_search and meaningful_target:
        if meaningful_search[0] == meaningful_target[0] and len(meaningful_search[0]) >= 3:
            artist_bonus = 0.1  # 0.3'ten 0.1'e düşürüldü
    
    # 5. ŞARKI ADI BONUSU (İkinci kelime)
    song_bonus = 0.0
    if len(meaningful_search) >= 2 and len(meaningful_target) >= 2:
        if meaningful_search[1] == meaningful_target[1] and len(meaningful_search[1]) >= 3:
            song_bonus = 0.2
    
    # 6. TAM EŞLEŞME BONUSU
    full_match_bonus = 0.0
    if exact_meaningful_matches >= 3:
        full_match_bonus = 0.15
    
    # 7. GENEL KELİME PENALTY
    general_word_penalty = 0.0
    general_matches = sum(1 for word in search_words['file_words'] if word in target_words['file_words'] and word in common_words)
    if general_matches > 0:
        general_word_penalty = min(0.2, general_matches * 0.05)
    
    # Toplam skor hesapla
    total_score = meaningful_score + long_word_bonus + artist_bonus + song_bonus + full_match_bonus - general_word_penalty
    
    # 0.0 - 1.0 arasında sınırla
    return max(0.0, min(1.0, total_score))


def _calculate_word_similarity(words1: List[str], words2: List[str]) -> float:
    """Kelime listeleri arasında benzerlik hesapla - Final optimize edilmiş algoritma"""
    if not words1 or not words2:
        return 0.0
    
    # Tam kelime eşleşmesi
    exact_matches = sum(1 for word in words1 if word in words2)
    
    # Hibrit normalizasyon: Hem min hem max kullan
    min_length = min(len(words1), len(words2))
    max_length = max(len(words1), len(words2))
    
    # Eğer kelime sayısı farkı çok büyükse (3x'den fazla), min kullan
    # Aksi takdirde max kullan (daha konservatif)
    if max_length > min_length * 3:
        # Çok farklı uzunluklar - min kullan (kısa dosya adlarını korur)
        exact_match_score = exact_matches / min_length if min_length > 0 else 0.0
    else:
        # Benzer uzunluklar - max kullan (daha konservatif)
        exact_match_score = exact_matches / max_length if max_length > 0 else 0.0
    
    # Kısmi kelime eşleşmesi (düşük ağırlık)
    partial_matches = sum(
        1
        for word in words1
        if any((len(word) > 3 and word in w) or (len(w) > 3 and w in word) for w in words2)
    )
    partial_match_score = partial_matches / max_length if max_length > 0 else 0.0
    
    # Tam eşleşme %85, kısmi eşleşme %15 (tam eşleşmeye daha fazla ağırlık)
    return (exact_match_score * 0.85) + (partial_match_score * 0.15)


# Arama servisi
class SearchService:
    @staticmethod
    async def check_different_folder(full_path: str) -> Optional[Dict]:
        """Tam eşleşme kontrolü"""
        async with Database.get_data_lock() as db:
            file_name = Path(full_path).name
            file_name_without_ext = Path(file_name).stem
            normalized_search = normalize_text(file_name_without_ext)
            
            return next(
                (file for file in db["musicFiles"] if normalized_search == file["normalizedName"]), 
                None
            )


# API endpoint'leri eklenecek...


# Test endpoint'i
@app.get("/api/test")
async def test():
    """API'nin çalışıp çalışmadığını kontrol et"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }


# Ayarlar endpoint'leri
@app.get("/api/settings")
async def get_settings():
    """Mevcut ayarları getir"""
    try:
        if SETTINGS_PATH.exists():
            async with aiofiles.open(SETTINGS_PATH, "r", encoding="utf-8") as f:
                content = await f.read()
                settings = json.loads(content)
                return settings
        else:
            # Varsayılan ayarları döndür
            default_settings = {
                "music_folder": MUSIC_ROOT,
                "virtualdj_root": VIRTUALDJ_ROOT or "/Users/koray/Library/Application Support/VirtualDJ",
                "last_updated": None
            }
            return default_settings
    except Exception as e:
        logging.error(f"Ayarlar yüklenirken hata: {e}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e)}
        )


@app.post("/api/settings")
async def save_settings(settings: Settings):
    """Ayarları kaydet"""
    try:
        # Ayarları JSON formatına çevir
        settings_data = {
            "music_folder": settings.music_folder,
            "virtualdj_root": settings.virtualdj_root,
            "last_updated": datetime.now().isoformat()
        }
        
        # Ayarları dosyaya kaydet
        async with aiofiles.open(SETTINGS_PATH, "w", encoding="utf-8") as f:
            await f.write(json.dumps(settings_data, indent=2))
        
        # Config.py dosyasındaki MUSIC_ROOT ve VIRTUALDJ_ROOT değerlerini güncelle
        # (Bu değişiklikler runtime'da etkili olacak)
        global MUSIC_ROOT, VIRTUALDJ_ROOT
        MUSIC_ROOT = settings.music_folder
        VIRTUALDJ_ROOT = settings.virtualdj_root
        
        logging.info(f"Ayarlar kaydedildi: {settings_data}")
        
        return {
            "success": True,
            "message": "Ayarlar başarıyla kaydedildi",
            "data": settings_data
        }
        
    except Exception as e:
        logging.error(f"Ayarlar kaydedilirken hata: {e}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e)}
        )


# Playlist endpoint'leri
@app.get("/api/playlists/list")
async def get_playlists():
    """Playlist ağacını getir"""
    try:
        async def build_playlist_tree(dir_path: str, is_mylists: bool = False) -> List[Dict]:
            items = [item for item in os.scandir(dir_path) if not item.name.startswith(".")]
            result = []

            # Hem klasörleri hem de playlist dosyalarını bul
            folders = [item for item in items if item.is_dir() or item.name.endswith(".subfolders")]
            files = [item for item in items if item.name.endswith(".vdjfolder")]

            # Klasörleri işle (MyLists için de alt klasörleri tara)
            for folder in folders:
                if folder.name == "My Library.subfolders":
                    continue

                full_path = str(Path(dir_path) / folder.name)
                is_subfolder = folder.name.endswith(".subfolders")

                if is_subfolder or is_mylists:
                    children = await build_playlist_tree(full_path, is_mylists)
                    if children:
                        result.append({
                            "id": str(Path(full_path).as_posix().encode("utf-8").hex()),
                            "name": folder.name.replace(".subfolders", ""),
                            "path": full_path,
                            "type": "folder",
                            "children": children,
                        })

            # Playlist dosyalarını işle
            for file in files:
                full_path = str(Path(dir_path) / file.name)
                try:
                    async with aiofiles.open(full_path, "r", encoding="utf-8") as f:
                        content = (await f.read()).strip()

                    if not content:
                        logging.warning(f"Boş playlist dosyası: {full_path}")
                        continue

                    try:
                        xml_dict = xmltodict.parse(content)
                    except Exception as err:
                        logging.warning(f"XML parse hatası: {full_path}")
                        continue

                    # XML parsing başarılı mı kontrol et
                    if xml_dict is None:
                        logging.warning(f"XML içeriği boş: {full_path}")
                        continue

                    songs = xml_dict.get("VirtualFolder", {}).get("song", [])
                    if songs:
                        if not isinstance(songs, list):
                            songs = [songs]

                        result.append({
                            "id": str(Path(full_path).as_posix().encode("utf-8").hex()),
                            "name": file.name.replace(".vdjfolder", ""),
                            "path": full_path,
                            "type": "playlist",
                            "songCount": len(songs),
                        })
                except Exception as e:
                    logging.error(f"Playlist dosyası okunamadı: {full_path}", exc_info=e)

            return sorted(result, key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))

        # Her iki klasörden de playlist'leri al
        folders_tree = await build_playlist_tree(PLAYLISTS_FOLDERS)
        mylists_tree = await build_playlist_tree(PLAYLISTS_MYLISTS, True)

        # İki ağacı birleştir
        combined_tree = []
        
        # Folders klasörü varsa ekle
        if os.path.exists(PLAYLISTS_FOLDERS) and folders_tree:
            combined_tree.append({
                "id": str(Path(PLAYLISTS_FOLDERS).as_posix().encode("utf-8").hex()),
                "name": "Folders",
                "path": PLAYLISTS_FOLDERS,
                "type": "folder",
                "children": folders_tree
            })
            
        # MyLists klasörü varsa ekle
        if os.path.exists(PLAYLISTS_MYLISTS) and mylists_tree:
            combined_tree.append({
                "id": str(Path(PLAYLISTS_MYLISTS).as_posix().encode("utf-8").hex()),
                "name": "MyLists",
                "path": PLAYLISTS_MYLISTS,
                "type": "folder",
                "children": mylists_tree
            })

        # İstatistikleri hesapla
        stats = {
            "totalNodes": count_nodes(combined_tree),
            "folders": count_by_type(combined_tree, "folder"),
            "playlists": count_by_type(combined_tree, "playlist"),
        }

        return {"success": True, "data": combined_tree, "stats": stats}

    except Exception as e:
        logging.error("Playlist ağacı oluşturulurken hata:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e), "details": str(e.__traceback__)},
        ) from e


class PlaylistSongUpdate(BaseModel):
    playlistPath: str
    items: List[Dict[str, str]]


@app.post("/api/playlistsong/update")
async def update_playlist_song(data: PlaylistSongUpdate):
    """Playlist şarkı güncelle"""
    try:
        async with aiofiles.open(data.playlistPath, "r", encoding="utf-8") as f:
            content = await f.read()

        xml_dict = xmltodict.parse(content)

        if not xml_dict.get("VirtualFolder", {}).get("song"):
            raise HTTPException(
                status_code=400, 
                detail={"success": False, "error": "Geçersiz playlist formatı"}
            )

        songs = xml_dict["VirtualFolder"]["song"]
        if not isinstance(songs, list):
            songs = [songs]

        updated_count = 0
        for item in data.items:
            for song in songs:
                if song.get("@path") == item["oldPath"]:
                    song["@path"] = item["newPath"]
                    updated_count += 1

        if updated_count == 0:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": "Hiçbir şarkı güncellenemedi",
                    "details": {"items": data.items},
                },
            )

        xml_content = xmltodict.unparse(xml_dict, pretty=True)
        async with aiofiles.open(data.playlistPath, "w", encoding="utf-8") as f:
            await f.write(xml_content)

        return {"success": True, "message": f"{updated_count} şarkı yolu güncellendi"}

    except Exception as e:
        logging.error("Şarkı güncelleme hatası:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e), "details": str(e.__traceback__)},
        ) from e


class GlobalPlaylistUpdate(BaseModel):
    items: List[Dict[str, str]]  # oldPath -> newPath mappings
    updateAllPlaylists: bool = True


class GlobalMissingFilesResponse(BaseModel):
    success: bool
    total_missing_files: int
    unique_missing_files: int
    playlists_checked: int
    missing_files: List[Dict[str, Any]]


@app.post("/api/playlistsong/global-update")
async def global_update_playlist_songs(data: GlobalPlaylistUpdate):
    """Tüm playlist'lerdeki aynı dosya yollarını global olarak güncelle"""
    try:
        if not data.items:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "error": "Güncellenecek öğe bulunamadı"}
            )

        # Tüm playlist dosyalarını bul
        all_playlists = []
        
        # Folders klasöründeki playlist'leri tara
        if os.path.exists(PLAYLISTS_FOLDERS):
            for root, dirs, files in os.walk(PLAYLISTS_FOLDERS):
                for file in files:
                    if file.endswith('.vdjfolder'):
                        all_playlists.append(os.path.join(root, file))
        
        # MyLists klasöründeki playlist'leri tara
        if os.path.exists(PLAYLISTS_MYLISTS):
            for root, dirs, files in os.walk(PLAYLISTS_MYLISTS):
                for file in files:
                    if file.endswith('.vdjfolder'):
                        all_playlists.append(os.path.join(root, file))

        logging.info(f"Toplam {len(all_playlists)} playlist bulundu")

        # Her playlist'i kontrol et ve güncelle
        total_updated_playlists = 0
        total_updated_songs = 0
        updated_playlists = []
        
        # Detaylı log için değişiklik listesi
        all_changes = []

        for playlist_path in all_playlists:
            try:
                # Playlist'i oku
                async with aiofiles.open(playlist_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                xml_dict = xmltodict.parse(content)
                
                if not xml_dict.get("VirtualFolder", {}).get("song"):
                    continue

                songs = xml_dict["VirtualFolder"]["song"]
                if not isinstance(songs, list):
                    songs = [songs]

                # Bu playlist'te güncelleme yapılacak mı kontrol et
                playlist_updated = False
                playlist_song_count = 0
                playlist_changes = []  # Detaylı değişiklik listesi

                for item in data.items:
                    old_path = item["oldPath"]
                    new_path = item["newPath"]
                    
                    for song in songs:
                        if song.get("@path") == old_path:
                            # Eski ve yeni yolu kaydet
                            playlist_changes.append({
                                "old_path": old_path,
                                "new_path": new_path,
                                "song_name": os.path.basename(old_path)
                            })
                            
                            song["@path"] = new_path
                            playlist_updated = True
                            playlist_song_count += 1

                # Eğer güncelleme yapıldıysa dosyayı kaydet
                if playlist_updated:
                    xml_content = xmltodict.unparse(xml_dict, pretty=True)
                    async with aiofiles.open(playlist_path, "w", encoding="utf-8") as f:
                        await f.write(xml_content)
                    
                    total_updated_playlists += 1
                    total_updated_songs += playlist_song_count
                    updated_playlists.append({
                        "path": playlist_path,
                        "name": os.path.basename(playlist_path).replace('.vdjfolder', ''),
                        "updated_songs": playlist_song_count,
                        "changes": playlist_changes  # Detaylı değişiklik listesi
                    })
                    
                    # Tüm değişiklikleri genel listeye ekle
                    for change in playlist_changes:
                        all_changes.append({
                            "playlist_name": os.path.basename(playlist_path).replace('.vdjfolder', ''),
                            "playlist_path": playlist_path,
                            "song_name": change["song_name"],
                            "old_path": change["old_path"],
                            "new_path": change["new_path"]
                        })
                    
                    logging.info(f"Playlist güncellendi: {playlist_path} ({playlist_song_count} şarkı)")

            except Exception as e:
                logging.warning(f"Playlist güncellenemedi: {playlist_path} - {str(e)}")
                continue

        # Detaylı log dosyası oluştur
        log_filename = f"global_update_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_path = os.path.join(os.path.dirname(__file__), "logs", log_filename)
        
        # Logs klasörünü oluştur
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        
        # Detaylı log verilerini hazırla
        detailed_log = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_playlists_checked": len(all_playlists),
                "updated_playlists": total_updated_playlists,
                "total_songs_updated": total_updated_songs
            },
            "updated_playlists": updated_playlists,
            "all_changes": all_changes
        }
        
        # Log dosyasını kaydet
        try:
            import json
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump(detailed_log, f, ensure_ascii=False, indent=2)
            logging.info(f"Detaylı log dosyası oluşturuldu: {log_path}")
        except Exception as e:
            logging.warning(f"Log dosyası oluşturulamadı: {e}")

        return {
            "success": True,
            "message": f"Global güncelleme tamamlandı",
            "log_file": log_filename,
            "stats": {
                "total_playlists_checked": len(all_playlists),
                "updated_playlists": total_updated_playlists,
                "total_songs_updated": total_updated_songs,
                "updated_playlist_details": updated_playlists
            }
        }

    except Exception as e:
        logging.error("Global güncelleme hatası:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e), "details": str(e.__traceback__)},
        ) from e


class PlaylistSongRead(BaseModel):
    playlistPath: str


@app.post("/api/playlistsongs/read")
async def read_playlist_songs(data: PlaylistSongRead):
    """Playlist içeriğini oku"""
    try:
        async with aiofiles.open(data.playlistPath, "r", encoding="utf-8") as f:
            content = (await f.read()).strip()

        try:
            xml_dict = xmltodict.parse(content)
        except Exception as err:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "error": "XML parse hatası", "details": str(err)},
            ) from err

        songs = []
        existing_songs = 0
        missing_songs = 0

        if xml_dict.get("VirtualFolder", {}).get("song"):
            xml_songs = xml_dict["VirtualFolder"]["song"]
            if not isinstance(xml_songs, list):
                xml_songs = [xml_songs]

            for song_xml in xml_songs:
                file_path = song_xml.get("@path")
                is_file_exists = os.path.exists(file_path)

                if is_file_exists:
                    existing_songs += 1
                else:
                    missing_songs += 1

                songs.append({"path": file_path, "isFileExists": is_file_exists})

        stats = {
            "totalSongs": len(songs),
            "existingSongs": existing_songs,
            "missingSongs": missing_songs,
        }

        return {"success": True, "songs": songs, "stats": stats}

    except Exception as e:
        logging.error("Playlist okuma hatası:", exc_info=e)
        raise HTTPException(status_code=500, detail={"success": False, "error": str(e)}) from e


# Batch playlist API kaldırıldı - artık kullanılmıyor
# Global eksik dosyalar API'si zaten her dosya için son okunan playlist bilgisini döndürüyor

# Tek dosya playlist API kaldırıldı - artık kullanılmıyor
# Global eksik dosyalar API'si zaten her dosya için son okunan playlist bilgisini döndürüyor


async def search_similar_file(file_path: str):
    """Tek dosya için benzerlik araması yap"""
    try:
        # Veritabanını yükle
        db_instance = await Database.get_instance()
        if not db_instance._path_index:
            await Database.load()
        
        # Dosya adını çıkar
        file_name = os.path.basename(file_path)
        file_name_without_ext = os.path.splitext(file_name)[0]
        
        # 1. TAM YOL EŞLEŞMESİ
        if file_path in db_instance._path_index:
            return {
                "found": True,
                "foundPath": file_path,
                "similarity": 1.0,
                "matchType": "tamYolEsleme"
            }
        
        # 2. AYNI KLASÖR FARKLI UZANTI
        file_dir = os.path.dirname(file_path)
        for ext in ['.mp3', '.m4a', '.flac', '.wav', '.mp4', '.avi', '.mkv']:
            alt_path = os.path.join(file_dir, file_name_without_ext + ext)
            if alt_path in db_instance._path_index:
                return {
                    "found": True,
                    "foundPath": alt_path,
                    "similarity": 0.9,
                    "matchType": "ayniKlasorFarkliUzanti"
                }
        
        # 3. FARKLI KLASÖR AYNI UZANTI
        for path in db_instance._path_index:
            if os.path.basename(path) == file_name:
                return {
                    "found": True,
                    "foundPath": path,
                    "similarity": 0.8,
                    "matchType": "farkliKlasorveUzanti"
                }
        
        # 4. BENZERLİK ARAMASI
        search_words = extract_improved_words(file_name_without_ext)
        if not search_words:
            return {
                "found": False,
                "foundPath": None,
                "similarity": 0,
                "matchType": "missing"
            }
        
        # Veritabanındaki tüm dosyaları kontrol et
        candidates = []
        threshold = 0.3  # Aynı threshold'u kullan
        
        for path in db_instance._path_index:
            file_data = db_instance._path_index[path]
            if not file_data:
                continue
                
            # Veritabanındaki indexedWords'ü kullan
            indexed_words = file_data.get('indexedWords', [])
            
            # indexedWords'den kelime kategorilerini oluştur
            target_words = {
                'file_words': indexed_words,
                'folder_words': indexed_words,
                'artist_words': indexed_words,
                'song_words': indexed_words,
                'all_words': indexed_words,
                'meaningful_words': indexed_words
            }
            
            # Benzerlik hesapla
            similarity = calculate_improved_similarity(search_words, target_words)
            
            if similarity > threshold:
                candidates.append({
                    "path": path,
                    "similarity": similarity
                })
        
        # En iyi eşleşmeyi bul
        if candidates:
            candidates.sort(key=lambda x: x["similarity"], reverse=True)
            best_match = candidates[0]
            return {
                "found": True,
                "foundPath": best_match["path"],
                "similarity": best_match["similarity"],
                "matchType": "benzerDosya"
            }
        
        # Hiç eşleşme bulunamadı
        return {
            "found": False,
            "foundPath": None,
            "similarity": 0,
            "matchType": "missing"
        }
        
    except Exception as e:
        logging.error(f"Benzerlik araması hatası: {str(e)}")
        return {
            "found": False,
            "foundPath": None,
            "similarity": 0,
            "matchType": "missing"
        }


@app.get("/api/playlistsong/global-missing")
async def get_global_missing_files():
    """Tüm playlist'lerdeki eksik dosyaları getir (duplicate olmadan) - OPTİMİZE EDİLMİŞ"""
    try:
        # Tüm playlist dosyalarını bul
        all_playlists = []
        
        # Folders klasöründeki playlist'leri tara
        if os.path.exists(PLAYLISTS_FOLDERS):
            for root, dirs, files in os.walk(PLAYLISTS_FOLDERS):
                for file in files:
                    if file.endswith('.vdjfolder'):
                        all_playlists.append(os.path.join(root, file))
        
        # MyLists klasöründeki playlist'leri tara
        if os.path.exists(PLAYLISTS_MYLISTS):
            for root, dirs, files in os.walk(PLAYLISTS_MYLISTS):
                for file in files:
                    if file.endswith('.vdjfolder'):
                        all_playlists.append(os.path.join(root, file))

        logging.info(f"Toplam {len(all_playlists)} playlist taranıyor")

        # Tüm eksik dosyaları topla - OPTİMİZE EDİLMİŞ
        all_missing_files = []
        missing_file_paths = set()  # Duplicate kontrolü için
        playlists_checked = 0

        for playlist_path in all_playlists:
            try:
                # Playlist'i oku
                async with aiofiles.open(playlist_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                xml_dict = xmltodict.parse(content)
                
                if not xml_dict.get("VirtualFolder", {}).get("song"):
                    continue

                songs = xml_dict["VirtualFolder"]["song"]
                if not isinstance(songs, list):
                    songs = [songs]

                playlist_name = os.path.basename(playlist_path).replace('.vdjfolder', '')
                playlists_checked += 1

                # Eksik dosyaları bul - BENZERLİK ARAMASI İLE
                for song in songs:
                    file_path = song.get("@path")
                    if file_path and not os.path.exists(file_path):
                        # Duplicate kontrolü - sadece bir kez ekle
                        if file_path not in missing_file_paths:
                            missing_file_paths.add(file_path)
                            
                            # Benzerlik araması yap
                            search_result = await search_similar_file(file_path)
                            
                            all_missing_files.append({
                                "originalPath": file_path,
                                "playlistName": playlist_name,  # Son okunan playlist adı
                                "playlistPath": playlist_path,  # Son okunan playlist yolu
                                "artist": song.get("artist", "Bilinmeyen"),
                                "title": song.get("title", "Bilinmeyen"),
                                "isFileExists": False,
                                "found": search_result["found"],
                                "foundPath": search_result["foundPath"],
                                "similarity": search_result["similarity"],
                                "matchType": search_result["matchType"]
                            })

            except Exception as e:
                logging.warning(f"Playlist okunamadı: {playlist_path} - {str(e)}")
                continue
        
        return {
            "success": True,
            "total_missing_files": len(all_missing_files),
            "unique_missing_files": len(missing_file_paths),
            "playlists_checked": playlists_checked,
            "missing_files": all_missing_files
        }
        
    except Exception as e:
        logging.error("Global eksik dosyalar hatası:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e), "details": str(e.__traceback__)},
        ) from e


@app.post("/api/playlistsong/remove-from-all")
async def remove_song_from_all_playlists(data: dict):
    """Şarkıyı tüm playlist'lerden kaldır"""
    try:
        song_path = data.get("songPath")
        if not song_path:
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "error",
                    "message": "songPath parametresi gerekli"
                }
            )

        removed_from_playlists = []
        total_playlists_checked = 0

        # Tüm playlist dosyalarını bul
        all_playlists = []
        
        # Folders klasöründeki playlist'leri tara
        if os.path.exists(PLAYLISTS_FOLDERS):
            for root, dirs, files in os.walk(PLAYLISTS_FOLDERS):
                for file in files:
                    if file.endswith('.vdjfolder'):
                        all_playlists.append(os.path.join(root, file))
        
        # MyLists klasöründeki playlist'leri tara
        if os.path.exists(PLAYLISTS_MYLISTS):
            for root, dirs, files in os.walk(PLAYLISTS_MYLISTS):
                for file in files:
                    if file.endswith('.vdjfolder'):
                        all_playlists.append(os.path.join(root, file))

        logging.info(f"Şarkı kaldırma: {song_path} - {len(all_playlists)} playlist kontrol ediliyor")
        logging.info(f"Playlist'ler: {[os.path.basename(p) for p in all_playlists[:5]]}...")  # İlk 5 playlist adı

        for playlist_path in all_playlists:
            try:
                total_playlists_checked += 1
                
                # Playlist'i oku
                async with aiofiles.open(playlist_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                xml_dict = xmltodict.parse(content)
                
                if not xml_dict.get("VirtualFolder", {}).get("song"):
                    continue

                songs = xml_dict["VirtualFolder"]["song"]
                if not isinstance(songs, list):
                    songs = [songs]

                # Şarkıyı bul ve kaldır
                original_count = len(songs)
                
                # Path karşılaştırması için normalize et
                def normalize_path(path):
                    if not path:
                        return ""
                    return os.path.normpath(path).lower().strip()
                
                target_path_normalized = normalize_path(song_path)
                
                # Debug için ilk birkaç path'i logla
                if total_playlists_checked <= 3:
                    logging.info(f"Playlist {os.path.basename(playlist_path)} - İlk 3 path:")
                    for i, song in enumerate(songs[:3]):
                        song_path_normalized = normalize_path(song.get("@path"))
                        logging.info(f"  {i+1}. Orijinal: {song.get('@path')}")
                        logging.info(f"     Normalize: {song_path_normalized}")
                        logging.info(f"     Hedef: {target_path_normalized}")
                        logging.info(f"     Eşleşiyor mu: {song_path_normalized == target_path_normalized}")
                
                songs = [song for song in songs if normalize_path(song.get("@path")) != target_path_normalized]
                
                # Eğer şarkı kaldırıldıysa
                if len(songs) < original_count:
                    playlist_name = os.path.basename(playlist_path).replace('.vdjfolder', '')
                    removed_from_playlists.append({
                                "playlistName": playlist_name,
                                "playlistPath": playlist_path,
                        "removedCount": original_count - len(songs)
                    })

                    # XML'i güncelle
                    if songs:
                        xml_dict["VirtualFolder"]["song"] = songs
                    else:
                        # Eğer hiç şarkı kalmadıysa, song elementini kaldır
                        if "song" in xml_dict["VirtualFolder"]:
                            del xml_dict["VirtualFolder"]["song"]

                    # Playlist'i kaydet
                    updated_content = xmltodict.unparse(xml_dict, pretty=True)
                    async with aiofiles.open(playlist_path, "w", encoding="utf-8") as f:
                        await f.write(updated_content)
                    
                    logging.info(f"Şarkı kaldırıldı: {playlist_name} - {original_count - len(songs)} adet")

            except Exception as e:
                logging.warning(f"Playlist güncellenemedi: {playlist_path} - {str(e)}")
                continue

        return {
            "success": True,
            "songPath": song_path,
            "removedFromPlaylists": removed_from_playlists,
            "totalPlaylistsChecked": total_playlists_checked,
            "totalRemovedCount": sum(p["removedCount"] for p in removed_from_playlists)
        }

    except Exception as e:
        logging.error("Şarkı kaldırma hatası:", exc_info=e)
        return {
            "success": False,
            "error": str(e),
            "songPath": data.get("songPath", ""),
            "removedFromPlaylists": [],
            "totalPlaylistsChecked": 0,
            "totalRemovedCount": 0
        }


# İndeksleme ve arama endpoint'leri
@app.post("/api/index/create")
async def create_index():
    """Veritabanı indeksleme"""
    try:
        start_time = time.time()
        total_files = 0
        new_files = []
        error_count = 0
        error_details = []

        # Ana müzik klasörü kontrolü
        if not os.path.exists(MUSIC_ROOT):
            logging.error(f"Ana müzik klasörü erişilemiyor: {MUSIC_ROOT}")
            raise HTTPException(
                status_code=404,
                detail={
                    "status": "error",
                    "message": f"Ana müzik klasörü bulunamadı: {MUSIC_ROOT}",
                },
            )

        async def scan_directory(dir_path: str):
            nonlocal total_files, new_files, error_count, error_details

            try:
                items = [item for item in os.scandir(dir_path)]
            except Exception as e:
                logging.error(f"Klasör erişim hatası: {dir_path}", exc_info=e)
                error_count += 1
                error_details.append({"path": dir_path, "error": str(e)})
                return

            for item in items:
                full_path = str(Path(item.path))

                if item.is_dir():
                    await scan_directory(full_path)
                elif item.is_file():
                    ext = Path(item.name).suffix[1:].lower()
                    if ext in ALL_SUPPORTED_FORMATS:
                        try:
                            stats = os.stat(full_path)
                            file_name = Path(item.name).stem

                            media_type = next(
                                (
                                    format_type
                                    for format_type, exts in SUPPORTED_FORMATS.items()
                                    if ext in exts
                                ),
                                "unknown",
                            )

                            # Geliştirilmiş kelime çıkarma
                            improved_words = extract_improved_words(file_name, full_path)

                            new_files.append(
                                {
                                    "path": full_path,
                                    "name": item.name,
                                    "fileNameOnly": file_name,
                                    "normalizedName": normalize_text(
                                        file_name, {"keepSpaces": True, "keepSpecialChars": False}
                                    ),
                                    "indexedWords": extract_normalized_words(file_name, full_path),
                                    "extension": ext,
                                    "type": media_type,
                                    "size": stats.st_size,
                                    "modifiedTime": datetime.fromtimestamp(
                                        stats.st_mtime
                                    ).isoformat(),
                                    # Yeni veritabanı yapısı için kelime kategorileri
                                    "fileWords": improved_words['file_words'],
                                    "folderWords": improved_words['folder_words'],
                                    "allWords": improved_words['all_words'],
                                    "artistWords": improved_words.get('artist_words', []),
                                    "songWords": improved_words.get('song_words', []),
                                    "meaningfulWords": improved_words.get('meaningful_words', []),
                                    "meaningfulArtistWords": improved_words.get('meaningful_artist_words', []),
                                    "meaningfulSongWords": improved_words.get('meaningful_song_words', [])
                                }
                            )
                            total_files += 1
                        except Exception as e:
                            logging.error(f"Dosya işleme hatası: {full_path}", exc_info=e)
                            error_count += 1
                            error_details.append({"path": full_path, "error": str(e)})

        await scan_directory(MUSIC_ROOT)

        # Veritabanını güncelle
        instance = await Database.get_instance()
        async with instance._data_lock:
            instance.data = {
                "version": "1.0",
                "lastUpdate": datetime.now().isoformat(),
                "encoding": "utf-8",
                "musicFiles": new_files,
                "stats": {
                    "totalFiles": total_files,
                    "lastIndexDuration": int((time.time() - start_time) * 1000),
                    "indexingProgress": 100,
                    "status": "completed",
                    "errorCount": error_count,
                    "errorDetails": error_details if error_details else None,
                },
            }
            await instance.save()

        return {
            "status": "success",
            "data": {
                "totalFiles": total_files,
                "newFiles": len(new_files),
                "duration": int((time.time() - start_time) * 1000),
                "lastUpdate": instance.data["lastUpdate"],
                "errorCount": error_count,
                "errorDetails": error_details if error_details else None,
            },
        }

    except Exception as e:
        logging.error("Indexing error:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e),
                "details": {
                    "errorCode": getattr(e, "code", None),
                    "errorMessage": str(e),
                    "stack": str(e.__traceback__),
                },
            },
        ) from e


@app.get("/api/index/status")
async def get_index_status():
    """Veritabanı durumu"""
    try:
        async with Database.get_data_lock() as db:
            return {
                "status": "success",
                "data": {
                    "totalFiles": db["stats"].get("totalFiles", 0),
                    "lastUpdate": db["lastUpdate"],
                    "fileCount": len(db["musicFiles"]),
                    "indexStatus": db["stats"].get("status", "unknown"),
                    "databasePath": str(DB_PATH.absolute())
                },
            }
    except Exception as e:
        logging.error("Status error:", exc_info=e)
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "error", 
                "message": str(e),
                "details": str(e.__traceback__)
            }
        )


class SearchRequest(BaseModel):
    paths: List[str]
    options: Optional[Dict] = None


@app.post("/api/search/files")
async def search_files(data: SearchRequest):
    """Dosya ara"""
    try:
        if not isinstance(data.paths, list):
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "error",
                    "message": "Geçersiz istek: 'paths' parametresi dizi olmalı",
                    "details": {
                        "received": type(data.paths).__name__,
                        "example": {"paths": ["/path/to/file1.mp3", "/path/to/file2.mp4"]},
                    },
                },
            )

        invalid_paths = [path for path in data.paths if not isinstance(path, str)]
        if invalid_paths:
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "error",
                    "message": "Geçersiz path değerleri",
                    "details": {"invalidPaths": invalid_paths, "expected": "string"},
                },
            )

        start_time = time.time()
        # Sınır kaldırıldı - tüm path'ler işlenecek
        all_paths = data.paths
        
        # Önbellek anahtarı oluştur
        cache_key = hashlib.md5(json.dumps(all_paths).encode()).hexdigest()
        
        # Önbellekten kontrol et
        cached_result = await Database.get_search_cache(cache_key)
        if cached_result:
            return cached_result

        # Veritabanını yükle ve indeksleri oluştur
        db_instance = await Database.get_instance()
        if not db_instance._path_index:  # İndeksler oluşturulmamışsa
            await Database.load()  # Veritabanını yükle ve indeksleri oluştur
        
        match_details = {
            "tamYolEsleme": {"count": 0, "time": 0, "algoritmaYontemi": "Tam Yol Eşleşme"},
            "ayniKlasorFarkliUzanti": {
                "count": 0,
                "time": 0,
                "algoritmaYontemi": "Aynı Klasör Farklı Uzantı",
            },
            "farkliKlasor": {"count": 0, "time": 0, "algoritmaYontemi": "Farklı Klasör Aynı Ad"},
            "farkliKlasorveUzanti": {
                "count": 0,
                "time": 0,
                "algoritmaYontemi": "Farklı Klasör Farklı Uzantı",
            },
            "benzerDosya": {"count": 0, "time": 0, "algoritmaYontemi": "Benzerlik Bazlı Arama"},
        }
        
        # Paralel arama için yardımcı fonksiyon
        async def search_single_file(search_path: str) -> Dict:
            search_start_time = time.time()
            search_file_name = Path(search_path).name
            search_file_name_without_ext = Path(search_path).stem
            search_dir = str(Path(search_path).parent)
            normalized_search_dir = normalize_path(search_dir)
            
            # Veritabanı örneğinin yüklendiğinden emin ol
            if db_instance is None or db_instance.data is None:
                current_process_time = int((time.time() - search_start_time) * 1000)
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": False,
                        "status": "not_found",
                        "processTime": current_process_time,
                    },
                    "match_type": None,
                    "process_time": current_process_time
                }
            
            # 1. Tam yol eşleşme kontrolü - İndeks kullanarak
            if db_instance is not None and db_instance._path_index is not None and search_path in db_instance._path_index:
                match_type = "tamYolEsleme"
                current_process_time = int((time.time() - search_start_time) * 1000)
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": search_path,
                        "processTime": current_process_time,
                    },
                    "match_type": match_type,
                    "process_time": current_process_time
                }
            
            # 2. Aynı klasörde farklı uzantı kontrolü - İndeks kullanarak
            if db_instance is not None and db_instance._dir_index is not None and normalized_search_dir in db_instance._dir_index:
                dir_files = db_instance._dir_index[normalized_search_dir]
                for file in dir_files:
                    if "path" in file and file["path"] is not None:
                        file_stem = Path(file["path"]).stem
                        if normalize_file_name(file_stem) == normalize_file_name(search_file_name_without_ext):
                            match_type = "ayniKlasorFarkliUzanti"
                            current_process_time = int((time.time() - search_start_time) * 1000)
                            return {
                                "result": {
                                    "originalPath": search_path,
                                    "found": True,
                                    "status": "exact_match",
                                    "matchType": match_type,
                                    "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                                    "foundPath": file["path"],
                                    "processTime": current_process_time,
                                },
                                "match_type": match_type,
                                "process_time": current_process_time
                            }
            
            # 3. Farklı klasörde aynı ad kontrolü - İndeks kullanarak
            if db_instance._name_index is not None and search_file_name_without_ext in db_instance._name_index:
                match_type = "farkliKlasor"
                current_process_time = int((time.time() - search_start_time) * 1000)
                found_path = db_instance._name_index[search_file_name_without_ext][0]["path"] if db_instance._name_index[search_file_name_without_ext] else search_path
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": found_path,
                        "processTime": current_process_time,
                    },
                    "match_type": match_type,
                    "process_time": current_process_time
                }
            
            # 4. Farklı klasörde farklı uzantı kontrolü - İndeks kullanarak
            normalized_name = normalize_text(search_file_name_without_ext)
            if db_instance._normalized_name_index is not None and normalized_name in db_instance._normalized_name_index:
                match_type = "farkliKlasorveUzanti"
                current_process_time = int((time.time() - search_start_time) * 1000)
                found_path = db_instance._normalized_name_index[normalized_name][0]["path"] if db_instance._normalized_name_index[normalized_name] else search_path
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": found_path,
                        "processTime": current_process_time,
                    },
                    "match_type": match_type,
                    "process_time": current_process_time
                }
            
            # 5. YENİ VERİTABANI YAPISI İLE BENZERLİK ARAMA
            # Fuzzy search kontrolü - Varsayılan olarak aktif
            fuzzy_search_enabled = True  # Her zaman aktif
            if data.options and 'fuzzySearch' in data.options:
                fuzzy_search_enabled = data.options.get('fuzzySearch', True)
            
            if not fuzzy_search_enabled:
                logging.info(f"🔍 Fuzzy search devre dışı, benzerlik arama atlanıyor: {search_file_name}")
                current_process_time = int((time.time() - search_start_time) * 1000)
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": False,
                        "status": "not_found",
                        "processTime": current_process_time,
                    },
                    "match_type": None,
                    "process_time": current_process_time
                }
            
            try:
                logging.info(f"🔍 Benzerlik arama başlatılıyor: {search_file_name}")
                
                search_words = extract_improved_words(search_file_name, search_path)
                logging.info(f"📝 Search words çıkarıldı: {search_words}")
                
                # Search words None kontrolü
                if search_words is None:
                    logging.warning(f"⚠️ Search words None: {search_file_name}")
                    current_process_time = int((time.time() - search_start_time) * 1000)
                    return {
                        "result": {
                            "originalPath": search_path,
                            "found": False,
                            "status": "not_found",
                            "processTime": current_process_time,
                        },
                        "match_type": None,
                        "process_time": current_process_time
                    }
                
                # SADECE BENZERLİK SKORU - PREFIX FİLTRELEME YOK
                candidates = []
                # Geliştirilmiş eşik değeri - daha anlamlı eşleşmeler için
                threshold = 0.3  # Düşük threshold - daha fazla eşleşme bul
                
                logging.info(f"🎯 Threshold: {threshold}")
                logging.info(f"🗄️ DB instance kontrol: {db_instance is not None}")
                logging.info(f"📊 DB data kontrol: {db_instance.data is not None if db_instance else 'N/A'}")
                
                # TÜM DOSYALARI TARA - YENİ VERİTABANI YAPISI
                if db_instance is not None and db_instance.data is not None and 'musicFiles' in db_instance.data:
                    music_files = db_instance.data['musicFiles']
                    logging.info(f"📁 Müzik dosyaları sayısı: {len(music_files)}")
                    
                    for i, file in enumerate(music_files):
                        try:
                            # Dosya None kontrolü
                            if file is None:
                                logging.warning(f"⚠️ Dosya None: index {i}")
                                continue
                            
                            logging.debug(f"🔍 Dosya işleniyor {i+1}/{len(music_files)}: {file.get('path', 'Unknown')}")
                            
                            # Veritabanındaki indexedWords'ü kullan
                            indexed_words = file.get('indexedWords', []) if file else []
                            
                            # indexedWords'den kelime kategorilerini oluştur
                            target_words = {
                                'file_words': indexed_words,
                                'folder_words': indexed_words,
                                'artist_words': indexed_words,
                                'song_words': indexed_words,
                                'all_words': indexed_words,
                                'meaningful_words': indexed_words
                            }
                            
                            logging.debug(f"📝 Target words: {target_words}")
                            
                            similarity = calculate_improved_similarity(search_words, target_words)
                            logging.debug(f"🎯 Benzerlik skoru: {similarity}")
                            
                            if similarity > threshold:
                                candidates.append({
                                    "file": file, 
                                    "similarity": similarity,
                                    "file_words": target_words['file_words'],
                                    "folder_words": target_words['folder_words']
                                })
                                logging.info(f"✅ Aday bulundu: {similarity:.3f} - {file.get('path', 'Unknown')}")
                        
                        except Exception as file_error:
                            logging.error(f"❌ Dosya işleme hatası {i}: {file_error}")
                            continue
                
                else:
                    logging.warning("⚠️ Veritabanı veya müzik dosyaları bulunamadı")
                    logging.warning(f"   DB instance: {db_instance is not None}")
                    logging.warning(f"   DB data: {db_instance.data is not None if db_instance else 'N/A'}")
                    if db_instance and db_instance.data:
                        logging.warning(f"   MusicFiles key: {'musicFiles' in db_instance.data}")
                
                logging.info(f"🎯 Toplam aday sayısı: {len(candidates)}")
                
                # DEBUG: Dr Alban aramaları için detaylı log
                if "Dr Alban" in search_path or "Away From Home" in search_path:
                    logging.info(f"🔍 DEBUG - Search path: {search_path}")
                    logging.info(f"🔍 DEBUG - Search words: {search_words}")
                    sorted_candidates = sorted(candidates, key=lambda x: x["similarity"], reverse=True)
                    logging.info(f"🔍 DEBUG - Top 10 candidates:")
                    for i, candidate in enumerate(sorted_candidates[:10]):
                        logging.info(f"  {i+1}. {candidate['file'].get('name', 'Unknown')} - {candidate['similarity']:.3f}")
                        logging.info(f"      Path: {candidate['file'].get('path', 'Unknown')}")
                        if 'target_words' in candidate:
                            logging.info(f"      Target words: {candidate['target_words']}")
                
                # Benzerlik arama sayacını threshold'u geçen dosya sayısına göre ayarla
                if candidates:
                    match_details["benzerDosya"]["count"] = len(candidates)  # Threshold'u geçen dosya sayısı
                
            except Exception as similarity_error:
                logging.error(f"❌ Benzerlik arama hatası: {similarity_error}")
                logging.error(f"   Traceback: {similarity_error.__traceback__}")
                current_process_time = int((time.time() - search_start_time) * 1000)
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": False,
                        "status": "error",
                        "processTime": current_process_time,
                        "error": str(similarity_error)
                    },
                    "match_type": None,
                    "process_time": current_process_time
                }
            
            # En iyi eşleşmeyi bul - TAM EŞLEŞME ÖNCELİĞİ
            if candidates:
                # Benzerlik skoruna göre sırala
                candidates.sort(key=lambda x: x["similarity"], reverse=True)
                
                # Aynı benzerlik skorunda tam eşleşme sayısına göre sırala
                def sort_key(candidate):
                    similarity = candidate["similarity"]
                    file_words = candidate["file_words"]
                    exact_matches = len(set(search_words['file_words']) & set(file_words))
                    return (similarity, exact_matches)
                
                candidates.sort(key=sort_key, reverse=True)
                best_match = candidates[0]  # En yüksek benzerlik + en fazla tam eşleşme
                match_type = "benzerDosya"
                current_process_time = int((time.time() - search_start_time) * 1000)
                return {
                    "result": {
                        "originalPath": search_path,
                        "found": True,
                        "status": "similar_found",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "similarity": best_match["similarity"],
                        "foundPath": best_match["file"]["path"],
                        "processTime": current_process_time,
                    },
                    "match_type": match_type,
                    "process_time": current_process_time
                }
            
            # Eşleşme bulunamadı
            current_process_time = int((time.time() - search_start_time) * 1000)
            return {
                "result": {
                    "originalPath": search_path,
                    "found": False,
                    "status": "not_found",
                    "processTime": current_process_time,
                },
                "match_type": None,
                "process_time": current_process_time
            }
        
        # Tüm dosyaları paralel olarak ara
        tasks = [search_single_file(path) for path in all_paths]
        search_results = await asyncio.gather(*tasks)
        
        # Sonuçları birleştir
        results = []
        total_process_time = 0
        
        for result_data in search_results:
            results.append(result_data["result"])
            total_process_time += result_data["process_time"]
            
            # İstatistikleri güncelle
            if result_data["match_type"]:
                match_details[result_data["match_type"]]["count"] += 1
                match_details[result_data["match_type"]]["time"] += result_data["process_time"]
        
        execution_time = int((time.time() - start_time) * 1000)
        average_process_time = int(total_process_time / len(all_paths)) if all_paths and len(all_paths) > 0 else 0
        
        # Sonuçları log dosyasına kaydet
        try:
            log_data = {
                "timestamp": datetime.now().isoformat(),
                "api_endpoint": "/api/search/files",
                "request_data": {
                    "total_paths": len(all_paths) if all_paths else 0,
                    "batch_size": 100,
                    "fuzzy_search": False
                },
                "response_data": {
                    "status": "success",
                    "totalProcessed": len(all_paths) if all_paths else 0,
                    "executionTime": execution_time,
                    "averageProcessTime": average_process_time,
                    "matchDetails": match_details,
                    "results": results
                }
            }
        except Exception as log_error:
            logging.error(f"❌ Log data oluşturma hatası: {log_error}")
            log_data = {"error": str(log_error)}
        
        # Log dosyasına yaz
        log_filename = f"search_files_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_path = os.path.join("logs", log_filename)
        
        try:
            os.makedirs("logs", exist_ok=True)
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(log_data, f, ensure_ascii=False, indent=2)
            logging.info(f"Search files sonuçları log dosyasına kaydedildi: {log_path}")
        except Exception as log_error:
            logging.error(f"Log dosyası yazma hatası: {log_error}")
        
        return {
            "status": "success",
            "data": results,
            "stats": {
                "totalProcessed": len(all_paths),
                "executionTime": execution_time,
                "averageProcessTime": average_process_time,
                "matchDetails": match_details
            }
        }
    except Exception as e:
        logging.error("Search error:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e),
                "details": str(e.__traceback__)
            }
        )


# Müzik dosyası stream endpoint'i
class StreamRequest(BaseModel):
    filePath: str


@app.post("/api/stream")
async def stream_music_file(data: StreamRequest):
    """Müzik dosyasını stream et"""
    try:
        # Türkçe karakterli dosya yolları için direkt kullan
        file_path = data.filePath
        # Logging'i güvenli hale getir
        try:
            logging.info(f"Stream isteği - Orijinal: {data.filePath}, Decoded: {file_path}")
        except UnicodeEncodeError:
            logging.info("Stream isteği - Türkçe karakterli dosya yolu")
        
        # Türkçe karakterli dosya yolları için özel handling
        normalized_path = file_path
        
        # Pathlib kullanarak Türkçe karakterli dosya yollarını işle
        from pathlib import Path
        file_path_obj = Path(normalized_path)
        
        # Dosya varlığını kontrol et
        if not file_path_obj.exists():
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "Dosya bulunamadi", "filePath": "Turkish characters in path"}
            )
        
        # Dosya güvenlik kontrolü - sadece müzik dosyalarına izin ver
        allowed_extensions = {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'}
        file_extension = file_path_obj.suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "error": "Desteklenmeyen dosya formati", "filePath": "Turkish characters in path"}
            )
        
        # Dosya boyutunu kontrol et (max 100MB)
        file_size = file_path_obj.stat().st_size
        max_size = 100 * 1024 * 1024  # 100MB
        
        if file_size > max_size:
            raise HTTPException(
                status_code=413,
                detail={"success": False, "error": "Dosya cok buyuk", "filePath": "Turkish characters in path", "size": file_size}
            )
        
        # Dosyayı stream et
        def iter_file():
            # M4A dosyaları için daha büyük chunk boyutu kullan
            chunk_size = 32768 if file_extension == '.m4a' else 8192  # 32KB for M4A, 8KB for others
            
            try:
                with file_path_obj.open("rb") as file:
                    while True:
                        chunk = file.read(chunk_size)
                        if not chunk:
                            break
                        yield chunk
            except Exception as e:
                logging.error(f"Dosya acma hatasi: {e}")
                raise
        
        # Content-Type'ı dosya uzantısına göre belirle
        content_type_map = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.flac': 'audio/flac',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.wma': 'audio/x-ms-wma'
        }
        
        content_type = content_type_map.get(file_extension, 'audio/mpeg')
        
        # M4A dosyaları için özel header'lar - Türkçe karakter güvenli
        safe_filename = "music_file" + file_extension
        headers = {
            "Content-Disposition": f"inline; filename=\"{safe_filename}\"",
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "no-cache"
        }
        
        # M4A dosyaları için özel ayarlar
        if file_extension == '.m4a':
            headers.update({
                "Content-Type": "audio/mp4",
                "X-Content-Type-Options": "nosniff"
            })
        
        # StreamingResponse döndür
        return StreamingResponse(
            iter_file(),
            media_type=content_type,
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Muzik dosyasi stream hatasi:", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": "Stream hatasi", "details": "Encoding error"}
        )


# Main bloğu - doğrudan çalıştırılabilir hale getirme
if __name__ == "__main__":
    import uvicorn
    import traceback
    
    # Hata loglama için dosya ayarla
    error_log_file = "logs/error.log"
    os.makedirs("logs", exist_ok=True)
    
    try:
        # Sabit port kullan - dinamik port sistemi kaldırıldı
        print(f"Starting server on port {API_PORT}...")
        uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="info")
    except Exception as e:
        error_msg = f"Server başlatma hatası: {str(e)}\nTraceback: {traceback.format_exc()}\n"
        print(error_msg)
        
        # Hata dosyasına yaz
        with open(error_log_file, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} - {error_msg}\n")
        
        raise
