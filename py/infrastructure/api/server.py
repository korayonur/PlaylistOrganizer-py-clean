"""
FastAPI sunucusu

Playlist Organizer uygulamasının API sunucusunu başlatan ve
yöneten modül. REST API endpoint'lerini ve ilgili use-case'leri
içerir.
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ...application.use_cases.get_playlist_songs import GetPlaylistSongsUseCase
from ...application.use_cases.get_playlist_tree import GetPlaylistTreeUseCase
from ...application.use_cases.index_music_files import IndexMusicFilesUseCase
from ...application.use_cases.search_music_files import SearchMusicFilesUseCase
from ...domain.services.similarity_calculator import SimilarityCalculator
from ...domain.services.text_normalizer import TextNormalizer
from ...domain.value_objects.supported_formats import SupportedFormats
from ..persistence.json_database import JsonDatabase
from ..persistence.repositories.json_music_file_repository import JsonMusicFileRepository
from ..persistence.repositories.json_playlist_repository import JsonPlaylistRepository

# Sabit yollar
PLAYLISTS_ROOT = os.path.expanduser("~/Library/Application Support/VirtualDJ/Folders")
MUSIC_ROOT = os.path.expanduser("~/Music/KorayMusics")
DB_PATH = "musicfiles.db.json"
POETRY_ROOT = "/Users/koray/projects/PlaylistOrganizer-py/py"

# FastAPI uygulaması
app = FastAPI(
    title="Playlist Organizer API",
    description="VirtualDJ playlist dosyalarını yönetmek için REST API",
    version="1.0.0",
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik dosyalar
static_path = Path(__file__).parent.parent.parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Servisler
text_normalizer = TextNormalizer()
similarity_calculator = SimilarityCalculator()
supported_formats = SupportedFormats()

# Veritabanı
database = JsonDatabase(DB_PATH)

# Repository'ler
music_file_repository = JsonMusicFileRepository(database)
playlist_repository = JsonPlaylistRepository(PLAYLISTS_ROOT)

# Use case'ler
index_music_files = IndexMusicFilesUseCase(
    music_file_repository=music_file_repository,
    text_normalizer=text_normalizer,
    supported_formats=supported_formats,
)

search_music_files = SearchMusicFilesUseCase(
    music_file_repository=music_file_repository,
    text_normalizer=text_normalizer,
    similarity_calculator=similarity_calculator,
)

get_playlist_tree = GetPlaylistTreeUseCase(playlist_repository=playlist_repository)

get_playlist_songs = GetPlaylistSongsUseCase(playlist_repository=playlist_repository)


# Ana sayfa
@app.get("/")
async def get_index():
    """Ana sayfayı döndürür"""
    return FileResponse(str(static_path / "index.html"))


# API endpoint'leri
@app.get("/api/test")
async def test_api():
    """API test endpoint'i"""
    return {"status": "success", "message": "API çalışıyor"}


@app.post("/api/index/create")
async def create_index():
    """Müzik dosyalarını indeksler"""
    return await index_music_files.execute(MUSIC_ROOT)


@app.get("/api/index/status")
async def get_index_status():
    """İndeksleme durumunu getirir"""
    await database.load()
    return {"status": "success", "data": database.stats}


@app.post("/api/search/files")
async def search_files(request: dict):
    """Müzik dosyalarını arar"""
    if not request.get("paths"):
        raise HTTPException(status_code=400, detail="paths parametresi gerekli")
    return await search_music_files.execute(request["paths"])


@app.get("/api/playlists/list")
async def get_playlists():
    """Playlist ağacını getirir"""
    return await get_playlist_tree.execute()


@app.post("/api/playlistsongs/read")
async def get_playlist_songs_endpoint(request: dict):
    """Playlist şarkılarını getirir"""
    if not request.get("playlistPath"):
        raise HTTPException(status_code=400, detail="playlistPath parametresi gerekli")
    return await get_playlist_songs.execute(request["playlistPath"])
