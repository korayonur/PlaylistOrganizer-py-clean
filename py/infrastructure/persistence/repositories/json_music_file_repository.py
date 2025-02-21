from datetime import datetime
from typing import Any, Dict, List, Optional

from ....domain.entities.music_file import MusicFile
from ....domain.repositories.music_file_repository import MusicFileRepository
from ..json_database import JsonDatabase


class JsonMusicFileRepository(MusicFileRepository):
    """JSON müzik dosyası repository implementasyonu"""

    def __init__(self, database: JsonDatabase):
        self.database = database

    async def save(self, music_file: MusicFile) -> None:
        """Müzik dosyasını kaydeder"""
        await self.database.load()
        music_files = self.database.music_files

        # Eğer dosya zaten varsa güncelle
        for i, file in enumerate(music_files):
            if file["path"] == music_file.path:
                music_files[i] = self._to_dict(music_file)
                break
        else:
            # Yoksa yeni ekle
            music_files.append(self._to_dict(music_file))

        self.database.music_files = music_files
        await self.database.save()

    async def save_many(self, music_files: List[MusicFile]) -> None:
        """Birden fazla müzik dosyasını kaydeder"""
        await self.database.load()
        self.database.music_files = [self._to_dict(music_file) for music_file in music_files]
        await self.database.save()

    async def find_by_path(self, path: str) -> Optional[MusicFile]:
        """Yola göre müzik dosyasını bulur"""
        await self.database.load()
        for file in self.database.music_files:
            if file["path"] == path:
                return self._to_entity(file)
        return None

    async def find_by_name(self, name: str) -> List[MusicFile]:
        """İsme göre müzik dosyalarını bulur"""
        await self.database.load()
        return [
            self._to_entity(file)
            for file in self.database.music_files
            if file["normalizedName"] == name
        ]

    async def find_similar(self, name: str, similarity_threshold: float = 0.3) -> List[MusicFile]:
        """Benzer isimdeki müzik dosyalarını bulur"""
        await self.database.load()
        return [self._to_entity(file) for file in self.database.music_files]

    async def get_all(self) -> List[MusicFile]:
        """Tüm müzik dosyalarını getirir"""
        await self.database.load()
        return [self._to_entity(file) for file in self.database.music_files]

    async def clear(self) -> None:
        """Tüm müzik dosyalarını siler"""
        await self.database.clear()

    def _to_dict(self, entity: MusicFile) -> Dict[str, Any]:
        """Entity'yi sözlüğe dönüştürür"""
        return {
            "path": entity.path,
            "name": entity.name,
            "fileNameOnly": entity.file_name_only,
            "normalizedName": entity.normalized_name,
            "indexedWords": entity.indexed_words,
            "extension": entity.extension,
            "fileType": entity.file_type,
            "size": entity.size,
            "modifiedTime": entity.modified_time.isoformat(),
            "mimeType": entity.mime_type,
        }

    def _to_entity(self, data: Dict[str, Any]) -> MusicFile:
        """Sözlüğü entity'ye dönüştürür"""
        return MusicFile(
            path=data["path"],
            name=data["name"],
            file_name_only=data["fileNameOnly"],
            normalized_name=data["normalizedName"],
            indexed_words=data["indexedWords"],
            extension=data["extension"],
            file_type=data["fileType"],
            size=data["size"],
            modified_time=datetime.fromisoformat(data["modifiedTime"]),
            mime_type=data.get("mimeType"),
        )
