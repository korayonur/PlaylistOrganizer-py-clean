import base64
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Optional

from ....domain.entities.playlist import Playlist
from ....domain.entities.playlist_song import PlaylistSong
from ....domain.repositories.playlist_repository import PlaylistRepository
from ..exceptions import RepositoryError


class JsonPlaylistRepository(PlaylistRepository):
    """JSON playlist repository implementasyonu"""

    def __init__(self, playlists_root: str):
        self.playlists_root = Path(playlists_root)

    async def get_playlist_tree(self) -> List[Playlist]:
        """Playlist ağacını getirir"""
        try:
            return await self._build_playlist_tree(self.playlists_root)
        except Exception as err:
            raise RepositoryError("Playlist ağacı oluşturulurken hata oluştu") from err

    async def get_playlist_by_path(self, path: str) -> Optional[Playlist]:
        """Yola göre playlist'i getirir"""
        try:
            playlist_path = Path(path)
            if not playlist_path.exists():
                return None

            if playlist_path.suffix == ".vdjfolder":
                return await self._parse_playlist_file(playlist_path)

            return None
        except Exception as err:
            raise RepositoryError("Playlist okuma hatası") from err

    async def get_playlist_songs(self, path: str) -> List[PlaylistSong]:
        """Playlist şarkılarını getirir"""
        try:
            playlist_path = Path(path)
            if not playlist_path.exists():
                return []

            if playlist_path.suffix != ".vdjfolder":
                return []

            content = playlist_path.read_text(encoding="utf-8").strip()
            root = ET.fromstring(content)

            songs = []
            for song_elem in root.findall(".//song"):
                song_path = song_elem.get("path")
                exists = Path(song_path).exists() if song_path else False
                songs.append(PlaylistSong(path=song_path, exists=exists))

            return songs
        except Exception as err:
            raise RepositoryError("Playlist şarkıları okunurken hata oluştu") from err

    async def update_playlist_songs(self, path: str, songs: List[PlaylistSong]) -> None:
        """Playlist şarkılarını günceller"""
        try:
            playlist_path = Path(path)
            if not playlist_path.exists():
                raise FileNotFoundError(f"Playlist bulunamadı: {path}")

            if playlist_path.suffix != ".vdjfolder":
                raise ValueError("Geçersiz playlist dosyası")

            content = playlist_path.read_text(encoding="utf-8").strip()
            root = ET.fromstring(content)

            # Mevcut şarkıları temizle
            for song_elem in root.findall(".//song"):
                root.remove(song_elem)

            # Yeni şarkıları ekle
            for song in songs:
                song_elem = ET.SubElement(root, "song")
                song_elem.set("path", song.path)

            # XML'i kaydet
            tree = ET.ElementTree(root)
            tree.write(playlist_path, encoding="utf-8", xml_declaration=True)

        except Exception as err:
            raise RepositoryError("Playlist güncelleme hatası") from err

    async def _build_playlist_tree(self, dir_path: Path) -> List[Playlist]:
        """Playlist ağacını oluşturur"""
        items = []

        # Klasörleri ve .subfolders dosyalarını bul
        folders = [
            item
            for item in dir_path.iterdir()
            if item.is_dir() or item.name.endswith(".subfolders")
        ]

        # .vdjfolder dosyalarını bul
        files = [item for item in dir_path.iterdir() if item.name.endswith(".vdjfolder")]

        # Klasörleri işle
        for folder in folders:
            if folder.name == "My Library.subfolders":
                continue

            is_subfolder = folder.name.endswith(".subfolders")
            children = await self._build_playlist_tree(folder) if is_subfolder else []

            if children:
                items.append(
                    Playlist(
                        id=base64.b64encode(str(folder).encode()).decode(),
                        name=folder.name.replace(".subfolders", ""),
                        path=str(folder),
                        type="folder",
                        children=children,
                        songs=[],
                        song_count=0
                    )
                )

        # Playlist dosyalarını işle
        for file in files:
            playlist = await self._parse_playlist_file(file)
            if playlist:
                items.append(playlist)

        # Sırala
        return sorted(items, key=lambda x: (x.type != "folder", x.name.lower()))

    async def _parse_playlist_file(self, file_path: Path) -> Optional[Playlist]:
        """Playlist dosyasını ayrıştırır"""
        try:
            content = file_path.read_text(encoding="utf-8").strip()
            root = ET.fromstring(content)

            songs = root.findall(".//song")
            if not songs:
                return None

            return Playlist(
                id=base64.b64encode(str(file_path).encode()).decode(),
                name=file_path.name.replace(".vdjfolder", ""),
                path=str(file_path),
                type="playlist",
                song_count=len(songs),
                songs=[],
                children=[]
            )
        except Exception as err:
            raise RepositoryError("Playlist ayrıştırma hatası") from err
