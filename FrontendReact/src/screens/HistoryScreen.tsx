import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { Search } from "lucide-react-native";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { CashflowComparisonBottomSheet } from "../components/modals/CashflowComparisonBottomSheet";
import { TotalExpenseDetailBottomSheet } from "../components/modals/TotalExpenseDetailBottomSheet";
import { EditTransactionModal } from "../components/modals/EditTransactionModal";
import { colors } from "../constants/colors";
import { financialServices } from "../services/financialServices";
import { Transaction, MonthlySummary } from "../types";
import { matchVietnamese } from "../utils/vietnamese";
import { CategoryIcon } from "../components/ui/CategoryIcon";

export const HistoryScreen: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [search, setSearch] = useState("");
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompModal, setShowCompModal] = useState(false);
  const [showTotalExpenseModal, setShowTotalExpenseModal] = useState(false);

  // Edit Modal state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, sumData, uncatCount] = await Promise.all([
        financialServices.getMonthlyTransactions(selectedYear, selectedMonth).catch(() => []),
        financialServices.getMonthlySummary(selectedYear, selectedMonth).catch(() => null),
        financialServices.getUncategorizedCount().catch(() => 0),
      ]);
      setTransactions(txData || []);
      setSummary(sumData);
      setUncategorizedCount(uncatCount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const changeMonth = (offset: number) => {
    let m = selectedMonth + offset;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const currentMonthExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0) || (summary?.currentMonth?.totalExpense ?? summary?.totalExpense ?? 0);

  const currentMonthIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0) || (summary?.currentMonth?.totalIncome ?? summary?.totalIncome ?? 0);

  const filtered = transactions.filter((t: any) => {
    const catName = t.categoryName || t.category?.name || "";
    return matchVietnamese(catName, search) || matchVietnamese(t.note, search);
  });

  const fmt = (n: number) => {
    const safe = Math.round(Math.abs(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + "đ";
  };

  const formatDateStr = (rawDateStr?: string) => {
    if (!rawDateStr) return "";
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return rawDateStr;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const DD = String(d.getDate()).padStart(2, "0");
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const YYYY = d.getFullYear();
      return `${hh}:${mm} - ${DD}/${MM}/${YYYY}`;
    } catch (e) {
      return rawDateStr;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[colors.indigo600]} />}
      >
        {/* ─── SEARCH & TOP OVERVIEW SECTION ─── */}
        <View style={styles.headerContainer}>
          {/* Search Bar Row */}
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <Input
                icon={<Search size={18} color="#64748b" />}
                placeholder="Tìm kiếm giao dịch"
                defaultValue={search}
                onChangeText={(text) => {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = setTimeout(() => {
                    setSearch(text);
                  }, 300);
                }}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {/* ─── SUMMARY CARD CONTAINER (TỔNG QUAN THÁNG X) ─── */}
          <Card style={styles.overviewCard}>
            {/* Header Row */}
            <View style={styles.overviewHeaderRow}>
              <Text style={styles.overviewTitle}>Tổng quan tháng {selectedMonth}</Text>
              <Text style={styles.overviewChevron}>›</Text>
            </View>

            {/* 2 Inner Side-by-Side Cards: Tổng chi & So với cùng kỳ */}
            <View style={styles.innerCardsRow}>
              {/* Inner Card 1: Tổng chi (Click to open Total Expense Breakdown Drawer) */}
              <TouchableOpacity style={styles.innerCard} onPress={() => setShowTotalExpenseModal(true)}>
                <Text style={styles.innerCardLabel}>Tổng chi</Text>
                <View style={styles.innerCardValRow}>
                  <Text style={styles.innerCardValText}>{fmt(currentMonthExpense)}</Text>
                  <Text style={styles.innerCardValChevron}> ›</Text>
                </View>
              </TouchableOpacity>

              {/* Inner Card 2: So với cùng kỳ (Click to open Cashflow Comparison) */}
              <TouchableOpacity style={styles.innerCard} onPress={() => setShowCompModal(true)}>
                <Text style={styles.innerCardLabel}>So với cùng kỳ</Text>
                <View style={styles.innerCardValRow}>
                  <Text style={[styles.innerCardValText, { color: colors.rose600 }]}>
                    ↑ {fmt(currentMonthExpense)}
                  </Text>
                  <Text style={[styles.innerCardValChevron, { color: colors.rose600 }]}> ›</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom Strip: Bạn muốn tiết kiệm tiền hơn? Đặt ngân sách */}
            <View style={styles.bottomStripRow}>
              <Text style={styles.bottomStripLeftText}>Bạn muốn tiết kiệm tiền hơn?</Text>
              <TouchableOpacity onPress={() => onNavigate?.("budget")}>
                <Text style={styles.bottomStripActionText}>Đặt ngân sách</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* ─── TRANSACTIONS LIST SECTION HEADER ─── */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.recentTitle}>Giao dịch gần đây</Text>

          {/* Month Selector Pill */}
          <View style={styles.monthPill}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>Tháng {selectedMonth}/{selectedYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── UNCATEGORIZED TRANSACTIONS WARNING BANNER ─── */}
        {uncategorizedCount > 0 && (
          <TouchableOpacity
            style={styles.uncategorizedBanner}
            onPress={() => setSearch("chưa phân loại")}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.uncategorizedTitle}>Giao dịch chưa phân loại ({uncategorizedCount})</Text>
              <Text style={styles.uncategorizedSub}>Chạm để gán danh mục để báo cáo chính xác hơn</Text>
            </View>
            <Text style={styles.uncategorizedChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* ─── SINGLE UNIFIED WHITE CARD CONTAINER FOR TRANSACTIONS LIST ─── */}
        <Card style={styles.unifiedListCard}>
          {/* Card Header Strip */}
          <View style={styles.listHeaderStrip}>
            <Text style={styles.listHeaderTitle}>Tháng {selectedMonth}/{selectedYear}</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>📭</Text>
              <Text style={styles.emptyText}>Không tìm thấy giao dịch nào trong tháng {selectedMonth}/{selectedYear}</Text>
            </View>
          ) : (
            filtered.map((item, idx) => {
              const isLast = idx === filtered.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectedTx(item);
                    setEditModalVisible(true);
                  }}
                  activeOpacity={0.7}
                  style={[styles.txRowItem, !isLast && styles.txRowItemBorder]}
                >
                  {/* Category Icon */}
                  <View
                    style={[
                      styles.txIconBg,
                      { backgroundColor: item.type === "INCOME" ? "#E0F2FE" : "#FEF3C7" },
                    ]}
                  >
                    <CategoryIcon
                      name={item.categoryName || (item as any).category?.name || item.categoryIcon || (item.type === "INCOME" ? "Tiền lương" : "Khác")}
                      size={24}
                    />
                  </View>

                  {/* Transaction Info */}
                  <View style={styles.txMainInfo}>
                    <Text style={styles.txNameText} numberOfLines={2}>
                      {item.note || item.categoryName || (item as any).category?.name || "Giao dịch"}
                    </Text>
                    <Text style={styles.txDateText}>{formatDateStr(item.transactionDate)}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {(item.categoryName || (item as any).category?.name) && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>🧾 {item.categoryName || (item as any).category?.name}</Text>
                        </View>
                      )}
                      {(item.paymentMethod === "CASH" || (item.note && (item.note.includes("tiền mặt") || item.note.includes("Tiền mặt")))) && (
                        <View style={[styles.categoryBadge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                          <Text style={[styles.categoryBadgeText, { color: "#059669", fontWeight: "700" }]}>💵 Tiền mặt</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Transaction Amount */}
                  <Text
                    style={[
                      styles.txAmountText,
                      { color: item.type === "INCOME" ? colors.emerald600 : colors.slate900 },
                    ]}
                  >
                    {item.type === "INCOME" ? "+" : ""}
                    {fmt(item.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </Card>
      </ScrollView>

      {/* ─── CASHFLOW COMPARISON BOTTOM SHEET ─── */}
      <CashflowComparisonBottomSheet
        visible={showCompModal}
        onClose={() => setShowCompModal(false)}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        currentMonthExpense={currentMonthExpense}
        currentMonthIncome={currentMonthIncome}
      />

      {/* ─── TOTAL EXPENSE DETAIL BOTTOM SHEET ─── */}
      <TotalExpenseDetailBottomSheet
        visible={showTotalExpenseModal}
        onClose={() => setShowTotalExpenseModal(false)}
        totalExpense={currentMonthExpense}
      />

      {/* ─── EDIT TRANSACTION MODAL ─── */}
      <EditTransactionModal
        visible={editModalVisible}
        transaction={selectedTx}
        onClose={() => setEditModalVisible(false)}
        onRefresh={loadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    padding: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    gap: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* Overview Card Container (Image 3 Spec) */
  overviewCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  overviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900,
  },
  overviewChevron: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FF2E55",
  },
  innerCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  innerCard: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  innerCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate500,
    marginBottom: 6,
  },
  innerCardValRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  innerCardValText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900,
  },
  innerCardValChevron: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.slate400,
  },

  /* Bottom Strip */
  bottomStripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  bottomStripLeftText: {
    fontSize: 11,
    color: colors.slate500,
    fontWeight: "500",
  },
  bottomStripActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF2E55",
  },

  /* Uncategorized Banner */
  uncategorizedBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "center",
  },
  uncategorizedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  uncategorizedSub: {
    fontSize: 11,
    color: "#B45309",
  },
  uncategorizedChevron: {
    fontSize: 18,
    fontWeight: "900",
    color: "#D97706",
  },

  /* Recent Transactions Header */
  recentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 6,
  },
  monthNavBtn: {
    paddingHorizontal: 4,
  },
  monthNavText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate400,
  },
  monthText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate800,
  },

  /* SINGLE UNIFIED WHITE CARD CONTAINER FOR TRANSACTIONS LIST */
  unifiedListCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    padding: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  listHeaderStrip: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate600,
  },
  txRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txRowItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  txIconBg: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  txNameText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.slate900,
    lineHeight: 18,
    marginBottom: 2,
  },
  txDateText: {
    fontSize: 11,
    color: colors.slate400,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: colors.slate50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.slate500,
  },
  txAmountText: {
    fontSize: 15,
    fontWeight: "900",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
    fontWeight: "600",
    textAlign: "center",
  },
});
