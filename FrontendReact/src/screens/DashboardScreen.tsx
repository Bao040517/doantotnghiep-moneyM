import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
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
  Image,
  AppState,
  DeviceEventEmitter,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { Bell, Sparkles } from "lucide-react-native";
import { Card } from "../components/ui/Card";
import { WalletManagerBottomSheet } from "../components/modals/WalletManagerBottomSheet";
import { AddTransactionModal } from "../components/modals/AddTransactionModal";
import { TransferBottomSheet } from "../components/modals/TransferBottomSheet";
import { ExternalLoanManagerBottomSheet } from "../components/modals/ExternalLoanManagerBottomSheet";
import { NotificationsBottomSheet } from "../components/modals/NotificationsBottomSheet";
import { QuickBankTransactionModal } from "../components/modals/QuickBankTransactionModal";
import { BankNotificationDetectorModal } from "../components/modals/BankNotificationDetectorModal";
import { ParsedBankNotification, parseBankNotificationText } from "../utils/bankNotificationParser";
import { FinancialHealthCard } from "../components/features/FinancialHealthCard";
import { colors } from "../constants/colors";
import { DashboardSkeleton } from "../components/ui/SkeletonLoader";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { financialServices, Category } from "../services/financialServices";
import { WalletPayload, TransactionPayload } from "../types";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { useTopSafeInset } from "../utils/responsive";

