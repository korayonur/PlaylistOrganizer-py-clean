import json
import logging
import os
import time
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

import aiofiles
import xmltodict
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
from contextlib import asynccontextmanager

# Konfigürasyonu import et
from config import (
    CORS_ORIGINS,
    PLAYLISTS_ROOT,
    PLAYLISTS_FOLDERS,
    PLAYLISTS_MYLISTS,
    MUSIC_ROOT,
    DB_PATH
)

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
    "à": "a",
    "á": "a",
    "â": "a",
    "ã": "a",
    "ä": "a",
    "å": "a",
    "æ": "ae",
    "ç": "c",
    "ć": "c",
    "č": "c",
    # ... diğer karakterler eklenecek
}


# Veritabanı sınıfı
class Database:
    _instance = None
    _lock: asyncio.Lock = None
    _data_lock: asyncio.Lock = None
    _file_lock: asyncio.Lock = None
    _cache: Dict[str, Any] = {}
    _last_write: float = 0
    _cache_ttl: int = 300  # 5 dakika
    data = None

    def __init__(self):
        """Initialize locks"""
        Database._lock = asyncio.Lock()
        Database._data_lock = asyncio.Lock()
        Database._file_lock = asyncio.Lock()

    @classmethod
    @asynccontextmanager
    async def get_data_lock(cls):
        """Context manager for data access"""
        instance = await cls.get_instance()
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
        if instance.data is None:
            try:
                async with instance._file_lock:
                    if DB_PATH.exists():
                        async with aiofiles.open(DB_PATH, "r", encoding="utf-8") as f:
                            content = await f.read()
                            instance.data = json.loads(content)

                            # indexedWords kontrolü - mevcut mantık korundu
                            if not any("indexedWords" in file for file in instance.data["musicFiles"]):
                                instance.data["musicFiles"] = [
                                    {
                                        **file,
                                        "indexedWords": extract_normalized_words(file["fileNameOnly"]),
                                    }
                                    for file in instance.data["musicFiles"]
                                ]
                                await instance.save()
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
            except Exception as e:
                logging.error(f"Database load error: {e}")
                return None
        return instance.data

    @classmethod
    async def save(cls) -> None:
        """Save database with file lock"""
        instance = await cls.get_instance()
        async with instance._file_lock:
            async with aiofiles.open(DB_PATH, "w", encoding="utf-8") as f:
                await f.write(json.dumps(instance.data, indent=2))


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


def normalize_word(text: str) -> str:
    """Kelime normalizasyonu"""
    return normalize_text(text, {"keepSpaces": False, "keepSpecialChars": False})


def normalize_path(text: str) -> str:
    """Yol normalizasyonu"""
    return normalize_text(text, {"keepSpaces": True, "keepSpecialChars": True, "keepCase": False})


def normalize_search_term(text: str) -> str:
    """Arama terimi normalizasyonu"""
    return normalize_text(text, {"keepSpaces": True, "keepSpecialChars": False})


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


def split_artist_and_title(filename: str) -> List[Dict[str, str]]:
    """Sanatçı ve şarkı adını ayır"""
    separators = [" - ", " – ", " — ", " _ "]

    for separator in separators:
        if separator in filename:
            part1, part2 = filename.split(separator)

            normalized_part1 = normalize_text(part1)
            normalized_part2 = normalize_text(part2)

            return [
                {"artist": normalized_part1, "title": normalized_part2},
                {"artist": normalized_part2, "title": normalized_part1},
            ]

    return [{"artist": "", "title": normalize_text(filename)}]


async def extract_normalized_words(file_name: str, file_path: str = "") -> List[str]:
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


async def calculate_word_based_similarity(words1: List[str], words2: List[str]) -> float:
    """Kelime bazlı benzerlik hesapla"""
    search_words = words1[4:] if len(words1) > 4 else words1
    target_words = words2[4:] if len(words2) > 4 else words2

    # Sanatçı karşılaştırması
    artist_match = (
        len(search_words) >= 2
        and len(target_words) >= 2
        and search_words[0] == target_words[0]
        and search_words[1] == target_words[1]
    )

    # Şarkı adı karşılaştırması
    song_words1 = search_words[2:] if len(search_words) > 2 else []
    song_words2 = target_words[2:] if len(target_words) > 2 else []

    song_match = any(
        any(
            target_word == word
            or (len(word) >= 3 and word in target_word)
            or (len(target_word) >= 3 and target_word in word)
            for target_word in song_words2
        )
        for word in song_words1
    )

    return (0.7 if artist_match else 0) + (0.3 if song_match else 0)


def calculate_file_name_similarity(file_name1: str, file_name2: str) -> float:
    """Dosya adı benzerliği hesapla"""
    words1 = extract_normalized_words(file_name1)
    words2 = extract_normalized_words(file_name2)
    return calculate_word_based_similarity(words1, words2)


