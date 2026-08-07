import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { BottomSheet } from "../ui/BottomSheet";
import { colors } from "../../constants/colors";

interface CashflowComparisonBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  currentMonthExpense?: number;
  currentMonthIncome?: number;
}

export const CashflowComparisonBottomSheet: React.FC<CashflowComparisonBottomSheetProps> = ({
  visible,
  onClose,
  currentMonthExpense = 22438044,
  currentMonthIncome = 44800000,
}) => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("year");
  const [activeType, setActiveType] = useState<"income" | "expense" | "diff">("diff");

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

  const netDiff = currentMonthIncome - currentMonthExpense;

  // CHRONOLOGICAL DATA STRUCTURE (THỨ TỰ THỜI GIAN THEO YÊU CẦU):
  // - Theo tuần: 4 tuần (Tuần 1 -> Tuần 4)
  // - Theo tháng: 12 tháng (T1 -> T12)
  // - Theo năm: 5 năm (2022 -> 2026)
  const compData =
    timeRange === "year"
      ? [
          { period: "2022", label: "2022", income: 280000000, expense: 210000000 },
          { period: "2023", label: "2023", income: 320000000, expense: 250000000 },
          { period: "2024", label: "2024", income: 360000000, expense: 290000000 },
          { period: "2025", label: "2025", income: 400000000, expense: 330000000 },
          { period: "2026", label: "2026", income: currentMonthIncome * 12, expense: currentMonthExpense * 12 },
        ]
      : timeRange === "month"
      ? [
          { period: "T1", label: "T1", income: 32000000, expense: 18000000 },
          { period: "T2", label: "T2", income: 35000000, expense: 21000000 },
          { period: "T3", label: "T3", income: 38000000, expense: 24000000 },
          { period: "T4", label: "T4", income: 40000000, expense: 22000000 },
          { period: "T5", label: "T5", income: 42000000, expense: 25000000 },
          { period: "T6", label: "T6", income: 39000000, expense: 20000000 },
          { period: "T7", label: "T7", income: 41000000, expense: 23000000 },
          { period: "T8", label: "T8", income: currentMonthIncome, expense: currentMonthExpense },
          { period: "T9", label: "T9", income: 35000000, expense: 19000000 },
          { period: "T10", label: "T10", income: 37000000, expense: 21000000 },
          { period: "T11", label: "T11", income: 40000000, expense: 22000000 },
          { period: "T12", label: "T12", income: 45000000, expense: 26000000 },
        ]
      : [
          { period: "Tuần 1", label: "T1", income: 8000000, expense: 4500000 },
          { period: "Tuần 2", label: "T2", income: 9500000, expense: 5200000 },
          { period: "Tuần 3", label: "T3", income: 10000000, expense: 6100000 },
          { period: "Tuần 4", label: "T4", income: Math.round(currentMonthIncome / 4), expense: Math.round(currentMonthExpense / 4) },
        ];

  // Theme colors
  const themeColor =
    activeType === "income" ? "#10B981" : activeType === "expense" ? "#FF2E55" : "#6366F1";
  const heroValColor =
    activeType === "income" ? "#10B981" : activeType === "expense" ? "#FF2E55" : "#1E293B";

  // DYNAMIC SVG BAR CHART CALCULATION
  const renderChart = () => {
    const W = 320, H = 190, PAD_LEFT = 42, PAD_RIGHT = 14, PAD_TOP = 20, PAD_BOTTOM = 35;
    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;
    const yBaseline = H - PAD_BOTTOM; // Gốc tọa độ y = 0 ở dưới cùng

    // 1. Calculate actual raw values in Millions for current active period & type
    const rawValsInMillions = compData.map((d) => {
      if (activeType === "income") return d.income / 1000000;
      if (activeType === "expense") return d.expense / 1000000;
      return Math.abs(d.income - d.expense) / 1000000;
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

    // Responsive bar dimensions for 4 weeks, 12 months, or 5 years
    const numBars = compData.length;
    const slotW = chartW / numBars;
    const barW = Math.max(10, Math.min(42, slotW * 0.65));

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
                ? d.income / 1000000
                : activeType === "expense"
                ? d.expense / 1000000
                : Math.abs(d.income - d.expense) / 1000000;

            const barH = (rawVal / niceMax) * chartH;
            const y = yBaseline - Math.max(4, barH); // Standing ON bottom baseline

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

            const isCurrentItem = d.label.includes("2026") || d.label.includes("T8") || d.label.includes("T4");

            return (
              <G key={d.period}>
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
              ? `Tổng thu nhập ${timeRange === "year" ? "năm nay" : timeRange === "month" ? "tháng này" : "tuần này"}`
              : activeType === "expense"
              ? `Tổng chi tiêu ${timeRange === "year" ? "năm nay" : timeRange === "month" ? "tháng này" : "tuần này"}`
              : `Tổng chênh lệch ${timeRange === "year" ? "năm nay" : timeRange === "month" ? "tháng này" : "tuần này"}`}
          </Text>

          <Text style={[styles.heroVal, { color: heroValColor }]}>
            {activeType === "income"
              ? fmt(currentMonthIncome)
              : activeType === "expense"
              ? fmt(currentMonthExpense)
              : fmt(netDiff)}
          </Text>

          <View style={[
            styles.heroBadge,
            { backgroundColor: activeType === "income" ? "#ECFDF5" : activeType === "expense" ? "#FFF1F2" : "#F0FDF4" }
          ]}>
            <Text style={[
              styles.heroBadgeText,
              { color: activeType === "income" ? "#059669" : activeType === "expense" ? "#E11D48" : "#16A34A" }
            ]}>
              {fmt(netDiff)}
            </Text>
          </View>
        </View>

        {/* ─── BAR CHART SECTION ─── */}
        <Text style={styles.sectionHeaderTitle}>Biến động ({timeRange === "week" ? "4 tuần" : timeRange === "month" ? "12 tháng" : "5 năm"})</Text>
        {renderChart()}

        {/* ─── COMPARISON BREAKDOWN LIST ─── */}
        <View style={styles.compList}>
          {compData.slice(-4).map((d) => {
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
    borderRadius: 16,
    alignItems: "center",
  },
  pillBtnActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
    fontFamily: "Roboto",
  },
  pillTextActive: {
    color: "#FF2E55",
    fontWeight: "900",
  },

  /* Sub Tab Row */
  subTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate400,
    fontFamily: "Roboto",
  },
  subTabIncomeText: {
    color: "#10B981",
    fontWeight: "900",
  },
  subTabExpenseText: {
    color: "#FF2E55",
    fontWeight: "900",
  },
  subTabDiffText: {
    color: "#6366F1",
    fontWeight: "900",
  },

  /* Hero Box */
  heroBox: {
    alignItems: "center",
    marginVertical: 12,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    marginBottom: 4,
    fontFamily: "Roboto",
  },
  heroVal: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 8,
    fontFamily: "Roboto",
  },
  heroBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Roboto",
  },

  /* Section Header */
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900,
    marginTop: 12,
    marginBottom: 8,
    fontFamily: "Roboto",
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 16,
  },
  unitText: {
    fontSize: 10,
    color: colors.slate500,
    fontWeight: "700",
    marginBottom: 4,
    fontFamily: "Roboto",
  },

  /* Comp List */
  compList: {
    gap: 10,
  },
  compRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate50,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  compYearBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  compYearText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate900,
    fontFamily: "Roboto",
  },
  compSubText: {
    fontSize: 11,
    color: colors.slate500,
    fontFamily: "Roboto",
  },
  compValText: {
    fontWeight: "700",
  },
  remainLabel: {
    fontSize: 10,
    color: colors.slate400,
    fontFamily: "Roboto",
  },
  remainVal: {
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "Roboto",
  },
});