interface DashboardScreenProps {
  onNavigate?: (tab: string, targetId?: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
  const safeTopPadding = useTopSafeInset(12);
  const { unreadCount } = useNotifications();
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

  // ⚡ Zero-Latency Bank Notification States
  const [detectorVisible, setDetectorVisible] = useState(false);
  const [quickBankTxVisible, setQuickBankTxVisible] = useState(false);
  const [detectedBankData, setDetectedBankData] = useState<ParsedBankNotification | null>(null);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  useEffect(() => {
    financialServices.getCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategoriesList(cats);
      }
    }).catch(() => {});
  }, []);

  // ⚡ Tự động bắt biến động ngân hàng từ Clipboard khi người dùng quay lại ShareMoney
  const lastProcessedClipboard = useRef<string>("");
  useEffect(() => {
    const checkClipboardForBankTx = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (text && text.trim() && text !== lastProcessedClipboard.current) {
          const parsed = parseBankNotificationText(text.trim());
          if (parsed && parsed.isValid && parsed.amount > 0) {
            lastProcessedClipboard.current = text;
            setDetectedBankData(parsed);
            setQuickBankTxVisible(true);
          }
        }
      } catch (e) {
        // Ignore clipboard errors
      }
    };

    // Kiểm tra ngay khi mở màn hình
    checkClipboardForBankTx();

    // Lắng nghe khi người dùng chuyển từ app ngân hàng quay lại ShareMoney
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkClipboardForBankTx();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAddWallet = async (payload: WalletPayload) => {
    await financialServices.createWallet(payload);
    refresh();
  };

  const handleAddTransaction = async (walletId: string, payload: Omit<TransactionPayload, "walletId">) => {
    await financialServices.createTransaction(walletId, payload);
    refresh();
  };

  const fmt = (n: number) => {
    const safe = Math.abs(Math.round(Number(n) || 0));
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {isLoading && !wallets.length ? (
        <DashboardSkeleton />
      ) : (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[colors.indigo600]} />}
      >
        {/* ─── DARK HEADER HERO CARD ─── */}
        <View style={[styles.headerHeroContainer, { backgroundColor: themeColors.headerBg, paddingTop: safeTopPadding }]}>
          {/* Top User Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.userInfoRow}
              onPress={() => navigation.navigate("Profile" as never)}
              activeOpacity={0.8}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.userAvatarTop} />
              ) : (
                <View style={styles.handBadge}>
                  <Text style={{ fontSize: 18 }}>👋</Text>
                </View>
              )}
              <View>
                <Text style={styles.headerSubtitle}>Tổng quan Tài chính</Text>
                <Text style={styles.headerTitle}>{user?.name ? `Chào ${user.name},` : "Chào bạn,"}</Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setNotifSheetVisible(true)} style={styles.eyeBtn}>
                <Bell size={20} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
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
            {/* Ô 1: Tổng đã chi */}
            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("history")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>TỔNG ĐÃ CHI</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(totalActualExpense) : "••••••"}</Text>
            </TouchableOpacity>

            {/* Ô 2: Ngân sách */}
            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("budget")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>NGÂN SÁCH</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(totalBudgetLimit) : "••••••"}</Text>
            </TouchableOpacity>

            {/* Ô 3: Tiết kiệm */}
            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("savings")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>TIẾT KIỆM</Text>
              </View>
              <Text style={styles.metricVal}>{showBalance ? fmt(totalSavings) : "••••••"}</Text>
            </TouchableOpacity>

            {/* Ô 4: Sổ nợ (Người khác nợ & Mình nợ) */}
            <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate?.("groups")}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricTitle}>SỔ NỢ</Text>
              </View>
              {showBalance ? (
                <View style={styles.debtCompactContainer}>
                  <View style={styles.debtCompactRow}>
                    <Text style={styles.debtCompactLabel}>Người khác nợ:</Text>
                    <Text style={[styles.debtCompactVal, { color: "#4ADE80" }]}>+{fmt(debtSummary.totalOwed)}</Text>
                  </View>
                  <View style={styles.debtCompactRow}>
                    <Text style={styles.debtCompactLabel}>Mình nợ:</Text>
                    <Text style={[styles.debtCompactVal, { color: "#FB7185" }]}>-{fmt(debtSummary.totalOwing)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.metricVal}>••••••</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>



        {/* ─── AT-RISK BUDGET WARNING / ALL GOOD CARD ─── */}
        {totalWarningCount > 0 ? (
          <View style={[styles.warningCard, { backgroundColor: isDark ? "#1C1518" : "#FFFFFF", borderColor: isDark ? "#3D1B22" : "#FEE2E2" }]}>
            <View style={styles.warningHeaderRow}>
              <View style={styles.warningTitleGroup}>
                <View style={styles.redDot} />
                <Text style={[styles.warningTitleText, { color: isDark ? "#FDA4AF" : colors.slate800 }]} numberOfLines={1}>
                  CẢNH BÁO HẠN MỨC ({totalWarningCount})
                </Text>
              </View>

              <View style={[styles.warningBadge, { backgroundColor: isDark ? "#381216" : "#FFE4E6", borderColor: isDark ? "#5C1D24" : "#FECDD3" }]}>
                <Text style={styles.warningBadgeText}>
                  {overLimitBudgets.length > 0
                    ? `${overLimitBudgets.length} khoản vượt!`
                    : `${approachingBudgets.length} khoản sắp chạm`}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.warningPillsScroll}>
              {/* 1. Over Limit Budgets (Red) */}
              {overLimitBudgets.map((b, idx) => {
                const catName = (b.name || b.categoryName || "Khoản chi").replace(/^Ngân sách\s+/i, "");
                const pct = Math.round(((b.spentAmount || 0) / b.limitAmount) * 100);
                const overAmt = (b.spentAmount || 0) - b.limitAmount;

                return (
                  <TouchableOpacity
                    key={b.budgetId || `over-${idx}`}
                    onPress={() => onNavigate?.("budget", b.budgetId || b.id || b.categoryId)}
                    style={[
                      styles.overPill,
                      {
                        backgroundColor: isDark ? "#281419" : "#FFF5F5",
                        borderColor: isDark ? "#4D1D26" : "#FECDD3",
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pillTopRow}>
                      <View style={styles.pillIconBoxRed}>
                        <CategoryIcon name={b.categoryName || b.name || b.categoryIcon} size={15} />
                      </View>
                      <Text
                        style={[styles.overPillTitle, { color: isDark ? "#FFE4E6" : "#881337" }]}
                        numberOfLines={1}
                      >
                        {catName}
                      </Text>
                      <View style={styles.pillPctBadgeRed}>
                        <Text style={styles.pillPctTextRed}>{pct}%</Text>
                      </View>
                    </View>

                    <View style={[styles.pillTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FEE2E2" }]}>
                      <View style={[styles.pillFill, { width: "100%", backgroundColor: colors.rose600 }]} />
                    </View>

                    <View style={styles.pillBottomRow}>
                      <Text style={[styles.pillSubLabel, { color: isDark ? "#94A3B8" : colors.slate500 }]}>
                        Vượt mức
                      </Text>
                      <Text style={styles.overPillVal} numberOfLines={1}>
                        {fmt(overAmt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* 2. Approaching Limit Budgets (Amber) */}
              {approachingBudgets.map((b, idx) => {
                const catName = (b.name || b.categoryName || "Khoản chi").replace(/^Ngân sách\s+/i, "");
                const pct = Math.round(((b.spentAmount || 0) / b.limitAmount) * 100);
                const remainAmt = b.limitAmount - (b.spentAmount || 0);

                return (
                  <TouchableOpacity
                    key={b.budgetId || `approach-${idx}`}
                    onPress={() => onNavigate?.("budget", b.budgetId || b.id || b.categoryId)}
                    style={[
                      styles.approachingPill,
                      {
                        backgroundColor: isDark ? "#24190B" : "#FFFDF5",
                        borderColor: isDark ? "#453215" : "#FDE68A",
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pillTopRow}>
                      <View style={styles.pillIconBoxAmber}>
                        <CategoryIcon name={b.categoryName || b.name || b.categoryIcon} size={15} />
                      </View>
                      <Text
                        style={[styles.approachingPillTitle, { color: isDark ? "#FEF3C7" : "#78350F" }]}
                        numberOfLines={1}
                      >
                        {catName}
                      </Text>
                      <View style={styles.pillPctBadgeAmber}>
                        <Text style={styles.pillPctTextAmber}>{pct}%</Text>
                      </View>
                    </View>

                    <View style={[styles.pillTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FEF3C7" }]}>
                      <View style={[styles.pillFill, { width: `${Math.min(100, pct)}%`, backgroundColor: colors.amber500 }]} />
                    </View>

                    <View style={styles.pillBottomRow}>
                      <Text style={[styles.pillSubLabel, { color: isDark ? "#94A3B8" : colors.slate500 }]}>
                        Còn lại
                      </Text>
                      <Text style={styles.approachingPillVal} numberOfLines={1}>
                        {fmt(remainAmt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.successCard, { backgroundColor: isDark ? "#0A2118" : "#F0FDF4", borderColor: isDark ? "#14432E" : "#DCFCE7" }]}>
            <View style={styles.warningHeaderRow}>
              <View style={styles.warningTitleGroup}>
                <View style={styles.greenDot} />
                <Text style={[styles.successTitleText, { color: isDark ? "#4ADE80" : colors.emerald800 }]} numberOfLines={1}>
                  NGÂN SÁCH TRONG TẦM KIỂM SOÁT
                </Text>
              </View>

              <View style={[styles.successBadge, { backgroundColor: isDark ? "#123824" : "#DCFCE7", borderColor: isDark ? "#1C5236" : "#BBF7D0" }]}>
                <Text style={[styles.successBadgeText, { color: isDark ? "#4ADE80" : colors.emerald700 }]}>An toàn 100%</Text>
              </View>
            </View>

            <View style={styles.successContentRow}>
              <Text style={{ fontSize: 24, marginRight: 10 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.successMainText, { color: isDark ? "#ECFDF5" : colors.emerald900 }]}>
                  Tuyệt vời! Không có danh mục nào vượt ngân sách.
                </Text>
                <Text style={[styles.successSubText, { color: isDark ? "#A7F3D0" : colors.emerald700 }]}>
                  Tất cả chi tiêu tháng này đều đang nằm trong tầm kiểm soát an toàn.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── QUICK ACTIONS GRID (4 Action Buttons Balanced in 1 Row) ─── */}
        <View style={styles.quickActionGrid}>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("budget")} activeOpacity={0.7}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Text style={{ fontSize: 22 }}>🪙</Text>
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.textPrimary }]} numberOfLines={1}>Ngân sách</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("groups")} activeOpacity={0.7}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#E0F2FE" }]}>
              <Text style={{ fontSize: 22 }}>👥</Text>
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.textPrimary }]} numberOfLines={1}>Nhóm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("savings")} activeOpacity={0.7}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Text style={{ fontSize: 22 }}>🌱</Text>
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.textPrimary }]} numberOfLines={1}>Tiết kiệm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => onNavigate?.("history")} activeOpacity={0.7}>
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#EDE9FE" }]}>
              <Text style={{ fontSize: 22 }}>🕒</Text>
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.textPrimary }]} numberOfLines={1}>Lịch sử</Text>
          </TouchableOpacity>
        </View>

        {/* ─── BUDGET PROGRESS SECTION ─── */}
        <Text style={[styles.sectionHeaderTitle, { color: themeColors.textPrimary }]}>Ngân sách Tháng này</Text>
        <Card style={[styles.budgetCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
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
                        {fmt(cat.totalAmount)}
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
      )}

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

      {/* ⚡ Bank Notification Detector Modal (Input / Simulation) */}
      <BankNotificationDetectorModal
        visible={detectorVisible}
        onClose={() => setDetectorVisible(false)}
        onParsedResult={(result) => {
          setDetectedBankData(result);
          setQuickBankTxVisible(true);
        }}
      />

      {/* ⚡ Quick Bank Transaction Confirmation & Category Switcher Modal */}
      <QuickBankTransactionModal
        visible={quickBankTxVisible}
        onClose={() => setQuickBankTxVisible(false)}
        parsedData={detectedBankData}
        wallets={wallets}
        categories={categoriesList}
        onSuccess={() => {
          refresh();
        }}
      />

      {/* 🤖 Floating AI Assistant Button */}
      <TouchableOpacity
        style={styles.floatingAiBtn}
        onPress={() => DeviceEventEmitter.emit("OPEN_AI_CHATBOT")}
        activeOpacity={0.85}
      >
        <Sparkles size={22} color="#FFFFFF" />
        <View style={styles.floatingAiBadge}>
          <Text style={styles.floatingAiBadgeText}>AI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bankSyncBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  bankSyncBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  bankSyncIconGlow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bankSyncTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  zeroLatencyBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  zeroLatencyText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  bankSyncDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  bankSyncArrow: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
    marginLeft: 8,
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
  userAvatarTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
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
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 12,
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
  debtCompactContainer: {
    gap: 1,
  },
  debtCompactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debtCompactLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
  },
  debtCompactVal: {
    fontSize: 11,
    fontWeight: "900",
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

  /* Quick Actions Row */
  quickActionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate800,
    textAlign: "center",
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
    paddingRight: 4,
  },
  overPill: {
    width: 175,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  approachingPill: {
    width: 175,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  pillIconBoxRed: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  pillIconBoxAmber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  overPillTitle: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  approachingPillTitle: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  pillPctBadgeRed: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pillPctTextRed: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.rose600,
  },
  pillPctBadgeAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pillPctTextAmber: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.amber700,
  },
  pillTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  pillFill: {
    height: "100%",
    borderRadius: 3,
  },
  pillBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pillSubLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  overPillVal: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.rose600,
  },
  approachingPillVal: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.amber700,
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
  floatingAiBtn: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    zIndex: 99,
  },
  floatingAiBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  floatingAiBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#ffffff",
  },
});
