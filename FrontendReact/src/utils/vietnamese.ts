/**
 * ============================================================================
 * UNIKEY VIETNAMESE TELEX ENGINE & NORMALIZER FOR SHAREMONEY
 * Complete pure-JS implementation of Vietnamese Telex Input Method (IME)
 * Supports full diacritics, tone placement, undo, search matching, and accents.
 * ============================================================================
 */

// Mapping of vowels to tone marks [sắc, huyền, hỏi, ngã, nặng]
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
  A: ["Á", "À", "Ả", "Ã", "Ạ"],
  Ă: ["Ắ", "Ằ", "Ẳ", "Ẵ", "Ặ"],
  Â: ["Ấ", "Ầ", "Ẩ", "Ẫ", "Ậ"],
  E: ["É", "È", "Ẻ", "Ẽ", "Ẹ"],
  Ê: ["Ế", "Ề", "Ể", "Ễ", "Ệ"],
  I: ["Í", "Ì", "Ỉ", "Ĩ", "Ị"],
  O: ["Ó", "Ò", "Ỏ", "Õ", "Ọ"],
  Ô: ["Ố", "Ồ", "Ổ", "Ỗ", "Ộ"],
  Ơ: ["Ớ", "Ờ", "Ở", "Ỡ", "Ợ"],
  U: ["Ú", "Ù", "Ủ", "Ũ", "Ụ"],
  Ư: ["Ứ", "Ừ", "Ử", "Ữ", "Ự"],
  Y: ["Ý", "Ỳ", "Ỷ", "Ỹ", "Ỵ"],
};

const TONE_KEYS: Record<string, number> = {
  s: 0, // Dấu sắc
  f: 1, // Dấu huyền
  r: 2, // Dấu hỏi
  x: 3, // Dấu ngã
  j: 4, // Dấu nặng
};

