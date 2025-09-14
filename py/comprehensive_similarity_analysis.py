#!/usr/bin/env python3
"""
Kapsamlı Benzerlik Analiz Sistemi
=================================

Bu sistem şu analizleri yapar:
1. Log dosyasındaki TÜM eşleşmeleri detaylı analiz eder
2. Veritabanındaki dosyaları analiz eder
3. Neden bulamadığını veya yanlış bulduğunu tespit eder
4. Her eşleşme için detaylı rapor oluşturur
5. Algoritma sorunlarını netleştirir
"""

import json
import re
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any, Set
from collections import Counter, defaultdict
import statistics

class ComprehensiveSimilarityAnalysis:
    def __init__(self, log_file_path: str, db_file_path: str):
        self.log_file_path = log_file_path
        self.db_file_path = db_file_path
        self.log_data = None
        self.db_data = None
        self.db_files = {}  # path -> file_info mapping
        self.analysis_results = {}
        
    def load_data(self):
        """Verileri yükle ve indeksle"""
        print("📁 Veriler yükleniyor ve indeksleniyor...")
        
        # Log dosyasını yükle
        try:
            with open(self.log_file_path, 'r', encoding='utf-8') as f:
                self.log_data = json.load(f)
            print(f"✅ Log dosyası yüklendi: {len(self.log_data['response_data']['results'])} sonuç")
        except Exception as e:
            print(f"❌ Log dosyası yüklenemedi: {e}")
            return False
            
        # Veritabanını yükle ve indeksle
        try:
            with open(self.db_file_path, 'r', encoding='utf-8') as f:
                self.db_data = json.load(f)
            
            # Veritabanı dosyalarını indeksle
            self.db_files = {}
            for file_info in self.db_data.get('musicFiles', []):
                if 'path' in file_info:
                    self.db_files[file_info['path']] = file_info
            
            print(f"✅ Veritabanı yüklendi: {len(self.db_files)} dosya indekslendi")
        except Exception as e:
            print(f"❌ Veritabanı yüklenemedi: {e}")
            return False
            
        return True
    
    def analyze_all_matches(self):
        """TÜM eşleşmeleri detaylı analiz et"""
        print("\n🔍 TÜM EŞLEŞMELER DETAYLI ANALİZİ")
        print("=" * 80)
        
        results = self.log_data['response_data']['results']
        total_results = len(results)
        
        # Kategorilere ayır
        exact_matches = []
        similar_matches = []
        not_found = []
        
        for result in results:
            if result.get('found'):
                if result.get('matchType') == 'benzerDosya':
                    similar_matches.append(result)
                else:
                    exact_matches.append(result)
            else:
                not_found.append(result)
        
        print(f"📊 Eşleşme Kategorileri:")
        print(f"   Tam eşleşme: {len(exact_matches)}")
        print(f"   Benzerlik eşleşmesi: {len(similar_matches)}")
        print(f"   Bulunamayan: {len(not_found)}")
        print(f"   Toplam: {total_results}")
        
        # Her kategoriyi detaylı analiz et
        self.analyze_exact_matches(exact_matches)
        self.analyze_similar_matches(similar_matches)
        self.analyze_not_found(not_found)
        
        return {
            'exact_matches': exact_matches,
            'similar_matches': similar_matches,
            'not_found': not_found
        }
    
    def analyze_exact_matches(self, exact_matches: List[Dict]):
        """Tam eşleşmeleri analiz et"""
        print(f"\n✅ TAM EŞLEŞMELER ANALİZİ ({len(exact_matches)} adet)")
        print("-" * 60)
        
        if not exact_matches:
            print("   Tam eşleşme bulunamadı")
            return
        
        # Algoritma türlerine göre grupla
        algorithm_groups = defaultdict(list)
        for match in exact_matches:
            algo = match.get('matchType', 'unknown')
            algorithm_groups[algo].append(match)
        
        for algo, matches in algorithm_groups.items():
            print(f"\n   {algo}: {len(matches)} eşleşme")
            for i, match in enumerate(matches[:3]):  # İlk 3 örnek
                original = match['originalPath'].split('/')[-1]
                found = match['foundPath'].split('/')[-1]
                print(f"     {i+1}. {original} → {found}")
    
    def analyze_similar_matches(self, similar_matches: List[Dict]):
        """Benzerlik eşleşmelerini detaylı analiz et"""
        print(f"\n🎯 BENZERLİK EŞLEŞMELERİ DETAYLI ANALİZİ ({len(similar_matches)} adet)")
        print("-" * 60)
        
        if not similar_matches:
            print("   Benzerlik eşleşmesi bulunamadı")
            return
        
        # Benzerlik skorlarına göre grupla
        score_groups = {
            'excellent': [],  # 0.9-1.0
            'good': [],       # 0.7-0.9
            'poor': [],       # 0.5-0.7
            'terrible': []    # 0.0-0.5
        }
        
        for match in similar_matches:
            similarity = match.get('similarity', 0)
            if similarity >= 0.9:
                score_groups['excellent'].append(match)
            elif similarity >= 0.7:
                score_groups['good'].append(match)
            elif similarity >= 0.5:
                score_groups['poor'].append(match)
            else:
                score_groups['terrible'].append(match)
        
        for group_name, matches in score_groups.items():
            if matches:
                print(f"\n   {group_name.upper()} ({len(matches)} adet):")
                for i, match in enumerate(matches[:5]):  # İlk 5 örnek
                    self.analyze_single_match(match, i+1)
    
    def analyze_single_match(self, match: Dict, index: int):
        """Tek bir eşleşmeyi detaylı analiz et"""
        original_path = match['originalPath']
        found_path = match['foundPath']
        similarity = match.get('similarity', 0)
        
        original_file = original_path.split('/')[-1]
        found_file = found_path.split('/')[-1]
        
        print(f"\n     {index}. BENZERLİK: {similarity:.3f}")
        print(f"        Orijinal: {original_file}")
        print(f"        Bulunan:  {found_file}")
        
        # Kelime analizi
        orig_words = set(re.findall(r'[a-zA-ZçğıöşüÇĞIİÖŞÜ]+', original_file.lower()))
        found_words = set(re.findall(r'[a-zA-ZçğıöşüÇĞIİÖŞÜ]+', found_file.lower()))
        common_words = orig_words & found_words
        
        print(f"        Ortak kelimeler: {list(common_words)} ({len(common_words)} adet)")
        
        # Genel kelime analizi
        general_words = {'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by'}
        non_general_words = common_words - general_words
        
        print(f"        Genel olmayan kelimeler: {list(non_general_words)} ({len(non_general_words)} adet)")
        
        # Veritabanında kontrol et
        self.check_database_match(original_path, found_path)
        
        # Sorun tespiti
        issues = self.detect_match_issues(match, common_words, non_general_words)
        if issues:
            print(f"        ⚠️  SORUNLAR: {', '.join(issues)}")
    
    def check_database_match(self, original_path: str, found_path: str):
        """Veritabanında dosyaları kontrol et"""
        original_in_db = original_path in self.db_files
        found_in_db = found_path in self.db_files
        
        print(f"        Veritabanı kontrolü:")
        print(f"          Orijinal dosya: {'✅ Var' if original_in_db else '❌ Yok'}")
        print(f"          Bulunan dosya:  {'✅ Var' if found_in_db else '❌ Yok'}")
        
        if not found_in_db:
            print(f"          ⚠️  Bulunan dosya veritabanında yok!")
    
    def detect_match_issues(self, match: Dict, common_words: Set[str], non_general_words: Set[str]) -> List[str]:
        """Eşleşme sorunlarını tespit et"""
        issues = []
        similarity = match.get('similarity', 0)
        
        # Düşük benzerlik
        if similarity < 0.7:
            issues.append(f"Düşük benzerlik ({similarity:.3f})")
        
        # Az ortak kelime
        if len(common_words) < 3 and similarity < 0.9:
            issues.append(f"Az ortak kelime ({len(common_words)})")
        
        # Genel kelime bağımlı
        if len(non_general_words) < 2 and similarity < 0.9:
            issues.append(f"Genel kelime bağımlı ({len(non_general_words)} anlamlı kelime)")
        
        # Sadece 1 anlamlı kelime
        if len(non_general_words) == 1 and similarity < 0.9:
            issues.append("Sadece 1 anlamlı kelime")
        
        return issues
    
    def analyze_not_found(self, not_found: List[Dict]):
        """Bulunamayan dosyaları analiz et"""
        print(f"\n❌ BULUNAMADAN DOSYALAR ANALİZİ ({len(not_found)} adet)")
        print("-" * 60)
        
        if not not_found:
            print("   Tüm dosyalar bulundu")
            return
        
        # Veritabanında var mı kontrol et
        in_db_count = 0
        not_in_db_count = 0
        
        for match in not_found:
            original_path = match['originalPath']
            if original_path in self.db_files:
                in_db_count += 1
            else:
                not_in_db_count += 1
        
        print(f"   Veritabanında var: {in_db_count}")
        print(f"   Veritabanında yok: {not_in_db_count}")
        
        # Veritabanında olan ama bulunamayan dosyaları analiz et
        if in_db_count > 0:
            print(f"\n   Veritabanında olan ama bulunamayan dosyalar:")
            for i, match in enumerate(not_found[:10]):  # İlk 10 örnek
                original_path = match['originalPath']
                if original_path in self.db_files:
                    original_file = original_path.split('/')[-1]
                    print(f"     {i+1}. {original_file}")
                    self.analyze_why_not_found(original_path)
    
    def analyze_why_not_found(self, original_path: str):
        """Neden bulunamadığını analiz et"""
        if original_path not in self.db_files:
            print(f"        ❌ Dosya veritabanında yok")
            return
        
        file_info = self.db_files[original_path]
        original_file = original_path.split('/')[-1]
        
        print(f"        🔍 Neden bulunamadı analizi:")
        
        # Dosya adı analizi
        orig_words = set(re.findall(r'[a-zA-ZçğıöşüÇĞIİÖŞÜ]+', original_file.lower()))
        print(f"          Dosya adı kelimeleri: {list(orig_words)}")
        
        # Veritabanındaki kelimeler
        if 'fileWords' in file_info:
            db_words = set(file_info['fileWords'])
            print(f"          Veritabanı kelimeleri: {list(db_words)}")
            
            # Ortak kelime analizi
            common_words = orig_words & db_words
            print(f"          Ortak kelimeler: {list(common_words)} ({len(common_words)} adet)")
        
        # Benzer dosyalar ara
        similar_files = self.find_similar_files_in_db(original_file)
        if similar_files:
            print(f"          Benzer dosyalar bulundu:")
            for similar_file, similarity in similar_files[:3]:
                print(f"            {similar_file} (benzerlik: {similarity:.3f})")
    
    def find_similar_files_in_db(self, target_file: str) -> List[Tuple[str, float]]:
        """Veritabanında benzer dosyalar ara"""
        target_words = set(re.findall(r'[a-zA-ZçğıöşüÇĞIİÖŞÜ]+', target_file.lower()))
        similar_files = []
        
        for db_path, file_info in self.db_files.items():
            if 'fileWords' in file_info:
                db_words = set(file_info['fileWords'])
                common_words = target_words & db_words
                
                if common_words:
                    similarity = len(common_words) / len(target_words) if target_words else 0
                    if similarity > 0.3:  # En az %30 benzerlik
                        similar_files.append((db_path.split('/')[-1], similarity))
        
        # Benzerlik skoruna göre sırala
        similar_files.sort(key=lambda x: x[1], reverse=True)
        return similar_files
    
    def analyze_database_coverage(self):
        """Veritabanı kapsamını analiz et"""
        print(f"\n🗄️  VERİTABANI KAPSAM ANALİZİ")
        print("=" * 60)
        
        # Log dosyasındaki tüm dosyaları al
        log_files = set()
        for result in self.log_data['response_data']['results']:
            log_files.add(result['originalPath'])
        
        # Veritabanında olan/olmayan dosyaları say
        in_db = 0
        not_in_db = 0
        
        for log_file in log_files:
            if log_file in self.db_files:
                in_db += 1
            else:
                not_in_db += 1
        
        print(f"📊 Veritabanı Kapsamı:")
        print(f"   Log dosyasındaki dosyalar: {len(log_files)}")
        print(f"   Veritabanında var: {in_db} (%{(in_db/len(log_files))*100:.1f})")
        print(f"   Veritabanında yok: {not_in_db} (%{(not_in_db/len(log_files))*100:.1f})")
        
        # Veritabanında olmayan dosyaları göster
        if not_in_db > 0:
            print(f"\n   Veritabanında olmayan dosyalar:")
            missing_files = [f for f in log_files if f not in self.db_files]
            for i, missing_file in enumerate(missing_files[:10]):  # İlk 10 örnek
                print(f"     {i+1}. {missing_file.split('/')[-1]}")
    
    def generate_comprehensive_report(self):
        """Kapsamlı rapor oluştur"""
        print(f"\n📋 KAPSAMLI RAPOR OLUŞTURULUYOR")
        print("=" * 60)
        
        # Tüm analizleri çalıştır
        matches_analysis = self.analyze_all_matches()
        self.analyze_database_coverage()
        
        # Özet istatistikler
        total_results = len(self.log_data['response_data']['results'])
        found_results = len([r for r in self.log_data['response_data']['results'] if r.get('found')])
        not_found_results = total_results - found_results
        
        print(f"\n📊 ÖZET İSTATİSTİKLER:")
        print(f"   Toplam dosya: {total_results}")
        print(f"   Bulunan: {found_results} (%{(found_results/total_results)*100:.1f})")
        print(f"   Bulunamayan: {not_found_results} (%{(not_found_results/total_results)*100:.1f})")
        
        # Benzerlik eşleşmeleri analizi
        similar_matches = matches_analysis['similar_matches']
        if similar_matches:
            similarities = [m.get('similarity', 0) for m in similar_matches]
            print(f"\n   Benzerlik eşleşmeleri: {len(similar_matches)}")
            print(f"   Ortalama benzerlik: {statistics.mean(similarities):.3f}")
            print(f"   En düşük benzerlik: {min(similarities):.3f}")
            print(f"   En yüksek benzerlik: {max(similarities):.3f}")
            
            # Problemli eşleşmeler
            problematic = [m for m in similar_matches if m.get('similarity', 0) < 0.7]
            print(f"   Problemli eşleşmeler (< 0.7): {len(problematic)}")
        
        # Raporu kaydet
        self.save_comprehensive_report()
    
    def save_comprehensive_report(self):
        """Kapsamlı raporu kaydet"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f"comprehensive_similarity_report_{timestamp}.json"
        
        # Rapor verilerini hazırla
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'log_file': self.log_file_path,
            'db_file': self.db_file_path,
            'summary': {
                'total_files': len(self.log_data['response_data']['results']),
                'found_files': len([r for r in self.log_data['response_data']['results'] if r.get('found')]),
                'not_found_files': len([r for r in self.log_data['response_data']['results'] if not r.get('found')])
            },
            'analysis_results': self.analysis_results
        }
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Kapsamlı rapor kaydedildi: {report_file}")
            return report_file
        except Exception as e:
            print(f"❌ Rapor kaydedilemedi: {e}")
            return None
    
    def run_comprehensive_analysis(self):
        """Kapsamlı analizi çalıştır"""
        print("🚀 KAPSAMLI BENZERLİK ANALİZ SİSTEMİ")
        print("=" * 80)
        
        if not self.load_data():
            return False
        
        # Kapsamlı analizi çalıştır
        self.generate_comprehensive_report()
        
        print(f"\n✅ Kapsamlı analiz tamamlandı!")
        
        return True

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    log_file = "py/logs/search_files_log_20250913_124818.json"
    db_file = "py/musicfiles.db.json"
    
    # Analiz sistemini başlat
    analyzer = ComprehensiveSimilarityAnalysis(log_file, db_file)
    
    # Kapsamlı analizi çalıştır
    success = analyzer.run_comprehensive_analysis()
    
    if success:
        print("\n🎯 Kapsamlı analiz başarıyla tamamlandı!")
    else:
        print("\n❌ Analiz sırasında hata oluştu!")

if __name__ == "__main__":
    main()
