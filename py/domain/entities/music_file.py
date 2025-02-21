from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class MusicFile(BaseModel):
    """Müzik dosyası varlığı"""

    path: str = Field(description="Dosyanın tam yolu")
    name: str = Field(description="Dosyanın adı (uzantı dahil)")
    file_name_only: str = Field(description="Dosyanın adı (uzantısız)")
    normalized_name: str = Field(description="Normalize edilmiş dosya adı")
    indexed_words: List[str] = Field(description="İndekslenmiş kelimeler")
    extension: str = Field(description="Dosya uzantısı")
    file_type: str = Field(description="Dosya tipi (audio, video, vdj, image)")
    size: int = Field(description="Dosya boyutu (byte)")
    modified_time: datetime = Field(description="Son değiştirilme tarihi")
    mime_type: Optional[str] = Field(None, description="MIME tipi")
