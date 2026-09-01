import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { getCategoryEmoji } from "../../constants/categories";

interface WarningItem {
  categoryName: string;
  categoryIcon?: string;
  message: string;
  severity: "HIGH" | "MEDIUM";
  increasePercent: number;
  currentMonthSpent: number;
  avg3MonthSpent: number;
  projectedMonthEnd?: number;
  dailyBurnRate?: number;
  recommendedDailyLimit?: number;
  remainingDays?: number;
  actionableTip?: string;
  impactSummary?: string;
}

interface AnomalyWarningsSectionProps {
  warnings: WarningItem[];
  fmt: (n?: number) => string;
}

export const AnomalyWarningsSection: React.FC<AnomalyWarningsSectionProps> = ({
  warnings,
  fmt,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header Description */}
      <View
        style={[
          styles.alertsHeaderCard,
          {
            backgroundColor: isDark ? themeColors.card : "#fef3c7",
            borderColor: isDark ? "#78350F" : "#fde68a",
          },
        ]}
      >
        <View
          style={[
            styles.alertsHeaderIconBox,
            { backgroundColor: isDark ? themeColors.surface : "#fef3c7" },
          ]}
        >
          <Text style={{ fontSize: 22 }}>⚡</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[
              styles.alertsHeaderTitle,
              { color: isDark ? "#FCD34D" : "#92400e" },
            ]}
          >
            Cảnh báo Chi tiêu Bất thường ({warnings.length})
          </Text>
          <Text
            style={[
              styles.alertsHeaderSub,
              { color: isDark ? themeColors.textSecondary : "#b45309" },
            ]}
          >
            Hệ thống AI theo dõi tốc độ đốt tiền (Burn-rate) và so sánh với trung bình 3 tháng để cảnh báo nguy cơ thâm hụt sớm.
          </Text>
        </View>
      </View>

      {warnings.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? themeColors.card : "#f8fafc",
              borderColor: isDark ? themeColors.border : "#e2e8f0",
            },
          ]}
        >
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
            Tốc độ chi tiêu an toàn!
          </Text>
          <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
            Không phát hiện khoản chi nào tăng đột biến so với thói quen 3 tháng qua. Bạn đang kiểm soát dòng tiền rất tốt.
          </Text>
        </View>
      ) : (
        warnings.map((w, idx) => {
          const isHigh = w.severity === "HIGH";
          return (
            <View
              key={idx}
              style={[
                styles.smartWarningCard,
                {
                  backgroundColor: isDark ? themeColors.card : colors.white,
                  borderColor: isDark
                    ? themeColors.border
                    : isHigh
                    ? "#fecdd3"
                    : "#fef08a",
                },
              ]}
            >
              {/* Header */}
              <View style={styles.warningHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={[
                      styles.warningIconCircle,
                      {
                        backgroundColor: isHigh ? "#FEE2E2" : "#FEF3C7",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {getCategoryEmoji(w.categoryIcon, w.categoryName)}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.warningCatName, { color: themeColors.textPrimary }]}>
                      {w.categoryName}
                    </Text>
                    <Text
                      style={[
                        styles.warningBurnText,
                        { color: isHigh ? colors.rose600 : colors.amber600 },
                      ]}
                    >
                      Tốc độ: {fmt(w.dailyBurnRate)}/ngày
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.warningSeverityBadge,
                    {
                      backgroundColor: isHigh ? "#EF4444" : "#F59E0B",
                    },
                  ]}
                >
                  <Text style={styles.warningSeverityText}>
                    {isHigh ? "🔴 Rủi ro cao" : "⚠️ Cần chú ý"} (+{w.increasePercent}%)
                  </Text>
                </View>
              </View>

              {/* Message */}
              <View
                style={[
                  styles.warningMsgBox,
                  {
                    backgroundColor: isDark ? themeColors.surface : "#FFF7ED",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.warningMsgText,
                    { color: isDark ? "#FCD34D" : "#9A3412" },
                  ]}
                >
                  {w.message}
                </Text>
              </View>

              {/* Comparison Stats */}
              <View style={styles.warningStatsRow}>
                <View style={styles.warningStatCol}>
                  <Text style={styles.warningStatLabel}>THỰC CHI HIỆN TẠI</Text>
                  <Text style={[styles.warningStatVal, { color: isHigh ? colors.rose600 : colors.amber600 }]}>
                    {fmt(w.currentMonthSpent)}
                  </Text>
                </View>
                <View style={styles.warningStatDivider} />
                <View style={styles.warningStatCol}>
                  <Text style={styles.warningStatLabel}>TB 3 THÁNG QUA</Text>
                  <Text style={[styles.warningStatVal, { color: themeColors.textPrimary }]}>
                    {fmt(w.avg3MonthSpent)}
                  </Text>
                </View>
                <View style={styles.warningStatDivider} />
                <View style={styles.warningStatCol}>
                  <Text style={styles.warningStatLabel}>DỰ KIẾN CUỐI THÁNG</Text>
                  <Text style={[styles.warningStatVal, { color: colors.rose600 }]}>
                    {fmt(w.projectedMonthEnd)}
                  </Text>
                </View>
              </View>

              {/* Actionable Tip */}
              {w.actionableTip && (
                <View style={styles.actionableTipBox}>
                  <Text style={styles.actionableTipIcon}>💡</Text>
                  <Text style={styles.actionableTipText}>{w.actionableTip}</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  alertsHeaderCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  alertsHeaderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  alertsHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  alertsHeaderSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
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
  smartWarningCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  warningHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  warningIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  warningCatName: {
    fontSize: 15,
    fontWeight: "800",
  },
  warningBurnText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  warningSeverityBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warningSeverityText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  warningMsgBox: {
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
  },
  warningMsgText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
  },
  warningStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 12,
    padding: 10,
  },
  warningStatCol: {
    flex: 1,
    alignItems: "center",
  },
  warningStatLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 2,
  },
  warningStatVal: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  warningStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  actionableTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  actionableTipIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  actionableTipText: {
    fontSize: 12,
    color: "#065F46",
    flex: 1,
    lineHeight: 16,
    fontWeight: "600",
  },
});
