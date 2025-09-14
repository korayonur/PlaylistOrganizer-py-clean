#!/usr/bin/env python3
"""
Veritabanı indekslerini optimize eder
"""

import asyncio
import json
from pathlib import Path
from apiserver import Database


async def optimize_database_indexes():
    """Veritabanı indekslerini optimize eder"""
    print("Veritabanı indekslerini optimize ediliyor...")
    
    # Veritabanını yükle
    db = await Database.get_instance()
    await Database.load()
    
    print(f"Toplam müzik dosyası: {len(db.data['musicFiles'])}")
    print(f"Path indeksi oluşturuldu: {len(db._path_index)} kayıt")
    print(f"Directory indeksi oluşturuldu: {len(db._dir_index)} klasör")
    print(f"Name indeksi oluşturuldu: {len(db._name_index)} kayıt")
    print(f"Normalized name indeksi oluşturuldu: {len(db._normalized_name_index)} kayıt")
    
    # Veritabanını kaydet
    await db.save()
    
    print("İndeksler oluşturuldu ve veritabanı güncellendi.")
    
    # Örnek indeks içeriklerini göster
    print("\nİndeks örnekleri:")
    print("Path indeksi örnekleri:", list(db._path_index.keys())[:5])
    print("Directory indeksi örnekleri:", list(db._dir_index.keys())[:5])


if __name__ == "__main__":
    asyncio.run(optimize_database_indexes())