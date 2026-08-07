import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";
import { GroupExpense } from "../../types";

interface ExpenseChartProps {
  expenses: GroupExpense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Ăn uống": "#10b981", // emerald
  "Di chuyển": "#3b82f6", // blue
  "Lưu trú": "#8b5cf6", // violet
  "Giải trí": "#f59e0b", // amber
  "Mua sắm": "#ec4899", // pink
  "Sức khỏe": "#06b6d4", // cyan
  "Hóa đơn": "#2980b9", // strong blue
  "Khác": "#6b7280", // gray
};

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
      color: CATEGORY_COLORS[cat] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }));

  const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

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
        <View style={[styles.donutOuter, { borderColor: categoryList[0]?.color || "#10b981" }]}>
          <View style={styles.donutInner}>
            <Text style={styles.donutSub}>Tổng chi tiêu</Text>
            <Text style={styles.donutMainText}>{fmt(totalAmount)}</Text>
          </View>
          <View style={[styles.pctBadge, { backgroundColor: categoryList[0]?.color || "#10b981" }]}>
            <Text style={styles.pctBadgeText}>{Math.round(categoryList[0]?.pct || 100)}%</Text>
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
  donutOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: colors.white,
  },
  donutInner: {
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
  pctBadge: {
    position: "absolute",
    bottom: -8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pctBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.white,
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
