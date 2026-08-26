/**
 * ⚡ ZERO-LATENCY BANK NOTIFICATION PARSER
 * Bóc tách nội dung thông báo biến động số dư ngân hàng và tự động phân loại danh mục trong < 1ms (Offline, No AI).
 */

export interface ParsedBankNotification {
  isValid: boolean;
  amount: number;
  type: "EXPENSE" | "INCOME";
  note: string;
  bankName: string;
  accountSnippet?: string;
  suggestedCategoryName: string;
  confidence: "HIGH" | "MEDIUM" | "DEFAULT";
  rawText: string;
}

/**
 * Hàm chuẩn hoá chuỗi tiếng Việt (loại bỏ dấu và chuyển chữ thường) để khớp từ khóa chính xác 100%
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Danh sách ngân hàng phổ biến tại Việt Nam để nhận diện nguồn giao dịch
 */
const BANK_IDENTIFIERS: Array<{ name: string; keywords: string[] }> = [
  { name: "MBBank", keywords: ["mbbank", "mb bank", "ngan hang quan doi", "mb"] },
  { name: "Techcombank", keywords: ["techcombank", "tcb", "ngan hang ky thuong"] },
  { name: "Vietcombank", keywords: ["vietcombank", "vcb", "ngan hang ngoai thuong"] },
  { name: "BIDV", keywords: ["bidv", "dau tu va phat trien"] },
  { name: "VPBank", keywords: ["vpbank", "vpb", "viet nam thinh vuong"] },
  { name: "TPBank", keywords: ["tpbank", "tpb", "tien phong"] },
  { name: "MSB", keywords: ["msb", "hang hai", "maritime bank"] },
  { name: "ACB", keywords: ["acb", "a chau"] },
  { name: "Sacombank", keywords: ["sacombank", "stb", "sai gon thuong tin"] },
  { name: "VietinBank", keywords: ["vietinbank", "ctg", "cong thuong"] },
  { name: "HDBank", keywords: ["hdbank", "hdb", "phat trien tphcm"] },
  { name: "Agribank", keywords: ["agribank", "nong nghiep"] },
  { name: "VIB", keywords: ["vib", "quoc te"] },
  { name: "OCB", keywords: ["ocb", "phuong dong"] },
  { name: "MoMo", keywords: ["momo", "vi momo"] },
  { name: "ZaloPay", keywords: ["zalopay", "vi zalopay"] },
  { name: "ViettelMoney", keywords: ["viettel money", "viettelpay", "viettel"] }
];

/**
 * Bảng từ khóa phân loại danh mục (0ms Dictionary Matcher)
 */
