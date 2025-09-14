#!/usr/bin/env python3
"""
Detaylı Benzerlik Analiz Sistemi
===============================

Bu sistem şu analizleri yapar:
1. Log dosyasındaki eşleşmeleri detaylı analiz eder
2. Veritabanındaki dosya yapılarını analiz eder
3. Benzerlik algoritmasının performansını değerlendirir
4. Mantıksız eşleşmeleri tespit eder
5. Öneriler sunar
"""

import json
import re
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any
from collections import Counter, defaultdict
import statistics

class SimilarityDetailedAnalysisSystem:
    def __init__(self, log_file_path: str, db_file_path: str):
        self.log_file_path = log_file_path
        self.db_file_path = db_file_path
        self.log_data = None
        self.db_data = None
        self.analysis_results = {}
        
    def load_data(self):
        """Verileri yükle"""
        print("📁 Veriler yükleniyor...")
        
        # Log dosyasını yükle
        try:
            with open(self.log_file_path, 'r', encoding='utf-8') as f:
                self.log_data = json.load(f)
            print(f"✅ Log dosyası yüklendi: {len(self.log_data['response_data']['results'])} sonuç")
        except Exception as e:
            print(f"❌ Log dosyası yüklenemedi: {e}")
            return False
            
        # Veritabanını yükle
        try:
            with open(self.db_file_path, 'r', encoding='utf-8') as f:
                self.db_data = json.load(f)
            print(f"✅ Veritabanı yüklendi: {len(self.db_data.get('musicFiles', []))} dosya")
        except Exception as e:
            print(f"❌ Veritabanı yüklenemedi: {e}")
            return False
            
        return True
    
    def analyze_similarity_algorithm_focus(self):
        """Benzerlik algoritmasına odaklı analiz"""
        print("\n🎯 BENZERLİK ALGORİTMASI ODAKLI ANALİZ")
        print("=" * 60)
        
        # Sadece benzerlik algoritması ile eşleşen dosyaları analiz et
        similarity_matches = []
        for result in self.log_data['response_data']['results']:
            if (result.get('found') and 
                result.get('matchType') == 'benzerDosya' and 
                'similarity' in result):
                similarity_matches.append(result)
        
        print(f"📊 Benzerlik algoritması ile eşleşen dosya sayısı: {len(similarity_matches)}")
        
        # Benzerlik skorlarını analiz et
        similarities = [match['similarity'] for match in similarity_matches]
        if similarities:
            print(f"📈 Benzerlik skorları:")
            print(f"   Ortalama: {statistics.mean(similarities):.3f}")
            print(f"   Medyan: {statistics.median(similarities):.3f}")
            print(f"   En düşük: {min(similarities):.3f}")
            print(f"   En yüksek: {max(similarities):.3f}")
        
        self.analysis_results['similarity_focus'] = {
            'total_matches': len(similarity_matches),
            'similarities': similarities,
            'matches': similarity_matches
        }
        
        return similarity_matches
    
    def _classify_file_name(self, file_name: str) -> str:
        """Dosya adını kategorize et"""
        file_lower = file_name.lower()
        
        # Sanatçı - Şarkı formatı (tire ile ayrılmış)
        if ' - ' in file_name and len(file_name.split(' - ')) == 2:
            return 'sanatci_sarki'
        
        # Mix/Compilation
        if any(word in file_lower for word in ['mix', 'compilation', 'playlist', 'album', 'collection']):
            return 'mix_compilation'
        
        # DJ/Remix
        if any(word in file_lower for word in ['dj', 'remix', 'feat', 'ft', 'featuring']):
            return 'dj_remix'
        
        # Enstrümantal
        if any(word in file_lower for word in ['instrumental', 'enstrümantal', 'piyano', 'gitar', 'saz']):
            return 'instrumental'
        
        # Playlist/Album
        if any(word in file_lower for word in ['top', 'best', 'hits', 'classics', 'greatest']):
            return 'playlist_album'
        
        # Sadece şarkı adı (kısa)
        if len(file_name.split()) <= 3:
            return 'sadece_sarki'
        
        return 'other'
    
    def analyze_problematic_matches(self):
        """Problemli eşleşmeleri detaylı analiz et"""
        print("\n⚠️  PROBLEMLİ EŞLEŞMELER DETAYLI ANALİZİ")
        print("=" * 60)
        
        # Genel kelimeleri tanımla
        common_words = {'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by'}
        
        problematic_matches = []
        low_quality_matches = []
        general_word_matches = []
        
        for result in self.log_data['response_data']['results']:
            if (result.get('found') and 
                result.get('matchType') == 'benzerDosya' and 
                'similarity' in result):
                
                sim = result['similarity']
                original = result['originalPath'].split('/')[-1]
                found = result['foundPath'].split('/')[-1]
                
                # Ortak kelimeleri hesapla
                orig_words = set(re.findall(r'[a-zA-ZçğıöşüÇĞIİÖŞÜ]+', original.lower()))
                found_words = set(re.findall(r'[a-zA-ZçğıöşüÇĞIİÖŞÜ]+', found.lower()))
                common_words_set = orig_words & found_words
                common_words_list = list(common_words_set)
                
                # Problemli eşleşme kategorileri
                match_info = {
                    'similarity': sim,
                    'original': original,
                    'found': found,
                    'common_words': common_words_list,
                    'common_count': len(common_words_list),
                    'non_general_words': list(common_words_set - common_words),
                    'non_general_count': len(common_words_set - common_words)
                }
                
                # Düşük benzerlik (< 0.7)
                if sim < 0.7:
                    problematic_matches.append(match_info)
                
                # Düşük kalite (az ortak kelime)
                if len(common_words_list) < 3 and sim < 0.9:
                    low_quality_matches.append(match_info)
                
                # Genel kelime bağımlı eşleşme
                if len(common_words_set - common_words) < 2 and sim < 0.9:
                    general_word_matches.append(match_info)
        
        # Sonuçları yazdır
        print(f"📊 Problemli Eşleşme Kategorileri:")
        print(f"   Düşük benzerlik (< 0.7): {len(problematic_matches)}")
        print(f"   Düşük kalite (az ortak kelime): {len(low_quality_matches)}")
        print(f"   Genel kelime bağımlı: {len(general_word_matches)}")
        
        # En problemli eşleşmeleri göster
        print(f"\n🔍 EN PROBLEMLİ EŞLEŞMELER:")
        all_problematic = sorted(problematic_matches + low_quality_matches + general_word_matches, 
                               key=lambda x: x['similarity'])
        
        for i, match in enumerate(all_problematic[:15]):  # En problemli 15 örnek
            print(f"\n{i+1}. Benzerlik: {match['similarity']:.3f}")
            print(f"   Orijinal: {match['original']}")
            print(f"   Bulunan:  {match['found']}")
            print(f"   Ortak kelimeler: {match['common_words']} ({match['common_count']} adet)")
            print(f"   Genel olmayan kelimeler: {match['non_general_words']} ({match['non_general_count']} adet)")
        
        self.analysis_results['problematic_analysis'] = {
            'problematic_matches': problematic_matches,
            'low_quality_matches': low_quality_matches,
            'general_word_matches': general_word_matches,
            'common_words': common_words
        }
        
        return problematic_matches
    
    def analyze_database_structure(self):
        """Veritabanı yapısını analiz et"""
        print("\n🗄️  VERİTABANI YAPISI ANALİZİ")
        print("=" * 60)
        
        if not self.db_data or 'musicFiles' not in self.db_data:
            print("❌ Veritabanı verisi bulunamadı")
            return {}
        
        music_files = self.db_data['musicFiles']
        print(f"📁 Toplam dosya sayısı: {len(music_files)}")
        
        # Dosya uzantıları
        extensions = Counter()
        for file_info in music_files:
            if 'path' in file_info:
                ext = Path(file_info['path']).suffix.lower()
                extensions[ext] += 1
        
        print(f"\n📊 Dosya Uzantıları:")
        for ext, count in extensions.most_common():
            percentage = (count / len(music_files)) * 100
            print(f"   {ext}: {count} dosya (%{percentage:.1f})")
        
        # Kelime analizi
        word_analysis = self._analyze_words_in_database(music_files)
        
        # Klasör analizi
        folder_analysis = self._analyze_folders_in_database(music_files)
        
        self.analysis_results['database_structure'] = {
            'total_files': len(music_files),
            'extensions': dict(extensions),
            'word_analysis': word_analysis,
            'folder_analysis': folder_analysis
        }
        
        return self.analysis_results['database_structure']
    
    def _analyze_words_in_database(self, music_files: List[Dict]) -> Dict:
        """Veritabanındaki kelimeleri analiz et"""
        print(f"\n🔤 Kelime Analizi:")
        
        all_words = []
        file_words = []
        folder_words = []
        
        for file_info in music_files:
            if 'allWords' in file_info:
                all_words.extend(file_info['allWords'])
            if 'fileWords' in file_info:
                file_words.extend(file_info['fileWords'])
            if 'folderWords' in file_info:
                folder_words.extend(file_info['folderWords'])
        
        # En sık kullanılan kelimeler
        word_counts = Counter(all_words)
        file_word_counts = Counter(file_words)
        folder_word_counts = Counter(folder_words)
        
        print(f"   Toplam kelime: {len(all_words)}")
        print(f"   Benzersiz kelime: {len(word_counts)}")
        
        print(f"\n   En sık kullanılan kelimeler (genel):")
        for word, count in word_counts.most_common(10):
            print(f"     {word}: {count}")
        
        print(f"\n   En sık kullanılan kelimeler (dosya adı):")
        for word, count in file_word_counts.most_common(10):
            print(f"     {word}: {count}")
        
        return {
            'total_words': len(all_words),
            'unique_words': len(word_counts),
            'most_common_words': dict(word_counts.most_common(20)),
            'most_common_file_words': dict(file_word_counts.most_common(20)),
            'most_common_folder_words': dict(folder_word_counts.most_common(20))
        }
    
    def _analyze_folders_in_database(self, music_files: List[Dict]) -> Dict:
        """Klasör yapısını analiz et"""
        print(f"\n📁 Klasör Analizi:")
        
        folder_counts = Counter()
        folder_depth_counts = Counter()
        
        for file_info in music_files:
            if 'path' in file_info:
                path_parts = Path(file_info['path']).parts
                folder_depth = len(path_parts) - 1  # Dosya adı hariç
                folder_depth_counts[folder_depth] += 1
                
                # Ana klasörleri say
                if len(path_parts) > 1:
                    main_folder = path_parts[-2]  # Son klasör
                    folder_counts[main_folder] += 1
        
        print(f"   Klasör derinliği dağılımı:")
        for depth, count in sorted(folder_depth_counts.items()):
            print(f"     {depth} seviye: {count} dosya")
        
        print(f"\n   En sık kullanılan klasörler:")
        for folder, count in folder_counts.most_common(10):
            print(f"     {folder}: {count} dosya")
        
        return {
            'folder_counts': dict(folder_counts),
            'depth_distribution': dict(folder_depth_counts)
        }
    
    def analyze_algorithm_performance(self):
        """Algoritma performansını analiz et"""
        print("\n⚡ ALGORİTMA PERFORMANS ANALİZİ")
        print("=" * 60)
        
        if 'matchDetails' not in self.log_data['response_data']:
            print("❌ Match details bulunamadı")
            return {}
        
        match_details = self.log_data['response_data']['matchDetails']
        
        print(f"📊 Algoritma Kullanım Dağılımı:")
        total_matches = sum(detail['count'] for detail in match_details.values())
        
        for algo_name, details in match_details.items():
            count = details['count']
            percentage = (count / total_matches) * 100 if total_matches > 0 else 0
            avg_time = details['time'] / count if count > 0 else 0
            print(f"   {algo_name}: {count} eşleşme (%{percentage:.1f}) - Ort. süre: {avg_time:.1f}ms")
        
        # Performans istatistikleri
        execution_time = self.log_data['response_data']['executionTime']
        total_processed = self.log_data['response_data']['totalProcessed']
        avg_process_time = self.log_data['response_data']['averageProcessTime']
        
        print(f"\n⏱️  Performans İstatistikleri:")
        print(f"   Toplam işlem süresi: {execution_time}ms ({execution_time/1000:.1f}s)")
        print(f"   İşlenen dosya sayısı: {total_processed}")
        print(f"   Ortalama işlem süresi: {avg_process_time}ms")
        print(f"   Dosya başına süre: {execution_time/total_processed:.1f}ms")
        
        self.analysis_results['algorithm_performance'] = {
            'match_details': match_details,
            'execution_time': execution_time,
            'total_processed': total_processed,
            'avg_process_time': avg_process_time
        }
        
        return self.analysis_results['algorithm_performance']
    
    def generate_similarity_recommendations(self):
        """Benzerlik algoritması için öneriler oluştur"""
        print("\n💡 BENZERLİK ALGORİTMASI ÖNERİLERİ")
        print("=" * 60)
        
        recommendations = []
        
        # Problemli eşleşme analizi
        if 'problematic_analysis' in self.analysis_results:
            problematic = self.analysis_results['problematic_analysis']
            problematic_count = len(problematic['problematic_matches'])
            low_quality_count = len(problematic['low_quality_matches'])
            general_word_count = len(problematic['general_word_matches'])
            
            # Threshold önerisi
            if problematic_count > 0:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'Threshold',
                    'issue': f'{problematic_count} adet düşük benzerlik eşleşmesi (< 0.7)',
                    'solution': 'Threshold değerini 0.75-0.8 arasına yükseltin',
                    'code': 'threshold = 0.75  # 0.4 yerine',
                    'impact': f'Bu değişiklik {problematic_count} mantıksız eşleşmeyi engelleyecek'
                })
            
            # Genel kelime filtresi önerisi
            if general_word_count > 0:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'General Word Filter',
                    'issue': f'{general_word_count} adet genel kelime bağımlı eşleşme',
                    'solution': 'Genel kelimeleri filtreleyin',
                    'code': '''common_words = {'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by'}
if len(exact_matches - common_words) < 2: return 0.0''',
                    'impact': f'Bu değişiklik {general_word_count} genel kelime bağımlı eşleşmeyi engelleyecek'
                })
            
            # Minimum ortak kelime önerisi
            if low_quality_count > 0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'Quality Control',
                    'issue': f'{low_quality_count} adet düşük kaliteli eşleşme (az ortak kelime)',
                    'solution': 'Minimum ortak kelime sayısı kontrolü ekleyin',
                    'code': 'if len(common_words) < 3 and similarity < 0.9: return 0.0',
                    'impact': f'Bu değişiklik {low_quality_count} düşük kaliteli eşleşmeyi engelleyecek'
                })
        
        # Benzerlik skorları analizi
        if 'similarity_focus' in self.analysis_results:
            similarities = self.analysis_results['similarity_focus']['similarities']
            if similarities:
                avg_similarity = statistics.mean(similarities)
                high_similarity_count = len([s for s in similarities if s >= 0.9])
                
                # Çok yüksek benzerlik oranı analizi
                if high_similarity_count > len(similarities) * 0.8:
                    recommendations.append({
                        'priority': 'LOW',
                        'category': 'Algorithm Efficiency',
                        'issue': f'Çok yüksek benzerlik oranı: %{(high_similarity_count/len(similarities))*100:.1f}',
                        'solution': 'Tam eşleşme algoritmalarını optimize edin',
                        'code': 'İndeks optimizasyonu ve önbellek kullanımı',
                        'impact': 'Performans artışı sağlayacak'
                    })
        
        # Kelime ağırlıklandırması önerisi
        recommendations.append({
            'priority': 'MEDIUM',
            'category': 'Scoring Algorithm',
            'issue': 'Kısmi eşleşme çok kolay (sadece 3+ karakter)',
            'solution': 'Kelime ağırlıklandırmasını düzeltin',
            'code': '''# Tam eşleşme: %95, Kısmi eşleşme: %5
file_score = (exact_file_score * 0.95) + (partial_file_score * 0.05)

# Minimum kelime uzunluğu artır
if len(search_word) > 4 and len(target_word) > 4:''',
            'impact': 'Daha kaliteli eşleşmeler sağlayacak'
        })
        
        # Önerileri yazdır
        for i, rec in enumerate(recommendations, 1):
            priority_color = "🔴" if rec['priority'] == 'HIGH' else "🟡" if rec['priority'] == 'MEDIUM' else "🟢"
            print(f"\n{i}. {priority_color} {rec['category']} - {rec['priority']} Öncelik")
            print(f"   Sorun: {rec['issue']}")
            print(f"   Çözüm: {rec['solution']}")
            print(f"   Etki: {rec['impact']}")
            print(f"   Kod:")
            for line in rec['code'].split('\n'):
                print(f"     {line}")
        
        self.analysis_results['similarity_recommendations'] = recommendations
        return recommendations
    
    def save_analysis_report(self, output_file: str = None):
        """Analiz raporunu kaydet"""
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"similarity_analysis_report_{timestamp}.json"
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'log_file': self.log_file_path,
            'db_file': self.db_file_path,
            'analysis_results': self.analysis_results
        }
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Analiz raporu kaydedildi: {output_file}")
            return output_file
        except Exception as e:
            print(f"❌ Rapor kaydedilemedi: {e}")
            return None
    
    def run_similarity_focused_analysis(self):
        """Benzerlik algoritması odaklı analizi çalıştır"""
        print("🚀 BENZERLİK ALGORİTMASI ODAKLI ANALİZ SİSTEMİ")
        print("=" * 80)
        
        if not self.load_data():
            return False
        
        # Sadece benzerlik algoritması ile ilgili analizleri çalıştır
        self.analyze_similarity_algorithm_focus()
        self.analyze_problematic_matches()
        self.generate_similarity_recommendations()
        
        # Raporu kaydet
        report_file = self.save_analysis_report()
        
        print(f"\n✅ Benzerlik algoritması analizi tamamlandı!")
        if report_file:
            print(f"📄 Detaylı rapor: {report_file}")
        
        return True

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    log_file = "py/logs/search_files_log_20250913_124818.json"
    db_file = "py/musicfiles.db.json"
    
    # Analiz sistemini başlat
    analyzer = SimilarityDetailedAnalysisSystem(log_file, db_file)
    
    # Benzerlik algoritması odaklı analizi çalıştır
    success = analyzer.run_similarity_focused_analysis()
    
    if success:
        print("\n🎯 Benzerlik algoritması analizi başarıyla tamamlandı!")
    else:
        print("\n❌ Analiz sırasında hata oluştu!")

if __name__ == "__main__":
    main()
