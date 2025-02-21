from typing import List, Optional

from pydantic import BaseModel, Field


class PlaylistSong(BaseModel):
    """Playlist içindeki şarkı"""

    path: str = Field(description="Şarkının dosya yolu")
    exists: bool = Field(description="Dosyanın mevcut olup olmadığı")


class Playlist(BaseModel):
    """VirtualDJ playlist varlığı"""

    id: str = Field(description="Playlist benzersiz kimliği (base64 encoded path)")
    name: str = Field(description="Playlist adı")
    path: str = Field(description="Playlist dosyasının yolu")
    type: str = Field(description="Playlist tipi (folder/playlist)")
    song_count: Optional[int] = Field(None, description="Şarkı sayısı")
    children: Optional[List["Playlist"]] = Field(None, description="Alt klasörler/playlistler")
    songs: Optional[List[PlaylistSong]] = Field(None, description="Playlist şarkıları")