const CATEGORY_RULES: Array<{
  category: string;
  type: "EXPENSE" | "INCOME";
  keywords: string[];
}> = [
  // ─── CHI TIÊU THIẾT YẾU (NEEDS & BILLS) ───
  {
    category: "Tiền nhà",
    type: "EXPENSE",
    keywords: [
      "tien nha", "phong tro", "tien tro", "thue phong", "thue nha", "tien thue nha",
      "chu nha", "can ho", "chung cu", "phi quan ly", "tro hoang cau", "tien phong"
    ]
  },
  {
    category: "Tiền điện",
    type: "EXPENSE",
    keywords: [
      "evn", "tien dien", "dien luc", "dien sinh hoat", "hoa don dien", "dien evn", "evnhcmc", "evnhanoi"
    ]
  },
  {
    category: "Tiền nước",
    type: "EXPENSE",
    keywords: [
      "sawaco", "tien nuoc", "cap nuoc", "nuoc sinh hoat", "biwase", "hawaco", "hoa don nuoc"
    ]
  },
  {
    category: "Phí liên lạc",
    type: "EXPENSE",
    keywords: [
      "viettel", "vinaphone", "mobifone", "4g", "5g", "internet", "fpt", "vnpt",
      "nap tien dt", "cuoc dt", "cuoc internet", "wifi", "goi cuoc"
    ]
  },
  {
    category: "Y tế",
    type: "EXPENSE",
    keywords: [
      "pharmacity", "long chau", "an khang", "nha thuoc", "thuoc", "kham benh",
      "benh vien", "careplus", "bac si", "xet nghiem", "nha khoa", "rang ham mat", "thuoc cam"
    ]
  },
  {
    category: "Giáo dục",
    type: "EXPENSE",
    keywords: [
      "hoc phi", "khoa hoc", "udemy", "coursera", "fpt", "aptech", "dai hoc",
      "sach", "tiki sach", "fahasa", "nha sach", "lop hoc", "tieng anh", "ielts"
    ]
  },
  {
    category: "Đi lại",
    type: "EXPENSE",
    keywords: [
      "grab", "be bike", "be car", "be", "gojek", "xanh sm", "taxi", "mai linh",
      "vinasun", "do xang", "xang a95", "xang e5", "petrolimex", "pvoil", "gui xe",
      "ve xe", "ve metro", "ve may bay", "vietjet", "vietnam airlines", "bamboo", "phi cau duong", "epass", "vetc"
    ]
  },

  // ─── CHI TIÊU HÀNG NGÀY & ĂN UỐNG ───
  {
    category: "Ăn uống",
    type: "EXPENSE",
    keywords: [
      "pho", "com tam", "bun", "banh mi", "com trua", "an trua", "an toi", "an sang",
      "cafe", "ca phe", "highlands", "starbucks", "phuc long", "the coffee house",
      "kfc", "lotteria", "jollibee", "mcdonald", "haidilao", "gogi", "kichi",
      "king bbq", "lau", "nuong", "tra sua", "mixue", "topping tea", "chu long",
      "quan an", "nha hang", "shopeefood", "grabfood", "befood", "baemin", "food"
    ]
  },
  {
    category: "Chi tiêu hàng ngày",
    type: "EXPENSE",
    keywords: [
      "winmart", "bach hoa xanh", "coopmart", "coop", "big c", "tops market", "lotte mart",
      "mega market", "sieu thi", "tap hoa", "cho", "rau", "thit", "trung", "nuoc rua chen",
      "dau goi", "giay ve sinh", "mua do", "nhu yeu pham"
    ]
  },
  {
    category: "Quần áo",
    type: "EXPENSE",
    keywords: [
      "uniqlo", "zara", "h&m", "hm", "yame", "coolmate", "canifa", "routine",
      "ao thun", "quan jean", "ao so mi", "vay", "dam", "giay", "sneaker",
      "nike", "adidas", "shopee mall quan ao", "shop quan ao"
    ]
  },
  {
    category: "Mỹ phẩm",
    type: "EXPENSE",
    keywords: [
      "hasaki", "watsons", "guardian", "beauty box", "the face shop", "innisfree",
      "my pham", "son moi", "kem chong nang", "sua rua mat", "toner", "serum", "skincare"
    ]
  },
  {
    category: "Phí giao lưu",
    type: "EXPENSE",
    keywords: [
      "karaoke", "bida", "billiard", "cau long", "da bong", "san bong", "tennis",
      "cgv", "lotte cinema", "bhd", "galaxy cinema", "rap phim", "xem phim",
      "sinh nhat", "tiec", "nhau", "bia", "bar", "pub", "lien hoan", "du lich", "homestay", "hotel"
    ]
  },

  // ─── THU NHẬP (INCOME) ───
  {
    category: "Tiền lương",
    type: "INCOME",
    keywords: [
      "luong", "salary", "tien luong", "chuyen luong", "tra luong", "tam ung luong",
      "payroll", "thu nhap thang", "cty tra luong", "cong ty ck luong"
    ]
  },
  {
    category: "Thưởng",
    type: "INCOME",
    keywords: [
      "thuong", "bonus", "tien thuong", "thuong tet", "thuong quy", "thuong du an", "khen thuong"
    ]
  },
  {
    category: "Đầu tư",
    type: "INCOME",
    keywords: [
      "lai", "tien lai", "co tuc", "chung khoan", "vps", "ssi", "tcbs", "vndirect",
      "crypto", "binance", "lai tiet kiem", "rut lai"
    ]
  },
  {
    category: "Thu nhập phụ",
    type: "INCOME",
    keywords: [
      "freelance", "thu nhap phu", "tien cong", "ban hang", "thu no", "khach ck",
      "chuyen tien", "thanh toan tien"
    ]
  }
];

/**
 * Hàm phân tích nội dung chuỗi tin nhắn thông báo
 */
