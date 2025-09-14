#!/usr/bin/env python3
"""
Geliştirilmiş Benzerlik Algoritması Test Sistemi
===============================================
"""

import json
import re
from typing import List, Dict

class ImprovedSimilarityTester:
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
        """Metni normalize et"""
        if not text:
            return ""
        
        # Küçük harfe çevir
        text = text.lower()
        
        # Türkçe karakterleri dönüştür
        char_map = {
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
            'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
        }
        
        for tr_char, en_char in char_map.items():
            text = text.replace(tr_char, en_char)
        
        # Sadece harf ve rakam bırak
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        
        # Çoklu boşlukları tek boşluğa çevir
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def extract_words(self, text: str) -> List[str]:
        """Metinden kelimeleri çıkar"""
        normalized = self.normalize_text(text)
        words = [word for word in normalized.split() if len(word) > 1]
        return words
    
    def calculate_improved_similarity(self, words1: List[str], words2: List[str]) -> float:
        """GELİŞTİRİLMİŞ ALGORİTMA - Yeni sıkı versiyon"""
        if not words1 or not words2:
            return 0.0
        
        # 1. GENEL KELİME FİLTRESİ
        meaningful_words1 = [w for w in words1 if w not in self.common_words]
        meaningful_words2 = [w for w in words2 if w not in self.common_words]
        
        # Eğer anlamlı kelime yoksa, genel kelimeleri kullan ama düşük skor ver
        if not meaningful_words1 or not meaningful_words2:
            if not words1 or not words2:
                return 0.0
            # Sadece genel kelimeler varsa çok düşük skor
            exact_matches = sum(1 for word in words1 if word in words2)
            return (exact_matches / max(len(words1), len(words2))) * 0.3
        
        # 2. ANLAMLI KELİME EŞLEŞMESİ (Ana skor)
        exact_meaningful_matches = sum(1 for word in meaningful_words1 if word in meaningful_words2)
        meaningful_score = exact_meaningful_matches / max(len(meaningful_words1), len(meaningful_words2))
        
        # 2.5. ŞARKI ADI ZORUNLU KONTROLÜ - En az 2 anlamlı kelime eşleşmeli
        if exact_meaningful_matches < 2:
            return 0.0  # Çok az eşleşme varsa direkt 0 döndür
        
        # 3. KELİME UZUNLUK BONUSU (Uzun kelimeler daha önemli)
        long_word_matches = sum(1 for word in meaningful_words1 if word in meaningful_words2 and len(word) >= 4)
        long_word_bonus = long_word_matches / max(len(meaningful_words1), len(meaningful_words2)) * 0.2
        
        # 4. SANATÇI ADI BONUSU (İlk kelime) - Azaltıldı
        artist_bonus = 0.0
        if meaningful_words1 and meaningful_words2:
            if meaningful_words1[0] == meaningful_words2[0] and len(meaningful_words1[0]) >= 3:
                artist_bonus = 0.1  # 0.3'ten 0.1'e düşürüldü
        
        # 5. ŞARKI ADI BONUSU (İkinci kelime)
        song_bonus = 0.0
        if len(meaningful_words1) >= 2 and len(meaningful_words2) >= 2:
            if meaningful_words1[1] == meaningful_words2[1] and len(meaningful_words1[1]) >= 3:
                song_bonus = 0.2
        
        # 6. TAM EŞLEŞME BONUSU
        full_match_bonus = 0.0
        if exact_meaningful_matches >= 3:
            full_match_bonus = 0.15
        
        # 7. GENEL KELİME PENALTY
        general_word_penalty = 0.0
        general_matches = sum(1 for word in words1 if word in words2 and word in self.common_words)
        if general_matches > 0:
            general_word_penalty = min(0.2, general_matches * 0.05)
        
        # Toplam skor hesapla
        total_score = meaningful_score + long_word_bonus + artist_bonus + song_bonus + full_match_bonus - general_word_penalty
        
        # 0.0 - 1.0 arasında sınırla
        return max(0.0, min(1.0, total_score))
    
    def test_specific_cases(self):
        """Belirli test durumlarını test et"""
        print("🧪 ÖZEL TEST DURUMLARI")
        print("=" * 50)
        
        test_cases = [
            # Dr. Alban testi
            {
                "original": "Dr. Alban - Away From Home (2).mp4",
                "found": "Dr. Alban - No Coke 2k24 (Dr. Luxe & DJ Finn & Lexy Key VIP Remix) www.clubberism.com.mp3",
                "expected": "Çok düşük skor (farklı şarkılar)"
            },
            # Aynı sanatçı, farklı şarkı
            {
                "original": "Tarkan - Gül Döktüm Yollarina (1).m4a",
                "found": "Tarkan - Yolla (Pop Orient Mix).m4a",
                "expected": "Düşük skor (farklı şarkılar)"
            },
            # Benzer şarkı adları
            {
                "original": "Çelik - Ateşteyim (10).mp3",
                "found": "Çelik - Ateşteyim.mp3",
                "expected": "Yüksek skor (aynı şarkı)"
            },
            # Tamamen farklı
            {
                "original": "House remix 2011 best disco music dJ aSSa.mp3",
                "found": "catwork remix engineers - rise up 2011.mp3",
                "expected": "Düşük skor (farklı sanatçılar)"
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{i}. Test:")
            print(f"   Orijinal: {test_case['original']}")
            print(f"   Bulunan:  {test_case['found']}")
            print(f"   Beklenen: {test_case['expected']}")
            
            # Kelimeleri çıkar
            orig_words = self.extract_words(test_case['original'])
            found_words = self.extract_words(test_case['found'])
            
            # Benzerlik hesapla
            similarity = self.calculate_improved_similarity(orig_words, found_words)
            
            print(f"   Kelimeler (Orijinal): {orig_words}")
            print(f"   Kelimeler (Bulunan):  {found_words}")
            print(f"   Benzerlik Skoru: {similarity:.3f}")
            
            # Sonuç değerlendirmesi
            if similarity >= 0.85:
                result = "✅ MÜKEMMEL EŞLEŞME"
            elif similarity >= 0.7:
                result = "✅ İYİ EŞLEŞME"
            elif similarity >= 0.5:
                result = "⚠️  ŞÜPHELİ EŞLEŞME"
            else:
                result = "❌ ZAYIF EŞLEŞME"
            
            print(f"   Sonuç: {result}")
            print(f"   Threshold (0.85): {'✅ GEÇTİ' if similarity >= 0.85 else '❌ GEÇMEDİ'}")

def main():
    """Ana fonksiyon"""
    print("🚀 GELİŞTİRİLMİŞ BENZERLİK ALGORİTMASI TESTİ")
    print("=" * 60)
    
    tester = ImprovedSimilarityTester()
    tester.test_specific_cases()
    
    print(f"\n✅ Test tamamlandı!")

if __name__ == "__main__":
    main()
