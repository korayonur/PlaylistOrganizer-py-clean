#!/usr/bin/env python3
"""
Benzerlik algoritması analiz ve test sistemi
API'deki mevcut benzerlik algoritmasını referans alarak geliştirilmiştir
"""

import asyncio
import json
import time
import unicodedata
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, asdict
import xmltodict

# API'deki fonksiyonları doğrudan kullanmak için gerekli importlar
from apiserver import (
    normalize_text, 
    normalize_file_name, 
    normalize_path,
    extract_improved_words,
    calculate_improved_similarity,
    Database,
    PLAYLISTS_FOLDERS,
    PLAYLISTS_MYLISTS
)


@dataclass
class TestResult:
    """Test sonucu"""
    original_path: str
    found: bool
    status: str
    match_type: Optional[str] = None
    algorithm: Optional[str] = None
    found_path: Optional[str] = None
    similarity: Optional[float] = None
    process_time: Optional[int] = None


@dataclass
class SimilarityTestStats:
    """Benzerlik testi istatistikleri"""
    total_files: int = 0
    found_count: int = 0
    not_found_count: int = 0
    exact_match_count: int = 0
    similarity_match_count: int = 0
    average_similarity: float = 0.0
    average_process_time: float = 0.0
    match_details: Dict[str, Dict[str, Any]] = None

    def __post_init__(self):
        if self.match_details is None:
            self.match_details = {
                "tamYolEsleme": {"count": 0, "time": 0, "algoritmaYontemi": "Tam Yol Eşleşme"},
                "ayniKlasorFarkliUzanti": {
                    "count": 0, 
                    "time": 0, 
                    "algoritmaYontemi": "Aynı Klasör Farklı Uzantı"
                },
                "farkliKlasor": {
                    "count": 0, 
                    "time": 0, 
                    "algoritmaYontemi": "Farklı Klasör Aynı Ad"
                },
                "farkliKlasorveUzanti": {
                    "count": 0, 
                    "time": 0, 
                    "algoritmaYontemi": "Farklı Klasör Farklı Uzantı"
                },
                "benzerDosya": {
                    "count": 0, 
                    "time": 0, 
                    "algoritmaYontemi": "Benzerlik Bazlı Arama"
                },
            }


