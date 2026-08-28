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
  ActivityIndicator,
} from "react-native";
import { X } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { useAppData } from "../../hooks/useAppData";
import { CategoryIcon } from "../ui/CategoryIcon";
import { BudgetSummary, CategoryBreakdown } from "../../types";
import { financialServices } from "../../services/financialServices";

interface TotalExpenseDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  totalExpense?: number;
  budgets?: BudgetSummary[];
  expBreakdown?: CategoryBreakdown[];
  debtSummary?: { totalOwed: number; totalOwing: number };
  totalSavings?: number;
}

const ESSENTIAL_KEYWORDS = [
  "nhà", "thuê nhà", "tiền nhà", "điện", "nước", "điện nước", "tiền điện", "tiền nước",
  "xăng", "đi lại", "xe cộ", "liên lạc", "internet", "wifi", "điện thoại", "y tế",
  "thuốc", "bệnh viện", "khám bệnh", "giáo dục", "học phí", "sách vở", "ăn uống",
  "siêu thị", "chợ", "thực phẩm", "gia vị", "cơm trưa"
];

const SAVINGS_KEYWORDS = ["tiết kiệm", "tích lũy", "mục tiêu tiết kiệm", "hoàn tiền tiết kiệm", "đầu tư"];

export const TotalExpenseDetailBottomSheet: React.FC<TotalExpenseDetailBottomSheetProps> = ({
  visible,
  onClose,
  totalExpense: propTotalExpense,
  budgets: propBudgets,
  expBreakdown: propExpBreakdown,
  debtSummary: propDebtSummary,
  totalSavings: propTotalSavings,
}) => {
  const appData = useAppData();

  const budgets = propBudgets || appData.budgets || [];
  const expBreakdown = propExpBreakdown || appData.topExpenseCategories || [];
  const debtSummary = propDebtSummary || appData.debtSummary || { totalOwed: 0, totalOwing: 0 };
  const totalSavings = propTotalSavings !== undefined ? propTotalSavings : (appData.totalSavings || 0);

  const [expandedSection, setExpandedSection] = useState<string | null>("essential");
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    iconName?: string;
    spentAmount: number;
    limitAmount: number;
    categoryId?: string;
  } | null>(null);

  const [categoryTxList, setCategoryTxList] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const toggleSection = (section: string) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {
      // Ignore LayoutAnimation on New Arch
    }
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.abs(Math.round(n))) + "đ";

  const fmtShort = (n: number) => {
    if (n >= 1000000) {
      const val = (n / 1000000).toFixed(1).replace(".", ",");
      return `${val}tr+`;
    }
    return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
  };

  const openCategoryHistory = async (item: { name: string; iconName?: string; spentAmount: number; limitAmount: number; categoryId?: string }) => {
    setSelectedCategory(item);
    setLoadingTx(true);
    try {
      const now = new Date();
      const allTx = await financialServices.getMonthlyTransactions(now.getFullYear(), now.getMonth() + 1);
      const catNameLower = (item.name || "").toLowerCase();
      const filtered = (allTx || []).filter((t: any) => {
        const txCatName = (t.categoryName || t.category?.name || "").toLowerCase();
        return (
          t.categoryId === item.categoryId ||
          txCatName === catNameLower ||
          txCatName.includes(catNameLower) ||
          catNameLower.includes(txCatName)
        );
      });
      setCategoryTxList(filtered);
    } catch (e) {
      console.error(e);
      setCategoryTxList([]);
    } finally {
      setLoadingTx(false);
    }
  };

  // ─── TỔNG HỢP VÀ ĐỐI CHIẾU GIỮA ĐÃ CHI (THỰC TẾ) VÀ PHẢI CHI (HẠN MỨC NGÂN SÁCH) ───
  const categoryMap = new Map<string, {
    name: string;
    iconName: string;
    spentAmount: number;
    limitAmount: number;
    hasBudget: boolean;
    categoryId?: string;
  }>();

  // 1. Nạp dữ liệu từ Ngân sách (Hạn mức kế hoạch)
  budgets.forEach((b: any) => {
    const rawName = (b.categoryName || b.name || "Khác").trim();
    const key = rawName.toLowerCase();
    const limit = Number(b.limitAmount || 0);
    const spent = Number(b.spentAmount || 0);

    categoryMap.set(key, {
      name: rawName,
      iconName: b.categoryName || b.name || b.categoryIcon || "Khác",
      spentAmount: spent,
      limitAmount: limit,
      hasBudget: limit > 0,
      categoryId: b.categoryId || b.id,
    });
  });

  // 2. Nạp/Cập nhật dữ liệu từ Lịch sử chi tiêu thực tế
  expBreakdown.forEach((item) => {
    const rawName = (item.categoryName || "Khác").trim();
    const key = rawName.toLowerCase();
    const spent = Number(item.totalAmount || 0);

    if (categoryMap.has(key)) {
      const existing = categoryMap.get(key)!;
      existing.spentAmount = spent;
      if (!existing.categoryId) existing.categoryId = item.categoryId;
    } else {
      categoryMap.set(key, {
        name: rawName,
        iconName: item.categoryName || item.categoryIcon || "Khác",
        spentAmount: spent,
        limitAmount: 0,
        hasBudget: false,
        categoryId: item.categoryId,
      });
    }
  });

  const allCategories = Array.from(categoryMap.values());

  // Phân loại vào 2 nhóm chính: Chi tiêu thiết yếu và Chi tiêu linh hoạt
  const isEssential = (name: string) => {
    const lower = name.toLowerCase();
    return ESSENTIAL_KEYWORDS.some((kw) => lower.includes(kw));
  };

  const isSavings = (name: string) => {
    const lower = name.toLowerCase();
    return SAVINGS_KEYWORDS.some((kw) => lower.includes(kw));
  };

  const essentialItems = allCategories.filter((c) => isEssential(c.name) && !isSavings(c.name));
  const flexibleItems = allCategories.filter((c) => !isEssential(c.name) && !isSavings(c.name));

  // Tính tổng cho từng nhóm: Đã chi (spent) và Phải chi/Hạn mức (limit)
  const essentialSpent = essentialItems.reduce((s, i) => s + i.spentAmount, 0);
  const essentialLimit = essentialItems.reduce((s, i) => s + (i.hasBudget ? i.limitAmount : i.spentAmount), 0);

  const flexibleSpent = flexibleItems.reduce((s, i) => s + i.spentAmount, 0);
  const flexibleLimit = flexibleItems.reduce((s, i) => s + (i.hasBudget ? i.limitAmount : i.spentAmount), 0);

  const debtOwing = debtSummary?.totalOwing || 0;
  const savingsTotal = totalSavings || 0;

  // Tổng thực tế đã chi
  const actualTotalSpent = essentialSpent + flexibleSpent;

  // Tổng chi dự kiến (bao gồm toàn bộ hạn mức cần chi + các khoản nợ cần trả + tích lũy)
  const grandPlanTotal = essentialLimit + flexibleLimit + debtOwing + savingsTotal;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
          {/* ─── HEADER ROW ─── */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {selectedCategory ? `Lịch sử • ${selectedCategory.name}` : "Chi tiết tổng chi tiêu"}
              </Text>
              {!selectedCategory && (
                <Text style={styles.modalSubTitle}>
                  Đối chiếu giữa Đã chi thực tế và Kế hoạch phải chi
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setSelectedCategory(null);
                onClose();
              }}
            >
              <X size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {selectedCategory ? (
              /* ─── XEM LỊCH SỬ GIAO DỊCH CỦA MỘT DANH MỤC CỤ THỂ ─── */
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={styles.backLinkRow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backLinkArrow}>‹</Text>
                  <Text style={styles.backLinkText}>Quay lại bảng phân bổ chi tiêu</Text>
                </TouchableOpacity>

                {/* Card tóm tắt danh mục */}
                <View style={styles.catSummaryCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <CategoryIcon name={selectedCategory.iconName || selectedCategory.name} size={28} />
                    <View>
                      <Text style={styles.catSummaryTitle}>{selectedCategory.name}</Text>
                      <Text style={styles.catSummarySub}>
                        {selectedCategory.limitAmount > 0
                          ? `Hạn mức: ${fmt(selectedCategory.limitAmount)}`
                          : "Chưa đặt hạn mức ngân sách"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.catSummarySpentLabel}>Đã chi thực tế</Text>
                    <Text style={styles.catSummarySpentVal}>{fmt(selectedCategory.spentAmount)}</Text>
                  </View>
                </View>

                <Text style={styles.sectionHeaderTitle}>
                  Các giao dịch trong tháng ({categoryTxList.length} giao dịch)
                </Text>

                {loadingTx ? (
                  <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
                ) : categoryTxList.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>📭</Text>
                    <Text style={styles.emptyText}>
                      Chưa có giao dịch nào cho mục '{selectedCategory.name}' trong tháng này
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {categoryTxList.map((tx: any, idx: number) => (
                      <View key={tx.id || idx} style={styles.txRowCard}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.txNoteText} numberOfLines={1}>
                            {tx.note || tx.categoryName || selectedCategory.name || "Chi tiêu"}
                          </Text>
                          <Text style={styles.txDateText}>
                            {tx.transactionDate ? new Date(tx.transactionDate).toLocaleString("vi-VN") : "Trong tháng"}
                          </Text>
                        </View>
                        <Text style={styles.txAmountText}>-{fmt(tx.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              /* ─── BẢNG TỔNG QUAN 4 NHÓM: THIẾT YẾU, LINH HOẠT, TRẢ NỢ, TÍCH LŨY ─── */
              <>
                {/* HERO CARD: TỔNG QUAN ĐÃ CHI VS PHẢI CHI */}
                <View style={styles.heroCard}>
                  <View style={styles.heroTopRow}>
                    <Text style={styles.heroSubTitle}>KẾ HOẠCH & DỰ KIẾN CHI THÁNG NÀY</Text>
                    <View style={styles.heroIconBg}>
                      <Text style={{ fontSize: 16 }}>📊</Text>
                    </View>
                  </View>

                  <Text style={styles.heroAmount}>{fmtShort(grandPlanTotal)}</Text>

                  {/* 2 Cột so sánh: Đã chi thực tế & Kế hoạch phải chi */}
                  <View style={styles.heroCompareBox}>
                    <View style={styles.heroCompareCol}>
                      <Text style={styles.heroCompareLabel}>Đã chi thực tế</Text>
                      <Text style={styles.heroCompareValSpent}>{fmt(actualTotalSpent)}</Text>
                    </View>
                    <View style={styles.heroCompareDivider} />
                    <View style={styles.heroCompareCol}>
                      <Text style={styles.heroCompareLabel}>Kế hoạch phải chi</Text>
                      <Text style={styles.heroCompareValPlan}>{fmt(grandPlanTotal)}</Text>
                    </View>
                  </View>

                  {/* 4 Nhãn nhỏ mô tả tỷ trọng */}
                  <View style={styles.subPillsRow}>
                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>1. Thiết yếu</Text>
                      <Text style={styles.subPillVal}>{fmtShort(essentialLimit)}</Text>
                    </View>
                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>2. Linh hoạt</Text>
                      <Text style={styles.subPillVal}>{fmtShort(flexibleLimit)}</Text>
                    </View>
                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>3. Đang nợ</Text>
                      <Text style={styles.subPillVal}>{fmtShort(debtOwing)}</Text>
                    </View>
                    <View style={styles.subPill}>
                      <Text style={styles.subPillLabel}>4. Tích lũy</Text>
                      <Text style={styles.subPillVal}>{fmtShort(savingsTotal)}</Text>
                    </View>
                  </View>
                </View>

                {/* ─── 4 NHÓM ACCORDION THEO ĐÚNG QUY TẮC TIẾNG VIỆT ─── */}
                <View style={styles.accordionContainer}>
                  {/* NHÓM 1: CHI TIÊU THIẾT YẾU */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("essential")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconBgBlue}>
                        <Text style={{ fontSize: 18 }}>🏠</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>1. Chi tiêu thiết yếu</Text>
                        <Text style={styles.accordionSub}>
                          Đã chi: <Text style={{ fontWeight: "700", color: "#2563EB" }}>{fmt(essentialSpent)}</Text>
                          {essentialLimit > 0 && ` • Hạn mức: ${fmt(essentialLimit)}`}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.amountBlue}>{fmtShort(essentialSpent)}</Text>
                        <Text style={styles.accordionArrowText}>{expandedSection === "essential" ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {expandedSection === "essential" && (
                      <View style={styles.accordionBody}>
                        {essentialItems.length === 0 ? (
                          <Text style={styles.emptyItemText}>Chưa có phát sinh chi tiêu thiết yếu</Text>
                        ) : (
                          essentialItems.map((item, idx) => {
                            const pct = item.limitAmount > 0 ? Math.min(100, Math.round((item.spentAmount / item.limitAmount) * 100)) : 0;
                            const isOver = item.limitAmount > 0 && item.spentAmount > item.limitAmount;

                            return (
                              <TouchableOpacity
                                key={idx}
                                style={styles.itemRow}
                                onPress={() => openCategoryHistory(item)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                                  <CategoryIcon name={item.iconName || item.name} size={24} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemSubText}>
                                      {item.limitAmount > 0
                                        ? `Hạn mức: ${fmt(item.limitAmount)} (${pct}%) • Chạm xem lịch sử ›`
                                        : "Chưa đặt hạn mức • Chạm xem lịch sử ›"}
                                    </Text>
                                    {item.limitAmount > 0 && (
                                      <View style={styles.progressBarTrack}>
                                        <View
                                          style={[
                                            styles.progressBarFill,
                                            {
                                              width: `${pct}%`,
                                              backgroundColor: isOver ? "#EF4444" : "#3B82F6",
                                            },
                                          ]}
                                        />
                                      </View>
                                    )}
                                  </View>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                  <Text style={[styles.itemValText, isOver && { color: "#EF4444" }]}>
                                    {fmt(item.spentAmount)}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>

                  {/* NHÓM 2: CHI TIÊU LINH HOẠT */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("flexible")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconBgOrange}>
                        <Text style={{ fontSize: 18 }}>🛍️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>2. Chi tiêu linh hoạt</Text>
                        <Text style={styles.accordionSub}>
                          Đã chi: <Text style={{ fontWeight: "700", color: "#EA580C" }}>{fmt(flexibleSpent)}</Text>
                          {flexibleLimit > 0 && ` • Hạn mức: ${fmt(flexibleLimit)}`}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.amountOrange}>{fmtShort(flexibleSpent)}</Text>
                        <Text style={styles.accordionArrowText}>{expandedSection === "flexible" ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {expandedSection === "flexible" && (
                      <View style={styles.accordionBody}>
                        {flexibleItems.length === 0 ? (
                          <Text style={styles.emptyItemText}>Chưa có phát sinh chi tiêu linh hoạt</Text>
                        ) : (
                          flexibleItems.map((item, idx) => {
                            const pct = item.limitAmount > 0 ? Math.min(100, Math.round((item.spentAmount / item.limitAmount) * 100)) : 0;
                            const isOver = item.limitAmount > 0 && item.spentAmount > item.limitAmount;

                            return (
                              <TouchableOpacity
                                key={idx}
                                style={styles.itemRow}
                                onPress={() => openCategoryHistory(item)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                                  <CategoryIcon name={item.iconName || item.name} size={24} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemSubText}>
                                      {item.limitAmount > 0
                                        ? `Hạn mức: ${fmt(item.limitAmount)} (${pct}%) • Chạm xem lịch sử ›`
                                        : "Chưa đặt hạn mức • Chạm xem lịch sử ›"}
                                    </Text>
                                    {item.limitAmount > 0 && (
                                      <View style={styles.progressBarTrack}>
                                        <View
                                          style={[
                                            styles.progressBarFill,
                                            {
                                              width: `${pct}%`,
                                              backgroundColor: isOver ? "#EF4444" : "#F97316",
                                            },
                                          ]}
                                        />
                                      </View>
                                    )}
                                  </View>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                  <Text style={[styles.itemValText, isOver && { color: "#EF4444" }]}>
                                    {fmt(item.spentAmount)}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>

                  {/* NHÓM 3: TRẢ NỢ & CHI PHÍ NHÓM */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("debt")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconBgRose}>
                        <Text style={{ fontSize: 18 }}>🤝</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>3. Trả nợ & chi phí nhóm</Text>
                        <Text style={styles.accordionSub}>Khoản nợ cần thanh toán</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.amountRose}>{fmt(debtOwing)}</Text>
                        <Text style={styles.accordionArrowText}>{expandedSection === "debt" ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {expandedSection === "debt" && (
                      <View style={styles.accordionBody}>
                        <View style={styles.itemRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                            <CategoryIcon name="Trả nợ nhóm" size={24} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>Nợ nhóm cần trả</Text>
                              <Text style={styles.itemSubText}>Các khoản chia sẻ chi phí nhóm</Text>
                            </View>
                          </View>
                          <Text style={[styles.itemValText, { color: "#E11D48" }]}>{fmt(debtOwing)}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* NHÓM 4: TÍCH LŨY & TIẾT KIỆM */}
                  <View style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleSection("savings")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconBgEmerald}>
                        <Text style={{ fontSize: 18 }}>🐷</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accordionTitle}>4. Tích lũy & tiết kiệm</Text>
                        <Text style={styles.accordionSub}>Quỹ dự phòng và mục tiêu tài chính</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.amountEmerald}>{fmt(savingsTotal)}</Text>
                        <Text style={styles.accordionArrowText}>{expandedSection === "savings" ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {expandedSection === "savings" && (
                      <View style={styles.accordionBody}>
                        <View style={styles.itemRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                            <CategoryIcon name="Mục tiêu tiết kiệm" size={24} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>Tổng tiền đã tích lũy</Text>
                              <Text style={styles.itemSubText}>Tài khoản tích lũy an toàn</Text>
                            </View>
                          </View>
                          <Text style={[styles.itemValText, { color: "#16A34A" }]}>{fmt(savingsTotal)}</Text>
                        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 36,
  },
  modalCard: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#0F172A",
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
  modalTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  scrollArea: {
    paddingBottom: 12,
  },
  backLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backLinkArrow: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.indigo600,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.indigo600,
  },
  catSummaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  catSummarySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  catSummarySpentLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E11D48",
  },
  catSummarySpentVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#E11D48",
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  txRowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  txNoteText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  txDateText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#E11D48",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
    fontWeight: "600",
    textAlign: "center",
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: "#6366F1",
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
    fontSize: 28,
    fontWeight: "900",
    color: colors.white,
    marginBottom: 12,
  },
  heroCompareBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  heroCompareCol: {
    flex: 1,
  },
  heroCompareLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 2,
  },
  heroCompareValSpent: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FED7AA",
  },
  heroCompareValPlan: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.white,
  },
  heroCompareDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    marginHorizontal: 10,
  },
  subPillsRow: {
    flexDirection: "row",
    gap: 4,
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

  /* Accordion */
  accordionContainer: {
    gap: 10,
  },
  accordionCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  iconBgBlue: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBgOrange: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBgRose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBgEmerald: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  accordionSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  amountBlue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },
  amountOrange: {
    fontSize: 13,
    fontWeight: "900",
    color: "#EA580C",
  },
  amountRose: {
    fontSize: 13,
    fontWeight: "900",
    color: "#E11D48",
  },
  amountEmerald: {
    fontSize: 13,
    fontWeight: "900",
    color: "#16A34A",
  },
  accordionArrowText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  accordionBody: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  emptyItemText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  itemSubText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  itemValText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
