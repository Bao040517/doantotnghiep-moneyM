/**
 * Comprehensive Vietnamese Telex & Tone Mark Engine & Normalizer
 */

const TONE_MAP: Record<string, [string, string, string, string, string]> = {
  a: ["á", "à", "ả", "ã", "ạ"],
  ă: ["ắ", "ằ", "ẳ", "ẵ", "ặ"],
  â: ["ấ", "ầ", "ẩ", "ẫ", "ậ"],
  e: ["é", "è", "ẻ", "ẽ", "ẹ"],
  ê: ["ế", "ề", "ể", "ễ", "ệ"],
  i: ["í", "ì", "ỉ", "ĩ", "ị"],
  o: ["ó", "ò", "ỏ", "õ", "ọ"],
  ô: ["ố", "ồ", "ổ", "ỗ", "ộ"],
  ơ: ["ớ", "ờ", "ở", "ỡ", "ợ"],
  u: ["ú", "ù", "ủ", "ũ", "ụ"],
  ư: ["ứ", "ừ", "ử", "ữ", "ự"],
  y: ["ý", "ỳ", "ỷ", "ỹ", "ỵ"],
};

const TONE_KEYS: Record<string, number> = {
  s: 0, // sắc
  f: 1, // huyền
  r: 2, // hỏi
  x: 3, // ngã
  j: 4, // nặng
};

/**
 * Normalizes a Vietnamese string by removing all accents, tone marks, and diacritics.
 * e.g., "Ăn uống Haidilao" -> "an uong haidilao"
 * e.g., "Phở Thìn Hà Nội" -> "pho thin ha noi"
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/**
 * Converts a single word containing raw Telex keys into a properly accented Vietnamese word.
 * e.g., "hoanf" -> "hoàn", "nguyenx" -> "nguyễn", "tiens" -> "tiến", "luongj" -> "lượng"
 */
export function parseTelexSingleWord(word: string): string {
  if (!word) return "";

  let toneIndex: number | null = null;
  let cleanWord = word;

  // Find last occurring tone key in word (s, f, r, x, j)
  for (let i = word.length - 1; i >= 0; i--) {
    const char = word[i].toLowerCase();
    if (TONE_KEYS[char] !== undefined) {
      // Ensure it's acting as a tone mark (must have a vowel before it)
      const sub = word.slice(0, i).toLowerCase();
      if (/[aeiouyăâêôơư]/i.test(sub)) {
        toneIndex = TONE_KEYS[char];
        cleanWord = word.slice(0, i) + word.slice(i + 1);
        break;
      }
    }
  }

  // 1. Transform letter combinations
  let base = cleanWord;
  base = base.replace(/uuw/gi, "ư").replace(/uw/gi, "ư");
  base = base.replace(/aa/gi, "â");
  base = base.replace(/aw/gi, "ă");
  base = base.replace(/ee/gi, "ê");
  base = base.replace(/oo/gi, "ô");
  base = base.replace(/ow/gi, "ơ");
  base = base.replace(/dd/gi, "đ").replace(/DD/gi, "Đ");

  // Handle 'w' attached to vowels
  if (base.toLowerCase().includes("uo")) {
    base = base.replace(/uo/gi, "ươ");
  }

  // If no tone key was found, return base word
  if (toneIndex === null) {
    return base;
  }

  // 2. Apply tone mark to target vowel
  const vowels = ["a", "ă", "â", "e", "ê", "i", "o", "ô", "ơ", "u", "ư", "y"];
  const chars = base.split("");

  const vowelIndices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i].toLowerCase();
    if (vowels.includes(c)) {
      vowelIndices.push(i);
    }
  }

  if (vowelIndices.length === 0) {
    return word;
  }

  // Default target vowel is last vowel
  let targetIdx = vowelIndices[vowelIndices.length - 1];

  // Prioritize modified vowels (ê, ô, ơ, ư, â, ă)
  for (const idx of vowelIndices) {
    const c = chars[idx].toLowerCase();
    if (["ê", "ô", "ơ", "ư", "â", "ă"].includes(c)) {
      targetIdx = idx;
      break;
    }
  }

  // Handle special diphthongs ("oa", "oe", "uy") where tone goes on 2nd vowel
  if (vowelIndices.length >= 2) {
    const firstV = chars[vowelIndices[0]].toLowerCase();
    const secondV = chars[vowelIndices[1]].toLowerCase();
    if ((firstV === "o" && (secondV === "a" || secondV === "e")) || (firstV === "u" && secondV === "y")) {
      targetIdx = vowelIndices[1];
    }
  }

  const targetChar = chars[targetIdx].toLowerCase();
  if (TONE_MAP[targetChar]) {
    const accentedChar = TONE_MAP[targetChar][toneIndex];
    const isUpper = chars[targetIdx] === chars[targetIdx].toUpperCase();
    chars[targetIdx] = isUpper ? accentedChar.toUpperCase() : accentedChar;
    return chars.join("");
  }

  return word;
}

/**
 * Converts a full text string with raw Telex patterns into properly accented Vietnamese text.
 */
export function convertTelexToVietnamese(str: string): string {
  if (!str) return "";
  return str
    .split(/(\s+)/)
    .map((part) => (/\s+/.test(part) ? part : parseTelexSingleWord(part)))
    .join("");
}

/**
 * Robust accent-insensitive & Telex-friendly search matcher for Vietnamese.
 */
export function matchVietnamese(text: string | null | undefined, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  const rawText = text.toLowerCase();
  const rawQuery = query.toLowerCase().trim();

  // 1. Direct lowercase string match
  if (rawText.includes(rawQuery)) return true;

  // 2. Accent-free match (e.g. "hoanf" or "hoan" matches "Hoàn")
  const normText = removeVietnameseAccents(text);
  const normQuery = removeVietnameseAccents(query);
  if (normText.includes(normQuery)) return true;

  // 3. Telex converted match (e.g. "hoanf" -> "hoàn" matches "Hoàn")
  const telexConvertedQuery = convertTelexToVietnamese(rawQuery);
  const normTelexQuery = removeVietnameseAccents(telexConvertedQuery);
  if (normText.includes(normTelexQuery) || rawText.includes(telexConvertedQuery)) return true;

  return false;
}