class SimilarityAnalysisTestSystem:
    """Benzerlik algoritması analiz ve test sistemi"""

    def __init__(self, db_path: str = "musicfiles.db.json", test_limit: int = 1000):
        self.db_path = db_path
        self.test_limit = test_limit  # Test sayısı için sınır
        self.db = None
        self.test_results = []
        self.stats = SimilarityTestStats()

    async def initialize(self):
        """Sistemi başlatır ve veritabanını yükler"""
        self.db = await Database.get_instance()
        await Database.load()

    def scan_playlists_for_missing_files(self) -> List[Dict]:
        """
        Playlistlerdeki eksik müzik dosyalarını tarar
        
        Returns:
            List[Dict]: Eksik dosyaların listesi
        """
        missing_files = []
        
        # Her iki klasörden de playlist'leri tara
        folders_tree = self._build_playlist_tree(PLAYLISTS_FOLDERS)
        mylists_tree = self._build_playlist_tree(PLAYLISTS_MYLISTS, True)
        
        # Tüm playlist dosyalarını işle
        all_playlists = []
        if folders_tree:
            all_playlists.extend(self._extract_playlists(folders_tree))
        if mylists_tree:
            all_playlists.extend(self._extract_playlists(mylists_tree))
        
        print(f"Toplam {len(all_playlists)} playlist bulundu.")
        
        # Her playlist dosyasını oku ve eksik dosyaları bul
        for playlist_path in all_playlists:
            try:
                with open(playlist_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                
                if not content:
                    continue
                
                try:
                    xml_dict = xmltodict.parse(content)
                except Exception as err:
                    print(f"XML parse hatası: {playlist_path} - {str(err)}")
                    continue
                
                songs = xml_dict.get("VirtualFolder", {}).get("song", [])
                if songs:
                    if not isinstance(songs, list):
                        songs = [songs]
                    
                    for song_xml in songs:
                        file_path = song_xml.get("@path")
                        if file_path and not os.path.exists(file_path):
                            missing_files.append({
                                "path": file_path,
                                "playlist": playlist_path
                            })
            except Exception as e:
                print(f"Playlist dosyası okunamadı: {playlist_path}")
        
        print(f"Toplam {len(missing_files)} eksik dosya bulundu.")
        return missing_files

    def _build_playlist_tree(self, dir_path: str, is_mylists: bool = False) -> List[Dict]:
        """Playlist ağacını oluşturur"""
        if not os.path.exists(dir_path):
            return []
        
        items = [item for item in os.scandir(dir_path) if not item.name.startswith(".")]
        result = []

        # Hem klasörleri hem de playlist dosyalarını bul
        folders = [item for item in items if item.is_dir() or item.name.endswith(".subfolders")]
        files = [item for item in items if item.name.endswith(".vdjfolder")]

        # Klasörleri işle (MyLists için de alt klasörleri tara)
        for folder in folders:
            if folder.name == "My Library.subfolders":
                continue

            full_path = str(Path(dir_path) / folder.name)
            is_subfolder = folder.name.endswith(".subfolders")

            if is_subfolder or is_mylists:
                children = self._build_playlist_tree(full_path, is_mylists)
                if children:
                    result.append({
                        "id": str(Path(full_path).as_posix().encode("utf-8").hex()),
                        "name": folder.name.replace(".subfolders", ""),
                        "path": full_path,
                        "type": "folder",
                        "children": children,
                    })

        # Playlist dosyalarını işle
        for file in files:
            full_path = str(Path(dir_path) / file.name)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()

                if not content:
                    continue

                try:
                    xml_dict = xmltodict.parse(content)
                except Exception as err:
                    continue

                # XML parsing başarılı mı kontrol et
                if xml_dict is None:
                    continue

                songs = xml_dict.get("VirtualFolder", {}).get("song", [])
                if songs:
                    if not isinstance(songs, list):
                        songs = [songs]

                    result.append({
                        "id": str(Path(full_path).as_posix().encode("utf-8").hex()),
                        "name": file.name.replace(".vdjfolder", ""),
                        "path": full_path,
                        "type": "playlist",
                        "songCount": len(songs),
                    })
            except Exception as e:
                pass

        return sorted(result, key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))

    def _extract_playlists(self, tree: List[Dict]) -> List[str]:
        """Ağaç yapısından playlist dosya yollarını çıkarır"""
        playlists = []
        for node in tree:
            if node["type"] == "playlist":
                playlists.append(node["path"])
            elif "children" in node:
                playlists.extend(self._extract_playlists(node["children"]))
        return playlists

    async def find_similarity_algorithm_entries(self, missing_files: List[Dict]) -> List[Dict]:
        """
        Sadece benzerlik algoritmasına giren dosyaları bulur
        
        Args:
            missing_files: Eksik dosyalar listesi
            
        Returns:
            List[Dict]: Benzerlik algoritmasına giren dosyalar
        """
        similarity_entries = []
        
        # Sistemi başlat
        await self.initialize()
        
        # Her eksik dosya için doğrudan eşleşme kontrollerini yap
        for file_info in missing_files:
            search_path = file_info.get("path", "")
            if not search_path:
                continue
            
            # API'deki doğrudan eşleşme kontrollerini yap
            is_direct_match = await self._check_direct_matches(search_path)
            
            # Eğer doğrudan eşleşme yoksa, bu dosya benzerlik algoritmasına girecek
            if not is_direct_match:
                similarity_entries.append(file_info)
                
                # Belirlenen limite kadar kayıtla yetin
                if len(similarity_entries) >= self.test_limit:
                    break
        
        print(f"Benzerlik algoritmasına giren {len(similarity_entries)} dosya bulundu.")
        return similarity_entries

    async def _check_direct_matches(self, search_path: str) -> bool:
        """
        Doğrudan eşleşme kontrollerini yapar
        
        Args:
            search_path: Aranacak dosya yolu
            
        Returns:
            bool: Doğrudan eşleşme varsa True, yoksa False
        """
        # Veritabanının yüklendiğinden emin ol
        if self.db is None:
            await self.initialize()
            
        # Veritabanı hala yoksa hata döndür
        if self.db is None or self.db.data is None:
            return False
            
        search_file_name = Path(search_path).name
        search_file_name_without_ext = Path(search_path).stem
        
        # 1. Tam yol eşleşme kontrolü
        if self.db._path_index is not None and search_path in self.db._path_index:
            return True
        
        # 2. Aynı klasörde farklı uzantı kontrolü
        search_dir = str(Path(search_path).parent)
        normalized_search_dir = normalize_path(search_dir)
        if self.db._dir_index is not None and normalized_search_dir in self.db._dir_index:
            dir_files = self.db._dir_index[normalized_search_dir]
            for file in dir_files:
                file_stem = Path(file["path"]).stem
                if normalize_file_name(file_stem) == normalize_file_name(search_file_name_without_ext):
                    return True
        
        # 3. Farklı klasörde aynı ad kontrolü
        if self.db._name_index is not None and search_file_name_without_ext in self.db._name_index:
            return True
        
        # 4. Farklı klasörde farklı uzantı kontrolü
        normalized_name = normalize_text(search_file_name_without_ext)
        if self.db._normalized_name_index is not None and normalized_name in self.db._normalized_name_index:
            return True
        
        # Doğrudan eşleşme bulunamadı
        return False

    async def run_similarity_tests(self, similarity_files: List[Dict]) -> List[TestResult]:
        """
        Benzerlik testlerini çalıştırır
        
        Args:
            similarity_files: Benzerlik algoritmasına giren dosyalar listesi
            
        Returns:
            List[TestResult]: Test sonuçları
        """
        results = []
        total_similarity = 0.0
        similarity_count = 0
        
        print(f"Toplam {len(similarity_files)} dosya üzerinde benzerlik testi yapılacak.")
        
        for i, file_info in enumerate(similarity_files):
            search_path = file_info.get("path", "")
            if not search_path:
                continue
                
            # İlerleme durumunu göster
            if (i + 1) % 50 == 0:
                print(f"İlerleme: {i + 1}/{len(similarity_files)} dosya işlendi")
                
            start_time = time.time()
            
            # API'deki benzerlik arama algoritmasını kullan
            result = await self._search_with_similarity(search_path)
            
            process_time = int((time.time() - start_time) * 1000)
            result.process_time = process_time
            
            results.append(result)
            
            # İstatistikleri güncelle
            self._update_stats(result, process_time)
            
            # Benzerlik istatistiklerini güncelle
            if result.similarity is not None:
                total_similarity += result.similarity
                similarity_count += 1
        
        # Ortalama benzerlik değerini hesapla
        if similarity_count > 0:
            self.stats.average_similarity = total_similarity / similarity_count
            
        return results

    async def _search_with_similarity(self, search_path: str) -> TestResult:
        """
        API'deki benzerlik algoritması ile arama yapar
        
        Args:
            search_path: Aranacak dosya yolu
            
        Returns:
            TestResult: Arama sonucu
        """
        # Veritabanının yüklendiğinden emin ol
        if self.db is None:
            await self.initialize()
            
        # Veritabanı hala yoksa hata döndür
        if self.db is None or self.db.data is None:
            return TestResult(
                original_path=search_path,
                found=False,
                status="not_found"
            )
        
        search_file_name = Path(search_path).name
        search_file_name_without_ext = Path(search_path).stem
        
        # Benzerlik araması (API'deki algoritmayı kullan)
        search_words = extract_improved_words(search_file_name, search_path)
        
        candidates = []
        threshold = 0.3  # API'deki eşik değeri
        
        # TÜM DOSYALARI TARA
        if self.db.data is not None and 'musicFiles' in self.db.data:
            for file in self.db.data['musicFiles']:
                # Yeni veritabanı yapısından kelime kategorilerini al
                target_words = {
                    'file_words': file.get('fileWords', []),
                    'folder_words': file.get('folderWords', []),
                    'artist_words': file.get('artistWords', []),
                    'song_words': file.get('songWords', []),
                    'all_words': file.get('allWords', [])
                }
                
                similarity = calculate_improved_similarity(search_words, target_words)
                
                if similarity > threshold:
                    candidates.append({
                        "file": file, 
                        "similarity": similarity,
                        "file_words": target_words['file_words'],
                        "folder_words": target_words['folder_words']
                    })
        
        # Adayları sırala ve en iyi eşleşmeyi bul
        if candidates:
            # Önce benzerlik skoruna göre sırala
            candidates.sort(key=lambda x: x["similarity"], reverse=True)
            
            # Aynı benzerlik skorunda tam eşleşme sayısına göre sırala
            def sort_key(candidate):
                similarity = candidate["similarity"]
                file_words = candidate["file_words"]
                exact_matches = len(set(search_words['file_words']) & set(file_words))
                return (similarity, exact_matches)
            
            candidates.sort(key=sort_key, reverse=True)
            best_match = candidates[0]
            
            return TestResult(
                original_path=search_path,
                found=True,
                status="similar_found",
                match_type="benzerDosya",
                algorithm="Benzerlik Bazlı Arama",
                similarity=best_match["similarity"],
                found_path=best_match["file"]["path"]
            )
        
        # Eşleşme bulunamadı
        return TestResult(
            original_path=search_path,
            found=False,
            status="not_found"
        )

    def _update_stats(self, result: TestResult, process_time: int):
        """
        Test istatistiklerini günceller
        
        Args:
            result: Test sonucu
            process_time: İşlem süresi
        """
        self.stats.total_files += 1
        if result.found:
            self.stats.found_count += 1
            if result.status == "exact_match":
                self.stats.exact_match_count += 1
            elif result.status == "similar_found":
                self.stats.similarity_match_count += 1
                
            # Eşleşme tipine göre istatistikleri güncelle
            if result.match_type and self.stats.match_details and result.match_type in self.stats.match_details:
                self.stats.match_details[result.match_type]["count"] += 1
                self.stats.match_details[result.match_type]["time"] += process_time
        else:
            self.stats.not_found_count += 1
            
        # Ortalama işlem süresini güncelle
        total_time = self.stats.average_process_time * (self.stats.total_files - 1) + process_time
        self.stats.average_process_time = total_time / self.stats.total_files

    def generate_report(self) -> Dict[str, Any]:
        """
        Test raporu oluşturur
        
        Returns:
            Dict[str, Any]: Test raporu
        """
        return {
            "test_summary": {
                "total_files_tested": self.stats.total_files,
                "found_count": self.stats.found_count,
                "not_found_count": self.stats.not_found_count,
                "exact_match_count": self.stats.exact_match_count,
                "similarity_match_count": self.stats.similarity_match_count,
                "success_rate": (
                    self.stats.found_count / self.stats.total_files * 100 
                    if self.stats.total_files > 0 else 0
                ),
                "average_similarity": self.stats.average_similarity,
                "average_process_time_ms": self.stats.average_process_time
            },
            "match_details": self.stats.match_details,
            "detailed_results": self.test_results,  # Detaylı sonuçlar eklendi
            "recommendations": self._generate_recommendations()
        }

    def _generate_recommendations(self) -> List[str]:
        """
        İyileştirme önerileri oluşturur
        
        Returns:
            List[str]: Öneriler listesi
        """
        recommendations = []
        
        # Benzerlik başarısı düşükse öneriler
        if self.stats.average_similarity < 0.5:
            recommendations.append(
                "Benzerlik skoru düşük. Eşik değeri (threshold) 0.3'ün altında olabilir."
            )
            
        # Çok fazla eşleşmeyen dosya varsa öneriler
        if self.stats.not_found_count > self.stats.found_count:
            recommendations.append(
                "Çok fazla eşleşmeyen dosya bulundu. "
                "Benzerlik algoritmasının parametrelerini gözden geçirin."
            )
            
        # Ortalama işlem süresi yüksekse öneriler
        if self.stats.average_process_time > 100:  # 100ms
            recommendations.append(
                "Ortalama işlem süresi yüksek. "
                "İndeksleme veya algoritma optimizasyonu gerekebilir."
            )
            
        return recommendations

    async def run_complete_analysis(self):
        """Tam analiz çalıştırır"""
        print("Benzerlik Analiz Test Sistemi Başlatılıyor...")
        
        # Playlistleri tarayarak eksik dosyaları bul
        print("Playlistler taranıyor...")
        missing_files = self.scan_playlists_for_missing_files()
        
        if not missing_files:
            print("Eksik dosya bulunamadı.")
            return
        
        # Sadece benzerlik algoritmasına giren dosyaları bul
        print("Benzerlik algoritmasına giren dosyalar bulunuyor...")
        similarity_files = await self.find_similarity_algorithm_entries(missing_files)
        
        if not similarity_files:
            print("Benzerlik algoritmasına giren dosya bulunamadı.")
            return
        
        print(f"İlk {len(similarity_files)} benzerlik dosyası bulundu.")
        
        # Benzerlik testlerini çalıştır
        print("Benzerlik testleri başlatılıyor...")
        results = await self.run_similarity_tests(similarity_files)
        print(f"Toplam {len(results)} benzerlik testi çalıştırıldı.")
        
        # Detaylı sonuçları sakla (rapor için)
        self.test_results = [
            {
                "original_path": result.original_path,
                "found": result.found,
                "status": result.status,
                "match_type": result.match_type,
                "algorithm": result.algorithm,
                "found_path": result.found_path,
                "similarity": result.similarity,
                "process_time": result.process_time
            }
            for result in results
        ]
        
        # Rapor oluştur
        report = self.generate_report()
        
        # Sonuçları yazdır
        print("\n=== TEST SONUÇLARI ===")
        # print(json.dumps(report, indent=2, ensure_ascii=False))
        
        # Detaylı sonuçları yazdır
        print("\n=== DETAYLI SONUÇLAR ===")
        for result in results[:20]:  # İlk 20 sonucu göster
            if result.found:
                if result.similarity:
                    print(f"✓ {result.original_path} -> {result.found_path} "
                          f"(Benzerlik: {result.similarity:.2f})")
                else:
                    print(f"✓ {result.original_path} -> {result.found_path} "
                          f"({result.algorithm})")
            else:
                print(f"✗ {result.original_path} (Eşleşme bulunamadı)")
                
        return report


# Test çalıştırıcı
async def main():
    """Ana test fonksiyonu"""
    # Test sayısını 100 ile sınırladık
    test_system = SimilarityAnalysisTestSystem(test_limit=100)
    
    # Tam analiz çalıştır
    report = await test_system.run_complete_analysis()
    
    # Raporu dosyaya yaz
    with open("similarity_test_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("\nRapor 'similarity_test_report.json' dosyasına kaydedildi.")


if __name__ == "__main__":
    asyncio.run(main())