def calculate_simple_similarity(words1: List[str], words2: List[str]) -> float:
    """Basit benzerlik hesapla"""
    if not words1 or not words2:
        return 0.0

    matches = sum(
        1
        for word in words1
        if any(
            w == word or (len(word) > 3 and word in w) or (len(w) > 3 and w in word) for w in words2
        )
    )

    return matches / max(len(words1), len(words2))


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

    @staticmethod
    async def search_file(full_path: str) -> Dict:
        """Dosya ara"""
        start_time = time.time()
        
        async with Database.get_data_lock() as db:
            # Tam eşleşme kontrolü
            exact_match = await SearchService.check_different_folder(full_path)
            if exact_match:
                return {
                    "originalPath": full_path,
                    "foundPath": exact_match["path"],
                    "found": True,
                    "status": "exact_match",
                    "matchType": "farkliKlasor",
                    "algoritmaYontemi": "Tam Eşleşme",
                    "processTime": int((time.time() - start_time) * 1000),
                }

            # Benzerlik araması
            search_words = extract_normalized_words(full_path)
            similar_files = [
                {
                    "path": file["path"],
                    "similarity": calculate_simple_similarity(search_words, file["indexedWords"]),
                }
                for file in db["musicFiles"]
            ]

            similar_files = [match for match in similar_files if match["similarity"] > 0.3]

            similar_files.sort(key=lambda x: x["similarity"], reverse=True)
            similar_files = similar_files[:1]

            if similar_files:
                return {
                    "originalPath": full_path,
                    "foundPath": similar_files[0]["path"],
                    "found": True,
                    "status": "similar_found",
                    "matchType": "benzerDosya",
                    "algoritmaYontemi": "Basit Benzerlik",
                    "similarity": similar_files[0]["similarity"],
                    "processTime": int((time.time() - start_time) * 1000),
                }

            return {
                "originalPath": full_path,
                "found": False,
                "status": "not_found",
                "processTime": int((time.time() - start_time) * 1000),
            }


# API endpoint'leri eklenecek...


