using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace PlaylistOrganizerAvalonia.Shared.Services
{
    /// <summary>
    /// Merkezi string normalizasyon servisi
    /// Tüm dünya dillerini destekler ve tüm sistem tarafından kullanılır
    /// JavaScript'teki ENHANCED_CHAR_MAP'in C# versiyonu
    /// </summary>
    public class StringNormalizationService
    {
        // Kapsamlı uluslararası karakter haritası
        private static readonly Dictionary<string, string> EnhancedCharMap = new()
        {
            // Türkçe karakterler
            ["ğ"] = "g", ["Ğ"] = "G", ["ı"] = "i", ["I"] = "i", ["İ"] = "i", 
            ["ş"] = "s", ["Ş"] = "S", ["ç"] = "c", ["Ç"] = "C", 
            ["ü"] = "u", ["Ü"] = "U", ["ö"] = "o", ["Ö"] = "O",
            
            // Fransızca karakterler
            ["à"] = "a", ["á"] = "a", ["â"] = "a", ["ã"] = "a", ["ä"] = "a", ["å"] = "a", ["æ"] = "ae",
            ["è"] = "e", ["é"] = "e", ["ê"] = "e", ["ë"] = "e", ["ì"] = "i", ["í"] = "i", ["î"] = "i", ["ï"] = "i",
            ["ò"] = "o", ["ó"] = "o", ["ô"] = "o", ["õ"] = "o", ["ø"] = "o", ["ù"] = "u", ["ú"] = "u", ["û"] = "u",
            ["ý"] = "y", ["ÿ"] = "y",
            
            // Almanca karakterler
            ["ß"] = "ss", ["Ä"] = "A", ["Ö"] = "O", ["Ü"] = "U",
            
            // İspanyolca karakterler
            ["ñ"] = "n", ["Ñ"] = "N", ["Á"] = "A", ["É"] = "E", ["Í"] = "I", ["Ó"] = "O", ["Ú"] = "U",
            
            // İtalyanca karakterler
            ["À"] = "A", ["È"] = "E", ["Ì"] = "I", ["Ò"] = "O", ["Ù"] = "U",
            
            // Portekizce karakterler
            ["Ã"] = "A", ["Õ"] = "O", ["Â"] = "A", ["Ê"] = "E", ["Ô"] = "O",
            
            // Çekçe ve Slovakça karakterler
            ["č"] = "c", ["ď"] = "d", ["ě"] = "e", ["ň"] = "n", ["ř"] = "r", ["š"] = "s", ["ť"] = "t", ["ů"] = "u", ["ž"] = "z",
            ["Č"] = "C", ["Ď"] = "D", ["Ě"] = "E", ["Ň"] = "N", ["Ř"] = "R", ["Š"] = "S", ["Ť"] = "T", ["Ů"] = "U", ["Ž"] = "Z",
            ["ć"] = "c", ["Ć"] = "C", ["ł"] = "l", ["Ł"] = "L", ["ń"] = "n", ["Ń"] = "N", ["ś"] = "s", ["Ś"] = "S", ["ź"] = "z", ["Ź"] = "Z", ["ż"] = "z", ["Ż"] = "Z",
            
            // Lehçe karakterler
            ["ą"] = "a", ["ę"] = "e", ["Ą"] = "A", ["Ć"] = "C", ["Ę"] = "E", ["Ł"] = "L", ["Ń"] = "N", ["Ó"] = "O", ["Ś"] = "S", ["Ź"] = "Z", ["Ż"] = "Z",
            
            // Macarca karakterler
            ["ő"] = "o", ["ű"] = "u", ["Ő"] = "O", ["Ű"] = "U",
            
            // Romence karakterler
            ["ă"] = "a", ["â"] = "a", ["î"] = "i", ["ș"] = "s", ["ț"] = "t",
            ["Ă"] = "A", ["Â"] = "A", ["Î"] = "I", ["Ș"] = "S", ["Ț"] = "T",
            
            // Rusça karakterler
            ["а"] = "a", ["б"] = "b", ["в"] = "v", ["г"] = "g", ["д"] = "d", ["е"] = "e", ["ё"] = "e", ["ж"] = "zh", ["з"] = "z", ["и"] = "i", ["й"] = "y", ["к"] = "k", ["л"] = "l", ["м"] = "m", ["н"] = "n", ["о"] = "o", ["п"] = "p", ["р"] = "r", ["с"] = "s", ["т"] = "t", ["у"] = "u", ["ф"] = "f", ["х"] = "h", ["ц"] = "ts", ["ч"] = "ch", ["ш"] = "sh", ["щ"] = "sch", ["ъ"] = "", ["ы"] = "y", ["ь"] = "", ["э"] = "e", ["ю"] = "yu", ["я"] = "ya",
            ["А"] = "A", ["Б"] = "B", ["В"] = "V", ["Г"] = "G", ["Д"] = "D", ["Е"] = "E", ["Ё"] = "E", ["Ж"] = "ZH", ["З"] = "Z", ["И"] = "I", ["Й"] = "Y", ["К"] = "K", ["Л"] = "L", ["М"] = "M", ["Н"] = "N", ["О"] = "O", ["П"] = "P", ["Р"] = "R", ["С"] = "S", ["Т"] = "T", ["У"] = "U", ["Ф"] = "F", ["Х"] = "H", ["Ц"] = "TS", ["Ч"] = "CH", ["Ш"] = "SH", ["Щ"] = "SCH", ["Ъ"] = "", ["Ы"] = "Y", ["Ь"] = "", ["Э"] = "E", ["Ю"] = "YU", ["Я"] = "YA",
            
            // Yunanca karakterler
            ["α"] = "a", ["β"] = "b", ["γ"] = "g", ["δ"] = "d", ["ε"] = "e", ["ζ"] = "z", ["η"] = "e", ["θ"] = "th", ["ι"] = "i", ["κ"] = "k", ["λ"] = "l", ["μ"] = "m", ["ν"] = "n", ["ξ"] = "x", ["ο"] = "o", ["π"] = "p", ["ρ"] = "r", ["σ"] = "s", ["τ"] = "t", ["υ"] = "u", ["φ"] = "f", ["χ"] = "ch", ["ψ"] = "ps", ["ω"] = "o",
            ["Α"] = "A", ["Β"] = "B", ["Γ"] = "G", ["Δ"] = "D", ["Ε"] = "E", ["Ζ"] = "Z", ["Η"] = "E", ["Θ"] = "TH", ["Ι"] = "I", ["Κ"] = "K", ["Λ"] = "L", ["Μ"] = "M", ["Ν"] = "N", ["Ξ"] = "X", ["Ο"] = "O", ["Π"] = "P", ["Ρ"] = "R", ["Σ"] = "S", ["Τ"] = "T", ["Υ"] = "U", ["Φ"] = "F", ["Χ"] = "CH", ["Ψ"] = "PS", ["Ω"] = "O",
            
            // Arapça karakterler
            ["ا"] = "a", ["ب"] = "b", ["ت"] = "t", ["ث"] = "th", ["ج"] = "j", ["ح"] = "h", ["خ"] = "kh", ["د"] = "d", ["ذ"] = "dh", ["ر"] = "r", ["ز"] = "z", ["س"] = "s", ["ش"] = "sh", ["ص"] = "s", ["ض"] = "d", ["ط"] = "t", ["ظ"] = "z", ["ع"] = "a", ["غ"] = "gh", ["ف"] = "f", ["ق"] = "q", ["ك"] = "k", ["ل"] = "l", ["م"] = "m", ["ن"] = "n", ["ه"] = "h", ["و"] = "w", ["ي"] = "y",
            
            // Çince karakterler (basit transliterasyon)
            ["一"] = "yi", ["二"] = "er", ["三"] = "san", ["四"] = "si", ["五"] = "wu", ["六"] = "liu", ["七"] = "qi", ["八"] = "ba", ["九"] = "jiu", ["十"] = "shi",
            
            // Japonca karakterler (hiragana)
            ["あ"] = "a", ["い"] = "i", ["う"] = "u", ["え"] = "e", ["お"] = "o", ["か"] = "ka", ["き"] = "ki", ["く"] = "ku", ["け"] = "ke", ["こ"] = "ko",
            ["さ"] = "sa", ["し"] = "shi", ["す"] = "su", ["せ"] = "se", ["そ"] = "so", ["た"] = "ta", ["ち"] = "chi", ["つ"] = "tsu", ["て"] = "te", ["と"] = "to",
            ["な"] = "na", ["に"] = "ni", ["ぬ"] = "nu", ["ね"] = "ne", ["の"] = "no", ["は"] = "ha", ["ひ"] = "hi", ["ふ"] = "fu", ["へ"] = "he", ["ほ"] = "ho",
            ["ま"] = "ma", ["み"] = "mi", ["む"] = "mu", ["め"] = "me", ["も"] = "mo", ["や"] = "ya", ["ゆ"] = "yu", ["よ"] = "yo", ["ら"] = "ra", ["り"] = "ri", ["る"] = "ru", ["れ"] = "re", ["ろ"] = "ro", ["わ"] = "wa", ["を"] = "wo", ["ん"] = "n",
            
            // Korece karakterler (hangul)
            ["ㄱ"] = "g", ["ㄴ"] = "n", ["ㄷ"] = "d", ["ㄹ"] = "r", ["ㅁ"] = "m", ["ㅂ"] = "b", ["ㅅ"] = "s", ["ㅇ"] = "ng", ["ㅈ"] = "j", ["ㅊ"] = "ch", ["ㅋ"] = "k", ["ㅌ"] = "t", ["ㅍ"] = "p", ["ㅎ"] = "h",
            ["ㅏ"] = "a", ["ㅓ"] = "eo", ["ㅗ"] = "o", ["ㅜ"] = "u", ["ㅡ"] = "eu", ["ㅣ"] = "i", ["ㅔ"] = "e", ["ㅐ"] = "ae", ["ㅚ"] = "oe", ["ㅟ"] = "wi", ["ㅢ"] = "ui", ["ㅘ"] = "wa", ["ㅝ"] = "wo", ["ㅙ"] = "wae", ["ㅞ"] = "we"
        };

        /// <summary>
        /// Dosya adını normalize et
        /// JavaScript'teki normalizeText fonksiyonunun C# versiyonu
        /// </summary>
        /// <param name="fileName">Normalize edilecek dosya adı</param>
        /// <returns>Normalize edilmiş dosya adı</returns>
        public static string NormalizeFileName(string fileName)
        {
            if (string.IsNullOrEmpty(fileName))
                return string.Empty;

            // Uzantıyı çıkar (.mp3, .m4a, .mp4, vb)
            var withoutExt = Regex.Replace(fileName, 
                @"\.(mp3|m4a|mp4|wav|flac|aac|wma|ogg|avi|mkv|mov|wmv|flv|webm)$", "", 
                RegexOptions.IgnoreCase);

            // Apostrof'u önce sil (I'm → Im, d'Amélie → dAmélie)
            var normalized = withoutExt.Replace("'", "");

            // ENHANCED_CHAR_MAP ile dönüştür
            foreach (var kvp in EnhancedCharMap)
            {
                normalized = normalized.Replace(kvp.Key, kvp.Value);
            }

            // Küçük harfe çevir ve sadece harfleri, rakamları ve boşlukları tut
            normalized = normalized.ToLowerInvariant();
            
            // Özel karakterleri boşlukla değiştir (regex kullanarak)
            normalized = Regex.Replace(normalized, @"[^a-z0-9\s]", " ");
            
            // Çoklu boşlukları tek boşluğa çevir
            normalized = Regex.Replace(normalized, @"\s+", " ");
            
            return normalized.Trim();
        }

        /// <summary>
        /// Metni normalize et (dosya adı olmayan genel metinler için)
        /// </summary>
        /// <param name="text">Normalize edilecek metin</param>
        /// <returns>Normalize edilmiş metin</returns>
        public static string NormalizeText(string text)
        {
            if (string.IsNullOrEmpty(text))
                return string.Empty;

            // Apostrof'u önce sil
            var normalized = text.Replace("'", "");

            // ENHANCED_CHAR_MAP ile dönüştür
            foreach (var kvp in EnhancedCharMap)
            {
                normalized = normalized.Replace(kvp.Key, kvp.Value);
            }

            // Küçük harfe çevir ve sadece harfleri, rakamları ve boşlukları tut
            normalized = normalized.ToLowerInvariant();
            
            // Özel karakterleri boşlukla değiştir
            normalized = Regex.Replace(normalized, @"[^a-z0-9\s]", " ");
            
            // Çoklu boşlukları tek boşluğa çevir
            normalized = Regex.Replace(normalized, @"\s+", " ");
            
            return normalized.Trim();
        }
    }
}
