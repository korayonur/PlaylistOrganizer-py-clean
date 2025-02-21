from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from .models import Base


class Database:
    """Veritabanı bağlantı yöneticisi"""

    def __init__(self, db_path: str = "playlist_organizer.db"):
        self.db_path = Path(db_path).absolute()
        self.engine = create_async_engine(
            f"sqlite+aiosqlite:///{self.db_path}", poolclass=NullPool, echo=False
        )
        self.session_maker = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def create_database(self) -> None:
        """Veritabanını oluşturur"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Veritabanı oturumu oluşturur"""
        async with self.session_maker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
