from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger

from ...domain.repositories.music_file_repository import MusicFileRepository
from ...domain.services.similarity_calculator import SimilarityCalculator
from ...domain.services.text_normalizer import TextNormalizer


class SearchResult:
    """Arama sonucu"""

    def __init__(
        self,
        original_path: str,
        found: bool,
        status: str,
        match_type: Optional[str] = None,
        algorithm: Optional[str] = None,
        found_path: Optional[str] = None,
        similarity: Optional[float] = None,
        process_time: Optional[int] = None,
    ):
        self.original_path = original_path
        self.found = found
        self.status = status
        self.match_type = match_type
        self.algorithm = algorithm
        self.found_path = found_path
        self.similarity = similarity
        self.process_time = process_time

    def to_dict(self) -> Dict[str, Any]:
        """Dict formatına dönüştürür"""
        return {
            "originalPath": self.original_path,
            "found": self.found,
            "status": self.status,
            "matchType": self.match_type,
            "algoritmaYontemi": self.algorithm,
            "foundPath": self.found_path,
            "similarity": self.similarity,
            "processTime": self.process_time,
        }


class SearchMusicFilesUseCase:
    """Müzik dosyası arama use case'i"""

    def __init__(
        self,
        music_file_repository: MusicFileRepository,
        text_normalizer: TextNormalizer,
        similarity_calculator: SimilarityCalculator,
    ):
        self.music_file_repository = music_file_repository
        self.text_normalizer = text_normalizer
        self.similarity_calculator = similarity_calculator

    async def execute(self, paths: List[str]) -> Dict[str, Any]:
        """Use case'i çalıştırır"""
        try:
            limited_paths = paths[:100]  # İlk 100 path ile sınırla

            results = []
            total_process_time = 0
            match_details: Dict[str, Dict[str, Any]] = {
                "tamYolEsleme": {
                    "count": 0,
                    "time": 0,
                    "algoritmaYontemi": "Tam Yol Eşleşme",
                },
                "ayniKlasorFarkliUzanti": {
                    "count": 0,
                    "time": 0,
                    "algoritmaYontemi": "Aynı Klasör Farklı Uzantı",
                },
                "farkliKlasor": {
                    "count": 0,
                    "time": 0,
                    "algoritmaYontemi": "Farklı Klasör Aynı Ad",
                },
                "farkliKlasorveUzanti": {
                    "count": 0,
                    "time": 0,
                    "algoritmaYontemi": "Farklı Klasör Farklı Uzantı",
                },
                "benzerDosya": {
                    "count": 0,
                    "time": 0,
                    "algoritmaYontemi": "Benzerlik Bazlı Arama",
                },
            }

            music_files = await self.music_file_repository.get_all()

            for search_path in limited_paths:
                search_file_name = self.text_normalizer.normalize_file_name(search_path)
                search_dir = str(Path(search_path).parent)

                # 1. Tam yol eşleşme kontrolü
                exact_match = next(
                    (file for file in music_files if file.path == search_path), None
                )

                if exact_match:
                    match_type = "tamYolEsleme"
                    result = SearchResult(
                        original_path=search_path,
                        found=True,
                        status="exact_match",
                        match_type=match_type,
                        algorithm=match_details[match_type]["algoritmaYontemi"],
                        found_path=search_path,
                        process_time=0,
                    )
                    match_details[match_type]["count"] += 1
                    match_details[match_type]["time"] += result.process_time
                    total_process_time += result.process_time
                    results.append(result)
                    continue

                # 2. Aynı klasörde farklı uzantı kontrolü
                same_dir_diff_ext = next(
                    (
                        file
                        for file in music_files
                        if self.text_normalizer.normalize_path(str(Path(file.path).parent))
                        == self.text_normalizer.normalize_path(search_dir)
                        and self.text_normalizer.normalize_file_name(Path(file.path).stem)
                        == self.text_normalizer.normalize_file_name(Path(search_path).stem)
                    ),
                    None,
                )

                if same_dir_diff_ext:
                    match_type = "ayniKlasorFarkliUzanti"
                    result = SearchResult(
                        original_path=search_path,
                        found=True,
                        status="exact_match",
                        match_type=match_type,
                        algorithm=match_details[match_type]["algoritmaYontemi"],
                        found_path=same_dir_diff_ext.path,
                        process_time=0,
                    )
                    match_details[match_type]["count"] += 1
                    match_details[match_type]["time"] += result.process_time
                    total_process_time += result.process_time
                    results.append(result)
                    continue

                # 3. Farklı klasörde aynı ad kontrolü
                diff_dir_same_file = next(
                    (
                        file
                        for file in music_files
                        if file.file_name_only == Path(search_path).stem
                    ),
                    None,
                )

                if diff_dir_same_file:
                    match_type = "farkliKlasor"
                    result = SearchResult(
                        original_path=search_path,
                        found=True,
                        status="exact_match",
                        match_type=match_type,
                        algorithm=match_details[match_type]["algoritmaYontemi"],
                        found_path=diff_dir_same_file.path,
                        process_time=0,
                    )
                    match_details[match_type]["count"] += 1
                    match_details[match_type]["time"] += result.process_time
                    total_process_time += result.process_time
                    results.append(result)
                    continue

                # 4. Farklı klasörde farklı uzantı kontrolü
                diff_dir_diff_ext = next(
                    (
                        file
                        for file in music_files
                        if file.normalized_name
                        == self.text_normalizer.normalize_file_name(Path(search_path).stem)
                    ),
                    None,
                )

                if diff_dir_diff_ext:
                    match_type = "farkliKlasorveUzanti"
                    result = SearchResult(
                        original_path=search_path,
                        found=True,
                        status="exact_match",
                        match_type=match_type,
                        algorithm=match_details[match_type]["algoritmaYontemi"],
                        found_path=diff_dir_diff_ext.path,
                        process_time=0,
                    )
                    match_details[match_type]["count"] += 1
                    match_details[match_type]["time"] += result.process_time
                    total_process_time += result.process_time
                    results.append(result)
                    continue

                # 5. Benzerlik bazlı arama
                search_words = self.text_normalizer.normalize_word(search_file_name).split()
                candidates = [
                    {
                        "file": file,
                        "similarity": self.similarity_calculator.calculate_similarity(
                            search_words, file.indexed_words
                        ),
                    }
                    for file in music_files
                ]

                candidates = [match for match in candidates if match["similarity"] > 0.3]
                candidates.sort(key=lambda x: x["similarity"], reverse=True)
                candidates = candidates[:1]

                if candidates:
                    best_match = candidates[0]
                    match_type = "benzerDosya"
                    result = SearchResult(
                        original_path=search_path,
                        found=True,
                        status="similar_found",
                        match_type=match_type,
                        algorithm=match_details[match_type]["algoritmaYontemi"],
                        similarity=best_match["similarity"],
                        found_path=best_match["file"].path,
                        process_time=0,
                    )
                    match_details[match_type]["count"] += 1
                    match_details[match_type]["time"] += result.process_time
                    total_process_time += result.process_time
                    results.append(result)
                else:
                    result = SearchResult(
                        original_path=search_path,
                        found=False,
                        status="not_found",
                        process_time=0,
                    )
                    total_process_time += result.process_time
                    results.append(result)

            average_process_time = total_process_time // len(limited_paths)

            not_found_paths = [result.original_path for result in results if not result.found]

            return {
                "status": "success",
                "results": [result.to_dict() for result in results],
                "stats": {
                    "totalSearched": len(limited_paths),
                    "found": len([r for r in results if r.found]),
                    "notFound": len([r for r in results if not r.found]),
                    "executionTimeMs": total_process_time,
                    "totalProcessTime": total_process_time,
                    "averageProcessTime": average_process_time,
                    "cacheHit": False,
                    "matchDetails": match_details,
                },
                "notFoundPaths": not_found_paths if not_found_paths else None,
            }

        except Exception as err:
            raise Exception("Arama hatası") from err

    def _extract_words(self, file_name: str, file_path: str) -> List[str]:
        """Dosya adı ve yolundan kelimeleri çıkarır"""
        # Klasör yolundan son iki klasörü al
        path_parts = (
            Path(file_path).parent.parts[-2:] if len(Path(file_path).parent.parts) >= 2 else []
        )

        # Dosya adını tire, alt çizgi ve boşluklardan böl
        name_parts = file_name.replace("-", " ").replace("_", " ").split()

        # Tüm parçaları birleştir ve normalize et
        all_parts = [*path_parts, *name_parts]
        return [self.text_normalizer.normalize_word(word) for word in all_parts if len(word) > 1]
