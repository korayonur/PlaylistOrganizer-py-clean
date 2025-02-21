from abc import ABC, abstractmethod
from typing import List, Optional

from ..entities.playlist import Playlist, PlaylistSong


class PlaylistRepository(ABC):
    """Playlist repository arayüzü"""

    @abstractmethod
    async def get_playlist_tree(self) -> List[Playlist]:
        """Playlist ağacını getirir"""
        pass

    @abstractmethod
    async def get_playlist_by_path(self, path: str) -> Optional[Playlist]:
        """Yola göre playlist'i getirir"""
        pass

    @abstractmethod
    async def get_playlist_songs(self, path: str) -> List[PlaylistSong]:
        """Playlist şarkılarını getirir"""
        pass

    @abstractmethod
    async def update_playlist_songs(self, path: str, songs: List[PlaylistSong]) -> None:
        """Playlist şarkılarını günceller"""
        pass
