from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from loguru import logger

from ...domain.entities.music_file import MusicFile
from ...domain.repositories.music_file_repository import MusicFileRepository
from ...domain.services.text_normalizer import TextNormalizer
from ...domain.value_objects.supported_formats import SupportedFormats


class IndexMusicFilesUseCase:
    """Müzik dosyalarını indeksleme use case'i"""

    def __init__(
        self,
        music_file_repository: MusicFileRepository,
        text_normalizer: TextNormalizer,
        supported_formats: SupportedFormats,
    ):
        self.music_file_repository = music_file_repository
        self.text_normalizer = text_normalizer
        self.supported_formats = supported_formats

    async def execute(self, music_root: str) -> Dict[str, Any]:
        """Use case'i çalıştırır"""
        try:
            start_time = datetime.now()
            total_files = 0
            new_files = []
            error_count = 0
            error_details = []

            # Ana müzik klasörü kontrolü
            if not Path(music_root).exists():
                return {
                    "status": "error",
                    "message": f"Ana müzik klasörü bulunamadı: {music_root}",
                }

            # Dosyaları tara
            for file_path in Path(music_root).rglob("*"):
                if file_path.is_file():
                    ext = file_path.suffix[1:].lower()
                    if ext in self.supported_formats.all_formats:
                        try:
                            stats = file_path.stat()
                            file_name = file_path.name
                            file_name_only = file_path.stem

                            media_type = next(
                                (
                                    format_type
                                    for format_type, exts in self.supported_formats.formats.items()
                                    if ext in exts
                                ),
                                "unknown",
                            )

                            new_files.append(
                                MusicFile(
                                    path=str(file_path),
                                    name=file_name,
                                    file_name_only=file_name_only,
                                    normalized_name=self.text_normalizer.normalize_file_name(
                                        file_name_only
                                    ),
                                    indexed_words=self._extract_words(file_name_only, str(file_path)),
                                    extension=ext,
                                    file_type=media_type,
                                    size=stats.st_size,
                                    modified_time=datetime.fromtimestamp(stats.st_mtime),
                                    mime_type=self.supported_formats.get_mime_type(ext),
                                )
                            )
                            total_files += 1
                        except Exception as err:
                            error_count += 1
                            error_details.append({"path": str(file_path), "error": str(err)})

            # Veritabanını güncelle
            await self.music_file_repository.clear()
            await self.music_file_repository.save_all(new_files)

            execution_time = (datetime.now() - start_time).total_seconds()

            return {
                "status": "success",
                "data": {
                    "totalFiles": total_files,
                    "newFiles": len(new_files),
                    "duration": int(execution_time * 1000),
                    "lastUpdate": datetime.now().isoformat(),
                    "errorCount": error_count,
                    "errorDetails": error_details if error_details else None,
                },
            }

        except Exception as err:
            logger.error("İndeksleme hatası", exc_info=True)
            return {
                "status": "error",
                "message": str(err),
                "details": {"error_code": getattr(err, "code", None), "error_message": str(err)},
            }

    def _extract_words(self, file_name: str, file_path: str) -> List[str]:
        """Dosya adını ve klasör yolunu kelimelere ayırıp normalize eder"""
        folder_parts = [
            p for p in Path(file_path).parent.parts if p and p != "." and not p.startswith("/")
        ]
        relevant_folders = folder_parts[-2:] if len(folder_parts) >= 2 else folder_parts
        file_name_parts = [part.strip() for part in file_name.split("-")]
        all_parts = [*relevant_folders, *file_name_parts]

        words = " ".join(all_parts).split()
        return [self.text_normalizer.normalize_word(word) for word in words if len(word) > 1]
