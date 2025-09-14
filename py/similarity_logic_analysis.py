#!/usr/bin/env python3
"""
Benzerlik sonuçlarının mantıksal analizi
"""

import json
from pathlib import Path
from typing import Dict, List, Any

# API'deki fonksiyonları doğrudan kullanmak için gerekli importlar
from apiserver import (
    normalize_text, 
    extract_improved_words,
    calculate_improved_similarity
)


def analyze_similarity_logic():
    """Benzerlik sonuçlarının mantıksal analizini yapar"""
    
    # Test raporunu oku
    with open("similarity_test_report.json", "r", encoding="utf-8") as f:
        report = json.load(f)
    
    detailed_results = report["detailed_results"]
    
    print("=== BENZERLİK SONUÇLARININ MANTIKSAL ANALİZİ ===\n")
    
    # Yüksek benzerlikli sonuçları analiz et (0.8 ve üzeri)
    high_similarity_matches = [r for r in detailed_results if r["similarity"] and r["similarity"] >= 0.8]
    
    print(f"Yüksek Benzerlikli Eşleşmeler ({len(high_similarity_matches)} adet):")
    print("-" * 80)
    
    for result in high_similarity_matches[:10]:  # İlk 10'u göster
        original_path = result["original_path"]
        found_path = result["found_path"]
        similarity = result["similarity"]
        
        print(f"\nOrjinal: {Path(original_path).name}")
        print(f"Eşleşen: {Path(found_path).name}")
        print(f"Benzerlik: {similarity:.2f}")
        
        # Kelime analizini yap
        original_file_name = Path(original_path).name
        found_file_name = Path(found_path).name
        
        original_words = extract_improved_words(original_file_name, original_path)
        found_words = extract_improved_words(found_file_name, found_path)
        
        print(f"Orjinal kelime seti: {original_words}")
        print(f"Eşleşen kelime seti: {found_words}")
        
        # Detaylı benzerlik hesaplamasını yap
        detailed_similarity = calculate_improved_similarity(original_words, found_words)
        print(f"Hesaplanan benzerlik: {detailed_similarity:.2f}")
    
    # Düşük benzerlikli sonuçları analiz et (0.3-0.5 arası)
    low_similarity_matches = [r for r in detailed_results if r["similarity"] and 0.3 <= r["similarity"] <= 0.5]
    
    print(f"\n\nDüşük Benzerlikli Eşleşmeler ({len(low_similarity_matches)} adet):")
    print("-" * 80)
    
    for result in low_similarity_matches[:10]:  # İlk 10'u göster
        original_path = result["original_path"]
        found_path = result["found_path"]
        similarity = result["similarity"]
        
        print(f"\nOrjinal: {Path(original_path).name}")
        print(f"Eşleşen: {Path(found_path).name}")
        print(f"Benzerlik: {similarity:.2f}")
        
        # Kelime analizini yap
        original_file_name = Path(original_path).name
        found_file_name = Path(found_path).name
        
        original_words = extract_improved_words(original_file_name, original_path)
        found_words = extract_improved_words(found_file_name, found_path)
        
        print(f"Orjinal kelime seti: {original_words}")
        print(f"Eşleşen kelime seti: {found_words}")
        
        # Detaylı benzerlik hesaplamasını yap
        detailed_similarity = calculate_improved_similarity(original_words, found_words)
        print(f"Hesaplanan benzerlik: {detailed_similarity:.2f}")
    
    # Mantıksal tutarsızlıklar
    print(f"\n\nMANTIKSAL TUTARSIZLIKLAR ANALİZİ:")
    print("-" * 80)
    
    # Aynı şarkının farklı versiyonları için 1.0 benzerlik
    perfect_matches = [r for r in detailed_results if r["similarity"] == 1.0]
    print(f"\nTam eşleşmeler (1.0 benzerlik): {len(perfect_matches)} adet")
    print("Bu eşleşmeler mantıksal olarak tutarlı:")
    
    for result in perfect_matches[:5]:
        original_name = Path(result["original_path"]).name
        found_name = Path(result["found_path"]).name
        print(f"  ✓ {original_name} ↔ {found_name}")
    
    # Benzerlik skoru ile mantık uyumsuzlukları
    print(f"\nPotansiyel mantıksal sorunlar:")
    
    logical_issues = 0
    
    # 1. Aynı sanatçı farklı şarkılar
    for result in detailed_results:
        if result["similarity"] and 0.6 <= result["similarity"] <= 0.8:
            original_artist = Path(result["original_path"]).name.split(" - ")[0] if " - " in Path(result["original_path"]).name else ""
            found_artist = Path(result["found_path"]).name.split(" - ")[0] if " - " in Path(result["found_path"]).name else ""
            
            if original_artist and found_artist and original_artist == found_artist:
                original_song = " - ".join(Path(result["original_path"]).name.split(" - ")[1:]) if " - " in Path(result["original_path"]).name else ""
                found_song = " - ".join(Path(result["found_path"]).name.split(" - ")[1:]) if " - " in Path(result["found_path"]).name else ""
                
                # Şarkı adları çok farklıysa ama benzerlik yüksekse uyarı ver
                if original_song and found_song:
                    print(f"  ⚠ Aynı sanatçı, farklı şarkılar (benzerlik: {result['similarity']:.2f}):")
                    print(f"    Orjinal: {Path(result['original_path']).name}")
                    print(f"    Eşleşen: {Path(result['found_path']).name}")
                    logical_issues += 1
    
    # 2. Tamamen farklı içeriklerde yüksek benzerlik
    for result in detailed_results:
        if result["similarity"] and result["similarity"] >= 0.7:
            original_name = Path(result["original_path"]).name.lower()
            found_name = Path(result["found_path"]).name.lower()
            
            # Türkçe düğün müzikleri ile uluslararası müzikler
            if ("düğün" in original_name or "dügün" in original_name) and ("bachata" in found_name or "salsa" in found_name):
                print(f"  ⚠ Türkçe düğün müziği ile uluslararası müzik eşleşmesi (benzerlik: {result['similarity']:.2f}):")
                print(f"    Orjinal: {Path(result['original_path']).name}")
                print(f"    Eşleşen: {Path(result['found_path']).name}")
                logical_issues += 1
            
            # Klasik müzik ile pop müzik
            if ("chopin" in original_name or "waltz" in original_name) and ("pop" in found_name or "remix" in found_name):
                print(f"  ⚠ Klasik müzik ile pop müzik eşleşmesi (benzerlik: {result['similarity']:.2f}):")
                print(f"    Orjinal: {Path(result['original_path']).name}")
                print(f"    Eşleşen: {Path(result['found_path']).name}")
                logical_issues += 1
    
    # 3. Düşük benzerlikte eşleşen içerikler
    for result in detailed_results:
        if result["similarity"] and result["similarity"] <= 0.4:
            original_name = Path(result["original_path"]).name.lower()
            found_name = Path(result["found_path"]).name.lower()
            
            # Aynı sanatçılar
            original_artist = Path(result["original_path"]).name.split(" - ")[0] if " - " in Path(result["original_path"]).name else ""
            found_artist = Path(result["found_path"]).name.split(" - ")[0] if " - " in Path(result["found_path"]).name else ""
            
            if original_artist and found_artist and original_artist == found_artist:
                print(f"  ⚠ Aynı sanatçı ama çok düşük benzerlik (benzerlik: {result['similarity']:.2f}):")
                print(f"    Orjinal: {Path(result['original_path']).name}")
                print(f"    Eşleşen: {Path(result['found_path']).name}")
                logical_issues += 1
    
    if logical_issues == 0:
        print("  ✓ Önemli mantıksal tutarsızlık bulunamadı.")
    else:
        print(f"\nToplam {logical_issues} potansiyel mantıksal sorun tespit edildi.")
    
    # Öneriler
    print(f"\n\nİYİLEŞTİRME ÖNERİLERİ:")
    print("-" * 80)
    print("1. Kelime çıkarım algoritmasında sanatçı adı ile şarkı adı ayrımı daha net yapılmalı")
    print("2. Klasör yapısı benzerliği daha fazla ağırlıklandırılmalı")
    print("3. Türkçe karakter dönüşümü ve normalizasyon iyileştirilmeli")
    print("4. Remix, cover, vs. gibi ekstra terimler için özel işlem yapılmalı")
    print("5. Benzerlik eşiği (threshold) 0.3 yerine 0.4-0.5 arası bir değere yükseltilmeli")


if __name__ == "__main__":
    analyze_similarity_logic()