#!/usr/bin/env python3
"""
Benzerlik Algoritması Nasıl Çalışıyor?
=====================================
"""

import re
from typing import List, Dict

class AlgorithmExplainer:
    def __init__(self):
        # Genel kelimeler (filtreleme için)
        self.common_words = {
            'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
            'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
            'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
            'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
            've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
            'müzik', 'şarkı', 'parça'
        }
    
    def normalize_text(self, text: str) -> str:
        """1. ADIM: Metni normalize et"""
        print(f"📝 Orijinal metin: '{text}'")
        
        if not text:
            return ""
        
        # Küçük harfe çevir
        text = text.lower()
        print(f"   → Küçük harf: '{text}'")
        
        # Türkçe karakterleri dönüştür
        char_map = {
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
            'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
        }
        
        for tr_char, en_char in char_map.items():
            text = text.replace(tr_char, en_char)
        print(f"   → Türkçe karakter dönüşümü: '{text}'")
        
        # Sadece harf ve rakam bırak
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        print(f"   → Özel karakter temizleme: '{text}'")
        
        # Çoklu boşlukları tek boşluğa çevir
        text = re.sub(r'\s+', ' ', text)
        print(f"   → Boşluk normalizasyonu: '{text}'")
        
        return text.strip()
    
    def extract_words(self, text: str) -> List[str]:
        """2. ADIM: Metinden kelimeleri çıkar"""
        print(f"\n🔤 Kelime çıkarma:")
        normalized = self.normalize_text(text)
        words = [word for word in normalized.split() if len(word) > 1]
        print(f"   → Kelimeler: {words}")
        return words
    
    def filter_meaningful_words(self, words: List[str]) -> List[str]:
        """3. ADIM: Anlamlı kelimeleri filtrele"""
        print(f"\n🎯 Anlamlı kelime filtresi:")
        print(f"   → Tüm kelimeler: {words}")
        print(f"   → Genel kelimeler: {self.common_words}")
        
        meaningful = [w for w in words if w not in self.common_words]
        general = [w for w in words if w in self.common_words]
        
        print(f"   → Anlamlı kelimeler: {meaningful}")
        print(f"   → Genel kelimeler: {general}")
        
        return meaningful
    
    def calculate_similarity_step_by_step(self, words1: List[str], words2: List[str]) -> float:
        """4. ADIM: Benzerlik hesaplama - Adım adım"""
        print(f"\n⚖️  BENZERLİK HESAPLAMA")
        print("=" * 50)
        
        if not words1 or not words2:
            print("❌ Boş kelime listesi - 0.0 döndür")
            return 0.0
        
        # 1. Anlamlı kelime filtresi
        meaningful1 = self.filter_meaningful_words(words1)
        meaningful2 = self.filter_meaningful_words(words2)
        
        # Eğer anlamlı kelime yoksa
        if not meaningful1 or not meaningful2:
            print("⚠️  Anlamlı kelime yok - genel kelimeleri kullan")
            if not words1 or not words2:
                return 0.0
            exact_matches = sum(1 for word in words1 if word in words2)
            score = (exact_matches / max(len(words1), len(words2))) * 0.3
            print(f"   → Genel kelime skoru: {score:.3f}")
            return score
        
        # 2. Anlamlı kelime eşleşmesi (Ana skor)
        exact_meaningful_matches = sum(1 for word in meaningful1 if word in meaningful2)
        meaningful_score = exact_meaningful_matches / max(len(meaningful1), len(meaningful2))
        print(f"\n📊 Ana skor hesaplama:")
        print(f"   → Anlamlı eşleşmeler: {exact_meaningful_matches}")
        print(f"   → Maksimum kelime sayısı: {max(len(meaningful1), len(meaningful2))}")
        print(f"   → Ana skor: {meaningful_score:.3f}")
        
        # 2.5. Minimum eşleşme kontrolü
        if exact_meaningful_matches < 2:
            print("❌ Yetersiz eşleşme (< 2) - 0.0 döndür")
            return 0.0
        
        # 3. Kelime uzunluk bonusu
        long_word_matches = sum(1 for word in meaningful1 if word in meaningful2 and len(word) >= 4)
        long_word_bonus = long_word_matches / max(len(meaningful1), len(meaningful2)) * 0.2
        print(f"\n📏 Uzun kelime bonusu:")
        print(f"   → Uzun kelime eşleşmeleri: {long_word_matches}")
        print(f"   → Uzun kelime bonusu: {long_word_bonus:.3f}")
        
        # 4. Sanatçı adı bonusu
        artist_bonus = 0.0
        if meaningful1 and meaningful2:
            if meaningful1[0] == meaningful2[0] and len(meaningful1[0]) >= 3:
                artist_bonus = 0.1
                print(f"\n🎤 Sanatçı adı bonusu:")
                print(f"   → İlk kelime eşleşmesi: '{meaningful1[0]}' == '{meaningful2[0]}'")
                print(f"   → Sanatçı bonusu: {artist_bonus:.3f}")
        
        # 5. Şarkı adı bonusu
        song_bonus = 0.0
        if len(meaningful1) >= 2 and len(meaningful2) >= 2:
            if meaningful1[1] == meaningful2[1] and len(meaningful1[1]) >= 3:
                song_bonus = 0.2
                print(f"\n🎵 Şarkı adı bonusu:")
                print(f"   → İkinci kelime eşleşmesi: '{meaningful1[1]}' == '{meaningful2[1]}'")
                print(f"   → Şarkı bonusu: {song_bonus:.3f}")
        
        # 6. Tam eşleşme bonusu
        full_match_bonus = 0.0
        if exact_meaningful_matches >= 3:
            full_match_bonus = 0.15
            print(f"\n🏆 Tam eşleşme bonusu:")
            print(f"   → Eşleşme sayısı: {exact_meaningful_matches} >= 3")
            print(f"   → Tam eşleşme bonusu: {full_match_bonus:.3f}")
        
        # 7. Genel kelime penalty
        general_matches = sum(1 for word in words1 if word in words2 and word in self.common_words)
        general_word_penalty = min(0.2, general_matches * 0.05) if general_matches > 0 else 0.0
        print(f"\n⚠️  Genel kelime penalty:")
        print(f"   → Genel kelime eşleşmeleri: {general_matches}")
        print(f"   → Genel kelime penalty: {general_word_penalty:.3f}")
        
        # Toplam skor
        total_score = meaningful_score + long_word_bonus + artist_bonus + song_bonus + full_match_bonus - general_word_penalty
        print(f"\n🎯 TOPLAM SKOR HESAPLAMA:")
        print(f"   → Ana skor: {meaningful_score:.3f}")
        print(f"   → Uzun kelime bonusu: +{long_word_bonus:.3f}")
        print(f"   → Sanatçı bonusu: +{artist_bonus:.3f}")
        print(f"   → Şarkı bonusu: +{song_bonus:.3f}")
        print(f"   → Tam eşleşme bonusu: +{full_match_bonus:.3f}")
        print(f"   → Genel kelime penalty: -{general_word_penalty:.3f}")
        print(f"   → TOPLAM SKOR: {total_score:.3f}")
        
        # 0.0 - 1.0 arasında sınırla
        final_score = max(0.0, min(1.0, total_score))
        print(f"   → FİNAL SKOR: {final_score:.3f}")
        
        return final_score
    
    def explain_algorithm(self, file1: str, file2: str):
        """Algoritmayı adım adım açıkla"""
        print(f"🔍 BENZERLİK ALGORİTMASI AÇIKLAMASI")
        print("=" * 60)
        print(f"📁 Dosya 1: {file1}")
        print(f"📁 Dosya 2: {file2}")
        
        # Kelimeleri çıkar
        words1 = self.extract_words(file1)
        words2 = self.extract_words(file2)
        
        # Benzerlik hesapla
        similarity = self.calculate_similarity_step_by_step(words1, words2)
        
        print(f"\n🎯 SONUÇ:")
        print(f"   → Benzerlik skoru: {similarity:.3f}")
        print(f"   → Threshold (0.85): {'✅ GEÇTİ' if similarity >= 0.85 else '❌ GEÇMEDİ'}")
        
        return similarity

def main():
    """Ana fonksiyon"""
    explainer = AlgorithmExplainer()
    
    # Test durumları
    test_cases = [
        {
            "file1": "Dr. Alban - Away From Home (2).mp4",
            "file2": "Dr. Alban - No Coke 2k24 (Dr. Luxe & DJ Finn & Lexy Key VIP Remix) www.clubberism.com.mp3",
            "description": "Farklı şarkılar - aynı sanatçı"
        },
        {
            "file1": "Çelik - Ateşteyim (10).mp3", 
            "file2": "Çelik - Ateşteyim.mp3",
            "description": "Aynı şarkı - farklı versiyonlar"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*80}")
        print(f"TEST {i}: {test_case['description']}")
        print(f"{'='*80}")
        
        explainer.explain_algorithm(test_case['file1'], test_case['file2'])
        
        if i < len(test_cases):
            input("\n⏸️  Devam etmek için Enter'a basın...")

if __name__ == "__main__":
    main()
