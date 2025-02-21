import unicodedata
from dataclasses import dataclass
from typing import Dict, Optional

from ..value_objects.char_map import CharacterMap


@dataclass
class NormalizationOptions:
    """Normalizasyon seçenekleri"""

    keep_spaces: bool = True
    keep_special_chars: bool = False
    keep_case: bool = False
    keep_diacritics: bool = False


class TextNormalizer:
    """Metin normalizasyon servisi"""

    def __init__(self) -> None:
        self.char_map = CharacterMap()

    def normalize(self, text: str, options: Optional[Dict[str, bool]] = None) -> str:
        """
        Tüm uygulama için merkezi string normalizasyon fonksiyonu
        """
        if options is None:
            options = {}

        keep_spaces = options.get("keepSpaces", True)
        keep_special_chars = options.get("keepSpecialChars", False)
        keep_case = options.get("keepCase", False)
        keep_diacritics = options.get("keepDiacritics", False)

        if not isinstance(text, str):
            raise TypeError("Input must be a string")

        normalized = text

        if not keep_diacritics:
            # NFKC normalizasyonu ve CHAR_MAP dönüşümü
            normalized = unicodedata.normalize("NFKC", normalized)
            normalized = "".join(self.char_map.mapping.get(c.lower(), c) for c in normalized)

        if not keep_case:
            normalized = normalized.lower()

        if not keep_special_chars:
            normalized = "".join(c for c in normalized if c.isalnum() or c.isspace())

        if not keep_spaces:
            normalized = "_".join(normalized.split())

        return normalized.strip()

    def normalize_file_name(self, text: str) -> str:
        """Dosya adı normalizasyonu"""
        return self.normalize(text, {"keepSpaces": True, "keepSpecialChars": True})

    def normalize_word(self, text: str) -> str:
        """Kelime normalizasyonu"""
        return self.normalize(text, {"keepSpaces": False, "keepSpecialChars": False})

    def normalize_path(self, text: str) -> str:
        """Yol normalizasyonu"""
        return self.normalize(
            text, {"keepSpaces": True, "keepSpecialChars": True, "keepCase": False}
        )

    def normalize_search_term(self, text: str) -> str:
        """Arama terimi normalizasyonu"""
        return self.normalize(text, {"keepSpaces": True, "keepSpecialChars": False})