# Test endpoint'i
@app.get("/api/test")
async def test():
    """API'nin çalışıp çalışmadığını kontrol et"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }


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
        limited_paths = data.paths[:100]  # İlk 100 path ile sınırla

        results = []
        total_process_time = 0
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

        db = await Database.load()
        music_files = db["musicFiles"]

        for search_path in limited_paths:
            search_start_time = time.time()
            search_file_name = Path(search_path).name
            search_file_name_without_ext = Path(search_path).stem
            search_dir = str(Path(search_path).parent)

            # 1. Tam yol eşleşme kontrolü
            exact_match = next((file for file in music_files if file["path"] == search_path), None)

            if exact_match:
                match_type = "tamYolEsleme"
                current_process_time = int((time.time() - search_start_time) * 1000)
                results.append(
                    {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": search_path,
                        "processTime": current_process_time,
                    }
                )
                match_details[match_type]["count"] += 1
                match_details[match_type]["time"] += current_process_time
                total_process_time += current_process_time
                continue

            # 2. Aynı klasörde farklı uzantı kontrolü
            same_dir_diff_ext = next(
                (
                    file
                    for file in music_files
                    if normalize_path(str(Path(file["path"]).parent)) == normalize_path(search_dir)
                    and normalize_file_name(Path(file["path"]).stem)
                    == normalize_file_name(search_file_name_without_ext)
                ),
                None,
            )

            if same_dir_diff_ext:
                match_type = "ayniKlasorFarkliUzanti"
                current_process_time = int((time.time() - search_start_time) * 1000)
                results.append(
                    {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": same_dir_diff_ext["path"],
                        "processTime": current_process_time,
                    }
                )
                match_details[match_type]["count"] += 1
                match_details[match_type]["time"] += current_process_time
                total_process_time += current_process_time
                continue

            # 3. Farklı klasörde aynı ad kontrolü
            diff_dir_same_file = next(
                (
                    file
                    for file in music_files
                    if file["fileNameOnly"] == search_file_name_without_ext
                ),
                None,
            )

            if diff_dir_same_file:
                match_type = "farkliKlasor"
                current_process_time = int((time.time() - search_start_time) * 1000)
                results.append(
                    {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": diff_dir_same_file["path"],
                        "processTime": current_process_time,
                    }
                )
                match_details[match_type]["count"] += 1
                match_details[match_type]["time"] += current_process_time
                total_process_time += current_process_time
                continue

            # 4. Farklı klasörde farklı uzantı kontrolü
            diff_dir_diff_ext = next(
                (
                    file
                    for file in music_files
                    if file["normalizedName"] == normalize_text(search_file_name_without_ext)
                ),
                None,
            )

            if diff_dir_diff_ext:
                match_type = "farkliKlasorveUzanti"
                current_process_time = int((time.time() - search_start_time) * 1000)
                results.append(
                    {
                        "originalPath": search_path,
                        "found": True,
                        "status": "exact_match",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "foundPath": diff_dir_diff_ext["path"],
                        "processTime": current_process_time,
                    }
                )
                match_details[match_type]["count"] += 1
                match_details[match_type]["time"] += current_process_time
                total_process_time += current_process_time
                continue

            # 5. Benzerlik bazlı arama
            search_words = extract_normalized_words(search_file_name)
            candidates = [
                {
                    "file": file,
                    "similarity": calculate_two_stage_similarity(
                        search_words, file["indexedWords"]
                    ),
                }
                for file in music_files
            ]

            candidates = [match for match in candidates if match["similarity"] > 0.3]
            candidates.sort(key=lambda x: x["similarity"], reverse=True)
            candidates = candidates[:1]

            if candidates:
                best_match = candidates[0]
                match_type = "benzerDosya"
                current_process_time = int((time.time() - search_start_time) * 1000)
                results.append(
                    {
                        "originalPath": search_path,
                        "found": True,
                        "status": "similar_found",
                        "matchType": match_type,
                        "algoritmaYontemi": match_details[match_type]["algoritmaYontemi"],
                        "similarity": best_match["similarity"],
                        "foundPath": best_match["file"]["path"],
                        "processTime": current_process_time,
                    }
                )
                match_details[match_type]["count"] += 1
                match_details[match_type]["time"] += current_process_time
                total_process_time += current_process_time
            else:
                current_process_time = int((time.time() - search_start_time) * 1000)
                results.append(
                    {
                        "originalPath": search_path,
                        "found": False,
                        "status": "not_found",
                        "processTime": current_process_time,
                    }
                )
                total_process_time += current_process_time

        execution_time = int((time.time() - start_time) * 1000)
        average_process_time = int(total_process_time / len(limited_paths))

        not_found_paths = [result["originalPath"] for result in results if not result["found"]]

        return {
            "status": "success",
            "results": results,
            "stats": {
                "totalSearched": len(limited_paths),
                "found": len([r for r in results if r["found"]]),
                "notFound": len([r for r in results if not r["found"]]),
                "executionTimeMs": execution_time,
                "totalProcessTime": total_process_time,
                "averageProcessTime": average_process_time,
                "cacheHit": False,
                "matchDetails": match_details,
            },
            "notFoundPaths": not_found_paths if not_found_paths else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error("Search endpoint error:", exc_info=e)
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


# StreamRequest modeli
class StreamRequest(BaseModel):
    """Stream isteği için model"""
    filePath: str

async def range_requests_stream(file_path: str, start: int, end: int):
    """Dosyayı parça parça stream et"""
    chunk_size = 1024 * 1024  # 1MB chunks
    async with aiofiles.open(file_path, 'rb') as f:
        await f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk_size = min(chunk_size, remaining)
            data = await f.read(chunk_size)
            if not data:
                break
            remaining -= len(data)
            yield data

async def handle_web_stream(file_path: str, range: Optional[str], file_size: int) -> StreamingResponse:
    """Web tarayıcı için stream yanıtı"""
    start = 0
    end = file_size - 1
    
    if range:
        try:
            parts = range.replace("bytes=", "").split("-")
            start = int(parts[0])
            end = int(parts[1]) if parts[1] else file_size - 1
            
            if start >= file_size or end >= file_size:
                raise HTTPException(
                    status_code=416,
                    detail={
                        "success": False,
                        "error": "İstenen aralık dosya boyutunun dışında"
                    }
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "Geçersiz range header'ı"
                }
            )
    
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(end - start + 1),
        "Content-Type": MIME_TYPES.get(Path(file_path).suffix.lower()[1:], "application/octet-stream"),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "http://localhost:4200",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Type"
    }
    
    return StreamingResponse(
        range_requests_stream(file_path, start, end),
        status_code=206 if range else 200,
        headers=headers
    )

@app.post("/api/stream")
async def stream_file(
    request: StreamRequest,
    range: Optional[str] = Header(None),
    user_agent: Optional[str] = Header(None)
):
    """Müzik dosyasını stream olarak gönderir"""
    try:
        file_path = request.filePath
        logging.info(f"Stream isteği alındı: {file_path}")
        
        # URL encoding kontrolü
        from urllib.parse import unquote
        decoded_path = unquote(file_path)
        
        # Dosya varlığını kontrol et
        try:
            file_size = os.path.getsize(decoded_path)
        except OSError as e:
            logging.error(f"Dosya erişim hatası: {decoded_path}", exc_info=e)
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": "Dosya bulunamadı veya erişilemedi",
                    "details": {"path": decoded_path, "error": str(e)}
                }
            )
        
        # İsteğin masaüstü uygulamasından gelip gelmediğini kontrol et
        is_desktop_app = "QtWebEngine" in (user_agent or "")
        ext = Path(decoded_path).suffix.lower()[1:]
        
        # M4A dosyası ve masaüstü uygulama ise native player kullan
        if is_desktop_app and ext == "m4a":
            logging.info(f"Native playback kullanılıyor: {decoded_path}")
            return {
                "success": True,
                "action": "native_playback",
                "file_path": decoded_path,
                "mime_type": MIME_TYPES.get(ext, "application/octet-stream")
            }
        
        # Diğer durumlar için normal stream devam etsin
        logging.info(f"Web stream kullanılıyor: {decoded_path}")
        return await handle_web_stream(decoded_path, range, file_size)
        
    except Exception as e:
        logging.error(f"Stream hatası: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Stream işlemi başarısız",
                "details": str(e)
            }
        )


# Diğer endpoint'ler eklenecek...

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=3000)
