import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Inbox, AlertTriangle } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { CategoryIcon } from "../ui/CategoryIcon";

interface BudgetPlanItem {
  categoryId?: string;
  categoryName: string;
  categoryIcon: string;
  suggestedAmount: number;
  currentBudget?: number | null;
  lastMonthBudget?: number | null;
  lastMonthSpent?: number | null;
  avgSpent3Months: number;
  reasoning: string;
  budgetId?: string | null;
  hasBudget?: boolean;
}

interface BudgetPlanSectionProps {
  plan: BudgetPlanItem[];
  rebalancePlan?: any;
  appliedCategoryMap: Record<string, boolean>;
  applyingCategory: string | null;
  onApplyBudget: (item: BudgetPlanItem) => void;
  onNavigateToRebalance: () => void;
  fmt: (n?: number) => string;
}

export const BudgetPlanSection: React.FC<BudgetPlanSectionProps> = ({
  plan,
  rebalancePlan,
  appliedCategoryMap,
  applyingCategory,
  onApplyBudget,
  onNavigateToRebalance,
  fmt,
}) => {
  const navigation = useNavigation<any>();
  const { isDark, colors: themeColors } = useTheme();

  const getSmartInsight = (item: BudgetPlanItem) => {
    const suggested = Number(item.suggestedAmount || 0);
    const avg = Number(item.avgSpent3Months || 0);
    const lastBudget =
      item.lastMonthBudget !== null && item.lastMonthBudget !== undefined
        ? Number(item.lastMonthBudget)
        : null;

    if (lastBudget !== null) {
      const diffFromLast = suggested - lastBudget;
      if (diffFromLast < 0) {
        return {
          icon: "📉",
          title: `Đề xuất giảm ${fmt(Math.abs(diffFromLast))} so với tháng trước`,
          description: `Tháng trước bạn đặt ${fmt(lastBudget)} nhưng thực chi TB 3 tháng qua là ${fmt(avg)}. Đề xuất hạ về ${fmt(suggested)} để tiết kiệm ${fmt(Math.abs(diffFromLast))}!`,
          bgStyle: { backgroundColor: isDark ? "#064E3B" : "#ecfdf5", borderColor: isDark ? "#047857" : "#a7f3d0" },
          titleColor: isDark ? "#34D399" : "#065f46",
        };
      } else if (diffFromLast > 0) {
        return {
          icon: "📈",
          title: `Đề xuất tăng ${fmt(diffFromLast)} so với tháng trước`,
          description: `Tháng trước bạn đặt ${fmt(lastBudget)} nhưng mức chi TB 3 tháng gần nhất là ${fmt(avg)}. Nâng lên ${fmt(suggested)} để tránh vỡ kế hoạch chi tiêu.`,
          bgStyle: { backgroundColor: isDark ? "#78350F" : "#fffbeb", borderColor: isDark ? "#B45309" : "#fde68a" },
          titleColor: isDark ? "#FCD34D" : "#92400e",
        };
      } else {
        return {
          icon: "⚖️",
          title: `Bám sát ngân sách tháng trước (${fmt(lastBudget)})`,
          description: `Thói quen chi tiêu 3 tháng gần nhất (TB: ${fmt(avg)}) hoàn toàn trùng khớp với hạn mức tháng trước. Giữ nguyên ${fmt(suggested)} để duy trì ổn định.`,
          bgStyle: { backgroundColor: isDark ? "#1E3A8A" : "#eff6ff", borderColor: isDark ? "#1D4ED8" : "#bfdbfe" },
          titleColor: isDark ? "#93C5FD" : "#1e40af",
        };
      }
    }

    return {
      icon: "🎯",
      title: "Chưa có hạn mức tháng trước",
      description: `Dựa trên dữ liệu chi tiêu 3 tháng gần nhất (TB ${fmt(avg)}/tháng), hệ thống đề xuất đặt ${fmt(suggested)} để bắt đầu kiểm soát danh mục này.`,
      bgStyle: { backgroundColor: isDark ? themeColors.surface : "#f8fafc", borderColor: isDark ? themeColors.border : "#e2e8f0" },
      titleColor: isDark ? themeColors.textPrimary : "#475569",
    };
  };

  return (
    <View style={styles.container}>
      {/* 🚨 Overspending Highlight Banner if active */}
      {rebalancePlan?.hasOverspending && (
        <TouchableOpacity
          style={styles.rebalanceBannerCard}
          onPress={onNavigateToRebalance}
          activeOpacity={0.9}
        >
          <View style={styles.rebalanceBannerLeft}>
            <View style={{ marginRight: 10, justifyContent: "center" }}>
              <AlertTriangle size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rebalanceBannerTitle}>
                Phát hiện {rebalancePlan.overspentItems.length} khoản chi tiêu lố (+{fmt(rebalancePlan.totalOverspent)})
              </Text>
              <Text style={styles.rebalanceBannerSub}>
                Đã có phương án cắt giảm {rebalancePlan.compensationCuts.length} khoản linh hoạt để bù vào.
              </Text>
            </View>
          </View>
          <View style={styles.rebalanceBannerAction}>
            <Text style={styles.rebalanceBannerActionText}>Tái cân bằng ➔</Text>
          </View>
        </TouchableOpacity>
      )}

      {plan.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? themeColors.card : "#f8fafc",
              borderColor: isDark ? themeColors.border : "#e2e8f0",
            },
          ]}
        >
          <Inbox size={36} color="#94A3B8" strokeWidth={1.5} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
            Chưa đủ dữ liệu gợi ý
          </Text>
          <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
            Hãy ghi chép thu chi ít nhất 1 tháng để hệ thống gợi ý hạn mức chuẩn xác.
          </Text>
        </View>
      ) : (
        plan.map((item, idx) => {
          const hasCurrentBudget =
            (item.currentBudget !== null && item.currentBudget !== undefined) ||
            !!item.hasBudget ||
            !!item.budgetId ||
            !!appliedCategoryMap[item.categoryName];
          const isApplying = applyingCategory === item.categoryName;
          const insight = getSmartInsight(item);

          return (
            <View
              key={idx}
              style={[
                styles.planCard,
                {
                  backgroundColor: isDark ? themeColors.card : colors.white,
                  borderColor: isDark ? themeColors.border : "#e2e8f0",
                },
              ]}
            >
              {/* Top Row: Icon & Category Name */}
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.planIconBox,
                    { backgroundColor: isDark ? themeColors.surface : "#f1f5f9" },
                  ]}
                >
                  <CategoryIcon name={item.categoryIcon || item.categoryName} size={20} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.planCategory, { color: themeColors.textPrimary }]}>
                    {item.categoryName}
                  </Text>
                  <Text style={[styles.planSub, { color: themeColors.textSecondary }]}>
                    Dựa trên dữ liệu phân tích 3 tháng & tháng trước
                  </Text>
                </View>
              </View>

              {/* 3-Pillar Data Comparison Row */}
              <View
                style={[
                  styles.metricsCompareRow,
                  {
                    backgroundColor: isDark ? themeColors.surface : "#f8fafc",
                    borderColor: isDark ? themeColors.border : "#f1f5f9",
                  },
                ]}
              >
                <View style={styles.metricColumn}>
                  <Text style={[styles.metricColumnLabel, { color: themeColors.textSecondary }]}>
                    TB 3 THÁNG
                  </Text>
                  <Text style={[styles.metricColumnValue, { color: themeColors.textPrimary }]}>
                    {fmt(item.avgSpent3Months)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricDivider,
                    { backgroundColor: isDark ? themeColors.border : "#e2e8f0" },
                  ]}
                />

                <View style={styles.metricColumn}>
                  <Text style={[styles.metricColumnLabel, { color: themeColors.textSecondary }]}>
                    THÁNG TRƯỚC
                  </Text>
                  <Text
                    style={[
                      styles.metricColumnValue,
                      !item.lastMonthBudget && { color: colors.slate400, fontSize: 13 },
                      !!item.lastMonthBudget && { color: themeColors.textPrimary },
                    ]}
                  >
                    {item.lastMonthBudget ? fmt(item.lastMonthBudget) : "Chưa đặt"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricDivider,
                    { backgroundColor: isDark ? themeColors.border : "#e2e8f0" },
                  ]}
                />

                <View style={[styles.metricColumn, styles.metricColumnHighlight]}>
                  <Text style={[styles.metricColumnLabel, { color: colors.emerald700 }]}>
                    ĐỀ XUẤT THÁNG NÀY
                  </Text>
                  <Text
                    style={[
                      styles.metricColumnValue,
                      { color: colors.emerald700, fontWeight: "900" },
                    ]}
                  >
                    {fmt(item.suggestedAmount)}
                  </Text>
                </View>
              </View>

              {/* Single Smart AI Insight Box */}
              <View style={[styles.smartInsightCard, insight.bgStyle]}>
                <View style={styles.smartInsightHeader}>
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{insight.icon}</Text>
                  <Text style={[styles.smartInsightTitle, { color: insight.titleColor }]}>
                    {insight.title}
                  </Text>
                </View>
                <Text style={[styles.smartInsightDesc, { color: isDark ? "#E2E8F0" : colors.slate700 }]}>
                  {insight.description}
                </Text>
              </View>

              {/* Action Button */}
              <View style={styles.planActionRow}>
                <TouchableOpacity
                  style={[
                    styles.applyBudgetBtn,
                    hasCurrentBudget && styles.applyBudgetBtnDisabled,
                  ]}
                  onPress={() => onApplyBudget(item)}
                  disabled={isApplying || hasCurrentBudget}
                  activeOpacity={0.85}
                >
                  {isApplying ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : hasCurrentBudget ? (
                    <Text style={[styles.applyBudgetBtnText, styles.applyBudgetBtnTextDisabled]}>
                      ✓ Đã có ngân sách
                    </Text>
                  ) : (
                    <Text style={styles.applyBudgetBtnText}>+ Thêm ngân sách</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Link to Full Budget Manager Screen */}
      <TouchableOpacity
        style={[
          styles.fullBudgetLinkCard,
          {
            backgroundColor: isDark ? themeColors.card : colors.white,
            borderColor: isDark ? "#059669" : colors.emerald200,
          },
        ]}
        onPress={() => navigation.navigate("Budget")}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.fullBudgetLinkTitle, { color: isDark ? "#34D399" : colors.emerald900 }]}>
            🎯 Xem danh sách Hạn mức đầy đủ
          </Text>
          <Text style={[styles.fullBudgetLinkSub, { color: themeColors.textSecondary }]}>
            Kiểm tra tiến độ chi tiêu, phân bổ và ưu tiên thanh toán
          </Text>
        </View>
        <Text style={styles.fullBudgetLinkArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  rebalanceBannerCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rebalanceBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rebalanceBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991B1B",
  },
  rebalanceBannerSub: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  rebalanceBannerAction: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  rebalanceBannerActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  planCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  planIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  planCategory: {
    fontSize: 16,
    fontWeight: "800",
  },
  planSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  metricsCompareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
  },
  metricColumnHighlight: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 10,
    paddingVertical: 4,
  },
  metricColumnLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
  },
  metricColumnValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  smartInsightCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  smartInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  smartInsightTitle: {
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  smartInsightDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  planActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  applyBudgetBtn: {
    backgroundColor: colors.indigo600,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBudgetBtnDisabled: {
    backgroundColor: colors.slate200,
  },
  applyBudgetBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  applyBudgetBtnTextDisabled: {
    color: colors.slate500,
  },
  fullBudgetLinkCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  fullBudgetLinkTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  fullBudgetLinkSub: {
    fontSize: 12,
    marginTop: 2,
  },
  fullBudgetLinkArrow: {
    fontSize: 22,
    color: colors.emerald600,
    fontWeight: "800",
    marginLeft: 10,
  },
});