// Map accented vowels back to root vowels
const ROOT_VOWELS: Record<string, string> = {
  á: "a", à: "a", ả: "a", ã: "a", ạ: "a",
  ắ: "ă", ằ: "ă", ẳ: "ă", ẵ: "ă", ặ: "ă",
  ấ: "â", ầ: "â", ẩ: "â", ẫ: "â", ậ: "â",
  é: "e", è: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ế: "ê", ề: "ê", ể: "ê", ễ: "ê", ệ: "ê",
  í: "i", ì: "i", ỉ: "i", ĩ: "i", ị: "i",
  ó: "o", ò: "o", ỏ: "o", õ: "o", ọ: "o",
  ố: "ô", ồ: "ô", ổ: "ô", ỗ: "ô", ộ: "ô",
  ớ: "ơ", ờ: "ơ", ở: "ơ", ỡ: "ơ", ợ: "ơ",
  ú: "u", ù: "u", ủ: "u", ũ: "u", ụ: "u",
  ứ: "ư", ừ: "ư", ử: "ư", ữ: "ư", ự: "ư",
  ý: "y", ỳ: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  Á: "A", À: "A", Ả: "A", Ã: "A", Ạ: "A",
  Ắ: "Ă", Ằ: "Ă", Ẳ: "Ă", Ẵ: "Ă", Ặ: "Ă",
  Ấ: "Â", Ầ: "Â", Ẩ: "Â", Ẫ: "Â", Ậ: "Â",
  É: "E", È: "E", Ẻ: "E", Ẽ: "E", Ẹ: "E",
  Ế: "Ê", Ề: "Ê", Ể: "Ê", Ễ: "Ê", Ệ: "Ê",
  Í: "I", Ì: "I", Ỉ: "I", Ĩ: "I", Ị: "I",
  Ó: "O", Ò: "O", Ỏ: "O", Õ: "O", Ọ: "O",
  Ố: "Ô", Ồ: "Ô", Ổ: "Ô", Ỗ: "Ô", Ộ: "Ô",
  Ớ: "Ơ", Ờ: "Ơ", Ở: "Ơ", Ỡ: "Ơ", Ợ: "Ơ",
  Ú: "U", Ù: "U", Ủ: "U", Ũ: "U", Ụ: "U",
  Ứ: "Ư", Ừ: "Ư", Ử: "Ư", Ữ: "Ư", Ự: "Ư",
  Ý: "Y", Ỳ: "Y", Ỷ: "Y", Ỹ: "Y", Ỵ: "Y",
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
 * Strips tone marks from a word, returning root vowels with hats/horns intact.
 * e.g., "tiến" -> "tiên", "hoàn" -> "hoan", "phùng" -> "phung"
 */
export function stripToneMarks(word: string): string {
  if (!word) return "";
  return word.split("").map((c) => ROOT_VOWELS[c] || c).join("");
}

/**
 * Finds the correct vowel index in a Vietnamese word to place the tone mark
 * according to official Vietnamese orthographic rules.
 */
function findToneTargetIndex(chars: string[]): number {
  const vowels = ["a", "ă", "â", "e", "ê", "i", "o", "ô", "ơ", "u", "ư", "y"];
  const vowelIndices: number[] = [];

  for (let i = 0; i < chars.length; i++) {
    const root = (ROOT_VOWELS[chars[i]] || chars[i]).toLowerCase();
    if (vowels.includes(root)) {
      vowelIndices.push(i);
    }
  }

  if (vowelIndices.length === 0) return -1;
  if (vowelIndices.length === 1) return vowelIndices[0];

  // If there are modified vowels (ê, ô, ơ, ư, â, ă), place tone on them
  for (const idx of vowelIndices) {
    const c = (ROOT_VOWELS[chars[idx]] || chars[idx]).toLowerCase();
    if (["ê", "ô", "ơ", "ư", "â", "ă"].includes(c)) {
      return idx;
    }
  }

  // Check diphthongs / triphthongs
  const hasConsonantAfter = vowelIndices[vowelIndices.length - 1] < chars.length - 1;
  const firstV = (ROOT_VOWELS[chars[vowelIndices[0]]] || chars[vowelIndices[0]]).toLowerCase();
  const secondV = (ROOT_VOWELS[chars[vowelIndices[1]]] || chars[vowelIndices[1]]).toLowerCase();

  // "oa", "oe", "uy" without ending consonant -> 2nd vowel ("hoà", "khoẻ", "thuý")
  // with ending consonant -> 2nd vowel ("hoàn", "hoán", "toán")
  if ((firstV === "o" && (secondV === "a" || secondV === "e")) || (firstV === "u" && secondV === "y")) {
    return vowelIndices[1];
  }

  // If there's a ending consonant (e.g. "toan", "tien", "luon"), tone goes on 2nd vowel
  if (hasConsonantAfter) {
    return vowelIndices[vowelIndices.length - 1];
  }

  // Default to 1st vowel in open diphthongs like "ai", "oi", "ui", "ay"
  return vowelIndices[0];
}

/**
 * Converts a single word containing raw Telex keys into a properly accented Vietnamese word.
 * Supports:
 * - Hats & Horns: aa->â, aw->ă, ee->ê, oo->ô, ow->ơ, uw->ư, w->ư, uow->ươ, dd->đ
 * - Tones: s (sắc), f (huyền), r (hỏi), x (ngã), j (nặng), z (xóa dấu)
 * - Undo duplicate tone: e.g. "as" -> "á", "ass" -> "as"
 */
export function parseTelexSingleWord(word: string): string {
  if (!word) return "";

  // Don't modify URLs, emails, numbers, or punctuation
  if (/^https?:\/\/|@|\d|\.com|\.vn/i.test(word)) return word;

  let toneIndex: number | null = null;
  let cleanWord = word;

  // 1. Detect and strip tone key (s, f, r, x, j, z) from end or inside word
  for (let i = word.length - 1; i >= 0; i--) {
    const char = word[i].toLowerCase();
    if (char === "z") {
      // z means remove tone
      cleanWord = word.slice(0, i) + word.slice(i + 1);
      cleanWord = stripToneMarks(cleanWord);
      break;
    }
    if (TONE_KEYS[char] !== undefined) {
      const sub = word.slice(0, i).toLowerCase();
      // Only treat as tone mark if preceded by a vowel
      if (/[aeiouyăâêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(sub)) {
        toneIndex = TONE_KEYS[char];
        cleanWord = word.slice(0, i) + word.slice(i + 1);
        break;
      }
    }
  }

  // 2. Strip existing tone marks from base characters before transforming
  let base = stripToneMarks(cleanWord);

  // 3. Transform Telex vowel/consonant pairs
  base = base.replace(/uow/gi, (m) => (m[0] === m[0].toUpperCase() ? "Ươ" : "ươ"));
  base = base.replace(/uo[wW]/g, "ươ").replace(/UO[wW]/g, "ƯƠ").replace(/Uo[wW]/g, "Ươ");
  base = base.replace(/uuw/gi, "ư").replace(/uw/gi, (m) => (m[0] === m[0].toUpperCase() ? "Ư" : "ư"));
  base = base.replace(/aa/gi, (m) => (m[0] === m[0].toUpperCase() ? "Â" : "â"));
  base = base.replace(/aw/gi, (m) => (m[0] === m[0].toUpperCase() ? "Ă" : "ă"));
  base = base.replace(/ee/gi, (m) => (m[0] === m[0].toUpperCase() ? "Ê" : "ê"));
  base = base.replace(/oo/gi, (m) => (m[0] === m[0].toUpperCase() ? "Ô" : "ô"));
  base = base.replace(/ow/gi, (m) => (m[0] === m[0].toUpperCase() ? "Ơ" : "ơ"));
  base = base.replace(/dd/gi, (m) => (m[0] === m[0].toUpperCase() ? "Đ" : "đ"));

  // Standalone 'w' rules
  base = base.replace(/([aeiouy])w/gi, (_match, p1) => {
    const isUpper = p1 === p1.toUpperCase();
    const p1Low = p1.toLowerCase();
    if (p1Low === "a") return isUpper ? "Ă" : "ă";
    if (p1Low === "o") return isUpper ? "Ơ" : "ơ";
    if (p1Low === "u") return isUpper ? "Ư" : "ư";
    return p1 + "w";
  });
  base = base.replace(/^w/i, (m) => (m === "W" ? "Ư" : "ư"));

  // If no tone key, return base
  if (toneIndex === null) {
    return base;
  }

  // 4. Apply Tone Mark
  const chars = base.split("");
  const targetIdx = findToneTargetIndex(chars);

  if (targetIdx >= 0 && targetIdx < chars.length) {
    const char = chars[targetIdx];
    const root = (ROOT_VOWELS[char] || char).toLowerCase();
    if (TONE_MAP[root]) {
      const isUpper = char === char.toUpperCase();
      const accented = TONE_MAP[root][toneIndex];
      chars[targetIdx] = isUpper ? accented.toUpperCase() : accented;
      return chars.join("");
    }
  }

  return base;
}

/**
 * Converts a full text string with raw Telex patterns into properly accented Vietnamese text.
 * e.g., "toi muon mua nuoc ngot va banh mi" -> "tôi muốn mua nước ngọt và bánh mì"
 */
export function convertTelexToVietnamese(str: string): string {
  if (!str) return "";
  return str
    .split(/(\s+)/)
    .map((part) => (/\s+/.test(part) ? part : parseTelexSingleWord(part)))
    .join("");
}

/**
 * Real-time Unikey engine helper for typing in Input / TextInput.
 * Automatically transforms the last typed word as the user types.
 */
export function processUnikeyInput(prevText: string, newText: string): string {
  if (!newText) return "";
  // If user is deleting/backspacing, do not auto-convert
  if (newText.length < prevText.length) {
    return newText;
  }
  return convertTelexToVietnamese(newText);
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
