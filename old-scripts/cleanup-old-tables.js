const { getDatabase } = require('./shared/database');

console.log('🗑️  Gereksiz tablolar temizleniyor...\n');

const db = getDatabase().getDatabase();

// tracks_backup tablosunu sil
console.log('📦 tracks_backup tablosu siliniyor...');
db.exec('DROP TABLE IF EXISTS tracks_backup');
console.log('✅ tracks_backup silindi\n');

// VACUUM
console.log('🧹 Database optimize ediliyor...');
db.exec('VACUUM');
console.log('✅ VACUUM tamamlandı\n');

console.log('🎉 Temizlik tamamlandı!');

