/**
 * 🎨 SEMANTIC THEME COLOR TOKENS
 * Bộ màu ngữ nghĩa cho Light Mode và Dark Mode.
 * Các màu brand (indigo, emerald, rose, amber) giữ nguyên vì hoạt động tốt trên cả 2 nền.
 */

export interface ThemeColors {
  // ─── Layout & Surface ───
  background: string;
  surface: string;
  card: string;
  cardElevated: string;
  border: string;
  borderLight: string;
  divider: string;

  // ─── Text ───
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // ─── Header / Hero ───
  headerBg: string;
  headerText: string;
  headerSubtext: string;

  // ─── Interactive ───
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  chipBg: string;
  chipBgActive: string;
  chipText: string;

  // ─── Status Bar ───
  statusBarStyle: "light" | "dark";

  // ─── Skeleton Shimmer ───
  skeletonBase: string;
  skeletonHighlight: string;

  // ─── Misc ───
  overlay: string;
  shadow: string;
  tabBarBg: string;
  tabBarBorder: string;
  modalBg: string;
}

export const lightColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  divider: "#E2E8F0",

  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  headerBg: "#0F172A",
  headerText: "#FFFFFF",
  headerSubtext: "rgba(255,255,255,0.7)",

  inputBg: "#F8FAFC",
  inputBorder: "#CBD5E1",
  inputText: "#1E293B",
  inputPlaceholder: "#94A3B8",
  chipBg: "#F1F5F9",
  chipBgActive: "#2563EB",
  chipText: "#475569",

  statusBarStyle: "dark",

  skeletonBase: "#E2E8F0",
  skeletonHighlight: "#F1F5F9",

  overlay: "rgba(15, 23, 42, 0.65)",
  shadow: "#000000",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#F1F5F9",
  modalBg: "#FFFFFF",
};

export const darkColors: ThemeColors = {
  background: "#0F172A",
  surface: "#1E293B",
  card: "#1E293B",
  cardElevated: "#263548",
  border: "#334155",
  borderLight: "#1E293B",
  divider: "#334155",

  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  textInverse: "#0F172A",

  headerBg: "#020617",
  headerText: "#F8FAFC",
  headerSubtext: "rgba(248,250,252,0.6)",

  inputBg: "#1E293B",
  inputBorder: "#475569",
  inputText: "#E2E8F0",
  inputPlaceholder: "#64748B",
  chipBg: "#334155",
  chipBgActive: "#2563EB",
  chipText: "#CBD5E1",

  statusBarStyle: "light",

  skeletonBase: "#1E293B",
  skeletonHighlight: "#334155",

  overlay: "rgba(0, 0, 0, 0.75)",
  shadow: "#000000",
  tabBarBg: "#1E293B",
  tabBarBorder: "#334155",
  modalBg: "#1E293B",
};
