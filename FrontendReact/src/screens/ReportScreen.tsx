import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import Svg, { Line, Polyline, Circle, Text as SvgText, G } from "react-native-svg";
import { Card } from "../components/ui/Card";
import { BottomSheet } from "../components/ui/BottomSheet";
import { TotalExpenseDetailBottomSheet } from "../components/modals/TotalExpenseDetailBottomSheet";
import { colors } from "../constants/colors";
import { useNavigation } from "@react-navigation/native";
import { financialServices } from "../services/financialServices";
import { groupService } from "../services/groupService";
import { CategoryBreakdown, MonthlySummary, BudgetSummary, Transaction, GroupDebtSummary } from "../types";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { ReportSkeleton } from "../components/ui/SkeletonLoader";
import { X } from "lucide-react-native";

const CHART_COLORS = [
  "#FBBF24", // Vàng ấm (như Mua sắm 58%)
  "#FB923C", // Cam tươi (như Chợ, siêu thị 22%)
  "#34D399", // Xanh ngọc (như Hóa đơn 12%)
  "#60A5FA", // Xanh dương pastel (như Di chuyển 5%)
  "#A78BFA", // Tím pastel
  "#F472B6", // Hồng phấn
  "#38BDF8", // Xanh sky
  "#94A3B8", // Xám bạc (như Còn lại 3%)
  "#F87171", // Đỏ san hô
  "#4ADE80", // Xanh lá tươi
];

const NEEDS_KEYWORDS = [
  "tiền nhà", "thuê nhà", "tiền điện", "tiền nước", "điện nước", "y tế", "đi lại",
  "phí liên lạc", "internet", "học phí", "trả góp", "cơm trưa", "siêu thị", "ăn uống"
];
const SAVINGS_KEYWORDS = ["mục tiêu tiết kiệm", "hoàn tiền tiết kiệm", "tích lũy"];

function categorizeExpenseGroup(categoryName: string): "NEEDS" | "WANTS" | "SAVINGS" {
  const lower = (categoryName || "").toLowerCase();
  if (SAVINGS_KEYWORDS.some((k) => lower.includes(k))) return "SAVINGS";
  if (NEEDS_KEYWORDS.some((k) => lower.includes(k))) return "NEEDS";
  return "WANTS";
}

