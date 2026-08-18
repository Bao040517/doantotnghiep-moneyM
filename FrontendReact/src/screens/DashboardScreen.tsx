import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { Card } from "../components/ui/Card";
import { WalletManagerBottomSheet } from "../components/modals/WalletManagerBottomSheet";
import { AddTransactionModal } from "../components/modals/AddTransactionModal";
import { TransferBottomSheet } from "../components/modals/TransferBottomSheet";
import { ExternalLoanManagerBottomSheet } from "../components/modals/ExternalLoanManagerBottomSheet";
import { NotificationsBottomSheet } from "../components/modals/NotificationsBottomSheet";
import { FinancialHealthCard } from "../components/features/FinancialHealthCard";
import { colors } from "../constants/colors";
import { useAppData } from "../hooks/useAppData";
import { financialServices } from "../services/financialServices";
import { WalletPayload, TransactionPayload } from "../types";
import { CategoryIcon } from "../components/ui/CategoryIcon";

interface DashboardScreenProps {
  onNavigate?: (tab: string, targetId?: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const {
    wallets,
    budgets,
    topExpenseCategories,
    totalWalletBalance,
    totalSavings,
    debtSummary,
    unpaidBudgetsAmount,
    totalBudgetLimit,
    totalBudgetSpent,
    totalActualExpense,
    safeToSpend,
    isLoading,
    refresh,
  } = useAppData();

  const [showBalance, setShowBalance] = useState(true);
  const [walletSheetVisible, setWalletSheetVisible] = useState(false);
  const [addTxVisible, setAddTxVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [defaultTxType, setDefaultTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [loanSheetVisible, setLoanSheetVisible] = useState(false);
  const [notifSheetVisible, setNotifSheetVisible] = useState(false);

  const handleAddWallet = async (payload: WalletPayload) => {
    await financialServices.createWallet(payload);
    refresh();
  };

  const handleAddTransaction = async (walletId: string, payload: Omit<TransactionPayload, "walletId">) => {
    await financialServices.createTransaction(walletId, payload);
    refresh();
  };

  const fmt = (n: number) => {
    const safe = Math.round(Number(n) || 0);
    return safe.toLocaleString("vi-VN") + "đ";
  };

  const daysLeft = (() => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return end.getDate() - today.getDate() + 1;
  })();

  const budgetPct = totalBudgetLimit > 0 ? Math.min(100, Math.round((totalBudgetSpent / totalBudgetLimit) * 100)) : 0;

  const overLimitBudgets = (budgets || []).filter(
    (b) => (b.limitAmount || 0) > 0 && (b.spentAmount || 0) > b.limitAmount
  );
  const approachingBudgets = (budgets || []).filter(
    (b) =>
      (b.limitAmount || 0) > 0 &&
      (b.spentAmount || 0) <= b.limitAmount &&
      ((b.spentAmount || 0) / b.limitAmount) >= 0.8
  );
  const totalWarningCount = overLimitBudgets.length + approachingBudgets.length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[colors.indigo600]} />}
      >
        {/* ─── DARK HEADER HERO CARD ─── */}
        <View style={styles.headerHeroContainer}>
          {/* Top User Bar */}
          <View style={styles.topBar}>
            <View style={styles.userInfoRow}>
              <View style={styles.handBadge}>
                <Text style={{ fontSize: 18 }}>👋</Text>
              </View>
              <View>
                <Text style={styles.headerSubtitle}>Tổng quan Tài chính</Text>
                <Text style={styles.headerTitle}>Chào bạn,</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setNotifSheetVisible(true)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>🔔</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>{showBalance ? "👁️" : "🙈"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Available Balance Display */}
          <View style={styles.heroSection}>
            <View style={styles.heroLabelRow}>
              <Text style={styles.heroLabel}>SỐ DƯ KHẢ DỤNG (TỔNG CÁC VÍ)</Text>
              <View style={styles.daysBadge}>
                <Text style={styles.daysBadgeText}>Còn {daysLeft} ngày</Text>
              </View>
            </View>

            <Text style={styles.mainBalanceText}>
              {showBalance ? fmt(totalWalletBalance) : "••••••••"}
            </Text>

