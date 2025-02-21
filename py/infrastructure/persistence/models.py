from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class MusicFileModel(Base):
    """Müzik dosyası veritabanı modeli"""

    __tablename__ = "music_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    path: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    file_name_only: Mapped[str] = mapped_column(String)
    normalized_name: Mapped[str] = mapped_column(String, index=True)
    extension: Mapped[str] = mapped_column(String)
    file_type: Mapped[str] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer)
    modified_time: Mapped[datetime] = mapped_column(DateTime)
    mime_type: Mapped[str] = mapped_column(String, nullable=True)

    # İndekslenmiş kelimeler için ayrı tablo
    indexed_words: Mapped[List["MusicFileWordModel"]] = relationship(
        back_populates="music_file", cascade="all, delete-orphan"
    )


class MusicFileWordModel(Base):
    """Müzik dosyası indekslenmiş kelime modeli"""

    __tablename__ = "music_file_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    music_file_id: Mapped[int] = mapped_column(ForeignKey("music_files.id"))
    word: Mapped[str] = mapped_column(String, index=True)

    music_file: Mapped[MusicFileModel] = relationship(back_populates="indexed_words")


class PlaylistModel(Base):
    """Playlist veritabanı modeli"""

    __tablename__ = "playlists"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # base64 encoded path
    name: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String, unique=True, index=True)
    type: Mapped[str] = mapped_column(String)  # folder/playlist
    song_count: Mapped[int] = mapped_column(Integer, nullable=True)
    parent_id: Mapped[str] = mapped_column(String, ForeignKey("playlists.id"), nullable=True)

    children: Mapped[List["PlaylistModel"]] = relationship(
        "PlaylistModel", backref="parent", remote_side=[id], cascade="all, delete-orphan"
    )
    songs: Mapped[List["PlaylistSongModel"]] = relationship(
        back_populates="playlist", cascade="all, delete-orphan"
    )


class PlaylistSongModel(Base):
    """Playlist şarkı veritabanı modeli"""

    __tablename__ = "playlist_songs"

    id: Mapped[int] = mapped_column(primary_key=True)
    playlist_id: Mapped[str] = mapped_column(ForeignKey("playlists.id"))
    path: Mapped[str] = mapped_column(String)
    exists: Mapped[bool] = mapped_column(Boolean, default=False)

    playlist: Mapped[PlaylistModel] = relationship(back_populates="songs")