export const ReportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [expBreakdown, setExpBreakdown] = useState<CategoryBreakdown[]>([]);
  const [incBreakdown, setIncBreakdown] = useState<CategoryBreakdown[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [debtSummary, setDebtSummary] = useState<GroupDebtSummary>({ totalOwed: 0, totalOwing: 0, details: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number | null>(null);
  const [expandedExpenseSections, setExpandedExpenseSections] = useState<Record<string, boolean>>({});

  // Interactive Modal state for 5 summary cards
  const [selectedCardModal, setSelectedCardModal] = useState<
    "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "SAVINGS" | null
  >(null);
  const [expandedPayableDrawer, setExpandedPayableDrawer] = useState<string | null>(null);

  // Category History Modal State
  const [selectedCategoryHist, setSelectedCategoryHist] = useState<CategoryBreakdown | null>(null);
  const [categoryTxList, setCategoryTxList] = useState<Transaction[]>([]);
  const [loadingCategoryTx, setLoadingCategoryTx] = useState(false);

  const openCategoryHistory = async (item: CategoryBreakdown) => {
    setSelectedCategoryHist(item);
    setLoadingCategoryTx(true);
    try {
      const allTx = await financialServices.getMonthlyTransactions(selectedYear, selectedMonth);
      const catNameLower = (item.categoryName || "").toLowerCase();
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
      setLoadingCategoryTx(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, expRes, budgetRes, incRes, debtRes] = await Promise.all([
        financialServices.getMonthlySummary(selectedYear, selectedMonth).catch(() => null),
        financialServices.getCategoryBreakdown(selectedYear, selectedMonth).catch(() => []),
        financialServices.getBudgetSummary(selectedYear, selectedMonth).catch(() => []),
        financialServices.getIncomeCategoryBreakdown(selectedYear, selectedMonth).catch(() => []),
        groupService.getGroupDebtSummary().catch(() => ({ totalOwing: 0, totalOwed: 0, details: [] })),
      ]);

      setSummary(summaryRes);
      setExpBreakdown(expRes || []);

      const rawBudgets = budgetRes || [];
      const groupedBudgetsMap = new Map();
      rawBudgets.forEach((b: any) => {
        const cid = b.categoryId;
        if (!groupedBudgetsMap.has(cid)) {
          groupedBudgetsMap.set(cid, {
            ...b,
            flexibleSpent: b.type === "FLEXIBLE" ? Number(b.spentAmount || 0) : 0,
            billSpent: b.type === "BILL" ? Number(b.spentAmount || 0) : 0,
          });
        } else {
          const existing = groupedBudgetsMap.get(cid);
          existing.limitAmount = Number(existing.limitAmount || 0) + Number(b.limitAmount || 0);
          if (b.type === "FLEXIBLE") {
            existing.flexibleSpent = Number(b.spentAmount || 0);
          } else if (b.type === "BILL") {
            existing.billSpent += Number(b.spentAmount || 0);
          }
        }
      });
      const groupedBudgets = Array.from(groupedBudgetsMap.values()).map((b: any) => {
        b.spentAmount = b.flexibleSpent + b.billSpent;
        return b;
      });

      setBudgets(groupedBudgets);
      setIncBreakdown(incRes || []);
      if (debtRes) {
        setDebtSummary({
          totalOwed: debtRes.totalOwed || 0,
          totalOwing: debtRes.totalOwing || 0,
          details: debtRes.details || [],
        });
      }
    } catch (e) {
      console.error("Failed to load report data", e);
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
    setSelectedSliceIndex(null);
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const fmt = (n: number) => {
    const safe = Math.round(Math.abs(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + "đ";
  };

  const totalExpense = summary?.currentMonth?.totalExpense ?? summary?.totalExpense ?? 0;
  const totalIncome = summary?.currentMonth?.totalIncome ?? summary?.totalIncome ?? 0;
  const netSavings = totalIncome - totalExpense;

  const activeBreakdown = activeTab === "expense" ? expBreakdown : incBreakdown;

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId.toString(), b.limitAmount]));

  const activeBudgets = budgets.filter((b) => (b.spentAmount || 0) > 0);

  const unpaidBudgetsAmount = budgets.reduce(
    (sum, b) => sum + Math.max(0, (b.limitAmount || 0) - (b.spentAmount || 0)),
    0
  );

  const groupDebtPaid = expBreakdown.find((c) => c.categoryName === "Trả nợ nhóm")?.totalAmount || 0;
  const currentDebt = debtSummary.totalOwing || 0;
  const totalDebtToPay = groupDebtPaid + currentDebt;
  const debtPct = totalDebtToPay > 0 ? Math.round((groupDebtPaid / totalDebtToPay) * 100) : 0;
  const showDebtItem = totalDebtToPay > 0;

  const toggleDetail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetail(!showDetail);
  };

  const monthsData = summary?.months || [];

  const renderTrendChart = () => {
    if (!monthsData || monthsData.length <= 1) return null;

    const W = 320, H = 140, PAD_LEFT = 40, PAD_RIGHT = 16, PAD_TOP = 16, PAD_BOTTOM = 28;
    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;

    const isExpense = activeTab === "expense";
    const topCats = activeBreakdown.slice(0, 5);

    const categoryLines = topCats.map((cat, i) => {
      const vals = monthsData.map((m) => {
        const map = isExpense ? m.categoryExpenses : m.categoryIncomes;
        return map ? Number(map[cat.categoryName]) || 0 : 0;
      });
      return {
        name: cat.categoryName,
        color: CHART_COLORS[i % CHART_COLORS.length],
        vals,
      };
    });

    const allVals: number[] = [];
    categoryLines.forEach((cl) => allVals.push(...cl.vals));

    const maxVal = Math.max(...allVals, 1);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const xOf = (i: number) => PAD_LEFT + (i / Math.max(1, monthsData.length - 1)) * chartW;
    const yOf = (v: number) => PAD_TOP + chartH - ((v - minVal) / range) * chartH;

    const polylineStr = (vals: number[]) => vals.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");

    return (
      <View style={styles.chartWrapper}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {[maxVal, maxVal / 2, 0].map((v, i) => {
            const y = yOf(v);
            const label = v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : "0";
            return (
              <G key={i}>
                <Line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 3" />
                <SvgText x={PAD_LEFT - 6} y={y + 3} textAnchor="end" fontSize={8} fill="#94A3B8">
                  {label}
                </SvgText>
              </G>
            );
          })}

          {categoryLines.map((cl) => (
            <Polyline key={cl.name} points={polylineStr(cl.vals)} fill="none" stroke={cl.color} strokeWidth={2} />
          ))}

          {monthsData.map((m, i) => (
            <G key={i}>
              {categoryLines.map((cl) => (
                <Circle key={cl.name} cx={xOf(i)} cy={yOf(cl.vals[i])} r={3} fill={cl.color} stroke="#FFFFFF" strokeWidth={1.5} />
              ))}
              <SvgText x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#64748B">
                {m.label}
              </SvgText>
            </G>
          ))}
        </Svg>

        <View style={styles.legendContainer}>
          {categoryLines.map((cl) => (
            <View key={cl.name} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cl.color }]} />
              <Text style={styles.legendText}>{cl.name}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading && !summary) {
    return <ReportSkeleton />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[colors.indigo600]} />}
      >
        {/* ─── MONTH PICKER CARD WITH BACK BUTTON ─── */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate("Dashboard")}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Báo cáo tài chính</Text>

            <View style={{ width: 36 }} />
          </View>

          <View style={styles.monthSelectorPill}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>
              Tháng {selectedMonth}/{selectedYear}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>›</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ─── 4 SUMMARY CARDS (2x2 Grid) + SAVINGS CARD (INTERACTIVE) ─── */}
        <View style={styles.grid2x2}>
          {/* Đã Thu Thực Tế */}
          <TouchableOpacity style={{ width: "48.5%" }} onPress={() => setSelectedCardModal("INCOME")}>
            <Card style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>💵 Đã thu (Thực tế)</Text>
              <Text style={[styles.summaryBoxVal, { color: colors.emerald600 }]}>{fmt(totalIncome)}</Text>
            </Card>
          </TouchableOpacity>

          {/* Đã Chi Thực Tế (Lấy từ lịch sử chi tiêu) */}
          <TouchableOpacity style={{ width: "48.5%" }} onPress={() => setSelectedCardModal("EXPENSE")}>
            <Card style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>💸 Đã chi (Thực tế)</Text>
              <Text style={[styles.summaryBoxVal, { color: colors.rose600 }]}>{fmt(totalExpense)}</Text>
            </Card>
          </TouchableOpacity>

          {/* Tổng Thu Dự Kiến (Đã thu + Cần thu) */}
          <TouchableOpacity style={{ width: "48.5%" }} onPress={() => setSelectedCardModal("RECEIVABLE")}>
            <Card style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>📥 Tổng thu (Dự kiến)</Text>
              <Text style={[styles.summaryBoxVal, { color: colors.indigo600 }]}>
                {fmt(totalIncome + debtSummary.totalOwed)}
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Tổng Chi Kế Hoạch / Dự Kiến (Hạn mức phải chi + Nợ) */}
          <TouchableOpacity style={{ width: "48.5%" }} onPress={() => setSelectedCardModal("PAYABLE")}>
            <Card style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>📤 Tổng chi (Kế hoạch)</Text>
              <Text style={[styles.summaryBoxVal, { color: colors.amber600 }]}>
                {fmt(totalExpense + unpaidBudgetsAmount + debtSummary.totalOwing)}
              </Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Full-width Savings Card */}
        <TouchableOpacity onPress={() => setSelectedCardModal("SAVINGS")}>
          <Card style={styles.savingsCard}>
            <View style={styles.savingsRow}>
              <View>
                <Text style={styles.summaryBoxLabel}>💰 Tiết kiệm tháng này</Text>
                <Text style={[styles.summaryBoxVal, { color: netSavings >= 0 ? colors.slate900 : colors.rose600 }]}>
                  {netSavings >= 0 ? "+" : ""}
                  {fmt(netSavings)}
                </Text>
              </View>

              {summary?.comparison && (
                <View
                  style={[
                    styles.comparisonBadge,
                    {
                      backgroundColor:
                        (summary.comparison.expenseChange || 0) > 0 ? "#FFE4E6" : "#E6F4EA",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.comparisonBadgeText,
                      {
                        color:
                          (summary.comparison.expenseChange || 0) > 0
                            ? colors.rose600
                            : colors.emerald600,
                      },
                    ]}
                  >
                    {(summary.comparison.expenseChange || 0) > 0 ? "📈 Chi tăng " : "📉 Chi giảm "}
                    {Math.abs(summary.comparison.expenseChangePercent || 0)}%
                  </Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>

        {/* ─── FINANCIAL STRUCTURE & BREAKDOWN CARD ─── */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Cơ cấu tài chính</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => {
                setActiveTab("expense");
                setSelectedSliceIndex(null);
              }}
              style={[styles.toggleBtn, activeTab === "expense" && styles.toggleBtnActiveExpense]}
            >
              <Text style={[styles.toggleBtnText, activeTab === "expense" && styles.toggleBtnTextActive]}>
                Chi tiêu
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab("income");
                setSelectedSliceIndex(null);
              }}
              style={[styles.toggleBtn, activeTab === "income" && styles.toggleBtnActiveIncome]}
            >
              <Text style={[styles.toggleBtnText, activeTab === "income" && styles.toggleBtnTextActive]}>
                Thu nhập
              </Text>
            </TouchableOpacity>
          </View>

          {activeBreakdown.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>📭</Text>
              <Text style={styles.emptyText}>Không có dữ liệu tháng này</Text>
            </View>
          ) : (
            <>
              {/* ─── DONUT CHART WITH >=5% THRESHOLD & DASHED LEADER LINES ─── */}
              <View style={styles.donutLeaderChartWrapper}>
                {(() => {
                  const total = activeBreakdown.reduce((acc, item) => acc + (item.totalAmount || 0), 0);

                  // 1. Tách các danh mục >= 5% và gom các mục < 5% vào "Còn lại"
                  const majorSlices: CategoryBreakdown[] = [];
                  let otherAmount = 0;
                  let otherPercentage = 0;

                  activeBreakdown.forEach((item) => {
                    const itemPct = total > 0 ? ((item.totalAmount || 0) / total) * 100 : 0;
                    if (itemPct >= 5) {
                      majorSlices.push({
                        ...item,
                        percentage: itemPct,
                      });
                    } else {
                      otherAmount += item.totalAmount || 0;
                      otherPercentage += itemPct;
                    }
                  });

                  // Sắp xếp các mục lớn từ lớn tới bé
                  majorSlices.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));

                  const chartItems: Array<CategoryBreakdown & { isOther?: boolean }> = [...majorSlices];
                  if (otherAmount > 0) {
                    chartItems.push({
                      categoryId: "cat_other_remaining",
                      categoryName: "Còn lại",
                      categoryIcon: "🫧",
                      totalAmount: otherAmount,
                      percentage: otherPercentage,
                      isOther: true,
                    });
                  }

                  // 2. Kích thước lớn, vành dày & rộng (Nép sát 2 lề)
                  const chartW = 350;
                  const chartH = 290;
                  const cx = 175;
                  const cy = 145;
                  const R_outer = 96;
                  const strokeWidth = 38;
                  const R_mid = R_outer - strokeWidth / 2; // 77
                  const circumference = 2 * Math.PI * R_mid; // ~483.8
                  const gap = chartItems.length > 1 ? 6 : 0;

                  let accumulatedFraction = 0;
                  const rawSlices = chartItems.map((item, idx) => {
                    const fraction = total > 0 ? (item.totalAmount || 0) / total : 0;
                    const startFraction = accumulatedFraction;
                    accumulatedFraction += fraction;

                    // Góc theo hệ trục (0 = 12 o'clock, quay theo chiều kim đồng hồ)
                    const startAngle = startFraction * 2 * Math.PI - Math.PI / 2;
                    const endAngle = accumulatedFraction * 2 * Math.PI - Math.PI / 2;
                    const midAngle = (startAngle + endAngle) / 2;

                    // Dasharray
                    const sliceLength = fraction * circumference;
                    const drawLength = Math.max(0.1, sliceLength - gap);
                    const strokeDasharray = `${drawLength} ${circumference}`;
                    const strokeDashoffset = -(startFraction * circumference + gap / 2);

                    const isSelected = selectedSliceIndex === idx;
                    const color = item.isOther ? "#94A3B8" : CHART_COLORS[idx % CHART_COLORS.length];
                    const pctStr = `${Math.round(fraction * 100)}%`;

                    // Tọa độ đường dẫn chỉ định (Leader line)
                    const p1x = cx + R_outer * Math.cos(midAngle);
                    const p1y = cy + R_outer * Math.sin(midAngle);

                    const extDist = 10;
                    const p2x = cx + (R_outer + extDist) * Math.cos(midAngle);
                    const p2y = cy + (R_outer + extDist) * Math.sin(midAngle);

                    const isRight = Math.cos(midAngle) >= 0;
                    // Đường kẻ ngang nối thẳng sát lề (trái/phải)
                    const p3x = isRight ? chartW - 86 : 86;
                    const p3y = p2y;

                    return {
                      item,
                      idx,
                      color,
                      pctStr,
                      strokeDasharray,
                      strokeDashoffset,
                      isSelected,
                      p1: { x: p1x, y: p1y },
                      p2: { x: p2x, y: p2y },
                      p3: { x: p3x, y: p3y },
                      isRight,
                    };
                  });

                  // Tránh đè nhãn theo phương dọc (De-collision)
                  const rightSlices = rawSlices.filter((s) => s.isRight).sort((a, b) => a.p3.y - b.p3.y);
                  for (let i = 1; i < rightSlices.length; i++) {
                    if (rightSlices[i].p3.y - rightSlices[i - 1].p3.y < 38) {
                      rightSlices[i].p3.y = rightSlices[i - 1].p3.y + 38;
                    }
                  }

                  const leftSlices = rawSlices.filter((s) => !s.isRight).sort((a, b) => a.p3.y - b.p3.y);
                  for (let i = 1; i < leftSlices.length; i++) {
                    if (leftSlices[i].p3.y - leftSlices[i - 1].p3.y < 38) {
                      leftSlices[i].p3.y = leftSlices[i - 1].p3.y + 38;
                    }
                  }

                  return (
                    <View style={[styles.donutLeaderBox, { width: chartW, height: chartH }]}>
                      {/* SVG Canvas for Donut + Dashed Leader Lines */}
                      <Svg width={chartW} height={chartH} style={StyleSheet.absoluteFill}>
                        {/* Leader Lines (Đường kẻ nét đứt dẫn tới chú thích sát lề) */}
                        {rawSlices.map((slice) => (
                          <Polyline
                            key={`leader_${slice.idx}`}
                            points={`${slice.p1.x},${slice.p1.y} ${slice.p2.x},${slice.p2.y} ${slice.p3.x},${slice.p3.y}`}
                            stroke={slice.isSelected ? slice.color : "#CBD5E1"}
                            strokeDasharray="3 3"
                            strokeWidth={slice.isSelected ? 2 : 1.2}
                            fill="none"
                          />
                        ))}

                        {/* Donut Slices */}
                        {total <= 0 ? (
                          <Circle
                            cx={cx}
                            cy={cy}
                            r={R_mid}
                            stroke="#E2E8F0"
                            strokeWidth={strokeWidth}
                            fill="none"
                          />
                        ) : (
                          <G rotation="-90" origin={`${cx}, ${cy}`}>
                            {rawSlices.map((slice) => (
                              <Circle
                                key={`donut_slice_${slice.idx}`}
                                cx={cx}
                                cy={cy}
                                r={R_mid}
                                stroke={slice.color}
                                strokeWidth={slice.isSelected ? strokeWidth + 4 : strokeWidth}
                                strokeDasharray={slice.strokeDasharray}
                                strokeDashoffset={slice.strokeDashoffset}
                                fill="none"
                                strokeLinecap="round"
                                opacity={selectedSliceIndex === null || slice.isSelected ? 1 : 0.35}
                                onPress={() =>
                                  setSelectedSliceIndex(selectedSliceIndex === slice.idx ? null : slice.idx)
                                }
                              />
                            ))}
                          </G>
                        )}
                      </Svg>

                      {/* ─── CALLOUT LABELS NÉP SÁT 2 LỀ ─── */}
                      {rawSlices.map((slice) => {
                        if (slice.isRight) {
                          return (
                            <TouchableOpacity
                              key={`callout_label_${slice.idx}`}
                              style={[
                                styles.calloutLabelAbsolute,
                                {
                                  right: 0,
                                  top: slice.p3.y - 18,
                                  alignItems: "flex-start",
                                  width: 84,
                                },
                              ]}
                              onPress={() =>
                                setSelectedSliceIndex(selectedSliceIndex === slice.idx ? null : slice.idx)
                              }
                              activeOpacity={0.8}
                            >
                              <View style={styles.calloutPillRow}>
                                <CategoryIcon name={slice.item.categoryName || slice.item.categoryIcon} size={14} />
                                <Text style={[styles.calloutPctText, { color: slice.color }]}>
                                  {slice.pctStr}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.calloutNameText,
                                  slice.isSelected && { fontWeight: "900", color: slice.color },
                                ]}
                                numberOfLines={1}
                              >
                                {slice.item.categoryName}
                              </Text>
                            </TouchableOpacity>
                          );
                        } else {
                          return (
                            <TouchableOpacity
                              key={`callout_label_${slice.idx}`}
                              style={[
                                styles.calloutLabelAbsolute,
                                {
                                  left: 0,
                                  top: slice.p3.y - 18,
                                  alignItems: "flex-start",
                                  width: 84,
                                },
                              ]}
                              onPress={() =>
                                setSelectedSliceIndex(selectedSliceIndex === slice.idx ? null : slice.idx)
                              }
                              activeOpacity={0.8}
                            >
                              <View style={styles.calloutPillRow}>
                                <CategoryIcon name={slice.item.categoryName || slice.item.categoryIcon} size={14} />
                                <Text style={[styles.calloutPctText, { color: slice.color }]}>
                                  {slice.pctStr}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.calloutNameText,
                                  slice.isSelected && { fontWeight: "900", color: slice.color },
                                ]}
                                numberOfLines={1}
                              >
                                {slice.item.categoryName}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      })}
                    </View>
                  );
                })()}
              </View>

              <TouchableOpacity onPress={toggleDetail} style={styles.accordionHeader}>
                <Text style={styles.accordionTitle}>
                  Chi tiết từng danh mục ({activeBreakdown.length})
                </Text>
                <Text style={styles.accordionArrow}>{showDetail ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {showDetail && (
                <View style={styles.accordionContent}>
                  {activeBreakdown.map((item, idx) => {
                    const color = CHART_COLORS[idx % CHART_COLORS.length];
                    const limit = Number(budgetByCategory.get(item.categoryId?.toString())) || 0;
                    const over = limit > 0 && item.totalAmount > limit;
                    const remain = limit > 0 ? limit - item.totalAmount : 0;

                    return (
                      <View key={item.categoryId} style={styles.catItemRow}>
                        <CategoryIcon name={item.categoryName || item.categoryIcon} size={28} />
                        <View style={{ flex: 1 }}>
                          <View style={styles.catNameRow}>
                            <Text style={styles.catNameText}>{item.categoryName}</Text>
                            <Text style={styles.catAmountText}>{fmt(item.totalAmount)}</Text>
                          </View>
                          <View style={styles.catProgressTrack}>
                            <View
                              style={[
                                styles.catProgressFill,
                                { width: `${item.percentage}%`, backgroundColor: color },
                              ]}
                            />
                          </View>
                          <View style={styles.catMetaRow}>
                            <Text style={styles.catMetaText}>{item.percentage}% tổng chi</Text>
                            {limit > 0 && (
                              <Text
                                style={[
                                  styles.catLimitBadge,
                                  over ? { color: colors.rose600 } : { color: colors.emerald600 },
                                ]}
                              >
                                {over ? `🔴 Vượt ${fmt(Math.abs(remain))}` : `Còn ${fmt(remain)}`}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {monthsData.length > 1 && (
            <View style={styles.trendSection}>
              <View style={styles.trendHeader}>
                <Text style={styles.cardHeaderTitle}>Xu hướng 6 tháng</Text>
                <View style={styles.trendRangeBadge}>
                  <Text style={styles.trendRangeText}>
                    {monthsData[0]?.label} → {monthsData[monthsData.length - 1]?.label}
                  </Text>
                </View>
              </View>
              {renderTrendChart()}
            </View>
          )}
        </Card>

        {/* ─── BUDGET OVERVIEW SUMMARY CARD ─── */}
        {(activeBudgets.length > 0 || showDebtItem) && (
          <Card style={styles.sectionCard}>
            <Text style={styles.cardHeaderTitle}>Tổng kết ngân sách</Text>
            <View style={{ gap: 16 }}>
              {activeBudgets.map((b) => {
                const spent = Number(b.spentAmount || 0);
                const limit = Number(b.limitAmount || 1);
                const pct = Math.min(100, Math.round((spent / limit) * 100));
                const isOver = spent > limit;
                const barColor = isOver ? colors.rose600 : pct >= 80 ? colors.amber500 : colors.emerald500;

                return (
                  <View key={b.budgetId}>
                    <View style={styles.budgetRowHeader}>
                      <View style={styles.budgetRowLeft}>
                        <CategoryIcon name={b.categoryName || b.name || b.categoryIcon} size={22} />
                        <Text style={styles.budgetCategoryName}>{b.categoryName}</Text>
                      </View>
                      <Text style={styles.budgetAmountText}>
                        {fmt(spent)}{" "}
                        <Text style={styles.budgetLimitText}>/ {fmt(limit)}</Text>
                      </Text>
                    </View>

                    <View style={styles.budgetTrack}>
                      <View style={[styles.budgetFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>

                    <View style={styles.budgetFooterRow}>
                      <Text style={styles.budgetPctText}>{pct}% đã dùng</Text>
                      <Text style={[styles.budgetRemainText, isOver && { color: colors.rose600 }]}>
                        {isOver ? `Vượt ${fmt(spent - limit)}` : `Còn ${fmt(limit - spent)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {showDebtItem && (
                <View style={styles.groupDebtRowSection}>
                  <View style={styles.budgetRowHeader}>
                    <View style={styles.budgetRowLeft}>
                      <Text style={{ fontSize: 16 }}>👥</Text>
                      <Text style={styles.budgetCategoryName}>Thanh toán nợ nhóm</Text>
                    </View>
                    <Text style={styles.budgetAmountText}>
                      {fmt(groupDebtPaid)}{" "}
                      <Text style={styles.budgetLimitText}>/ {fmt(totalDebtToPay)} (Tổng nợ)</Text>
                    </Text>
                  </View>

                  <View style={styles.budgetTrack}>
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${debtPct}%`,
                          backgroundColor: currentDebt > 0 ? colors.amber500 : colors.emerald500,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetFooterRow}>
                    <Text style={styles.budgetPctText}>{debtPct}% đã thanh toán</Text>
                    <Text
                      style={[
                        styles.budgetRemainText,
                        { color: currentDebt > 0 ? colors.rose600 : colors.emerald600 },
                      ]}
                    >
                      {currentDebt > 0 ? `Còn nợ ${fmt(currentDebt)}` : "Đã thanh toán hết"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* ─── CENTERED POPUP MODAL FOR TOTAL EXPENSE (PAYABLE) ─── */}
      <TotalExpenseDetailBottomSheet
        visible={selectedCardModal === "PAYABLE"}
        onClose={() => setSelectedCardModal(null)}
        totalExpense={totalExpense}
        budgets={budgets}
        expBreakdown={expBreakdown}
        debtSummary={debtSummary}
        totalSavings={netSavings > 0 ? netSavings : 0}
      />

      {/* ─── INTERACTIVE BOTTOM SHEET MODAL FOR OTHER SUMMARY CARDS ─── */}
      <BottomSheet
        visible={!!selectedCardModal && selectedCardModal !== "PAYABLE"}
        onClose={() => {
          setSelectedCardModal(null);
          setSelectedCategoryHist(null);
        }}
        title={
          selectedCategoryHist
            ? `Lịch sử - ${selectedCategoryHist.categoryName}`
            : selectedCardModal === "INCOME"
            ? "Chi tiết Đã thu"
            : selectedCardModal === "EXPENSE"
            ? "Chi tiết Đã chi"
            : selectedCardModal === "RECEIVABLE"
            ? "Chi tiết Cần thu"
            : "Chi tiết Tiết kiệm"
        }
      >
        <ScrollView style={{ maxHeight: 400 }}>
          {selectedCardModal === "INCOME" && (
            <View style={{ gap: 12 }}>
              <View style={styles.modalHeroBox}>
                <Text style={styles.modalHeroLabel}>Tổng Thu Nhập Tháng {selectedMonth}</Text>
                <Text style={[styles.modalHeroVal, { color: colors.emerald600 }]}>{fmt(totalIncome)}</Text>
              </View>

              <Text style={styles.modalSectionTitle}>Phân bổ danh mục Thu nhập</Text>
              {incBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có thu nhập ghi nhận</Text>
              ) : (
                incBreakdown.map((item) => (
                  <View key={item.categoryId} style={styles.modalItemRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <CategoryIcon name={item.categoryName || item.categoryIcon} size={22} />
                      <Text style={styles.modalItemName}>{item.categoryName}</Text>
                    </View>
                    <Text style={[styles.modalItemVal, { color: colors.emerald600 }]}>+{fmt(item.totalAmount)}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {selectedCardModal === "EXPENSE" && (
            selectedCategoryHist ? (
              /* ─── CATEGORY HISTORY IN-PLACE VIEW ─── */
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setSelectedCategoryHist(null)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: colors.indigo600 }}>‹</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.indigo600 }}>
                    Quay lại danh sách chi tiết
                  </Text>
                </TouchableOpacity>

                <View style={{ backgroundColor: "#fff1f2", borderRadius: 18, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CategoryIcon name={selectedCategoryHist.categoryName || selectedCategoryHist.categoryIcon} size={24} />
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#e11d48" }}>{selectedCategoryHist.categoryName}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#e11d48" }}>
                    {fmt(selectedCategoryHist.totalAmount || 0)}
                  </Text>
                </View>

                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                  Chi tiết các lần chi tiêu ({categoryTxList.length} lần)
                </Text>

                {loadingCategoryTx ? (
                  <ActivityIndicator size="small" color="#0f172a" style={{ marginVertical: 20 }} />
                ) : categoryTxList.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
                    <Text style={{ fontSize: 28 }}>📭</Text>
                    <Text style={{ fontSize: 13, color: colors.slate400, fontWeight: "600", textAlign: "center" }}>
                      Chưa có giao dịch nào cho mục '{selectedCategoryHist.categoryName}' trong tháng {selectedMonth}/{selectedYear}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {categoryTxList.map((tx: any, idx: number) => (
                      <View
                        key={tx.id || idx}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor: "#f8fafc",
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "#f1f5f9",
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={{ fontSize: 13, fontWeight: "800", color: "#1e293b" }} numberOfLines={1}>
                            {tx.note || tx.categoryName || selectedCategoryHist.categoryName || "Giao dịch chi tiêu"}
                          </Text>
                          <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontWeight: "500" }}>
                            {tx.transactionDate ? new Date(tx.transactionDate).toLocaleString("vi-VN") : "Giao dịch trong tháng"}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: "900", color: "#e11d48" }}>
                          {fmt(tx.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              /* ─── SUMMARY 50/30/20 ACCORDION VIEW ─── */
              <View style={{ gap: 10 }}>
                {/* Hero Pink/Red Card */}
                <View style={styles.expenseHeroCard}>
                  <Text style={styles.expenseHeroLabel}>Tổng thực chi</Text>
                  <Text style={styles.expenseHeroVal}>{fmt(totalExpense)}</Text>
                </View>

                {/* Mini 50/30/20 Progress Bar Card & Accordion Sections */}
                {(() => {
                  const DEFAULT_SYSTEM_CATEGORIES = [
                    { categoryId: "def_w1", categoryName: "Chi tiêu hàng ngày", categoryIcon: "🧴" },
                    { categoryId: "def_w2", categoryName: "Ăn uống", categoryIcon: "🍽️" },
                    { categoryId: "def_w3", categoryName: "Quần áo", categoryIcon: "👕" },
                    { categoryId: "def_w4", categoryName: "Phí giao lưu", categoryIcon: "🥂" },
                    { categoryId: "def_w5", categoryName: "Mỹ phẩm", categoryIcon: "💄" },
                    { categoryId: "def_n1", categoryName: "Tiền nhà", categoryIcon: "🏠" },
                    { categoryId: "def_n2", categoryName: "Tiền điện", categoryIcon: "💡" },
                    { categoryId: "def_n3", categoryName: "Đi lại", categoryIcon: "🚆" },
                    { categoryId: "def_n4", categoryName: "Phí liên lạc", categoryIcon: "📱" },
                    { categoryId: "def_n5", categoryName: "Y tế", categoryIcon: "💊" },
                    { categoryId: "def_n6", categoryName: "Giáo dục", categoryIcon: "📚" },
                    { categoryId: "def_s1", categoryName: "Mục tiêu tiết kiệm", categoryIcon: "🎯" },
                  ];

                  const totalExp = totalExpense || 1;
                  const catMap = new Map<string, CategoryBreakdown>();

                  // 1. Fill default categories with 0đ
                  DEFAULT_SYSTEM_CATEGORIES.forEach((def) => {
                    catMap.set(def.categoryName.toLowerCase(), {
                      categoryId: def.categoryId,
                      categoryName: def.categoryName,
                      categoryIcon: def.categoryIcon,
                      totalAmount: 0,
                      percentage: 0,
                    });
                  });

                  // 2. Add budget categories
                  budgets.forEach((b) => {
                    const key = (b.categoryName || "").toLowerCase();
                    if (!catMap.has(key)) {
                      const spent = Number(b.spentAmount || 0);
                      catMap.set(key, {
                        categoryId: b.categoryId || b.budgetId || "unknown",
                        categoryName: b.categoryName,
                        categoryIcon: b.categoryIcon || "🧾",
                        totalAmount: spent,
                        percentage: Math.round((spent / totalExp) * 1000) / 10,
                      });
                    }
                  });

                  // 3. Override with real expBreakdown items
                  expBreakdown.forEach((item) => {
                    const key = (item.categoryName || "").toLowerCase();
                    catMap.set(key, { ...item });
                  });

                  const fullCategoryList = Array.from(catMap.values());

                  const needsItems = fullCategoryList.filter((item) => categorizeExpenseGroup(item.categoryName) === "NEEDS");
                  const wantsItems = fullCategoryList.filter((item) => categorizeExpenseGroup(item.categoryName) === "WANTS");
                  const savingsItems = fullCategoryList.filter((item) => categorizeExpenseGroup(item.categoryName) === "SAVINGS");

                  const needsTotal = needsItems.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
                  const wantsTotal = wantsItems.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
                  const savingsTotal = savingsItems.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

                  const grandTotal = needsTotal + wantsTotal + savingsTotal;
                  const needsPct = grandTotal > 0 ? Math.round((needsTotal / grandTotal) * 100) : 0;
                  const wantsPct = grandTotal > 0 ? Math.round((wantsTotal / grandTotal) * 100) : 0;
                  const savingsPct = grandTotal > 0 ? Math.max(0, 100 - needsPct - wantsPct) : 0;

                  const sections = [
                    {
                      key: "NEEDS",
                      label: "1. Chi tiêu thiết yếu",
                      items: needsItems,
                      total: needsTotal,
                      bgColor: "#eff6ff",
                      borderColor: "#dbeafe",
                      textColor: "#2563eb",
                    },
                    {
                      key: "WANTS",
                      label: "2. Chi tiêu linh hoạt",
                      items: wantsItems,
                      total: wantsTotal,
                      bgColor: "#fff7ed",
                      borderColor: "#ffedd5",
                      textColor: "#ea580c",
                    },
                    {
                      key: "SAVINGS",
                      label: "3. Tích lũy & tiết kiệm",
                      items: savingsItems,
                      total: savingsTotal,
                      bgColor: "#f0fdf4",
                      borderColor: "#dcfce7",
                      textColor: "#16a34a",
                    },
                  ].filter((s) => s.items.length > 0);

                  return (
                    <>
                      {/* Mini 50/30/20 Bar Card */}
                      <View style={styles.miniBarCard}>
                        <View style={styles.miniBarTrack}>
                          {needsPct > 0 && (
                            <View style={[styles.miniBarSeg, { width: `${needsPct}%`, backgroundColor: "#3b82f6" }]} />
                          )}
                          {wantsPct > 0 && (
                            <View style={[styles.miniBarSeg, { width: `${wantsPct}%`, backgroundColor: "#f97316" }]} />
                          )}
                          {savingsPct > 0 && (
                            <View style={[styles.miniBarSeg, { width: `${savingsPct}%`, backgroundColor: "#10b981" }]} />
                          )}
                        </View>

                        <View style={styles.miniBarLabelsRow}>
                          <View style={styles.miniBarLabelItem}>
                            <View style={[styles.miniDot, { backgroundColor: "#3b82f6" }]} />
                            <Text style={[styles.miniLabelText, { color: "#2563eb" }]}>Thiết yếu {needsPct}%</Text>
                          </View>

                          <View style={styles.miniBarLabelItem}>
                            <View style={[styles.miniDot, { backgroundColor: "#f97316" }]} />
                            <Text style={[styles.miniLabelText, { color: "#ea580c" }]}>Linh hoạt {wantsPct}%</Text>
                          </View>

                          <View style={styles.miniBarLabelItem}>
                            <View style={[styles.miniDot, { backgroundColor: "#10b981" }]} />
                            <Text style={[styles.miniLabelText, { color: "#16a34a" }]}>Tích lũy {savingsPct}%</Text>
                          </View>
                        </View>
                      </View>

                      {/* Accordion List */}
                      {sections.map((section) => {
                        const isExpanded = !!expandedExpenseSections[section.key];
                        return (
                          <View key={section.key} style={styles.expenseSectionCard}>
                            <TouchableOpacity
                              style={[
                                styles.expenseSectionHeader,
                                { backgroundColor: section.bgColor, borderColor: section.borderColor },
                              ]}
                              onPress={() =>
                                setExpandedExpenseSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
                              }
                              activeOpacity={0.8}
                            >
                              <View style={styles.expenseHeaderLeft}>
                                <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "800", transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}>
                                  ›
                                </Text>
                                <Text style={styles.expenseSectionTitle}>{section.label}</Text>
                                <View style={styles.countBadge}>
                                  <Text style={styles.countBadgeText}>{section.items.length}</Text>
                                </View>
                              </View>

                              <Text style={[styles.expenseSectionTotal, { color: section.textColor }]}>
                                {fmt(section.total)}
                              </Text>
                            </TouchableOpacity>

                            {isExpanded && (
                              <View style={styles.expenseSectionBody}>
                                {section.items.map((item, idx) => {
                                  const limit = Number(budgetByCategory.get(item.categoryId?.toString())) || 0;
                                  return (
                                    <TouchableOpacity
                                      key={item.categoryId || idx}
                                      style={styles.expenseItemRow}
                                      onPress={() => openCategoryHistory(item)}
                                      activeOpacity={0.7}
                                    >
                                      <View style={styles.expenseItemLeft}>
                                        <CategoryIcon name={item.categoryName || item.categoryIcon || "Khác"} size={24} />
                                        <View style={{ marginLeft: 4 }}>
                                          <Text style={styles.expenseItemName}>{item.categoryName}</Text>
                                          <Text style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                                            {limit > 0 ? `Hạn mức: ${fmt(limit)} • Bấm xem lịch sử ›` : "Bấm xem lịch sử ›"}
                                          </Text>
                                        </View>
                                      </View>
                                      <Text style={styles.expenseItemVal}>{fmt(item.totalAmount)}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </>
                  );
                })()}
              </View>
            )
          )}

          {selectedCardModal === "RECEIVABLE" && (
            <View style={{ gap: 12 }}>
              <View style={styles.modalHeroBox}>
                <Text style={styles.modalHeroLabel}>Tổng Thu Dự Kiến (Đã thu + Cần thu)</Text>
                <Text style={[styles.modalHeroVal, { color: colors.indigo600 }]}>
                  {fmt(totalIncome + debtSummary.totalOwed)}
                </Text>
              </View>

              <View style={styles.modalFormulaBox}>
                <Text style={styles.formulaText}>
                  💵 Đã thu thực tế: <Text style={{ fontWeight: "800" }}>{fmt(totalIncome)}</Text>
                </Text>
                <Text style={styles.formulaText}>
                  🤝 Người khác nợ bạn: <Text style={{ fontWeight: "800" }}>{fmt(debtSummary.totalOwed)}</Text>
                </Text>
              </View>
            </View>
          )}

          {selectedCardModal === "SAVINGS" && (
            <View style={{ gap: 12 }}>
              <View style={styles.modalHeroBox}>
                <Text style={styles.modalHeroLabel}>Tiền Tích Lũy Tháng Này (Thu - Chi)</Text>
                <Text style={[styles.modalHeroVal, { color: netSavings >= 0 ? colors.emerald600 : colors.rose600 }]}>
                  {netSavings >= 0 ? "+" : ""}
                  {fmt(netSavings)}
                </Text>
              </View>

              <View style={styles.modalFormulaBox}>
                <Text style={styles.formulaText}>
                  💵 Tổng thu nhập: <Text style={{ fontWeight: "800" }}>{fmt(totalIncome)}</Text>
                </Text>
                <Text style={styles.formulaText}>
                  💸 Tổng chi tiêu: <Text style={{ fontWeight: "800" }}>{fmt(totalExpense)}</Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAFB",
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 40,
  },

  /* Header Card */
  headerCard: {
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  headerTopRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.slate800,
    marginTop: -2,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    textAlign: "center",
  },
  monthSelectorPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 16,
  },
  monthNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  monthNavText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate500,
  },
  monthText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate800,
  },

  /* 2x2 Grid + Savings Card */
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  summaryBox: {
    padding: 14,
    borderRadius: 20,
  },
  summaryBoxLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate500,
    marginBottom: 4,
  },
  summaryBoxVal: {
    fontSize: 17,
    fontWeight: "900",
  },
  savingsCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  savingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comparisonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  comparisonBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  /* Section Card */
  sectionCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: "center",
  },
  toggleBtnActiveExpense: {
    backgroundColor: "#FF2E55",
  },
  toggleBtnActiveIncome: {
    backgroundColor: colors.emerald500,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
  },
  toggleBtnTextActive: {
    color: colors.white,
  },

  /* ─── LEADER-LINE DONUT CHART STYLES ─── */
  donutLeaderChartWrapper: {
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  donutLeaderBox: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterHole: {
    position: "absolute",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  donutCenterTotalLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  donutCenterTotalVal: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  donutCenterActiveName: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate800,
    marginTop: 2,
  },
  donutCenterActiveVal: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 1,
  },

  /* Callout Labels Attached to Leader Lines */
  calloutLabelAbsolute: {
    position: "absolute",
    maxWidth: 95,
  },
  calloutPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  calloutPctText: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  calloutNameText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },

  /* Accordion */
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate700,
  },
  accordionArrow: {
    fontSize: 12,
    color: colors.slate400,
  },
  accordionContent: {
    marginTop: 8,
  },
  catItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate50,
  },
  catIconBg: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  catNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  catAmountText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate900,
  },
  catProgressTrack: {
    height: 6,
    backgroundColor: colors.slate100,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  catProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  catMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  catMetaText: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: "500",
  },
  catLimitBadge: {
    fontSize: 10,
    fontWeight: "800",
  },

  /* Trend Chart Section */
  trendSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  trendRangeBadge: {
    backgroundColor: colors.slate50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trendRangeText: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: "600",
  },
  chartWrapper: {
    marginTop: 8,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.slate500,
    fontWeight: "600",
  },

  /* Budget Summary */
  budgetRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  budgetRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  budgetCategoryName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate800,
  },
  budgetAmountText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate900,
  },
  budgetLimitText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.slate400,
  },
  budgetTrack: {
    height: 8,
    backgroundColor: colors.slate100,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  budgetFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetPctText: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: "600",
  },
  budgetRemainText: {
    fontSize: 10,
    color: colors.slate500,
    fontWeight: "700",
  },
  groupDebtRowSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
    fontWeight: "600",
  },

  /* Modal Styles */
  modalHeroBox: {
    backgroundColor: colors.slate50,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  modalHeroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    marginBottom: 4,
  },
  modalHeroVal: {
    fontSize: 24,
    fontWeight: "900",
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate800,
    marginTop: 8,
  },
  modalItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate800,
  },
  modalItemVal: {
    fontSize: 14,
    fontWeight: "900",
  },
  modalFormulaBox: {
    backgroundColor: colors.slate50,
    padding: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 4,
  },
  formulaText: {
    fontSize: 13,
    color: colors.slate700,
  },
  payableDrawerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: "hidden",
  },
  payableDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  payableIconBg: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payableDrawerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
  },
  payableDrawerSub: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 2,
  },
  payableDrawerVal: {
    fontSize: 13,
    fontWeight: "900",
  },
  payableChevron: {
    fontSize: 10,
    color: colors.slate400,
    marginLeft: 4,
  },
  payableSubItemsContent: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    gap: 8,
  },
  payableSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payableSubName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },
  payableSubVal: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate900,
  },

  /* 50/30/20 Expense Modal Styles */
  expenseHeroCard: {
    backgroundColor: "#fff1f2",
    borderRadius: 20,
    padding: 16,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  expenseHeroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e11d48",
    marginBottom: 4,
  },
  expenseHeroVal: {
    fontSize: 26,
    fontWeight: "900",
    color: "#e11d48",
  },
  miniBarCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 4,
  },
  miniBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e2e8f0",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 8,
  },
  miniBarSeg: {
    height: "100%",
  },
  miniBarLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniBarLabelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  miniLabelText: {
    fontSize: 11,
    fontWeight: "800",
  },
  expenseSectionCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 4,
  },
  expenseSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  expenseHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expenseSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },
  expenseSectionTotal: {
    fontSize: 14,
    fontWeight: "900",
  },
  expenseSectionBody: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  expenseItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  expenseItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expenseItemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  expenseItemVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
});