            <View style={styles.dailyLimitBadge}>
              <Text style={styles.dailyLimitLabel}>Chi tiêu an toàn hôm nay: </Text>
              <Text style={styles.dailyLimitVal}>
                {showBalance ? fmt(safeToSpend / (daysLeft || 1)) : "••••••••"}
              </Text>
            </View>
          </View>

          {/* 4 Metric Grid (2x2) */}
          <View style={styles.grid4}>
            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("history")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>TỔNG ĐÃ CHI (TẤT CẢ)</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(totalActualExpense) : "••••••"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("savings")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>TỔNG TIỀN TIẾT KIỆM</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(totalSavings) : "••••••"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("groups")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>NỢ CẦN THU</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(debtSummary.totalOwed) : "••••••"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("groups")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>NỢ PHẢI TRẢ</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(debtSummary.totalOwing) : "••••••"}</Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* ─── AT-RISK BUDGET WARNING / ALL GOOD CARD ─── */}
        {totalWarningCount > 0 ? (
          <View style={styles.warningCard}>
            <View style={styles.warningHeaderRow}>
              <View style={styles.warningTitleGroup}>
                <View style={styles.redDot} />
                <Text style={styles.warningTitleText} numberOfLines={1}>
                  CẢNH BÁO HẠN MỨC ({totalWarningCount})
                </Text>
              </View>

              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>
                  {overLimitBudgets.length > 0
                    ? `${overLimitBudgets.length} khoản vượt!`
                    : `${approachingBudgets.length} khoản sắp chạm`}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.warningPillsScroll}>
              {/* Over Limit Budgets (Red) */}
              {overLimitBudgets.map((b, idx) => {
                const catName = (b.name || b.categoryName || "Khoản chi").replace(/^Ngân sách\s+/i, "");
                const pct = Math.round(((b.spentAmount || 0) / b.limitAmount) * 100);
                const overAmt = (b.spentAmount || 0) - b.limitAmount;

                return (
                  <TouchableOpacity
                    key={b.budgetId || idx}
                    onPress={() => onNavigate?.("budget", b.budgetId || b.id || b.categoryId)}
                    style={styles.overPill}
                  >
                    <View style={styles.pillTopRow}>
                      <View style={styles.pillLabelRow}>
                        <CategoryIcon name={b.categoryName || b.name || b.categoryIcon} size={18} />
                        <Text style={styles.overPillTitle} numberOfLines={1}>
                          {catName}
                        </Text>
                      </View>
                      <Text style={styles.overPillPct}>{pct}%</Text>
                    </View>

                    <View style={styles.pillTrack}>
                      <View style={[styles.pillFill, { width: "100%", backgroundColor: colors.rose600 }]} />
                    </View>

                    <Text style={styles.overPillVal}>Vượt {fmt(overAmt)}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Approaching Limit Budgets (Amber) */}
              {approachingBudgets.map((b, idx) => {
                const catName = (b.name || b.categoryName || "Khoản chi").replace(/^Ngân sách\s+/i, "");
                const pct = Math.round(((b.spentAmount || 0) / b.limitAmount) * 100);
                const remainAmt = b.limitAmount - (b.spentAmount || 0);

                return (
                  <TouchableOpacity
                    key={b.budgetId || idx}
                    onPress={() => onNavigate?.("budget", b.budgetId || b.id || b.categoryId)}
                    style={styles.approachingPill}
                  >
                    <View style={styles.pillTopRow}>
                      <View style={styles.pillLabelRow}>
                        <CategoryIcon name={b.categoryName || b.name || b.categoryIcon} size={18} />
                        <Text style={styles.approachingPillTitle} numberOfLines={1}>
                          {catName}
                        </Text>
                      </View>
                      <Text style={styles.approachingPillPct}>{pct}%</Text>
                    </View>

                    <View style={styles.pillTrack}>
                      <View
                        style={[
                          styles.pillFill,
                          { width: `${Math.min(100, pct)}%`, backgroundColor: colors.amber500 },
                        ]}
                      />
                    </View>

                    <Text style={styles.approachingPillVal}>Còn {fmt(remainAmt)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.successCard}>
            <View style={styles.warningHeaderRow}>
              <View style={styles.warningTitleGroup}>
                <View style={styles.greenDot} />
                <Text style={styles.successTitleText} numberOfLines={1}>
                  TRẠNG THÁI NGÂN SÁCH
                </Text>
              </View>

              <View style={styles.successBadge}>
                <Text style={styles.successBadgeText}>An toàn 100%</Text>
              </View>
            </View>

            <View style={styles.successContentRow}>
              <Text style={{ fontSize: 24, marginRight: 10 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.successMainText}>
                  Tuyệt vời! Bạn không có khoản nào bị vượt ngân sách.
                </Text>
                <Text style={styles.successSubText}>
                  Tất cả danh mục chi tiêu đều đang nằm trong tầm kiểm soát an toàn.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── QUICK ACTIONS GRID (6 Circular Action Buttons) ─── */}
        <View style={styles.quickActionGrid}>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("budget")}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: colors.amber50 }]}>
              <Text style={{ fontSize: 20 }}>🪙</Text>
            </View>
            <Text style={styles.quickActionText}>Ngân sách</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("groups")}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#FFF7ED" }]}>
              <Text style={{ fontSize: 20 }}>👥</Text>
            </View>
            <Text style={styles.quickActionText}>Nhóm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("savings")}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#F3E8FF" }]}>
              <Text style={{ fontSize: 20 }}>🌱</Text>
            </View>
            <Text style={styles.quickActionText}>Tiết kiệm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("history")}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: colors.slate100 }]}>
              <Text style={{ fontSize: 20 }}>🕒</Text>
            </View>
            <Text style={styles.quickActionText}>Lịch sử</Text>
          </TouchableOpacity>
        </View>

        {/* ─── BUDGET PROGRESS SECTION ─── */}
        <Text style={styles.sectionHeaderTitle}>Ngân sách Tháng này</Text>
        <Card style={styles.budgetCard}>
          <TouchableOpacity onPress={() => onNavigate?.("budget")} activeOpacity={0.7}>
            <View style={styles.budgetHeaderRow}>
              <View>
                <Text style={styles.budgetHeaderSubHighlighted}>ĐÃ CHI TIÊU 🎯</Text>
                <Text style={styles.budgetHeaderVal}>
                  {fmt(totalBudgetSpent)}{" "}
                  <Text style={styles.budgetHeaderLimit}>/ {fmt(totalBudgetLimit)}</Text>
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${budgetPct}%`,
                    backgroundColor: budgetPct >= 100 ? colors.rose600 : budgetPct >= 80 ? colors.amber500 : colors.emerald500,
                  },
                ]}
              />
            </View>

            <Text style={styles.budgetSubtext}>Nhấn để xem chi tiết Ngân sách & Giao dịch</Text>
          </TouchableOpacity>

          {/* Top 5 Expense Category Leaderboard */}
          {topExpenseCategories.length > 0 && (
            <View style={styles.leaderboardSection}>
              <Text style={styles.leaderboardTitle}>🏆 BẢNG XẾP HẠNG CHI TIÊU</Text>
              {topExpenseCategories.slice(0, 5).map((cat, idx) => {
                const maxAmount = topExpenseCategories[0].totalAmount || 1;
                const barPct = Math.min(100, Math.round((cat.totalAmount / maxAmount) * 100));
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                return (
                  <View key={idx} style={styles.leaderboardItem}>
                    <View style={[styles.leaderboardBarFill, { width: `${barPct}%` }]} />
                    <View style={styles.leaderboardContent}>
                      <View style={styles.leaderboardLeft}>
                        <Text style={styles.medalIcon}>{medals[idx]}</Text>
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.categoryNameText}>{cat.categoryName}</Text>
                            {idx === 0 && (
                              <View style={styles.topBadge}>
                                <Text style={styles.topBadgeText}>VÔ ĐỊCH 💸</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.categoryPctText}>
                            Chiếm {cat.percentage ? cat.percentage.toFixed(1) : 0}% tháng này
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.categoryAmountText, idx === 0 && { color: colors.rose600 }]}>
                        -{fmt(cat.totalAmount)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* ─── FINANCIAL HEALTH SECTION ─── */}
        <FinancialHealthCard />
      </ScrollView>

      {/* Wallet Bottom Sheet */}
      <WalletManagerBottomSheet
        visible={walletSheetVisible}
        onClose={() => setWalletSheetVisible(false)}
        wallets={wallets}
        onAddWallet={handleAddWallet}
      />

      {/* Add Transaction Bottom Sheet */}
      <AddTransactionModal
        visible={addTxVisible}
        onClose={() => setAddTxVisible(false)}
        wallets={wallets}
        onAddTransaction={handleAddTransaction}
        defaultType={defaultTxType}
      />

      {/* Transfer Bottom Sheet */}
      <TransferBottomSheet
        visible={transferVisible}
        onClose={() => setTransferVisible(false)}
        onSuccess={() => refresh()}
      />

      {/* External Loan Bottom Sheet */}
      <ExternalLoanManagerBottomSheet
        visible={loanSheetVisible}
        onClose={() => setLoanSheetVisible(false)}
      />

      {/* Notifications Bottom Sheet */}
      <NotificationsBottomSheet
        visible={notifSheetVisible}
        onClose={() => setNotifSheetVisible(false)}
        onReadAction={() => {}} // Could refresh unread count if needed
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerHeroContainer: {
    backgroundColor: "#0F172A",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    padding: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 16 : 54,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  handBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.white,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    marginBottom: 20,
  },
  heroLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.5,
  },
  daysBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  daysBadgeText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  mainBalanceText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#4ADE80",
    marginBottom: 10,
  },
  dailyLimitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  dailyLimitLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  dailyLimitVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4ADE80",
  },
  grid4: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.3,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.white,
  },

  /* Breakdown Card */
  breakdownCard: {
    marginHorizontal: 20,
    marginTop: -20,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 4,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownLabelBold: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate800,
  },
  breakdownValBold: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate600,
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: "800",
  },

  /* Quick Actions Grid */
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickActionItem: {
    width: "30%",
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },

  /* Section Header */
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  /* Budget Progress Section */
  budgetCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  warningCard: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE4E6",
    marginBottom: 20,
    shadowColor: "#F43F5E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  successCard: {
    marginHorizontal: 20,
    backgroundColor: "#F0FDF4",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald600,
  },
  successTitleText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.emerald800,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  successBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexShrink: 0,
  },
  successBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.emerald700,
  },
  successContentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  successMainText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.emerald900,
    marginBottom: 2,
  },
  successSubText: {
    fontSize: 11,
    color: colors.emerald700,
    fontWeight: "500",
  },
  warningHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  warningTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.rose600,
  },
  warningTitleText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.slate800,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  warningBadge: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECDD3",
    flexShrink: 0,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.rose600,
  },
  warningPillsScroll: {
    gap: 10,
  },
  overPill: {
    width: 160,
    backgroundColor: "#FFF1F2",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  approachingPill: {
    width: 160,
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pillTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pillLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  overPillTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#881337",
    flexShrink: 1,
  },
  approachingPillTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#78350F",
    flexShrink: 1,
  },
  overPillPct: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.rose600,
  },
  approachingPillPct: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.amber600,
  },
  pillTrack: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  pillFill: {
    height: "100%",
    borderRadius: 3,
  },
  overPillVal: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.rose700,
    textAlign: "right",
  },
  approachingPillVal: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.amber700,
    textAlign: "right",
  },
  budgetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  budgetHeaderSub: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  budgetHeaderSubHighlighted: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.emerald600,
    letterSpacing: 0.5,
  },
  budgetHeaderVal: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.slate900,
    marginTop: 2,
  },
  budgetHeaderLimit: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate400,
  },
  manageBudgetBadge: {
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  manageBudgetBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emerald600,
  },
  totalAllExpenseBadge: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "flex-end",
  },
  totalAllExpenseBadgeTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
    letterSpacing: 0.4,
  },
  totalAllExpenseBadgeVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#DC2626",
    marginTop: 2,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: colors.slate100,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  budgetSubtext: {
    fontSize: 11,
    color: colors.slate400,
    textAlign: "center",
    fontWeight: "500",
  },
  leaderboardSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  leaderboardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate800,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  leaderboardItem: {
    position: "relative",
    backgroundColor: colors.white,
    borderColor: colors.slate100,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  leaderboardBarFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FFF1F2",
    opacity: 0.8,
  },
  leaderboardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leaderboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  medalIcon: {
    fontSize: 20,
  },
  categoryNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  topBadge: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.rose600,
  },
  categoryPctText: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  categoryAmountText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.slate800,
  },
});
