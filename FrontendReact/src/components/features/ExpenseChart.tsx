import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { colors } from "../../constants/colors";
import { GroupExpense } from "../../types";
import { CATEGORY_COLORS, getCategoryColor } from "../../constants/categories";

interface ExpenseChartProps {
  expenses: GroupExpense[];
}

const DEFAULT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"];

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ expenses }) => {
  const realExpenses = expenses.filter((e) => e.category !== "SETTLEMENT");

  if (realExpenses.length === 0) return null;

  const categoryMap: Record<string, number> = {};
  for (const e of realExpenses) {
    const cat = e.category || "Khác";
    categoryMap[cat] = (categoryMap[cat] || 0) + (e.amount || 0);
  }

  const totalAmount = Object.values(categoryMap).reduce((a, b) => a + b, 0);

  const categoryList = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt], i) => ({
      category: cat,
      amount: amt,
      pct: totalAmount > 0 ? (amt / totalAmount) * 100 : 0,
      color: getCategoryColor(cat, i),
    }));

  const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

  const chartSize = 150;
  const strokeWidth = 20;
  const radius = (chartSize - strokeWidth) / 2;
  const center = chartSize / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const slices = categoryList.map((item, idx) => {
    const pct = totalAmount > 0 ? item.amount / totalAmount : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -(accumulated * circumference);
    accumulated += pct;
    return {
      key: item.category || `${idx}`,
      color: item.color,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.icon}>🕒</Text>
          <Text style={styles.title}>Phân tích Chi tiêu theo Danh mục</Text>
        </View>
        <Text style={styles.totalSub}>
          Tổng: <Text style={styles.totalVal}>{fmt(totalAmount)}</Text>
        </Text>
      </View>

      {/* Donut Chart Visual */}
      <View style={styles.chartArea}>
        <View style={{ width: chartSize, height: chartSize, position: "relative", alignItems: "center", justifyContent: "center" }}>
          <Svg width={chartSize} height={chartSize}>
            {totalAmount <= 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
                fill="none"
              />
            ) : (
              <G rotation="-90" origin={`${center}, ${center}`}>
                {slices.map((slice) => (
                  <Circle
                    key={slice.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    fill="none"
                    strokeLinecap="butt"
                  />
                ))}
              </G>
            )}
          </Svg>
          <View style={styles.donutInnerAbsolute}>
            <Text style={styles.donutSub}>Tổng chi tiêu</Text>
            <Text style={styles.donutMainText}>{fmt(totalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Categories Breakdown List */}
      <View style={styles.breakdownList}>
        {categoryList.map((item) => (
          <View key={item.category} style={styles.catItem}>
            <View style={styles.catHeader}>
              <View style={styles.catNameRow}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={styles.catName}>{item.category}</Text>
              </View>
              <Text style={styles.catPct}>{item.pct.toFixed(1)}%</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.pct}%`, backgroundColor: item.color }]} />
            </View>

            <Text style={styles.catAmount}>{fmt(item.amount)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#475569",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
  },
  totalSub: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 4,
  },
  totalVal: {
    fontWeight: "800",
    color: colors.slate800,
  },
  chartArea: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  donutInnerAbsolute: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutSub: {
    fontSize: 11,
    color: colors.slate400,
    fontWeight: "600",
  },
  donutMainText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
    marginTop: 2,
  },
  breakdownList: {
    marginTop: 12,
    gap: 12,
  },
  catItem: {
    width: "100%",
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  catNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate800,
  },
  catPct: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate100,
    overflow: "hidden",
    marginVertical: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  catAmount: {
    fontSize: 11,
    color: colors.slate400,
    fontWeight: "600",
    marginTop: 2,
  },
});
