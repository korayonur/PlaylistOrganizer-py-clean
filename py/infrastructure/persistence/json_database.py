import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles

from .exceptions import DatabaseError


class JsonDatabase:
    """JSON veritabanı yöneticisi"""

    def __init__(self, db_path: str = "musicfiles.db.json"):
        self.db_path = Path(db_path).absolute()
        self._data: Optional[Dict[str, Any]] = None

    async def load(self) -> Dict[str, Any]:
        """Veritabanını yükler"""
        if self._data is None:
            try:
                if self.db_path.exists():
                    async with aiofiles.open(self.db_path, "r", encoding="utf-8") as f:
                        content = await f.read()
                        self._data = json.loads(content)
                else:
                    self._data = {
                        "version": "1.0",
                        "lastUpdate": datetime.now().isoformat(),
                        "encoding": "utf-8",
                        "musicFiles": [],
                        "stats": {
                            "totalFiles": 0,
                            "lastIndexDuration": 0,
                            "indexingProgress": 0,
                            "status": "initial",
                        },
                    }
                    await self.save()
            except Exception as err:
                raise DatabaseError("Veritabanı yüklenirken hata oluştu") from err

        return self._data

    async def save(self) -> None:
        """Veritabanını kaydeder"""
        if self._data is not None:
            self._data["lastUpdate"] = datetime.now().isoformat()
            async with aiofiles.open(self.db_path, "w", encoding="utf-8") as f:
                content = json.dumps(self._data, indent=2, ensure_ascii=False)
                await f.write(content)

    async def clear(self) -> None:
        """Veritabanını temizler"""
        self._data = {
            "version": "1.0",
            "lastUpdate": datetime.now().isoformat(),
            "encoding": "utf-8",
            "musicFiles": [],
            "stats": {
                "totalFiles": 0,
                "lastIndexDuration": 0,
                "indexingProgress": 0,
                "status": "initial",
            },
        }
        await self.save()

    @property
    def music_files(self) -> List[Dict[str, Any]]:
        """Müzik dosyalarını döndürür"""
        return self._data["musicFiles"] if self._data else []

    @music_files.setter
    def music_files(self, value: List[Dict[str, Any]]) -> None:
        """Müzik dosyalarını günceller"""
        if self._data:
            self._data["musicFiles"] = value
            self._data["stats"]["totalFiles"] = len(value)

    @property
    def stats(self) -> Dict[str, Any]:
        """İstatistikleri döndürür"""
        return self._data["stats"] if self._data else {}
