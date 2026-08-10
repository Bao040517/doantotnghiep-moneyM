import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { BudgetSummary, Transaction } from "../../types";
import { financialServices } from "../../services/financialServices";

interface BudgetTransactionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  budget: BudgetSummary | null;
  year: number;
  month: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Ăn uống": "🍽️",
  "Chi tiêu hàng ngày": "🧴",
  "Quần áo": "👕",
  "Phí giao lưu": "🥂",
  "Mỹ phẩm": "💄",
  "Tiền nhà": "🏠",
  "Tiền điện": "💡",
  "Đi lại": "🚆",
  "Phí liên lạc": "📱",
  "Y tế": "💊",
  "Giáo dục": "📚",
  "Mục tiêu tiết kiệm": "🎯",
  "Trả nợ nhóm": "💸",
  "Mua sắm": "🛍️",
  "Giải trí": "🎮",
  "Lưu trú": "🏨",
  "Di chuyển": "🚗",
  "Khác": "📦",
};

export const BudgetTransactionsBottomSheet: React.FC<BudgetTransactionsBottomSheetProps> = ({
  visible,
  onClose,
  budget,
  year,
  month,
  onAddNewExpense,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && budget) {
      setLoading(true);
      financialServices
        .getMonthlyTransactions(year, month)
        .then((allTxs) => {
          // Robust filtering for transactions belonging to this budget category
          const filtered = (allTxs || []).filter((tx: any) => {
            const txCatId = String(tx.categoryId || tx.category?.id || "").toLowerCase();
            const txCatName = String(tx.categoryName || tx.category?.name || "").toLowerCase();
            const bCatId = String(budget.categoryId || "").toLowerCase();
            const bCatName = String(budget.categoryName || "").toLowerCase();
            const bName = String(budget.name || "").toLowerCase();

            const matchesId = bCatId && txCatId && txCatId === bCatId;
            const matchesName = txCatName && (
              (bName && txCatName.includes(bName)) ||
              (bCatName && txCatName.includes(bCatName)) ||
              (bName && bName.includes(txCatName))
            );
            
            // Also match if note contains category name or budget title
            const noteStr = String(tx.note || "").toLowerCase();
            const matchesNote = noteStr && (
              (bName && noteStr.includes(bName)) ||
              (bCatName && noteStr.includes(bCatName))
            );

            return (matchesId || matchesName || matchesNote) && tx.type === "EXPENSE";
          });

          // Sort by transactionDate newest first
          filtered.sort((a, b) => {
            const timeA = new Date(a.transactionDate || a.createdAt || 0).getTime();
            const timeB = new Date(b.transactionDate || b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          setTransactions(filtered);
        })
        .catch((err) => console.log("Failed to load budget transactions:", err))
        .finally(() => setLoading(false));
    }
  }, [visible, budget, year, month]);

  if (!budget) return null;

  const fmt = (n?: number) => {
    const safe = Math.round(Number(n) || 0);
    return safe.toLocaleString("vi-VN") + " ₫";
  };

  const catName = budget.name || budget.categoryName || "Danh mục";
  const icon = CATEGORY_ICONS[catName] || budget.categoryIcon || "📊";
  const spent = budget.spentAmount || 0;
  const limit = budget.limitAmount || 1;
  const pct = Math.round((spent / limit) * 100);
  const isOver = spent > limit;
  const overAmount = spent - limit;
  const remaining = Math.max(0, limit - spent);

  const formatDateTime = (rawDate?: string) => {
    if (!rawDate) return "Tháng " + month + "/" + year;
    if (rawDate.includes("T")) {
      const parts = rawDate.split("T");
      const d = parts[0].split("-");
      const time = parts[1] ? parts[1].slice(0, 5) : "";
      if (d.length === 3) {
        return `${d[2]}/${d[1]}/${d[0]}${time ? ` lúc ${time}` : ""}`;
      }
    }
    const d = rawDate.split("-");
    if (d.length === 3) {
      return `${d[2]}/${d[1]}/${d[0]}`;
    }
    return rawDate;
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Lịch Sử Chi Tiêu Ngân Sách 📊"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ─── BUDGET SUMMARY HERO CARD ─── */}
        <View style={[styles.heroCard, isOver && styles.heroCardOver]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Text style={{ fontSize: 26 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {catName}
              </Text>
              <Text style={styles.heroMonthText}>
                Tháng {month}/{year} • Hạn mức {fmt(limit)}
              </Text>
            </View>
            <View style={[styles.pctBadge, isOver ? styles.pctBadgeOver : styles.pctBadgeSafe]}>
              <Text style={[styles.pctBadgeText, isOver ? styles.pctBadgeTextOver : styles.pctBadgeTextSafe]}>
                {pct}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: isOver ? colors.rose500 : pct >= 80 ? colors.amber500 : colors.emerald500,
                },
              ]}
            />
          </View>

          {/* Financial Breakdown Info */}
          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.statLabel}>TỔNG ĐÃ CHI ({transactions.length} LẦN)</Text>
              <Text style={styles.statValSpent}>{fmt(spent)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statLabel}>{isOver ? "ĐÃ VƯỢT HẠN MỨC" : "CÒN LẠI KHẢ DỤNG"}</Text>
              <Text style={[styles.statValRemain, isOver && styles.statValOver]}>
                {isOver ? `+${fmt(overAmount)}` : fmt(remaining)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── SECTION TITLE ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            LỊCH SỬ CÁC LẦN ĐÃ TIÊU ({transactions.length} LẦN)
          </Text>
          <Text style={styles.sectionSub}>Tất cả các lần trích tiền vào ngân sách này trong tháng</Text>
        </View>

        {/* ─── TRANSACTIONS / SPENDING HISTORY LIST ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.indigo600} />
            <Text style={styles.loadingText}>Đang tải lịch sử các lần chi tiêu...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🧾</Text>
            <Text style={styles.emptyTitle}>Chưa có lần chi tiêu nào</Text>
            <Text style={styles.emptySub}>
              Bạn chưa có giao dịch nào được ghi nhận cho ngân sách {catName} trong tháng {month}/{year}.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx, idx) => {
              const invoiceCode = tx.id
                ? `#HD-${tx.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`
                : `#HD-${idx + 1}`;
              const formattedDate = formatDateTime(tx.transactionDate || tx.createdAt);
              const txCountNumber = transactions.length - idx; // e.g. Lần 1, Lần 2...

              return (
                <View key={tx.id || idx} style={styles.txCard}>
                  {/* Left Timeline Indicator */}
                  <View style={styles.timelineCircle}>
                    <Text style={styles.timelineNumber}>{txCountNumber}</Text>
                  </View>

                  <View style={styles.txMainInfo}>
                    <View style={styles.txHeaderRow}>
                      <View style={styles.invoiceBadge}>
                        <Text style={styles.invoiceBadgeText}>{invoiceCode}</Text>
                      </View>
                      <Text style={styles.txDate}>📅 {formattedDate}</Text>
                    </View>

                    <Text style={styles.txNote} numberOfLines={2}>
                      {tx.note || catName || "Chi tiêu ngân sách"}
                    </Text>

                    <View style={styles.txMetaRow}>
                      <Text style={styles.txWallet}>💳 {tx.walletName || "Ví mặc định"}</Text>
                      {tx.linkedExpenseId && (
                        <View style={styles.groupBadge}>
                          <Text style={styles.groupBadgeText}>👥 Khoản chi nhóm</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Right Amount Column */}
                  <View style={styles.txRightCol}>
                    <Text style={styles.txAmount}>-{fmt(tx.amount)}</Text>
                    <View style={styles.settledTag}>
                      <Text style={styles.settledTagText}>Đã trừ ví ✓</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}


      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  heroCardOver: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
  },
  heroMonthText: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    fontWeight: "600",
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pctBadgeSafe: {
    backgroundColor: "#DCFCE7",
  },
  pctBadgeOver: {
    backgroundColor: "#FFE4E6",
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  pctBadgeTextSafe: {
    color: "#166534",
  },
  pctBadgeTextOver: {
    color: "#9F1239",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate200,
    overflow: "hidden",
    marginBottom: 12,
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.slate500,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValSpent: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900,
  },
  statValRemain: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
  },
  statValOver: {
    color: "#E11D48",
  },

  /* Section Title */
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate900,
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },

  /* Transaction Items */
  loadingBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 8,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate700,
  },
  emptySub: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
  },
  txList: {
    gap: 10,
    marginBottom: 16,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  timelineNumber: {
    fontSize: 11,
    fontWeight: "900",
    color: "#1D4ED8",
  },
  txMainInfo: {
    flex: 1,
    marginRight: 10,
  },
  txHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  invoiceBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  invoiceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  txDate: {
    fontSize: 11,
    color: colors.slate400,
    fontWeight: "600",
  },
  txNote: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.slate900,
  },
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  txWallet: {
    fontSize: 11,
    color: colors.slate500,
    fontWeight: "700",
  },
  groupBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  txRightCol: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#DC2626",
  },
  settledTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  settledTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },


});
