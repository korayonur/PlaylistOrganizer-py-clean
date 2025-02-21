from abc import ABC, abstractmethod
from typing import List, Optional

from ..entities.music_file import MusicFile


class MusicFileRepository(ABC):
    """Müzik dosyası repository arayüzü"""

    @abstractmethod
    async def save(self, music_file: MusicFile) -> None:
        """Müzik dosyasını kaydeder"""
        pass

    @abstractmethod
    async def save_many(self, music_files: List[MusicFile]) -> None:
        """Birden fazla müzik dosyasını kaydeder"""
        pass

    @abstractmethod
    async def find_by_path(self, path: str) -> Optional[MusicFile]:
        """Yola göre müzik dosyasını bulur"""
        pass

    @abstractmethod
    async def find_by_name(self, name: str) -> List[MusicFile]:
        """İsme göre müzik dosyalarını bulur"""
        pass

    @abstractmethod
    async def find_similar(self, name: str, similarity_threshold: float = 0.3) -> List[MusicFile]:
        """Benzer isimdeki müzik dosyalarını bulur"""
        pass

    @abstractmethod
    async def get_all(self) -> List[MusicFile]:
        """Tüm müzik dosyalarını getirir"""
        pass

    @abstractmethod
    async def clear(self) -> None:
        """Tüm müzik dosyalarını siler"""
        pass
