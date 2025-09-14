from typing import List

from rapidfuzz import fuzz


class SimilarityCalculator:
    """Benzerlik hesaplama servisi"""

    def calculate_word_based_similarity(self, words1: List[str], words2: List[str]) -> float:
        """Kelime bazlı benzerlik hesaplar"""
        if not words1 or not words2:
            return 0.0

        # Klasör isimlerini çıkar (ilk 4 kelime)
        search_words = words1[4:]
        target_words = words2[4:]

        # Sanatçı adı karşılaştırması (ilk 2 kelime)
        artist_match = (
            len(search_words) >= 2
            and len(target_words) >= 2
            and search_words[0] == target_words[0]
            and search_words[1] == target_words[1]
        )

        # Şarkı adı karşılaştırması (kalan kelimeler)
        song_words1 = search_words[2:] if len(search_words) > 2 else search_words
        song_words2 = target_words[2:] if len(target_words) > 2 else target_words

        song_match = any(
            word in song_words2
            or any(
                len(word) >= 3
                and word in target_word
                or len(target_word) >= 3
                and target_word in word
                for target_word in song_words2
            )
            for word in song_words1
        )

        # Ağırlıklı skor hesaplama
        artist_score = 0.7 if artist_match else 0.0  # Sanatçı eşleşmesi daha önemli
        song_score = 0.3 if song_match else 0.0  # Şarkı adı ikincil önemde

        return artist_score + song_score

    def calculate_simple_similarity(self, words1: List[str], words2: List[str]) -> float:
        """Basit kelime benzerliği hesaplar"""
        if not words1 or not words2:
            return 0.0

        matches = sum(
            1
            for word in words1
            if any(
                word == w or (len(word) > 3 and word in w) or (len(w) > 3 and w in word)
                for w in words2
            )
        )

        return matches / max(len(words1), len(words2))

    def calculate_two_stage_similarity(self, words1: List[str], words2: List[str]) -> float:
        """İki aşamalı benzerlik hesaplar"""
        if not words1 or not words2:
            return 0.0

        # İlk aşama: Tam kelime eşleşmesi
        exact_matches = sum(1 for word in words1 if word in words2)
        exact_match_score = exact_matches / max(len(words1), len(words2))

        # İkinci aşama: Kısmi kelime eşleşmesi
        partial_matches = sum(
            1
            for word in words1
            if any(len(word) > 3 and word in w or len(w) > 3 and w in word for w in words2)
        )
        partial_match_score = partial_matches / max(len(words1), len(words2))

        # Ağırlıklı toplam skor
        return (exact_match_score * 0.7) + (partial_match_score * 0.3)

    def calculate_string_similarity(self, text1: str, text2: str) -> float:
        """String benzerliği hesaplar"""
        return fuzz.ratio(text1, text2) / 100.0

    def calculate_similarity(self, words1: List[str], words2: List[str]) -> float:
        """Ana benzerlik hesaplama metodu - iki aşamalı algoritma kullanır"""
        return self.calculate_two_stage_similarity(words1, words2)
