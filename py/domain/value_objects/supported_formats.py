from typing import List, Set

from pydantic import BaseModel


class SupportedFormats(BaseModel):
    """Desteklenen dosya formatları"""

    audio: List[str] = [
        "mp3",
        "wav",
        "cda",
        "wma",
        "asf",
        "ogg",
        "m4a",
        "aac",
        "aif",
        "aiff",
        "flac",
        "mpc",
        "ape",
        "weba",
        "opus",
    ]
    video: List[str] = [
        "mp4",
        "ogm",
        "ogv",
        "avi",
        "mpg",
        "mpeg",
        "wmv",
        "vob",
        "mov",
        "divx",
        "m4v",
        "mkv",
        "flv",
        "webm",
    ]
    vdj: List[str] = ["vdj", "vdjcache", "vdjedit", "vdjsample", "vdjcachev"]
    image: List[str] = ["apng"]

    @property
    def all_formats(self) -> Set[str]:
        """Tüm desteklenen formatları döndürür"""
        return set(self.audio + self.video + self.vdj + self.image)

    def get_type_for_extension(self, extension: str) -> str:
        """Uzantıya göre dosya tipini döndürür"""
        extension = extension.lower()
        if extension in self.audio:
            return "audio"
        elif extension in self.video:
            return "video"
        elif extension in self.vdj:
            return "vdj"
        elif extension in self.image:
            return "image"
        return "unknown"

    def is_supported(self, extension: str) -> bool:
        """Uzantının desteklenip desteklenmediğini kontrol eder"""
        return extension.lower() in self.all_formats
