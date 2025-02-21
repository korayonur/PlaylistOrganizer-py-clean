from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ....domain.entities.music_file import MusicFile
from ....domain.repositories.music_file_repository import (
    MusicFileRepository as MusicFileRepositoryBase,
)
from ..models import MusicFileModel, MusicFileWordModel


class SQLiteMusicFileRepository(MusicFileRepositoryBase):
    """SQLite müzik dosyası repository implementasyonu"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, music_file: MusicFile) -> None:
        """Müzik dosyasını kaydeder"""
        model = await self._to_model(music_file)
        self.session.add(model)
        await self.session.commit()

    async def save_many(self, music_files: List[MusicFile]) -> None:
        """Birden fazla müzik dosyasını kaydeder"""
        models = [await self._to_model(music_file) for music_file in music_files]
        self.session.add_all(models)
        await self.session.commit()

    async def find_by_path(self, path: str) -> Optional[MusicFile]:
        """Yola göre müzik dosyasını bulur"""
        stmt = (
            select(MusicFileModel)
            .options(selectinload(MusicFileModel.indexed_words))
            .where(MusicFileModel.path == path)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return await self._to_entity(model) if model else None

    async def find_by_name(self, name: str) -> List[MusicFile]:
        """İsme göre müzik dosyalarını bulur"""
        stmt = (
            select(MusicFileModel)
            .options(selectinload(MusicFileModel.indexed_words))
            .where(MusicFileModel.normalized_name == name)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [await self._to_entity(model) for model in models]

    async def find_similar(self, name: str, similarity_threshold: float = 0.3) -> List[MusicFile]:
        """Benzer isimdeki müzik dosyalarını bulur"""
        # SQLite'da tam metin arama olmadığı için tüm dosyaları çekip
        # Python tarafında filtreleme yapıyoruz
        stmt = select(MusicFileModel).options(selectinload(MusicFileModel.indexed_words))
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [await self._to_entity(model) for model in models]

    async def get_all(self) -> List[MusicFile]:
        """Tüm müzik dosyalarını getirir"""
        stmt = select(MusicFileModel).options(selectinload(MusicFileModel.indexed_words))
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [await self._to_entity(model) for model in models]

    async def clear(self) -> None:
        """Tüm müzik dosyalarını siler"""
        await self.session.execute(select(MusicFileWordModel).delete())
        await self.session.execute(select(MusicFileModel).delete())
        await self.session.commit()

    async def _to_model(self, entity: MusicFile) -> MusicFileModel:
        """Entity'yi model'e dönüştürür"""
        model = MusicFileModel(
            path=entity.path,
            name=entity.name,
            file_name_only=entity.file_name_only,
            normalized_name=entity.normalized_name,
            extension=entity.extension,
            file_type=entity.file_type,
            size=entity.size,
            modified_time=entity.modified_time,
            mime_type=entity.mime_type,
        )

        model.indexed_words = [MusicFileWordModel(word=word) for word in entity.indexed_words]

        return model

    async def _to_entity(self, model: MusicFileModel) -> MusicFile:
        """Model'i entity'ye dönüştürür"""
        return MusicFile(
            path=model.path,
            name=model.name,
            file_name_only=model.file_name_only,
            normalized_name=model.normalized_name,
            indexed_words=[word.word for word in model.indexed_words],
            extension=model.extension,
            file_type=model.file_type,
            size=model.size,
            modified_time=model.modified_time,
            mime_type=model.mime_type,
        )