export function parseBankNotificationText(rawText: string): ParsedBankNotification {
  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    return createEmptyResult(rawText);
  }

  const cleanText = rawText.trim();
  const normalized = removeVietnameseAccents(cleanText);

  // 1. Nhận diện ngân hàng
  let detectedBank = "Ngân hàng";
  for (const b of BANK_IDENTIFIERS) {
    if (b.keywords.some((k) => normalized.includes(k))) {
      detectedBank = b.name;
      break;
    }
  }

  // 2. Nhận diện số tài khoản / thẻ nếu có (ví dụ: TK 6617052004... hoặc The ...1111)
  let accountSnippet: string | undefined;
  const accMatch = cleanText.match(/(?:TK|Tai khoan|Account|The|Card)\s*[:.]?\s*([0-9xX*]{4,16})/i);
  if (accMatch && accMatch[1]) {
    accountSnippet = accMatch[1];
  }

  // 3. Nhận diện Loại Giao Dịch (EXPENSE hay INCOME) & Số Tiền
  let isExpense = true;
  let rawAmountStr = "";

  // Pattern A: Dấu trừ rõ ràng (GD: -50,000VND hoặc So tien: -100,000 VND hoặc -50.000d)
  const minusMatch = cleanText.match(/(?:[-−]\s*|giam\s*|tru\s*)([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\s*(?:VND|vnd|VNĐ|vnđ|d|đ|dong|Dong)?/);
  
  // Pattern B: Dấu cộng rõ ràng (+50,000VND hoặc So tien: +100,000 VND)
  const plusMatch = cleanText.match(/(?:[+＋]\s*|tang\s*|cong\s*)([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\s*(?:VND|vnd|VNĐ|vnđ|d|đ|dong|Dong)?/);

  // Pattern C: Cú pháp "So tien: 50,000 VND"
  const generalAmountMatch = cleanText.match(/(?:so tien|amount|st|ps|gd|gia tri)\s*[:.]?\s*([-+]?\s*[0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\s*(?:VND|vnd|VNĐ|vnđ|d|đ)?/i);

  if (minusMatch && minusMatch[1]) {
    isExpense = true;
    rawAmountStr = minusMatch[1];
  } else if (plusMatch && plusMatch[1]) {
    isExpense = false;
    rawAmountStr = plusMatch[1];
  } else if (generalAmountMatch && generalAmountMatch[1]) {
    const rawVal = generalAmountMatch[1].trim();
    if (rawVal.startsWith("+")) {
      isExpense = false;
      rawAmountStr = rawVal.replace("+", "").trim();
    } else {
      isExpense = true;
      rawAmountStr = rawVal.replace("-", "").trim();
    }
  } else {
    // Pattern D: Tìm bất kỳ số tiền nào có định dạng tiền tệ (vd: 350.000 VND hoặc 350,000đ)
    const anyMoneyMatch = cleanText.match(/([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:VND|vnd|VNĐ|vnđ|d|đ)/i);
    if (anyMoneyMatch && anyMoneyMatch[1]) {
      rawAmountStr = anyMoneyMatch[1];
      // Đoán chiều biến động từ ngữ cảnh
      if (normalized.includes("nhan tien") || normalized.includes("nap tien") || normalized.includes("chuyen toi") || normalized.includes("cong vao")) {
        isExpense = false;
      } else {
        isExpense = true;
      }
    }
  }

  // Parse số tiền thành number hợp lệ
  let amount = 0;
  if (rawAmountStr) {
    // Chuẩn hóa dấu chấm/phẩy (ở VN: 100.000 hoặc 100,000 -> 100000)
    const cleanNum = rawAmountStr.replace(/[.,\s]/g, "");
    amount = parseInt(cleanNum, 10) || 0;
  }

  // Nếu số tiền không hợp lệ hoặc <= 0
  if (amount <= 0) {
    return createEmptyResult(rawText);
  }

  // 4. Bóc tách Nội dung chuyển khoản / Ghi chú (Note)
  let note = "";
  const noteMatch = cleanText.match(/(?:ND|Noi dung|Mo ta|Content|Ref|Ly do|GD)\s*[:.]\s*([^|\n;]+)/i);
  if (noteMatch && noteMatch[1]) {
    note = noteMatch[1].trim();
    // Bỏ mã giao dịch phía sau nếu có
    note = note.replace(/\b(MB|VCB|TCB|VNPAY|FT|NAPAS)[0-9A-Za-z]+\b/g, "").trim();
  }

  if (!note || note.length < 2) {
    // Lấy một đoạn tóm tắt từ tin nhắn
    note = cleanText.length > 50 ? cleanText.substring(0, 50) + "..." : cleanText;
  }

  // 5. Khớp từ khóa tìm danh mục phù hợp (0ms Dictionary Match)
  const targetType = isExpense ? "EXPENSE" : "INCOME";
  let suggestedCategory = isExpense ? "Chi tiêu hàng ngày" : "Thu nhập phụ";
  let confidence: "HIGH" | "MEDIUM" | "DEFAULT" = "DEFAULT";

  // Ưu tiên khớp danh mục cùng type
  for (const rule of CATEGORY_RULES) {
    if (rule.type === targetType) {
      for (const kw of rule.keywords) {
        if (normalized.includes(kw)) {
          suggestedCategory = rule.category;
          confidence = "HIGH";
          break;
        }
      }
      if (confidence === "HIGH") break;
    }
  }

  // Nếu chưa tìm thấy ở cùng type, quét toàn bộ
  if (confidence === "DEFAULT") {
    for (const rule of CATEGORY_RULES) {
      for (const kw of rule.keywords) {
        if (normalized.includes(kw)) {
          suggestedCategory = rule.category;
          confidence = "MEDIUM";
          break;
        }
      }
      if (confidence !== "DEFAULT") break;
    }
  }

  return {
    isValid: true,
    amount,
    type: targetType,
    note: note || (isExpense ? "Chi tiêu ngân hàng" : "Thu nhập ngân hàng"),
    bankName: detectedBank,
    accountSnippet,
    suggestedCategoryName: suggestedCategory,
    confidence,
    rawText: cleanText
  };
}

function createEmptyResult(rawText: string): ParsedBankNotification {
  return {
    isValid: false,
    amount: 0,
    type: "EXPENSE",
    note: "",
    bankName: "Ngân hàng",
    suggestedCategoryName: "Chi tiêu hàng ngày",
    confidence: "DEFAULT",
    rawText: rawText || ""
  };
}
