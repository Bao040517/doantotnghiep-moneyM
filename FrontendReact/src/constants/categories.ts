export interface CategoryDefinition {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  iconName: string;
  emoji: string;
  color: string;
  groupType?: "NEEDS" | "WANTS" | "SAVINGS";
}

/**
 * Standard category color palette (vibrant, modern, accessible)
 */
export const CATEGORY_COLORS: Record<string, string> = {
  // Expense
  "Ăn uống": "#10B981",           // Emerald Green
  "Chi tiêu hàng ngày": "#F59E0B", // Amber
  "Quần áo": "#38BDF8",           // Sky Blue
  "Mỹ phẩm": "#EC4899",           // Pink
  "Phí giao lưu": "#8B5CF6",       // Violet
  "Y tế": "#EF4444",              // Rose / Red
  "Giáo dục": "#6366F1",          // Indigo
  "Tiền điện": "#EAB308",         // Yellow / Gold
  "Tiền nước": "#06B6D4",         // Cyan / Aqua Water
  "Đi lại": "#0EA5E9",            // Ocean Blue
  "Di chuyển": "#0EA5E9",         // Ocean Blue
  "Phí liên lạc": "#A855F7",       // Purple
  "Tiền nhà": "#F97316",          // Orange
  "Nhà cửa": "#F97316",           // Orange
  "Mua sắm": "#F43F5E",           // Rose
  "Giải trí": "#818CF8",          // Indigo Light
  "Lưu trú": "#14B8A6",           // Teal
  "Mục tiêu tiết kiệm": "#10B981", // Emerald

  // Income
  "Tiền lương": "#22C55E",        // Green
  "Lương": "#22C55E",
  "Thưởng": "#EAB308",            // Gold
  "Tiền thưởng": "#EAB308",
  "Đầu tư": "#3B82F6",            // Blue
  "Thu nhập phụ": "#F59E0B",      // Amber
  "Thu nhập khác": "#64748B",
  "Hoàn tiền tiết kiệm": "#06B6D4",
  "Hoàn tiền": "#06B6D4",

  // Transfer & Groups
  "Trả nợ nhóm": "#EF4444",
  "Nhận tiền nhóm": "#22C55E",
  "Đòi nợ": "#F97316",
  "Trả nợ": "#EF4444",
  "Chuyển khoản": "#6366F1",
  "Nạp tiền ví": "#3B82F6",
  "Khác": "#64748B",
};

/**
 * Standardized mapping from category name or icon slug to Emoji.
 * Used consistently across Budget, Advisor, AddTransaction, Group, and History.
 */
export const CATEGORY_ICONS: Record<string, string> = {
  // DB Icon Slugs
  "utensils": "🍽️",
  "shopping-bag": "🛍️",
  "shirt": "👕",
  "sparkles": "💄",
  "users": "🥂",
  "heart-pulse": "💊",
  "graduation-cap": "📚",
  "zap": "💡",
  "droplets": "🚿",
  "water": "🚿",
  "car": "🚗",
  "phone": "📱",
  "home": "🏠",
  "wallet": "💰",
  "gift": "🎁",
  "trending-up": "📈",
  "coins": "🪙",
  "target": "🎯",
  "book-open": "📚",
  "coffee": "☕",

  // Vietnamese Category Names - Expense
  "Ăn uống": "🍽️",
  "Chi tiêu hàng ngày": "🧴",
  "Quần áo": "👕",
  "Mỹ phẩm": "💄",
  "Phí giao lưu": "🥂",
  "Y tế": "💊",
  "Giáo dục": "📚",
  "Tiền điện": "💡",
  "Tiền nước": "🚿",
  "Đi lại": "🚗",
  "Di chuyển": "🚗",
  "Phí liên lạc": "📱",
  "Tiền nhà": "🏠",
  "Nhà cửa": "🏠",
  "Mua sắm": "🛍️",
  "Giải trí": "🎮",
  "Lưu trú": "🏨",
  "Mục tiêu tiết kiệm": "🎯",

  // Vietnamese Category Names - Income
  "Tiền lương": "💰",
  "Lương": "💰",
  "Thưởng": "🎁",
  "Tiền thưởng": "🎁",
  "Đầu tư": "📈",
  "Thu nhập phụ": "🪙",
  "Hoàn tiền tiết kiệm": "🏦",
  "Hoàn tiền": "🔄",
  "Thu nhập khác": "📥",
  "Tiền lãi": "🏦",

  // Transfers & System
  "Trả nợ nhóm": "💸",
  "Nhận tiền nhóm": "⬅️",
  "Xóa nợ nhóm": "✅",
  "Cho nhóm mượn": "➡️",
  "Đòi nợ": "💸",
  "Trả nợ": "💳",
  "Chuyển khoản": "🔄",
  "Nạp tiền ví": "💳",
  "Khác": "📦",
};

/**
 * Standard Expense Category Options for pickers and UI tabs
 */
export const STANDARD_EXPENSE_CATEGORIES = [
  { name: "Ăn uống", iconName: "utensils", emoji: "🍽️" },
  { name: "Chi tiêu hàng ngày", iconName: "shopping-bag", emoji: "🧴" },
  { name: "Quần áo", iconName: "shirt", emoji: "👕" },
  { name: "Mỹ phẩm", iconName: "sparkles", emoji: "💄" },
  { name: "Phí giao lưu", iconName: "users", emoji: "🥂" },
  { name: "Y tế", iconName: "heart-pulse", emoji: "💊" },
  { name: "Giáo dục", iconName: "graduation-cap", emoji: "📚" },
  { name: "Tiền điện", iconName: "zap", emoji: "💡" },
  { name: "Tiền nước", iconName: "droplets", emoji: "🚿" },
  { name: "Đi lại", iconName: "car", emoji: "🚗" },
  { name: "Phí liên lạc", iconName: "phone", emoji: "📱" },
  { name: "Tiền nhà", iconName: "home", emoji: "🏠" },
  { name: "Mua sắm", iconName: "shopping-bag", emoji: "🛍️" },
  { name: "Giải trí", iconName: "game", emoji: "🎮" },
  { name: "Lưu trú", iconName: "hotel", emoji: "🏨" },
  { name: "Mục tiêu tiết kiệm", iconName: "target", emoji: "🎯" },
];

/**
 * Standard Income Category Options
 */
export const STANDARD_INCOME_CATEGORIES = [
  { name: "Tiền lương", iconName: "wallet", emoji: "💰" },
  { name: "Thưởng", iconName: "gift", emoji: "🎁" },
  { name: "Đầu tư", iconName: "trending-up", emoji: "📈" },
  { name: "Thu nhập phụ", iconName: "coins", emoji: "🪙" },
  { name: "Hoàn tiền", iconName: "rotate-ccw", emoji: "🔄" },
  { name: "Thu nhập khác", iconName: "inbox", emoji: "📥" },
];

/**
 * Get category emoji with intelligent fallback
 */
export function getCategoryEmoji(icon?: string, name?: string): string {
  if (name && CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  if (icon && CATEGORY_ICONS[icon]) return CATEGORY_ICONS[icon];
  if (icon && icon.toLowerCase() in CATEGORY_ICONS) return CATEGORY_ICONS[icon.toLowerCase()];
  // If icon is already an emoji character
  if (icon && icon.length <= 4 && !/^[a-zA-Z0-9_-]+$/.test(icon)) return icon;
  return "📦";
}

/**
 * Get category color with fallback
 */
export function getCategoryColor(name?: string, defaultIndex = 0): string {
  if (name && CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const fallbackColors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#F97316"];
  return fallbackColors[defaultIndex % fallbackColors.length];
}
