import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { getCategoryEmoji } from "../../constants/categories";

interface RebalancePlanSectionProps {
  activeRebalancePlan?: any;
  activeBudgets: any[];
  plan: any[];
  isRebalanceActive: boolean;
  isAllRebalanced: boolean;
  appliedCutIds: Record<string, boolean>;
  applyingSingleCutId: string | null;
  rebalancing: boolean;
  onApplySingleCut: (item: any) => void;
  onApplyRebalance: () => void;
  totalAllocatedBudget: number;
  selectedMonth: number;
  selectedYear: number;
  fmt: (n?: number) => string;
}

export const RebalancePlanSection: React.FC<RebalancePlanSectionProps> = ({
  activeRebalancePlan,
  activeBudgets,
  plan,
  isRebalanceActive,
  isAllRebalanced,
  appliedCutIds,
  applyingSingleCutId,
  rebalancing,
  onApplySingleCut,
  onApplyRebalance,
  totalAllocatedBudget,
  selectedMonth,
  selectedYear,
  fmt,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View style={styles.container}>
      {!isRebalanceActive ? (
        <View>
          {/* Hero Safe Card */}
          <View
            style={[
              styles.rebalanceSafeCard,
              {
                backgroundColor: isDark ? themeColors.card : "#ECFDF5",
                borderColor: isDark ? "#064E3B" : "#a7f3d0",
              },
            ]}
          >
            <View style={styles.safeIconCircle}>
              <Text style={{ fontSize: 32 }}>🛡️</Text>
            </View>
            <Text
              style={[
                styles.rebalanceSafeTitle,
                { color: isDark ? "#34D399" : "#065f46" },
              ]}
            >
              Ngân Sách Đang Rất An Toàn!
            </Text>
            <Text
              style={[
                styles.rebalanceSafeSub,
                { color: isDark ? themeColors.textSecondary : "#047857" },
              ]}
            >
              Trong tháng {selectedMonth}/{selectedYear}, bạn chưa tiêu lố bất kỳ khoản ngân sách nào. Mọi khoản chi tiêu đều đang bám sát hạn mức kế hoạch.
            </Text>

            {/* 2 Stats Column */}
            {activeBudgets.length > 0 && (
              <View
                style={[
                  styles.rebalanceStatsRow,
                  {
                    backgroundColor: isDark ? themeColors.surface : "#D1FAE5",
                  },
                ]}
              >
                <View style={styles.rebalanceStatBox}>
                  <Text style={[styles.rebalanceStatLabel, { color: themeColors.textSecondary }]}>
                    TỔNG HẠN MỨC ĐÃ ĐẶT
                  </Text>
                  <Text style={[styles.rebalanceStatValue, { color: colors.indigo600 }]}>
                    {fmt(totalAllocatedBudget)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.rebalanceStatDivider,
                    { backgroundColor: isDark ? themeColors.border : "#A7F3D0" },
                  ]}
                />
                <View style={styles.rebalanceStatBox}>
                  <Text style={[styles.rebalanceStatLabel, { color: themeColors.textSecondary }]}>
                    TRẠNG THÁI
                  </Text>
                  <Text style={[styles.rebalanceStatValue, { color: colors.emerald600 }]}>
                    ✓ 100% Cân bằng
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Section Header: Danh Sách Các Khoản Đã Cân Bằng */}
          <View style={[styles.rebalanceSectionHeaderRow, { marginTop: 20 }]}>
            <View style={[styles.sectionHeaderDot, styles.dotEmerald]} />
            <Text style={[styles.rebalanceSectionHeader, { color: themeColors.textPrimary }]}>
              Danh Sách Các Khoản Đang Cân Bằng ({activeBudgets.length > 0 ? activeBudgets.length : plan.length})
            </Text>
            <View style={styles.sectionHeaderBadgeGray}>
              <Text style={styles.sectionHeaderBadgeGrayText}>✓ An toàn</Text>
            </View>
          </View>

          {/* Danh sách các card danh mục đang cân bằng an toàn */}
          {activeBudgets.length > 0 ? (
            activeBudgets.map((item, idx) => {
              const limit = Number(item.currentBudget || item.suggestedAmount || 0);
              const avgSpent = Number(item.avgSpent3Months || item.lastMonthSpent || 0);
              const remaining = limit > avgSpent ? limit - avgSpent : 0;
              const percentSpent = limit > 0 ? Math.min(100, Math.round((avgSpent / limit) * 100)) : 0;

              return (
                <View
                  key={idx}
                  style={[
                    styles.cutItemCard,
                    {
                      backgroundColor: isDark ? themeColors.card : colors.white,
                      borderColor: isDark ? themeColors.border : "#e2e8f0",
                    },
                  ]}
                >
                  <View style={styles.cutHeaderRow}>
                    <View
                      style={[
                        styles.planIconBox,
                        { backgroundColor: isDark ? themeColors.surface : "#ECFDF5" },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>
                        {getCategoryEmoji(item.categoryIcon, item.categoryName)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text
                          style={[styles.cutItemName, { flex: 1, marginRight: 8, color: themeColors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.categoryName}
                        </Text>
                        <View style={styles.balancedTag}>
                          <Text style={styles.balancedTagText}>✓ Đã cân bằng</Text>
                        </View>
                      </View>
                      <Text style={[styles.cutItemSub, { marginTop: 3, color: themeColors.textSecondary }]}>
                        Hạn mức: {fmt(limit)} • Chi TB: {fmt(avgSpent)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.balancedProgressBox,
                      { backgroundColor: isDark ? themeColors.surface : "#f8fafc" },
                    ]}
                  >
                    <View style={styles.balancedProgressLabelRow}>
                      <Text style={[styles.balancedProgressText, { color: themeColors.textSecondary }]}>
                        Mức độ sử dụng:{" "}
                        <Text
                          style={{
                            fontWeight: "800",
                            color: percentSpent >= 90 ? colors.amber600 : colors.emerald600,
                          }}
                        >
                          {percentSpent}%
                        </Text>
                      </Text>
                      <Text style={[styles.balancedRemainingText, { color: themeColors.textSecondary }]}>
                        Còn dư:{" "}
                        <Text style={{ fontWeight: "900", color: colors.emerald600 }}>
                          {fmt(remaining)}
                        </Text>
                      </Text>
                    </View>
                    <View style={[styles.balancedTrack, { backgroundColor: isDark ? "#334155" : colors.slate200 }]}>
                      <View
                        style={[
                          styles.balancedFill,
                          {
                            width: `${percentSpent}%`,
                            backgroundColor: percentSpent >= 90 ? colors.amber500 : colors.emerald500,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: isDark ? themeColors.card : "#f8fafc",
                  borderColor: isDark ? themeColors.border : "#e2e8f0",
                },
              ]}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                Chưa có danh mục nào được đặt hạn mức
              </Text>
              <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
                Chuyển sang tab "Gợi ý chi tiêu" để thiết lập ngân sách nhanh chỉ với 1 chạm.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View>
          {/* Overspent Hero Header Card */}
          <View style={styles.overspentHeroCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View style={styles.overspentHeroIcon}>
                <Text style={{ fontSize: 26 }}>⚡</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.overspentHeroTitle}>
                  {isAllRebalanced
                    ? "Đã Tái Cân Bằng Thành Công! 🎉"
                    : `Cảnh Báo Vượt Ngân Sách (${activeRebalancePlan?.overspentItems?.length || 0})`}
                </Text>
                <Text style={styles.overspentHeroSub}>
                  {isAllRebalanced
                    ? "Tất cả các khoản chi lố đã được bù trừ hoàn hảo từ các danh mục linh hoạt."
                    : activeRebalancePlan?.statusMessage || "Phát hiện khoản chi vượt hạn mức"}
                </Text>
              </View>
            </View>

            {/* 3 Metrics Box */}
            <View style={styles.rebalanceStatsRow}>
              <View style={styles.rebalanceStatBox}>
                <Text style={styles.rebalanceStatLabel}>TỔNG LỐ</Text>
                <Text style={[styles.rebalanceStatValue, { color: "#EF4444" }]}>
                  +{fmt(activeRebalancePlan?.totalOverspent)}
                </Text>
              </View>
              <View style={styles.rebalanceStatDivider} />
              <View style={styles.rebalanceStatBox}>
                <Text style={styles.rebalanceStatLabel}>ĐỀ XUẤT CẮT</Text>
                <Text style={[styles.rebalanceStatValue, { color: "#10B981" }]}>
                  -{fmt(activeRebalancePlan?.totalCompensated)}
                </Text>
              </View>
              <View style={styles.rebalanceStatDivider} />
              <View style={styles.rebalanceStatBox}>
                <Text style={styles.rebalanceStatLabel}>THÂM HỤT CÒN LẠI</Text>
                <Text
                  style={[
                    styles.rebalanceStatValue,
                    {
                      color:
                        (activeRebalancePlan?.remainingDeficit || 0) === 0
                          ? "#10B981"
                          : "#F59E0B",
                    },
                  ]}
                >
                  {isAllRebalanced || (activeRebalancePlan?.remainingDeficit || 0) === 0
                    ? "0đ (Đã bù)"
                    : fmt(activeRebalancePlan?.remainingDeficit)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 1: Overspent Items List */}
          <View style={[styles.rebalanceSectionHeaderRow, { marginTop: 20 }]}>
            <View style={[styles.sectionHeaderDot, isAllRebalanced ? styles.dotGray : styles.dotRose]} />
            <Text style={[styles.rebalanceSectionHeader, { color: themeColors.textPrimary }]}>
              1. Các Khoản Chi Vượt Hạn Mức ({activeRebalancePlan?.overspentItems?.length || 0})
            </Text>
          </View>

          {activeRebalancePlan?.overspentItems?.map((item: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.overspentItemCard,
                {
                  backgroundColor: isDark ? themeColors.card : colors.white,
                  borderColor: isDark ? themeColors.border : "#fecdd3",
                },
              ]}
            >
              <View style={styles.overspentItemTopRow}>
                <View style={styles.overspentIconBox}>
                  <Text style={{ fontSize: 22 }}>
                    {getCategoryEmoji(item.categoryIcon, item.categoryName)}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.overspentItemName, { color: themeColors.textPrimary }]}>
                    {item.categoryName}
                  </Text>
                  <Text style={[styles.overspentItemSub, { color: themeColors.textSecondary }]}>
                    Hạn mức: {fmt(item.limitAmount)} • Thực chi: {fmt(item.spentAmount)}
                  </Text>
                </View>
                <View style={styles.overspentBadge}>
                  <Text style={styles.overspentBadgeText}>
                    {isAllRebalanced ? "✓ Đã bù" : `+${item.overspentPercent}%`}
                  </Text>
                </View>
              </View>

              <View style={styles.overspentAmountBox}>
                <Text style={styles.overspentAmountLabel}>Vượt hạn mức:</Text>
                <Text style={styles.overspentAmountValue}>+{fmt(item.overspentAmount)}</Text>
              </View>
            </View>
          ))}

          {/* Section 2: Compensation Cuts */}
          <View style={[styles.rebalanceSectionHeaderRow, { marginTop: 22 }]}>
            <View style={[styles.sectionHeaderDot, styles.dotEmerald]} />
            <Text style={[styles.rebalanceSectionHeader, { color: themeColors.textPrimary }]}>
              2. Đề Xuất Cắt Giảm Bù Vào ({activeRebalancePlan?.compensationCuts?.length || 0})
            </Text>
          </View>

          {activeRebalancePlan?.compensationCuts?.map((item: any, idx: number) => {
            const cutKey = item.categoryId || item.categoryName;
            const hasCutAmount = Number(item.suggestedCutAmount) > 0;
            const isCutApplied =
              isAllRebalanced ||
              !!appliedCutIds[cutKey] ||
              !!item.isBalanced ||
              !hasCutAmount;
            const isApplying = applyingSingleCutId === cutKey;

            return (
              <View
                key={idx}
                style={[
                  styles.cutItemCard,
                  {
                    backgroundColor: isDark ? themeColors.card : colors.white,
                    borderColor: isDark ? themeColors.border : "#e2e8f0",
                  },
                ]}
              >
                <View style={styles.cutHeaderRow}>
                  <View
                    style={[
                      styles.planIconBox,
                      { backgroundColor: isCutApplied ? "#f1f5f9" : "#ecfdf5" },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>
                      {getCategoryEmoji(item.categoryIcon, item.categoryName)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={[styles.cutItemName, { color: themeColors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.categoryName}
                      </Text>
                      {isCutApplied ? (
                        <View style={styles.balancedTag}>
                          <Text style={styles.balancedTagText}>✓ Đã cân bằng</Text>
                        </View>
                      ) : item.tier === "TIER_1_LUXURY" ? (
                        <View style={styles.tier1Badge}>
                          <Text style={styles.tier1BadgeText}>✨ Hưởng thụ</Text>
                        </View>
                      ) : (
                        <View style={styles.tier2Badge}>
                          <Text style={styles.tier2BadgeText}>🛒 Sinh hoạt</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cutItemSub, { color: themeColors.textSecondary }]}>
                      Đã chi {fmt(item.currentSpent)} • Hạn mức {fmt(item.currentLimit)}
                    </Text>
                  </View>
                </View>

                {/* Highlight banner */}
                <View style={styles.cutHighlightBanner}>
                  <Text style={styles.cutHighlightLabel}>
                    {hasCutAmount ? "MỨC ĐỀ XUẤT CẮT GIẢM" : "TRẠNG THÁI NGÂN SÁCH"}
                  </Text>
                  <Text style={styles.cutHighlightValue}>
                    {hasCutAmount ? `${fmt(item.suggestedCutAmount)}` : "✓ Đã Cân Bằng"}
                  </Text>
                </View>

                {/* Limits Row */}
                <View style={styles.cutLimitsRow}>
                  <View style={styles.cutLimitCol}>
                    <Text style={styles.cutLimitLabel}>HẠN MỨC CŨ</Text>
                    <Text style={styles.cutLimitOld}>{fmt(item.currentLimit)}</Text>
                  </View>
                  <Text style={styles.cutArrowText}>➔</Text>
                  <View style={styles.cutLimitCol}>
                    <Text style={styles.cutLimitLabel}>HẠN MỨC MỚI</Text>
                    <Text style={styles.cutLimitNew}>{fmt(item.newSuggestedLimit)}</Text>
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.cutReasonBox}>
                  <Text style={styles.cutReasonText}>💡 {item.reason}</Text>
                </View>

                {/* Single apply btn */}
                <TouchableOpacity
                  style={[
                    styles.cutApplySingleBtn,
                    isCutApplied && styles.cutApplySingleBtnDone,
                  ]}
                  onPress={() => onApplySingleCut(item)}
                  disabled={isApplying || isCutApplied}
                  activeOpacity={0.85}
                >
                  {isApplying ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : isCutApplied ? (
                    <Text style={styles.cutApplySingleBtnTextDone}>✓ Đã cân bằng</Text>
                  ) : (
                    <Text style={styles.cutApplySingleBtnText}>Áp Dụng Ngân Sách Này</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* 1-Click Apply Action Button */}
          {activeRebalancePlan?.compensationCuts && activeRebalancePlan.compensationCuts.length > 0 && (
            <View style={styles.rebalanceActionBox}>
              <TouchableOpacity
                style={[styles.rebalanceApplyBtn, isAllRebalanced && styles.rebalanceApplyBtnDone]}
                onPress={onApplyRebalance}
                disabled={rebalancing || isAllRebalanced}
                activeOpacity={0.85}
              >
                {rebalancing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : isAllRebalanced ? (
                  <Text style={styles.rebalanceApplyBtnTextDone}>✓ Đã Cân Bằng Toàn Bộ Ngân Sách</Text>
                ) : (
                  <Text style={styles.rebalanceApplyBtnText}>Áp Dụng Tất Cả Ngay</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  rebalanceSafeCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  safeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  rebalanceSafeTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  rebalanceSafeSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  rebalanceStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    width: "100%",
  },
  rebalanceStatBox: {
    flex: 1,
    alignItems: "center",
  },
  rebalanceStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
  },
  rebalanceStatValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  rebalanceStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#A7F3D0",
  },
  rebalanceSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotEmerald: {
    backgroundColor: "#10B981",
  },
  dotRose: {
    backgroundColor: "#EF4444",
  },
  dotGray: {
    backgroundColor: "#94A3B8",
  },
  rebalanceSectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  sectionHeaderBadgeGray: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sectionHeaderBadgeGrayText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },
  cutItemCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cutHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  planIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cutItemName: {
    fontSize: 15,
    fontWeight: "800",
  },
  cutItemSub: {
    fontSize: 12,
  },
  balancedTag: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  balancedTagText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "800",
  },
  tier1Badge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tier1BadgeText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "800",
  },
  tier2Badge: {
    backgroundColor: "#E0E7FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tier2BadgeText: {
    fontSize: 11,
    color: "#4338CA",
    fontWeight: "800",
  },
  balancedProgressBox: {
    borderRadius: 14,
    padding: 10,
    marginTop: 6,
  },
  balancedProgressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  balancedProgressText: {
    fontSize: 11.5,
  },
  balancedRemainingText: {
    fontSize: 11.5,
  },
  balancedTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  balancedFill: {
    height: "100%",
    borderRadius: 3,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  overspentHeroCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 24,
    padding: 18,
    marginBottom: 8,
  },
  overspentHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  overspentHeroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  overspentHeroSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  overspentItemCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  overspentItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overspentIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  overspentItemName: {
    fontSize: 14,
    fontWeight: "800",
  },
  overspentItemSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  overspentBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overspentBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  overspentAmountBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },
  overspentAmountLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  overspentAmountValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#DC2626",
  },
  cutHighlightBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cutHighlightLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065F46",
  },
  cutHighlightValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#059669",
  },
  cutLimitsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cutLimitCol: {
    flex: 1,
  },
  cutLimitLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "800",
  },
  cutLimitOld: {
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
    color: "#94A3B8",
    marginTop: 2,
  },
  cutArrowText: {
    fontSize: 16,
    color: "#10B981",
    marginHorizontal: 8,
  },
  cutLimitNew: {
    fontSize: 13,
    fontWeight: "900",
    color: "#10B981",
    marginTop: 2,
  },
  cutReasonBox: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  cutReasonText: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },
  cutApplySingleBtn: {
    backgroundColor: colors.indigo600,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cutApplySingleBtnDone: {
    backgroundColor: "#E2E8F0",
  },
  cutApplySingleBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  cutApplySingleBtnTextDone: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  rebalanceActionBox: {
    marginTop: 8,
  },
  rebalanceApplyBtn: {
    backgroundColor: colors.emerald600,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rebalanceApplyBtnDone: {
    backgroundColor: "#E2E8F0",
  },
  rebalanceApplyBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  rebalanceApplyBtnTextDone: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
  },
});
