import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  ActivityIndicator,
} from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { BottomSheet } from "../ui/BottomSheet";
import { colors } from "../../constants/colors";
import { financialServices } from "../../services/financialServices";
import { CashflowPoint } from "../../types";

interface CashflowComparisonBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedYear?: number;
  selectedMonth?: number;
  currentMonthExpense?: number;
  currentMonthIncome?: number;
}

export const CashflowComparisonBottomSheet: React.FC<CashflowComparisonBottomSheetProps> = ({
  visible,
  onClose,
  selectedYear,
  selectedMonth,
  currentMonthExpense = 0,
  currentMonthIncome = 0,
}) => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [activeType, setActiveType] = useState<"income" | "expense" | "diff">("diff");
  const [weeksData, setWeeksData] = useState<CashflowPoint[]>([]);
  const [monthsData, setMonthsData] = useState<CashflowPoint[]>([]);
  const [yearsData, setYearsData] = useState<CashflowPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const targetYear = selectedYear || now.getFullYear();
  const targetMonth = selectedMonth || (now.getMonth() + 1);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setLoading(true);

    const loadRealData = async () => {
      try {
        // 1. Load Months (T1 -> targetMonth for current year, or 1..12 for past year)
        const maxMonths =
          targetYear === now.getFullYear()
            ? targetMonth
            : targetYear < now.getFullYear()
            ? 12
            : targetMonth;

        const monthPromises = [];
        for (let m = 1; m <= maxMonths; m++) {
          monthPromises.push(
            financialServices
              .getMonthlySummary(targetYear, m)
              .then((res) => {
                const inc = Number(res?.currentMonth?.totalIncome ?? res?.totalIncome ?? 0);
                const exp = Number(res?.currentMonth?.totalExpense ?? res?.totalExpense ?? 0);
                return {
                  period: `T${m}`,
                  label: `T${m}`,
                  income: inc,
                  expense: exp,
                  net: inc - exp,
                };
              })
              .catch(() => ({
                period: `T${m}`,
                label: `T${m}`,
                income: 0,
                expense: 0,
                net: 0,
              }))
          );
        }

        // 2. Load Transactions for 4 Weeks in selected month
        const weekPromise = financialServices
          .getMonthlyTransactions(targetYear, targetMonth)
          .then((txs) => {
            const w1 = { income: 0, expense: 0 };
            const w2 = { income: 0, expense: 0 };
            const w3 = { income: 0, expense: 0 };
            const w4 = { income: 0, expense: 0 };

            (txs || []).forEach((t) => {
              const d = new Date(t.transactionDate);
              const day = isNaN(d.getDate()) ? 1 : d.getDate();
              const amt = Number(t.amount || 0);

              if (day <= 7) {
                if (t.type === "INCOME") w1.income += amt;
                else if (t.type === "EXPENSE") w1.expense += amt;
              } else if (day <= 14) {
                if (t.type === "INCOME") w2.income += amt;
                else if (t.type === "EXPENSE") w2.expense += amt;
              } else if (day <= 21) {
                if (t.type === "INCOME") w3.income += amt;
                else if (t.type === "EXPENSE") w3.expense += amt;
              } else {
                if (t.type === "INCOME") w4.income += amt;
                else if (t.type === "EXPENSE") w4.expense += amt;
              }
            });

            return [
              { period: "Tuần 1", label: "T1", income: w1.income, expense: w1.expense, net: w1.income - w1.expense },
              { period: "Tuần 2", label: "T2", income: w2.income, expense: w2.expense, net: w2.income - w2.expense },
              { period: "Tuần 3", label: "T3", income: w3.income, expense: w3.expense, net: w3.income - w3.expense },
              { period: "Tuần 4", label: "T4", income: w4.income, expense: w4.expense, net: w4.income - w4.expense },
            ];
          })
          .catch(() => []);

        // 3. Load Year comparison (e.g. 2025 and 2026)
        const yearPromises = [targetYear - 1, targetYear].map(async (y) => {
          try {
            const monthsInY = y === now.getFullYear() ? targetMonth : 12;
            const resList = await Promise.all(
              Array.from({ length: monthsInY }, (_, i) =>
                financialServices.getMonthlySummary(y, i + 1).catch(() => null)
              )
            );
            const totalInc = resList.reduce((s, r) => s + Number(r?.currentMonth?.totalIncome ?? 0), 0);
            const totalExp = resList.reduce((s, r) => s + Number(r?.currentMonth?.totalExpense ?? 0), 0);
            return {
              period: String(y),
              label: String(y),
              income: totalInc,
              expense: totalExp,
              net: totalInc - totalExp,
            };
          } catch (e) {
            return { period: String(y), label: String(y), income: 0, expense: 0, net: 0 };
          }
        });

        const [fetchedMonths, fetchedWeeks, fetchedYears] = await Promise.all([
          Promise.all(monthPromises),
          weekPromise,
          Promise.all(yearPromises),
        ]);

        if (isMounted) {
          setMonthsData(fetchedMonths);
          setWeeksData(fetchedWeeks);
          setYearsData(fetchedYears);
        }
      } catch (err) {
        console.error("Failed to load real cashflow data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, [visible, targetYear, targetMonth]);

  const switchTimeRange = (range: "week" | "month" | "year") => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {}
    setTimeRange(range);
  };

  const switchActiveType = (type: "income" | "expense" | "diff") => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {}
    setActiveType(type);
  };

  const fmt = (n: number) => {
    const safe = Math.round(Math.abs(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + "đ";
  };

  // 100% REAL DATA FROM DATABASE (NO SYNTHETIC DATA)
  const compData: CashflowPoint[] =
    timeRange === "year"
      ? yearsData
      : timeRange === "month"
      ? monthsData
      : weeksData;

  // Selected period totals for Hero Box
  const activeMonthData = monthsData.find((d) => d.period === `T${targetMonth}`);
  const totalPeriodIncome =
    timeRange === "month"
      ? (activeMonthData?.income ?? currentMonthIncome)
      : compData.reduce((sum, d) => sum + (d.income || 0), 0);

  const totalPeriodExpense =
    timeRange === "month"
      ? (activeMonthData?.expense ?? currentMonthExpense)
      : compData.reduce((sum, d) => sum + (d.expense || 0), 0);

  const totalPeriodNet = totalPeriodIncome - totalPeriodExpense;

  // Theme colors
  const themeColor =
    activeType === "income" ? "#10B981" : activeType === "expense" ? "#FF2E55" : "#6366F1";
  const heroValColor =
    activeType === "income" ? "#10B981" : activeType === "expense" ? "#FF2E55" : "#1E293B";

  // DYNAMIC SVG BAR CHART CALCULATION
  const renderChart = () => {
    if (compData.length === 0) {
      return (
        <View style={[styles.chartContainer, { height: 190, justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ fontSize: 12, color: "#94a3b8", fontWeight: "600" }}>Đang tải dữ liệu thực tế...</Text>
        </View>
      );
    }

    const W = 320, H = 190, PAD_LEFT = 42, PAD_RIGHT = 14, PAD_TOP = 20, PAD_BOTTOM = 35;
    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;
    const yBaseline = H - PAD_BOTTOM; // Gốc tọa độ y = 0 ở dưới cùng

    // 1. Calculate actual raw values in Millions for current active period & type
    const rawValsInMillions = compData.map((d) => {
      if (activeType === "income") return (d.income || 0) / 1000000;
      if (activeType === "expense") return (d.expense || 0) / 1000000;
      return Math.abs((d.income || 0) - (d.expense || 0)) / 1000000;
    });

    const maxValReal = Math.max(...rawValsInMillions, 0.5);

    // 2. Dynamic max scale (niceMax) so bars fill 75%-90% height beautifully
    let niceMax = 10;
    if (maxValReal <= 1) niceMax = 1;
    else if (maxValReal <= 3) niceMax = 3;
    else if (maxValReal <= 6) niceMax = 6;
    else if (maxValReal <= 10) niceMax = 10;
    else if (maxValReal <= 20) niceMax = 20;
    else if (maxValReal <= 35) niceMax = 35;
    else if (maxValReal <= 60) niceMax = 60;
    else if (maxValReal <= 100) niceMax = 100;
    else if (maxValReal <= 300) niceMax = 300;
    else if (maxValReal <= 600) niceMax = 600;
    else niceMax = Math.ceil(maxValReal / 100) * 100;

    // 3. Dynamic tick milestones: [0, step1, step2, niceMax]
    const step = niceMax / 3;
    const yLevels = [
      0,
      Number(step.toFixed(niceMax <= 3 ? 1 : 0)),
      Number((step * 2).toFixed(niceMax <= 3 ? 1 : 0)),
      Number(niceMax.toFixed(niceMax <= 3 ? 1 : 0)),
    ];

    // Responsive bar dimensions for 4 weeks, 8/12 months, or years
    const numBars = compData.length;
    const slotW = chartW / numBars;
    const barW = Math.max(12, Math.min(42, slotW * 0.65));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.unitText}>(Triệu)</Text>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Dynamic grid lines and bold Roboto labels */}
          {yLevels.map((val, i) => {
            const y = yBaseline - (i / (yLevels.length - 1)) * chartH;
            return (
              <G key={i}>
                <Line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="#E2E8F0" strokeWidth={1} />
                <SvgText
                  x={PAD_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight="700"
                  fill="#334155"
                  fontFamily="Roboto"
                >
                  {val}
                </SvgText>
              </G>
            );
          })}

          {/* Vertical Bars standing ON bottom baseline and arranged in chronological order */}
          {compData.map((d, i) => {
            const x = PAD_LEFT + (i + 0.5) * slotW - barW / 2;
            
            const rawVal =
              activeType === "income"
                ? (d.income || 0) / 1000000
                : activeType === "expense"
                ? (d.expense || 0) / 1000000
                : Math.abs((d.income || 0) - (d.expense || 0)) / 1000000;

            const hasValue = rawVal > 0;
            const barH = (rawVal / niceMax) * chartH;
            const y = yBaseline - Math.max(hasValue ? 4 : 0, barH); // Standing ON bottom baseline

            const barFill =
              activeType === "income"
                ? "#D1FAE5"
                : activeType === "expense"
                ? "#FFE4E6"
                : (d.income - d.expense) >= 0
                ? "#D1FAE5"
                : "#FFE4E6";

            const barStroke =
              activeType === "income"
                ? "#10B981"
                : activeType === "expense"
                ? "#FF2E55"
                : (d.income - d.expense) >= 0
                ? "#10B981"
                : "#FF2E55";

            const isCurrentItem =
              d.period === `T${targetMonth}` ||
              d.period === targetYear.toString();

            return (
              <G key={d.period}>
                {hasValue && (
                  <Rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(4, barH)}
                    rx={numBars > 6 ? 4 : 8}
                    fill={barFill}
                    stroke={barStroke}
                    strokeWidth={1.2}
                  />
                )}
                <SvgText
                  x={x + barW / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={numBars > 8 ? 8 : 10}
                  fontWeight={isCurrentItem ? "900" : "600"}
                  fill={isCurrentItem ? themeColor : "#475569"}
                  fontFamily="Roboto"
                >
                  {d.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Biến động thu chi">
      <ScrollView
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* ─── TIME RANGE TAB SELECTOR (Row 1) ─── */}
        <View style={styles.pillContainer}>
          <TouchableOpacity
            onPress={() => switchTimeRange("week")}
            style={[styles.pillBtn, timeRange === "week" && styles.pillBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, timeRange === "week" && styles.pillTextActive]}>Theo tuần</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchTimeRange("month")}
            style={[styles.pillBtn, timeRange === "month" && styles.pillBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, timeRange === "month" && styles.pillTextActive]}>Theo tháng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchTimeRange("year")}
            style={[styles.pillBtn, timeRange === "year" && styles.pillBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, timeRange === "year" && styles.pillTextActive]}>Theo năm</Text>
          </TouchableOpacity>
        </View>

        {/* ─── SUB-TYPE TAB SELECTOR (Row 2) ─── */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            onPress={() => switchActiveType("income")}
            style={[styles.subTabBtn, activeType === "income" && styles.subTabActiveIncome]}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeType === "income" && styles.subTabIncomeText]}>Thu nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchActiveType("expense")}
            style={[styles.subTabBtn, activeType === "expense" && styles.subTabActiveExpense]}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeType === "expense" && styles.subTabExpenseText]}>Chi tiêu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchActiveType("diff")}
            style={[styles.subTabBtn, activeType === "diff" && styles.subTabActiveDiff]}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeType === "diff" && styles.subTabDiffText]}>Chênh lệch</Text>
          </TouchableOpacity>
        </View>

        {/* ─── HERO AMOUNT BOX ─── */}
        <View style={styles.heroBox}>
          <Text style={styles.heroSub}>
            {activeType === "income"
              ? `Tổng thu nhập ${timeRange === "year" ? `năm ${targetYear}` : timeRange === "month" ? `tháng ${targetMonth}/${targetYear}` : `tháng ${targetMonth}`}`
              : activeType === "expense"
              ? `Tổng chi tiêu ${timeRange === "year" ? `năm ${targetYear}` : timeRange === "month" ? `tháng ${targetMonth}/${targetYear}` : `tháng ${targetMonth}`}`
              : `Tổng chênh lệch ${timeRange === "year" ? `năm ${targetYear}` : timeRange === "month" ? `tháng ${targetMonth}/${targetYear}` : `tháng ${targetMonth}`}`}
          </Text>

          <Text style={[styles.heroVal, { color: heroValColor }]}>
            {activeType === "income"
              ? fmt(totalPeriodIncome)
              : activeType === "expense"
              ? fmt(totalPeriodExpense)
              : fmt(totalPeriodNet)}
          </Text>

          <View style={[
            styles.heroBadge,
            { backgroundColor: totalPeriodNet >= 0 ? "#ECFDF5" : "#FFF1F2" }
          ]}>
            <Text style={[
              styles.heroBadgeText,
              { color: totalPeriodNet >= 0 ? "#059669" : "#E11D48" }
            ]}>
              {totalPeriodNet >= 0 ? `Dư ${fmt(totalPeriodNet)}` : `Âm ${fmt(Math.abs(totalPeriodNet))}`}
            </Text>
          </View>
        </View>

        {/* ─── BAR CHART SECTION ─── */}
        <Text style={styles.sectionHeaderTitle}>
          Biến động ({timeRange === "week" ? `4 tuần Tháng ${targetMonth}` : timeRange === "month" ? `${compData.length} tháng Năm ${targetYear}` : `${compData.length} năm`})
        </Text>
        {loading ? (
          <View style={{ height: 190, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.indigo600} />
          </View>
        ) : (
          renderChart()
        )}

        {/* ─── COMPARISON BREAKDOWN LIST ─── */}
        <View style={styles.compList}>
          {compData.map((d) => {
            const diff = d.income - d.expense;
            return (
              <View key={d.period} style={styles.compRowItem}>
                <View style={styles.compYearBadge}>
                  <Text style={styles.compYearText}>{d.period}</Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.compSubText}>
                    Thu <Text style={[styles.compValText, { color: "#059669" }]}>{fmt(d.income)}</Text>
                  </Text>
                  <Text style={styles.compSubText}>
                    Chi <Text style={[styles.compValText, { color: "#E11D48" }]}>{fmt(d.expense)}</Text>
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.remainLabel}>Còn lại</Text>
                  <Text style={[styles.remainVal, { color: diff >= 0 ? colors.emerald600 : colors.rose600 }]}>
                    {fmt(diff)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  /* Time Range Pills */
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 16,
  },
  pillBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },

  /* Sub-Tab Selector */
  subTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 16,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  subTabActiveIncome: {
    borderBottomColor: "#10B981",
  },
  subTabActiveExpense: {
    borderBottomColor: "#FF2E55",
  },
  subTabActiveDiff: {
    borderBottomColor: "#6366F1",
  },
  subTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  subTabIncomeText: {
    color: "#10B981",
    fontWeight: "800",
  },
  subTabExpenseText: {
    color: "#FF2E55",
    fontWeight: "800",
  },
  subTabDiffText: {
    color: "#6366F1",
    fontWeight: "800",
  },

  /* Hero Amount Box */
  heroBox: {
    alignItems: "center",
    marginVertical: 12,
    gap: 4,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  heroVal: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  /* Bar Chart */
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 8,
  },
  chartContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    position: "relative",
  },
  unitText: {
    position: "absolute",
    top: 10,
    left: 12,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    zIndex: 1,
  },

  /* Comparison List */
  compList: {
    marginTop: 16,
    gap: 8,
  },
  compRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  compYearBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compYearText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  compSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  compValText: {
    fontWeight: "800",
  },
  remainLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  remainVal: {
    fontSize: 13,
    fontWeight: "900",
  },
});
