import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import {
  Search,
  AlertTriangle,
  Inbox,
  Banknote,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  RotateCcw,
  TrendingUp,
  CreditCard,
} from "lucide-react-native";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { NotificationBottomSheet } from "../components/modals/NotificationBottomSheet";
import { CashflowComparisonBottomSheet } from "../components/modals/CashflowComparisonBottomSheet";
import { TotalExpenseDetailBottomSheet } from "../components/modals/TotalExpenseDetailBottomSheet";
import { EditTransactionModal } from "../components/modals/EditTransactionModal";
import { colors } from "../constants/colors";
import { financialServices, Category } from "../services/financialServices";
import { Transaction, MonthlySummary, Wallet as WalletType } from "../types";
import { matchVietnamese } from "../utils/vietnamese";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { HistorySkeleton } from "../components/ui/SkeletonLoader";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { useTheme } from "../context/ThemeContext";
import { useGlobalDataRefresh } from "../hooks/useGlobalDataRefresh";

interface DayGroup {
  dateKey: string;
  displayDate: string;
  dayExpense: number;
  dayIncome: number;
  transactions: Transaction[];
}

export const HistoryScreen: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { user } = useAuth();
  const { unreadCount: unreadNotifCount, fetchUnreadCount } = useNotifications();
  const [notifVisible, setNotifVisible] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Modal states
  const [showCompModal, setShowCompModal] = useState(false);
  const [showTotalExpenseModal, setShowTotalExpenseModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, sumData, uncatCount, walletData, catData] = await Promise.all([
        financialServices.getMonthlyTransactions(selectedYear, selectedMonth).catch(() => []),
        financialServices.getMonthlySummary(selectedYear, selectedMonth).catch(() => null),
        financialServices.getUncategorizedCount().catch(() => 0),
        financialServices.getWallets().catch(() => []),
        financialServices.getCategories().catch(() => []),
      ]);
      setTransactions(txData || []);
      setSummary(sumData);
      setUncategorizedCount(uncatCount || 0);
      setWallets(walletData || []);
      setCategories(catData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useGlobalDataRefresh(loadData);

  useEffect(() => {
    loadData();
    fetchUnreadCount();
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

  const fmt = (n?: number) => {
    const safe = Math.round(Math.abs(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + "đ";
  };

  // Month-wide totals
  const currentMonthExpense = useMemo(() => {
    return (
      transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) ||
      (summary?.currentMonth?.totalExpense ?? summary?.totalExpense ?? 0)
    );
  }, [transactions, summary]);

  const currentMonthIncome = useMemo(() => {
    return (
      transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) ||
      (summary?.currentMonth?.totalIncome ?? summary?.totalIncome ?? 0)
    );
  }, [transactions, summary]);

  const netCashflow = currentMonthIncome - currentMonthExpense;

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== "ALL") count++;
    if (selectedCategoryId !== "ALL") count++;
    if (search.trim()) count++;
    return count;
  }, [typeFilter, selectedCategoryId, search]);

  const resetFilters = () => {
    setTypeFilter("ALL");
    setSelectedCategoryId("ALL");
    setSearch("");
  };

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((t: any) => {
      // 1. Type Filter
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;

      // 2. Category Filter
      if (selectedCategoryId !== "ALL") {
        const catId = t.categoryId || t.category?.id;
        if (catId !== selectedCategoryId) return false;
      }

      // 4. Search text
      if (search.trim()) {
        const catName = t.categoryName || t.category?.name || "";
        const note = t.note || "";
        const walletName = t.walletName || "";
        const payee = t.payeeName || "";
        const match =
          matchVietnamese(catName, search) ||
          matchVietnamese(note, search) ||
          matchVietnamese(walletName, search) ||
          matchVietnamese(payee, search);
        if (!match) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, selectedCategoryId, search]);

  // Date Formatting Helper
  const getDayLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      const dayOfWeekArr = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayOfWeek = dayOfWeekArr[d.getDay()];

      const DD = String(d.getDate()).padStart(2, "0");
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const YYYY = d.getFullYear();

      if (isToday) return `Hôm nay • ${DD}/${MM}`;
      if (isYesterday) return `Hôm qua • ${DD}/${MM}`;
      return `${dayOfWeek} • ${DD}/${MM}/${YYYY}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimeStr = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "";
    }
  };

  // Group transactions by date
  const groupedDays: DayGroup[] = useMemo(() => {
    const map = new Map<string, { displayDate: string; dayExpense: number; dayIncome: number; txs: Transaction[] }>();

    // Sort descending by transactionDate
    const sorted = [...filtered].sort((a, b) => {
      const timeA = new Date(a.transactionDate || 0).getTime();
      const timeB = new Date(b.transactionDate || 0).getTime();
      return timeB - timeA;
    });

    sorted.forEach((item) => {
      let key = "Khác";
      if (item.transactionDate) {
        try {
          const d = new Date(item.transactionDate);
          if (!isNaN(d.getTime())) {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }
        } catch {
          key = "Khác";
        }
      }

      if (!map.has(key)) {
        map.set(key, {
          displayDate: getDayLabel(item.transactionDate),
          dayExpense: 0,
          dayIncome: 0,
          txs: [],
        });
      }

      const entry = map.get(key)!;
      entry.txs.push(item);
      if (item.type === "EXPENSE") {
        entry.dayExpense += Number(item.amount) || 0;
      } else if (item.type === "INCOME") {
        entry.dayIncome += Number(item.amount) || 0;
      }
    });

    return Array.from(map.entries()).map(([dateKey, val]) => ({
      dateKey,
      displayDate: val.displayDate,
      dayExpense: val.dayExpense,
      dayIncome: val.dayIncome,
      transactions: val.txs,
    }));
  }, [filtered]);

  if (loading && transactions.length === 0) {
    return <HistorySkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : "#F8FAFC" }]}>
      {/* ─── STANDARD SCREEN TOP HEADER ─── */}
      <ScreenHeader
        title="Lịch sử giao dịch"
        showBack={true}
        showNotif={true}
        onNotifPress={() => setNotifVisible(true)}
        unreadCount={unreadNotifCount}
        showAvatar={true}
        avatarUrl={user?.avatarUrl}
        userName={user?.name}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[colors.emerald600]} />}
      >
        {/* ─── SEARCH & TOP OVERVIEW CARD ─── */}
        <View
          style={[
            styles.headerContainer,
            {
              backgroundColor: isDark ? themeColors.card : colors.white,
              borderBottomColor: isDark ? themeColors.border : "#F1F5F9",
            },
          ]}
        >
          {/* Search Row */}
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <Input
                icon={<Search size={18} color="#64748b" />}
                placeholder="Tìm ghi chú, danh mục, ví, người nhận..."
                defaultValue={search}
                onChangeText={(text) => {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = setTimeout(() => {
                    setSearch(text);
                  }, 250);
                }}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {/* ─── SUMMARY HERO CARD (TỔNG QUAN THÁNG X) ─── */}
          <Card
            style={[
              styles.overviewCard,
              {
                backgroundColor: isDark ? themeColors.surface : "#FFFFFF",
                borderColor: isDark ? themeColors.border : "#E2E8F0",
              },
            ]}
          >
            {/* Header with Month Switcher */}
            <View style={styles.overviewHeaderRow}>
              <View>
                <Text style={[styles.overviewSubtitle, { color: isDark ? themeColors.textSecondary : "#64748B" }]}>
                  Tổng quan thu chi
                </Text>
                <Text style={[styles.overviewTitle, { color: themeColors.textPrimary }]}>
                  Dòng tiền
                </Text>
              </View>

              <View
                style={[
                  styles.monthPill,
                  {
                    backgroundColor: isDark ? "#83184325" : "#FDF2F8",
                    borderColor: isDark ? "#9D174D" : "#FCE7F3",
                    borderWidth: 1,
                  },
                ]}
              >
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                  <ChevronLeft size={16} color="#EC4899" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={[styles.monthText, { color: "#DB2777" }]}>
                  Tháng {selectedMonth}/{selectedYear}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                  <ChevronRight size={16} color="#EC4899" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 3 Metric Cards: Tổng chi | Tổng thu | Dòng tiền ròng */}
            <View style={styles.metricCardsRow}>
              {/* Tổng chi */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: isDark ? themeColors.card : "#FFF1F2", borderColor: isDark ? themeColors.border : "#FFE4E6" },
                ]}
                onPress={() => setShowTotalExpenseModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.metricCardHeader}>
                  <ArrowDownRight size={14} color="#E11D48" strokeWidth={2.5} />
                  <Text style={[styles.metricLabel, { color: isDark ? "#FDA4AF" : "#9F1239" }]}>Tổng chi</Text>
                </View>
                <Text style={[styles.metricValue, { color: isDark ? "#FECDD3" : "#BE123C" }]}>
                  {fmt(currentMonthExpense)}
                </Text>
              </TouchableOpacity>

              {/* Tổng thu */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: isDark ? themeColors.card : "#ECFDF5", borderColor: isDark ? themeColors.border : "#D1FAE5" },
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.metricCardHeader}>
                  <ArrowUpRight size={14} color="#059669" strokeWidth={2.5} />
                  <Text style={[styles.metricLabel, { color: isDark ? "#6EE7B7" : "#065F46" }]}>Tổng thu</Text>
                </View>
                <Text style={[styles.metricValue, { color: isDark ? "#A7F3D0" : "#047857" }]}>
                  {fmt(currentMonthIncome)}
                </Text>
              </TouchableOpacity>

              {/* So sánh & Dòng tiền ròng */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: isDark ? themeColors.card : "#F0FDF4", borderColor: isDark ? themeColors.border : "#DCFCE7" },
                ]}
                onPress={() => setShowCompModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.metricCardHeader}>
                  <TrendingUp size={14} color={netCashflow >= 0 ? "#10B981" : "#E11D48"} strokeWidth={2.5} />
                  <Text style={[styles.metricLabel, { color: isDark ? themeColors.textSecondary : "#475569" }]}>Ròng</Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    { color: netCashflow >= 0 ? "#10B981" : "#E11D48" },
                  ]}
                >
                  {netCashflow >= 0 ? "+" : "-"}
                  {fmt(Math.abs(netCashflow))}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Strip: Link to Budget */}
            <View style={styles.bottomStripRow}>
              <Text style={[styles.bottomStripLeftText, { color: isDark ? themeColors.textSecondary : "#64748B" }]}>
                Muốn kiểm soát chi tiêu tốt hơn?
              </Text>
              <TouchableOpacity onPress={() => onNavigate?.("budget")} activeOpacity={0.7}>
                <Text style={styles.budgetLinkText}>Đặt ngân sách ›</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* ─── ADVANCED FILTER BAR ─── */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {/* Type: All */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === "ALL" && styles.filterChipActive,
                { backgroundColor: typeFilter === "ALL" ? "#10B981" : (isDark ? themeColors.card : colors.white) },
              ]}
              onPress={() => setTypeFilter("ALL")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: typeFilter === "ALL" ? colors.white : (isDark ? themeColors.textPrimary : colors.slate700) },
                ]}
              >
                Tất cả ({transactions.length})
              </Text>
            </TouchableOpacity>

            {/* Type: Expense */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === "EXPENSE" && { backgroundColor: "#E11D48", borderColor: "#E11D48" },
                { backgroundColor: typeFilter === "EXPENSE" ? "#E11D48" : (isDark ? themeColors.card : colors.white) },
              ]}
              onPress={() => setTypeFilter(typeFilter === "EXPENSE" ? "ALL" : "EXPENSE")}
            >
              <ArrowDownRight
                size={14}
                color={typeFilter === "EXPENSE" ? colors.white : "#E11D48"}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: typeFilter === "EXPENSE" ? colors.white : (isDark ? themeColors.textPrimary : colors.slate700) },
                ]}
              >
                Khoản chi
              </Text>
            </TouchableOpacity>

            {/* Type: Income */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === "INCOME" && { backgroundColor: "#059669", borderColor: "#059669" },
                { backgroundColor: typeFilter === "INCOME" ? "#059669" : (isDark ? themeColors.card : colors.white) },
              ]}
              onPress={() => setTypeFilter(typeFilter === "INCOME" ? "ALL" : "INCOME")}
            >
              <ArrowUpRight
                size={14}
                color={typeFilter === "INCOME" ? colors.white : "#059669"}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: typeFilter === "INCOME" ? colors.white : (isDark ? themeColors.textPrimary : colors.slate700) },
                ]}
              >
                Khoản thu
              </Text>
            </TouchableOpacity>

            {/* Category Filter Selector Button */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategoryId !== "ALL" && styles.filterChipActive,
                { backgroundColor: selectedCategoryId !== "ALL" ? "#10B981" : (isDark ? themeColors.card : colors.white) },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Filter size={14} color={selectedCategoryId !== "ALL" ? colors.white : "#64748B"} strokeWidth={2} />
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedCategoryId !== "ALL" ? colors.white : (isDark ? themeColors.textPrimary : colors.slate700) },
                ]}
              >
                {selectedCategoryId !== "ALL"
                  ? categories.find((c) => c.id === selectedCategoryId)?.name || "Danh mục"
                  : "Danh mục"}
              </Text>
            </TouchableOpacity>

            {/* Reset Filter Button */}
            {activeFiltersCount > 0 && (
              <TouchableOpacity style={styles.resetFilterChip} onPress={resetFilters}>
                <RotateCcw size={14} color="#E11D48" strokeWidth={2} />
                <Text style={styles.resetFilterText}>Xóa lọc ({activeFiltersCount})</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ─── UNCATEGORIZED BANNER ─── */}
        {uncategorizedCount > 0 && (
          <TouchableOpacity
            style={styles.uncategorizedBanner}
            onPress={() => setSearch("chưa phân loại")}
            activeOpacity={0.8}
          >
            <AlertTriangle size={20} color="#E11D48" strokeWidth={2} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.uncategorizedTitle}>Giao dịch chưa phân loại ({uncategorizedCount})</Text>
              <Text style={styles.uncategorizedSub}>Chạm để gán danh mục giúp báo cáo và cố vấn AI chuẩn xác hơn</Text>
            </View>
            <ChevronRight size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* ─── TRANSACTIONS LIST SECTION (DATE GROUPED) ─── */}
        <View style={styles.listContainer}>
          {groupedDays.length === 0 ? (
            <Card
              style={[
                styles.emptyCard,
                { backgroundColor: isDark ? themeColors.card : colors.white, borderColor: isDark ? themeColors.border : "#E2E8F0" },
              ]}
            >
              <Inbox size={42} color="#10B981" strokeWidth={1.5} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                Không có giao dịch nào
              </Text>
              <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
                {activeFiltersCount > 0
                  ? "Không tìm thấy giao dịch nào khớp với bộ lọc hiện tại."
                  : `Chưa có giao dịch nào được ghi nhận trong Tháng ${selectedMonth}/${selectedYear}.`}
              </Text>
              {activeFiltersCount > 0 && (
                <TouchableOpacity style={styles.emptyResetBtn} onPress={resetFilters}>
                  <Text style={styles.emptyResetBtnText}>Xóa tất cả bộ lọc</Text>
                </TouchableOpacity>
              )}
            </Card>
          ) : (
            groupedDays.map((group) => (
              <View key={group.dateKey} style={styles.dayGroupWrapper}>
                {/* Day Header */}
                <View style={styles.dayHeaderRow}>
                  <Text style={[styles.dayDateTitle, { color: isDark ? themeColors.textPrimary : "#0F172A" }]}>
                    {group.displayDate}
                  </Text>
                  <View style={styles.dayTotalsRow}>
                    {group.dayIncome > 0 && (
                      <Text style={styles.dayIncomeText}>
                        +{fmt(group.dayIncome)}
                      </Text>
                    )}
                    {group.dayExpense > 0 && (
                      <Text style={styles.dayExpenseText}>
                        -{fmt(group.dayExpense)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Day Transactions Card */}
                <Card
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: isDark ? themeColors.card : colors.white,
                      borderColor: isDark ? themeColors.border : "#E2E8F0",
                    },
                  ]}
                >
                  {group.transactions.map((item, idx) => {
                    const isLast = idx === group.transactions.length - 1;
                    const isIncome = item.type === "INCOME";
                    const isCash =
                      item.paymentMethod === "CASH" ||
                      (item.note && (item.note.toLowerCase().includes("tiền mặt") || item.note.toLowerCase().includes("tien mat")));
                    const isSplit = item.isSplit || !!item.linkedExpenseId;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setSelectedTx(item);
                          setEditModalVisible(true);
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.txRowItem,
                          !isLast && [styles.txRowBorder, { borderBottomColor: isDark ? themeColors.border : "#F1F5F9" }],
                        ]}
                      >
                        {/* 2D Category Icon Circle */}
                        <View
                          style={[
                            styles.txIconBg,
                            { backgroundColor: isIncome ? "#ECFDF5" : "#FEF3C7" },
                          ]}
                        >
                          <CategoryIcon
                            name={
                              item.categoryName ||
                              (item as any).category?.name ||
                              item.categoryIcon ||
                              (isIncome ? "Tiền lương" : "Khác")
                            }
                            size={22}
                          />
                        </View>

                        {/* Transaction Details */}
                        <View style={styles.txMainInfo}>
                          <Text
                            style={[
                              styles.txNameText,
                              { color: isDark ? themeColors.textPrimary : "#0F172A" },
                            ]}
                            numberOfLines={2}
                          >
                            {item.note || item.categoryName || (item as any).category?.name || "Giao dịch"}
                          </Text>

                          {/* Time & Badges */}
                          <View style={styles.txMetaRow}>
                            {formatTimeStr(item.transactionDate) ? (
                              <Text style={[styles.txTimeText, { color: themeColors.textSecondary }]}>
                                {formatTimeStr(item.transactionDate)}
                              </Text>
                            ) : null}

                            {/* Category Badge */}
                            {(item.categoryName || (item as any).category?.name) && (
                              <View
                                style={[
                                  styles.badge,
                                  { backgroundColor: isDark ? themeColors.surface : "#F1F5F9" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgeText,
                                    { color: isDark ? themeColors.textSecondary : "#475569" },
                                  ]}
                                >
                                  {item.categoryName || (item as any).category?.name}
                                </Text>
                              </View>
                            )}

                            {/* Wallet / Cash Badge */}
                            {item.walletName ? (
                              <View style={[styles.badge, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                  <CreditCard size={11} color="#16A34A" strokeWidth={2} />
                                  <Text style={[styles.badgeText, { color: "#16A34A", fontWeight: "600" }]}>
                                    {item.walletName}
                                  </Text>
                                </View>
                              </View>
                            ) : isCash ? (
                              <View style={[styles.badge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                  <Banknote size={11} color="#059669" strokeWidth={2} />
                                  <Text style={[styles.badgeText, { color: "#059669", fontWeight: "600" }]}>
                                    Tiền mặt
                                  </Text>
                                </View>
                              </View>
                            ) : null}

                            {/* Split Bill / Group Badge */}
                            {isSplit && (
                              <View style={[styles.badge, { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                  <Users size={11} color="#4F46E5" strokeWidth={2} />
                                  <Text style={[styles.badgeText, { color: "#4F46E5", fontWeight: "700" }]}>
                                    Chia nhóm
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Transaction Amount */}
                        <Text
                          style={[
                            styles.txAmountText,
                            { color: isIncome ? "#059669" : (isDark ? "#F87171" : "#0F172A") },
                          ]}
                        >
                          {isIncome ? "+" : "-"}
                          {fmt(item.amount)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </Card>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ─── CATEGORY FILTER MODAL ─── */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.categoryModalCard, { backgroundColor: isDark ? themeColors.card : colors.white }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Chọn danh mục lọc</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* All Categories option */}
              <TouchableOpacity
                style={[
                  styles.categoryOptionRow,
                  selectedCategoryId === "ALL" && { backgroundColor: isDark ? themeColors.surface : "#ECFDF5" },
                ]}
                onPress={() => {
                  setSelectedCategoryId("ALL");
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.categoryOptionText, { color: themeColors.textPrimary }]}>
                  Tất cả danh mục
                </Text>
                {selectedCategoryId === "ALL" && <Check size={18} color="#10B981" />}
              </TouchableOpacity>

              {categories.map((c) => {
                const isSelected = selectedCategoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryOptionRow,
                      isSelected && { backgroundColor: isDark ? themeColors.surface : "#ECFDF5" },
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(c.id);
                      setShowCategoryModal(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <CategoryIcon name={c.iconName || c.name} size={20} />
                      <Text style={[styles.categoryOptionText, { color: themeColors.textPrimary }]}>
                        {c.name}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── NOTIFICATION BOTTOM SHEET ─── */}
      <NotificationBottomSheet
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />

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
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    padding: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* Overview Card */
  overviewCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  overviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  overviewSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 4,
  },
  monthNavBtn: {
    padding: 2,
  },
  monthText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#DB2777",
    paddingHorizontal: 4,
  },

  /* Metric Cards */
  metricCardsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "900",
  },

  /* Bottom Strip */
  bottomStripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  bottomStripLeftText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  budgetLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
  },

  /* Filter Section */
  filterSection: {
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    borderColor: "#10B981",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  resetFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFE4E6",
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E11D48",
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
    marginTop: 2,
  },

  /* Transactions List Grouping */
  listContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  dayGroupWrapper: {
    gap: 8,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  dayDateTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  dayTotalsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayIncomeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  dayExpenseText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E11D48",
  },

  /* Day Card */
  dayCard: {
    borderRadius: 20,
    padding: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  txRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
  },
  txIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  txMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  txNameText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 4,
  },
  txMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  txTimeText: {
    fontSize: 11,
    fontWeight: "500",
    marginRight: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  txAmountText: {
    fontSize: 14.5,
    fontWeight: "900",
  },

  /* Empty Card */
  emptyCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyResetBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyResetBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },

  /* Category Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  categoryModalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  categoryOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
