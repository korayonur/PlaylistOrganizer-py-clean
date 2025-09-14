#!/usr/bin/env python3
"""
Mükemmel Benzerlik Algoritması ve Karşılaştırma Sistemi
======================================================

Bu sistem:
1. Mevcut algoritmanın sorunlarını analiz eder
2. Yeni mükemmel algoritma geliştirir
3. İki algoritmayı karşılaştırır
4. Detaylı rapor oluşturur
"""

import json
import re
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any, Set
from collections import Counter, defaultdict
import statistics

class PerfectSimilarityAlgorithm:
    def __init__(self, log_file_path: str, db_file_path: str):
        self.log_file_path = log_file_path
        self.db_file_path = db_file_path
        self.log_data = None
        self.db_data = None
        self.db_files = {}
        self.analysis_results = {}
        
        # Genel kelimeler (filtreleme için)
        self.common_words = {
            'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
            'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
            'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
            'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp'
        }
        
        # Türkçe genel kelimeler
        self.turkish_common_words = {
            've', 'ile', 'için', 'olan', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
            'müzik', 'şarkı', 'parça', 'remix', 'mix', 'dj', 'feat', 'ft'
        }
        
        # Tüm genel kelimeleri birleştir
        self.all_common_words = self.common_words | self.turkish_common_words
    
    def load_data(self):
        """Verileri yükle"""
        print("📁 Veriler yükleniyor...")
        
        try:
            with open(self.log_file_path, 'r', encoding='utf-8') as f:
                self.log_data = json.load(f)
            print(f"✅ Log dosyası yüklendi: {len(self.log_data['response_data']['results'])} sonuç")
        except Exception as e:
            print(f"❌ Log dosyası yüklenemedi: {e}")
            return False
            
        try:
            with open(self.db_file_path, 'r', encoding='utf-8') as f:
                self.db_data = json.load(f)
            
            self.db_files = {}
            for file_info in self.db_data.get('musicFiles', []):
                if 'path' in file_info:
                    self.db_files[file_info['path']] = file_info
            
            print(f"✅ Veritabanı yüklendi: {len(self.db_files)} dosya")
        except Exception as e:
            print(f"❌ Veritabanı yüklenemedi: {e}")
            return False
            
        return True
    
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
    
    def calculate_old_similarity(self, words1: List[str], words2: List[str]) -> float:
        """ESKİ ALGORİTMA - Mevcut algoritmanın simülasyonu"""
        if not words1 or not words2:
            return 0.0
        
        # Tam kelime eşleşmesi
        exact_matches = sum(1 for word in words1 if word in words2)
        
        # Hibrit normalizasyon
        min_length = min(len(words1), len(words2))
        max_length = max(len(words1), len(words2))
        
        if max_length > min_length * 3:
            exact_match_score = exact_matches / min_length if min_length > 0 else 0.0
        else:
            exact_match_score = exact_matches / max_length if max_length > 0 else 0.0
        
        # Kısmi kelime eşleşmesi
        partial_matches = sum(
            1
            for word in words1
            if any((len(word) > 3 and word in w) or (len(w) > 3 and w in word) for w in words2)
        )
        partial_match_score = partial_matches / max_length if max_length > 0 else 0.0
        
        return (exact_match_score * 0.85) + (partial_match_score * 0.15)
    
    def calculate_perfect_similarity(self, words1: List[str], words2: List[str]) -> float:
        """YENİ MÜKEMMEL ALGORİTMA"""
        if not words1 or not words2:
            return 0.0
        
        # 1. GENEL KELİME FİLTRESİ
        meaningful_words1 = [w for w in words1 if w not in self.all_common_words]
        meaningful_words2 = [w for w in words2 if w not in self.all_common_words]
        
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
        
        # 3. KELİME UZUNLUK BONUSU (Uzun kelimeler daha önemli)
        long_word_matches = sum(1 for word in meaningful_words1 if word in meaningful_words2 and len(word) >= 4)
        long_word_bonus = long_word_matches / max(len(meaningful_words1), len(meaningful_words2)) * 0.2
        
        # 4. SANATÇI ADI BONUSU (İlk kelime)
        artist_bonus = 0.0
        if meaningful_words1 and meaningful_words2:
            if meaningful_words1[0] == meaningful_words2[0] and len(meaningful_words1[0]) >= 3:
                artist_bonus = 0.3
        
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
        general_matches = sum(1 for word in words1 if word in words2 and word in self.all_common_words)
        if general_matches > 0:
            general_word_penalty = min(0.2, general_matches * 0.05)
        
        # Toplam skor hesapla
        total_score = meaningful_score + long_word_bonus + artist_bonus + song_bonus + full_match_bonus - general_word_penalty
        
        # 0.0 - 1.0 arasında sınırla
        return max(0.0, min(1.0, total_score))
    
    def analyze_old_algorithm_problems(self):
        """Eski algoritmanın sorunlarını analiz et"""
        print("\n🔍 ESKİ ALGORİTMA SORUNLARI ANALİZİ")
        print("=" * 60)
        
        results = self.log_data['response_data']['results']
        similar_matches = [r for r in results if r.get('found') and r.get('matchType') == 'benzerDosya']
        
        problems = {
            'low_similarity': [],
            'common_word_dependent': [],
            'single_word_matches': [],
            'meaningless_matches': []
        }
        
        for match in similar_matches:
            original_file = match['originalPath'].split('/')[-1]
            found_file = match['foundPath'].split('/')[-1]
            similarity = match.get('similarity', 0)
            
            orig_words = self.extract_words(original_file)
            found_words = self.extract_words(found_file)
            common_words = set(orig_words) & set(found_words)
            meaningful_common = common_words - self.all_common_words
            
            # Düşük benzerlik
            if similarity < 0.7:
                problems['low_similarity'].append({
                    'original': original_file,
                    'found': found_file,
                    'similarity': similarity,
                    'common_words': list(common_words),
                    'meaningful_words': list(meaningful_common)
                })
            
            # Genel kelime bağımlı
            if len(meaningful_common) < 2 and similarity < 0.9:
                problems['common_word_dependent'].append({
                    'original': original_file,
                    'found': found_file,
                    'similarity': similarity,
                    'common_words': list(common_words),
                    'meaningful_words': list(meaningful_common)
                })
            
            # Tek kelime eşleşmesi
            if len(meaningful_common) == 1 and similarity < 0.9:
                problems['single_word_matches'].append({
                    'original': original_file,
                    'found': found_file,
                    'similarity': similarity,
                    'common_words': list(common_words),
                    'meaningful_words': list(meaningful_common)
                })
            
            # Anlamsız eşleşmeler
            if len(meaningful_common) == 0 and similarity > 0.5:
                problems['meaningless_matches'].append({
                    'original': original_file,
                    'found': found_file,
                    'similarity': similarity,
                    'common_words': list(common_words),
                    'meaningful_words': list(meaningful_common)
                })
        
        print(f"📊 Sorun Kategorileri:")
        print(f"   Düşük benzerlik (< 0.7): {len(problems['low_similarity'])}")
        print(f"   Genel kelime bağımlı: {len(problems['common_word_dependent'])}")
        print(f"   Tek kelime eşleşmesi: {len(problems['single_word_matches'])}")
        print(f"   Anlamsız eşleşmeler: {len(problems['meaningless_matches'])}")
        
        # Örnekler göster
        for category, items in problems.items():
            if items:
                print(f"\n   {category.upper()} Örnekleri:")
                for i, item in enumerate(items[:3]):
                    print(f"     {i+1}. {item['original']} → {item['found']}")
                    print(f"        Benzerlik: {item['similarity']:.3f}")
                    print(f"        Ortak kelimeler: {item['common_words']}")
                    print(f"        Anlamlı kelimeler: {item['meaningful_words']}")
        
        return problems
    
    def compare_algorithms(self):
        """İki algoritmayı karşılaştır"""
        print("\n⚖️  ALGORİTMA KARŞILAŞTIRMASI")
        print("=" * 60)
        
        results = self.log_data['response_data']['results']
        similar_matches = [r for r in results if r.get('found') and r.get('matchType') == 'benzerDosya']
        
        comparison_results = {
            'old_scores': [],
            'new_scores': [],
            'improvements': [],
            'regressions': [],
            'statistics': {}
        }
        
        for match in similar_matches:
            original_file = match['originalPath'].split('/')[-1]
            found_file = match['foundPath'].split('/')[-1]
            old_similarity = match.get('similarity', 0)
            
            # Kelimeleri çıkar
            orig_words = self.extract_words(original_file)
            found_words = self.extract_words(found_file)
            
            # Yeni algoritma ile hesapla
            new_similarity = self.calculate_perfect_similarity(orig_words, found_words)
            
            comparison_results['old_scores'].append(old_similarity)
            comparison_results['new_scores'].append(new_similarity)
            
            # İyileşme/gerileme analizi
            diff = new_similarity - old_similarity
            if abs(diff) > 0.1:  # Önemli fark
                if diff > 0:
                    comparison_results['improvements'].append({
                        'original': original_file,
                        'found': found_file,
                        'old_score': old_similarity,
                        'new_score': new_similarity,
                        'improvement': diff
                    })
                else:
                    comparison_results['regressions'].append({
                        'original': original_file,
                        'found': found_file,
                        'old_score': old_similarity,
                        'new_score': new_similarity,
                        'regression': abs(diff)
                    })
        
        # İstatistikler
        old_scores = comparison_results['old_scores']
        new_scores = comparison_results['new_scores']
        
        comparison_results['statistics'] = {
            'old_mean': statistics.mean(old_scores),
            'new_mean': statistics.mean(new_scores),
            'old_median': statistics.median(old_scores),
            'new_median': statistics.median(new_scores),
            'old_std': statistics.stdev(old_scores) if len(old_scores) > 1 else 0,
            'new_std': statistics.stdev(new_scores) if len(new_scores) > 1 else 0,
            'improvements_count': len(comparison_results['improvements']),
            'regressions_count': len(comparison_results['regressions']),
            'total_comparisons': len(similar_matches)
        }
        
        # Sonuçları yazdır
        stats = comparison_results['statistics']
        print(f"📊 Karşılaştırma İstatistikleri:")
        print(f"   Toplam karşılaştırma: {stats['total_comparisons']}")
        print(f"   İyileşme: {stats['improvements_count']}")
        print(f"   Gerileme: {stats['regressions_count']}")
        print(f"   Eski ortalama: {stats['old_mean']:.3f}")
        print(f"   Yeni ortalama: {stats['new_mean']:.3f}")
        print(f"   Ortalama fark: {stats['new_mean'] - stats['old_mean']:.3f}")
        
        # En iyi iyileşmeler
        if comparison_results['improvements']:
            print(f"\n   EN İYİ İYİLEŞMELER:")
            sorted_improvements = sorted(comparison_results['improvements'], key=lambda x: x['improvement'], reverse=True)
            for i, imp in enumerate(sorted_improvements[:5]):
                print(f"     {i+1}. {imp['original']} → {imp['found']}")
                print(f"        Eski: {imp['old_score']:.3f} → Yeni: {imp['new_score']:.3f} (+{imp['improvement']:.3f})")
        
        # En kötü gerilemeler
        if comparison_results['regressions']:
            print(f"\n   EN KÖTÜ GERİLEMELER:")
            sorted_regressions = sorted(comparison_results['regressions'], key=lambda x: x['regression'], reverse=True)
            for i, reg in enumerate(sorted_regressions[:5]):
                print(f"     {i+1}. {reg['original']} → {reg['found']}")
                print(f"        Eski: {reg['old_score']:.3f} → Yeni: {reg['new_score']:.3f} (-{reg['regression']:.3f})")
        
        return comparison_results
    
    def generate_perfect_algorithm_code(self):
        """Mükemmel algoritma kodunu oluştur"""
        print("\n💻 MÜKEMMEL ALGORİTMA KODU")
        print("=" * 60)
        
        code = '''
def calculate_perfect_similarity(search_words: List[str], target_words: List[str]) -> float:
    """Mükemmel benzerlik algoritması"""
    if not search_words or not target_words:
        return 0.0
    
    # Genel kelimeler (filtreleme için)
    common_words = {
        'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
        'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
        'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
        'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
        've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
        'müzik', 'şarkı', 'parça'
    }
    
    # 1. GENEL KELİME FİLTRESİ
    meaningful_search = [w for w in search_words if w not in common_words]
    meaningful_target = [w for w in target_words if w not in common_words]
    
    # Eğer anlamlı kelime yoksa, çok düşük skor ver
    if not meaningful_search or not meaningful_target:
        if not search_words or not target_words:
            return 0.0
        exact_matches = sum(1 for word in search_words if word in target_words)
        return (exact_matches / max(len(search_words), len(target_words))) * 0.3
    
    # 2. ANLAMLI KELİME EŞLEŞMESİ (Ana skor)
    exact_meaningful_matches = sum(1 for word in meaningful_search if word in meaningful_target)
    meaningful_score = exact_meaningful_matches / max(len(meaningful_search), len(meaningful_target))
    
    # 3. KELİME UZUNLUK BONUSU
    long_word_matches = sum(1 for word in meaningful_search if word in meaningful_target and len(word) >= 4)
    long_word_bonus = long_word_matches / max(len(meaningful_search), len(meaningful_target)) * 0.2
    
    # 4. SANATÇI ADI BONUSU (İlk kelime)
    artist_bonus = 0.0
    if meaningful_search and meaningful_target:
        if meaningful_search[0] == meaningful_target[0] and len(meaningful_search[0]) >= 3:
            artist_bonus = 0.3
    
    # 5. ŞARKI ADI BONUSU (İkinci kelime)
    song_bonus = 0.0
    if len(meaningful_search) >= 2 and len(meaningful_target) >= 2:
        if meaningful_search[1] == meaningful_target[1] and len(meaningful_search[1]) >= 3:
            song_bonus = 0.2
    
    # 6. TAM EŞLEŞME BONUSU
    full_match_bonus = 0.0
    if exact_meaningful_matches >= 3:
        full_match_bonus = 0.15
    
    # 7. GENEL KELİME PENALTY
    general_word_penalty = 0.0
    general_matches = sum(1 for word in search_words if word in target_words and word in common_words)
    if general_matches > 0:
        general_word_penalty = min(0.2, general_matches * 0.05)
    
    # Toplam skor hesapla
    total_score = meaningful_score + long_word_bonus + artist_bonus + song_bonus + full_match_bonus - general_word_penalty
    
    # 0.0 - 1.0 arasında sınırla
    return max(0.0, min(1.0, total_score))

# ÖNERİLEN THRESHOLD DEĞERLERİ:
# - Mükemmel eşleşme: 0.9+
# - Çok iyi eşleşme: 0.8-0.9
# - İyi eşleşme: 0.7-0.8
# - Kabul edilebilir: 0.6-0.7
# - Şüpheli: 0.5-0.6
# - Reddet: < 0.5

RECOMMENDED_THRESHOLD = 0.75  # Eski 0.4'ten yükseltildi
'''
        
        print(code)
        return code
    
    def run_comprehensive_analysis(self):
        """Kapsamlı analizi çalıştır"""
        print("🚀 MÜKEMMEL BENZERLİK ALGORİTMASI ANALİZİ")
        print("=" * 80)
        
        if not self.load_data():
            return False
        
        # Eski algoritma sorunlarını analiz et
        problems = self.analyze_old_algorithm_problems()
        
        # Algoritmaları karşılaştır
        comparison = self.compare_algorithms()
        
        # Mükemmel algoritma kodunu oluştur
        perfect_code = self.generate_perfect_algorithm_code()
        
        # Raporu kaydet
        self.save_analysis_report(problems, comparison)
        
        print(f"\n✅ Mükemmel algoritma analizi tamamlandı!")
        
        return True
    
    def save_analysis_report(self, problems: Dict, comparison: Dict):
        """Analiz raporunu kaydet"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f"perfect_algorithm_analysis_{timestamp}.json"
        
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'analysis_type': 'perfect_similarity_algorithm',
            'old_algorithm_problems': problems,
            'algorithm_comparison': comparison,
            'recommendations': {
                'threshold': 0.75,
                'common_word_filter': True,
                'meaningful_word_minimum': 2,
                'artist_bonus': 0.3,
                'song_bonus': 0.2,
                'long_word_bonus': 0.2,
                'full_match_bonus': 0.15,
                'general_word_penalty': 0.2
            }
        }
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Analiz raporu kaydedildi: {report_file}")
        except Exception as e:
            print(f"❌ Rapor kaydedilemedi: {e}")

def main():
    """Ana fonksiyon"""
    log_file = "../logs/search_files_log_20250913_133024.json"
    db_file = "musicfiles.db.json"
    
    analyzer = PerfectSimilarityAlgorithm(log_file, db_file)
    success = analyzer.run_comprehensive_analysis()
    
    if success:
        print("\n🎯 Mükemmel algoritma analizi başarıyla tamamlandı!")
    else:
        print("\n❌ Analiz sırasında hata oluştu!")

if __name__ == "__main__":
    main()
