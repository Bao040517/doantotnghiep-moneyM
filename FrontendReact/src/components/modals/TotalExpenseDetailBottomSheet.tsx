import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Modal,
  Platform,
  UIManager,
} from "react-native";
import { X } from "lucide-react-native";
import { colors } from "../../constants/colors";

interface TotalExpenseDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  totalExpense?: number;
}

export const TotalExpenseDetailBottomSheet: React.FC<TotalExpenseDetailBottomSheetProps> = ({
  visible,
  onClose,
  totalExpense = 100144000,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedHistoryCategory, setSelectedHistoryCategory] = useState<{ name: string; amount: number; subNote: string } | null>(null);

  const toggleSection = (section: string) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {
      // Ignore LayoutAnimation errors on New Architecture
    }
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const fmtShort = (n: number) => {
    if (n >= 1000000) {
      const val = (n / 1000000).toFixed(1).replace(".", ",");
      return `${val}tr+`;
    }
    return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

  // 4 Groups breakdown matching the 50/30/20 & Groups specification
  const essentialAmount = 55824000;
  const flexibleAmount = 34520000;
  const debtAmount = 4800000;
  const savingsAmount = 5000000;
  const grandTotal = totalExpense || (essentialAmount + flexibleAmount + debtAmount + savingsAmount);

  const essentialItems = [
    { name: "🏠 Tiền nhà", amount: 18000000, subNote: "Hạn ngạch 18.000.000đ" },
    { name: "💡 Tiền điện", amount: 4440000, subNote: "Cố định định kỳ" },
    { name: "🚆 Đi lại", amount: 3500000, subNote: "Định mức tháng" },
    { name: "📱 Phí liên lạc", amount: 2524000, subNote: "Gói cước & Internet" },
    { name: "💊 Y tế", amount: 1500000, subNote: "Dự phòng thuốc men" },
    { name: "📚 Giáo dục", amount: 25860000, subNote: "Học phí định kỳ" },
  ];

  const flexibleItems = [
    { name: "🍽️ Ăn uống", amount: 16500000, subNote: "Cơm trưa & ăn ngoài" },
    { name: "🧴 Chi tiêu hàng ngày", amount: 10000000, subNote: "Sinh hoạt linh hoạt" },
    { name: "👕 Quần áo", amount: 5000000, subNote: "Mua sắm trang phục" },
    { name: "🥂 Phí giao lưu", amount: 2020000, subNote: "Cà phê & bạn bè" },
    { name: "💄 Mỹ phẩm", amount: 1000000, subNote: "Chăm sóc cá nhân" },
  ];

  const debtItems = [
    { name: "💸 Trả nợ nhóm", amount: 4800000, subNote: "Thanh toán nợ nhóm" },
  ];

  const savingsItems = [
    { name: "🎯 Mục tiêu tiết kiệm", amount: 5000000, subNote: "Tích lũy định kỳ" },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
          {/* ─── HEADER ROW (Title & Circle Close Button) ─── */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>
              {selectedHistoryCategory ? `Lịch sử - ${selectedHistoryCategory.name}` : "Chi tiết Tổng chi dự kiến"}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setSelectedHistoryCategory(null);
                onClose();
              }}
            >
              <X size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {selectedHistoryCategory ? (
              /* ─── CATEGORY TRANSACTION HISTORY IN-PLACE VIEW ─── */
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setSelectedHistoryCategory(null)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: colors.indigo600 }}>‹</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.indigo600 }}>
                    Quay lại danh sách phân bổ
                  </Text>
                </TouchableOpacity>

                <View style={{ backgroundColor: "#fff1f2", borderRadius: 18, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#e11d48" }}>Tổng đã chi mục này</Text>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#e11d48" }}>
                    {fmt(selectedHistoryCategory.amount)}
                  </Text>
                </View>

                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                  Lịch sử các lần chi tiêu trong tháng
                </Text>

                <View style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#f8fafc", borderRadius: 14, borderWidth: 1, borderColor: "#f1f5f9", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#1e293b" }}>Chi tiêu {selectedHistoryCategory.name}</Text>
                    <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontWeight: "500" }}>Giao dịch phát sinh trong tháng</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#e11d48" }}>-{fmt(selectedHistoryCategory.amount)}</Text>
                </View>
              </View>
            ) : (
              /* ─── 4 ACCORDION CARDS VIEW ─── */
              <>
                {/* ─── HERO PURPLE GRADIENT CARD ─── */}
                <View style={styles.heroCard}>
                  <View style={styles.heroTopRow}>
                    <Text style={styles.heroSubTitle}>TỔNG CHI DỰ KIẾN / CẦN TRẢ THÁNG NÀY</Text>
                    <View style={styles.heroIconBg}>
                      <Text style={{ fontSize: 16 }}>📊</Text>
                    </View>
                  </View>

                  <Text style={styles.heroAmount}>{fmtShort(grandTotal)}</Text>

                  {/* 4 Sub-Pills Row */}
                  <View style={styles.subPillsRow}>
                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>1. THIẾT YẾU</Text>
                      <Text style={styles.subPillVal}>{fmtShort(essentialAmount)}</Text>
                    </View>

                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>2. LINH HOẠT</Text>
                      <Text style={styles.subPillVal}>{fmtShort(flexibleAmount)}</Text>
                    </View>

                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>3. ĐANG NỢ</Text>
                      <Text style={styles.subPillVal}>{fmtShort(debtAmount)}</Text>
                    </View>

                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>4. TÍCH LŨY</Text>
                      <Text style={styles.subPillVal}>{fmtShort(savingsAmount)}</Text>
                    </View>
                  </View>

                  {/* Footer Note */}
                  <Text style={styles.heroFooterNote}>
                    💡 Tổng chi dự kiến phân làm 4 nhóm: Chi phí thiết yếu + Chi phí linh hoạt + Nợ nhóm cần trả + Tích lũy.
                  </Text>
                </View>

                {/* ─── 4 ACCORDION CARDS ─── */}
                <View style={styles.accordionContainer}>
                  {/* Section 1: Chi tiêu Thiết yếu */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("essential")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.accordionIconBgBlue}>
                        <Text style={{ fontSize: 18 }}>🏠</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>1. Chi tiêu Thiết yếu</Text>
                        <Text style={styles.accordionSubNote}>Ăn uống, thuê nhà, điện nước, di chuyển...</Text>
                      </View>
                      <Text style={styles.accordionAmountBlue}>{fmtShort(essentialAmount)}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>
                        {expandedSection === "essential" ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === "essential" && (
                      <View style={styles.accordionBody}>
                        {essentialItems.map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.itemRow}
                            onPress={() => setSelectedHistoryCategory(item)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemSub}>{item.subNote} • Bấm xem lịch sử ›</Text>
                            </View>
                            <Text style={styles.itemVal}>{fmt(item.amount)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Section 2: Chi tiêu Linh hoạt */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("flexible")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.accordionIconBgOrange}>
                        <Text style={{ fontSize: 18 }}>🛍️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>2. Chi tiêu Linh hoạt</Text>
                        <Text style={styles.accordionSubNote}>Mua sắm, cà phê, du lịch, giải trí...</Text>
                      </View>
                      <Text style={styles.accordionAmountOrange}>{fmtShort(flexibleAmount)}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>
                        {expandedSection === "flexible" ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === "flexible" && (
                      <View style={styles.accordionBody}>
                        {flexibleItems.map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.itemRow}
                            onPress={() => setSelectedHistoryCategory(item)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemSub}>{item.subNote} • Bấm xem lịch sử ›</Text>
                            </View>
                            <Text style={styles.itemVal}>{fmt(item.amount)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Section 3: Trả nợ & Chi phí Nhóm */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("debt")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.accordionIconBgRose}>
                        <Text style={{ fontSize: 18 }}>🤝</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>3. Trả nợ & Chi phí Nhóm</Text>
                        <Text style={styles.accordionSubNote}>Nợ nhóm phải trả, nợ cá nhân...</Text>
                      </View>
                      <Text style={styles.accordionAmountRed}>{fmt(debtAmount)}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>
                        {expandedSection === "debt" ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === "debt" && (
                      <View style={styles.accordionBody}>
                        {debtItems.map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.itemRow}
                            onPress={() => setSelectedHistoryCategory(item)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemSub}>{item.subNote} • Bấm xem lịch sử ›</Text>
                            </View>
                            <Text style={styles.itemVal}>{fmt(item.amount)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Section 4: Tích lũy & Tiết kiệm */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("savings")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.accordionIconBgEmerald}>
                        <Text style={{ fontSize: 18 }}>🐷</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>4. Tích lũy & Tiết kiệm</Text>
                        <Text style={styles.accordionSubNote}>Quỹ dự phòng khẩn cấp, tiết kiệm...</Text>
                      </View>
                      <Text style={styles.accordionAmountGreen}>{fmt(savingsAmount)}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>
                        {expandedSection === "savings" ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === "savings" && (
                      <View style={styles.accordionBody}>
                        {savingsItems.map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.itemRow}
                            onPress={() => setSelectedHistoryCategory(item)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemSub}>{item.subNote} • Bấm xem lịch sử ›</Text>
                            </View>
                            <Text style={styles.itemVal}>{fmt(item.amount)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#0f172a",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    fontFamily: "Roboto",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  scrollArea: {
    paddingBottom: 10,
  },
  heroCard: {
    backgroundColor: "#6366f1",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroSubTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.4,
  },
  heroIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.white,
    marginBottom: 14,
  },
  subPillsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
  },
  subPill: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  subPillLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 2,
  },
  subPillVal: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.white,
  },
  heroFooterNote: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 14,
    fontWeight: "500",
  },
  accordionContainer: {
    gap: 10,
  },
  accordionCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  accordionIconBgBlue: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionIconBgOrange: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionIconBgRose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#fff1f2",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionIconBgEmerald: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  accordionSubNote: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 2,
  },
  accordionAmountBlue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },
  accordionAmountOrange: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ea580c",
  },
  accordionAmountRed: {
    fontSize: 13,
    fontWeight: "900",
    color: "#e11d48",
  },
  accordionAmountGreen: {
    fontSize: 13,
    fontWeight: "900",
    color: "#16a34a",
  },
  accordionBody: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  itemSub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 1,
  },
  itemVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
});
