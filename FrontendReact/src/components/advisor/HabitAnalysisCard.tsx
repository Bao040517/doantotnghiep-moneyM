import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Home, ShoppingBag, PiggyBank, MessageSquare, TrendingUp } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";

interface HabitAnalysisCardProps {
  habits: {
    verdict: string;
    needsPercent: number;
    wantsPercent: number;
    savingsPercent: number;
    needsAmount: number;
    wantsAmount: number;
    savingsAmount: number;
    recommendations: string[];
  };
  fmt: (n?: number) => string;
}

export const HabitAnalysisCard: React.FC<HabitAnalysisCardProps> = ({ habits, fmt }) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Verdict Hero Card */}
      <View style={styles.verdictCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TrendingUp size={18} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.verdictTitle}>Phân tích theo chuẩn 50/30/20</Text>
        </View>
        <Text style={styles.verdictSub}>Mô hình quản lý tài chính cá nhân quốc tế</Text>
        <View style={styles.verdictBox}>
          <Text style={styles.verdictText}>{habits.verdict}</Text>
        </View>
      </View>

      {/* 50/30/20 Breakdown Bars */}
      <View
        style={[
          styles.breakdownCard,
          { backgroundColor: isDark ? themeColors.card : colors.white },
        ]}
      >
        <Text style={[styles.cardHeaderTitle, { color: themeColors.textPrimary }]}>
          Cơ cấu Chi tiêu / Thu nhập
        </Text>

        {/* Needs (50%) */}
        <View style={styles.barItem}>
          <View style={styles.barHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Home size={15} color="#10B981" strokeWidth={2} />
              <Text style={[styles.barLabel, { color: themeColors.textPrimary }]}>
                Thiết yếu (Chuẩn ≤ 50%)
              </Text>
            </View>
            <Text
              style={[
                styles.barPct,
                { color: habits.needsPercent > 50 ? colors.rose600 : colors.emerald600 },
              ]}
            >
              {habits.needsPercent.toFixed(0)}%
            </Text>
          </View>
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? "#334155" : colors.slate100 },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, habits.needsPercent)}%`,
                  backgroundColor:
                    habits.needsPercent > 50 ? colors.rose500 : colors.emerald500,
                },
              ]}
            />
          </View>
          <Text style={[styles.barSub, { color: themeColors.textSecondary }]}>
            {fmt(habits.needsAmount)} — Tiền nhà, ăn uống, điện nước...
          </Text>
        </View>

        {/* Wants (30%) */}
        <View style={styles.barItem}>
          <View style={styles.barHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ShoppingBag size={15} color="#F59E0B" strokeWidth={2} />
              <Text style={[styles.barLabel, { color: themeColors.textPrimary }]}>
                Linh hoạt (Chuẩn ≤ 30%)
              </Text>
            </View>
            <Text
              style={[
                styles.barPct,
                { color: habits.wantsPercent > 30 ? colors.amber600 : colors.emerald600 },
              ]}
            >
              {habits.wantsPercent.toFixed(0)}%
            </Text>
          </View>
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? "#334155" : colors.slate100 },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, habits.wantsPercent)}%`,
                  backgroundColor:
                    habits.wantsPercent > 30 ? colors.amber500 : colors.emerald500,
                },
              ]}
            />
          </View>
          <Text style={[styles.barSub, { color: themeColors.textSecondary }]}>
            {fmt(habits.wantsAmount)} — Mua sắm, giải trí, cafe...
          </Text>
        </View>

        {/* Savings (20%) */}
        <View style={styles.barItem}>
          <View style={styles.barHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <PiggyBank size={15} color="#10B981" strokeWidth={2} />
              <Text style={[styles.barLabel, { color: themeColors.textPrimary }]}>
                Tiết kiệm (Chuẩn ≥ 20%)
              </Text>
            </View>
            <Text
              style={[
                styles.barPct,
                { color: habits.savingsPercent < 20 ? colors.rose600 : colors.emerald600 },
              ]}
            >
              {habits.savingsPercent.toFixed(0)}%
            </Text>
          </View>
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? "#334155" : colors.slate100 },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, habits.savingsPercent)}%`,
                  backgroundColor:
                    habits.savingsPercent < 20 ? colors.rose500 : colors.emerald500,
                },
              ]}
            />
          </View>
          <Text style={[styles.barSub, { color: themeColors.textSecondary }]}>
            {fmt(habits.savingsAmount)} — Thu nhập trừ chi tiêu
          </Text>
        </View>
      </View>

      {/* Recommendations List */}
      {habits.recommendations.length > 0 && (
        <View
          style={[
            styles.recommendCard,
            { backgroundColor: isDark ? themeColors.card : colors.white },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <MessageSquare size={16} color="#10B981" strokeWidth={2} />
            <Text style={[styles.cardHeaderTitle, { color: themeColors.textPrimary, marginBottom: 0 }]}>
              Nhận xét chi tiết
            </Text>
          </View>
          {habits.recommendations.map((rec, idx) => (
            <View
              key={idx}
              style={[
                styles.recItem,
                { backgroundColor: isDark ? themeColors.surface : colors.slate50 },
              ]}
            >
              <Text
                style={[
                  styles.recText,
                  { color: isDark ? "#E2E8F0" : colors.slate700 },
                ]}
              >
                • {rec}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  verdictCard: {
    backgroundColor: "#7c3aed",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  verdictTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.white,
    marginBottom: 2,
  },
  verdictSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
  },
  verdictBox: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 12,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
    lineHeight: 20,
  },
  breakdownCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  barItem: {
    marginBottom: 14,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  barPct: {
    fontSize: 14,
    fontWeight: "900",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  barSub: {
    fontSize: 11,
    marginTop: 4,
  },
  recommendCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  recItem: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  recText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
