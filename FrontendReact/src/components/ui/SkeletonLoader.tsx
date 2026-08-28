import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, Dimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * ✨ Skeleton Loader với hiệu ứng Shimmer nhấp nháy chuyển động
 * Tự động thích ứng mượt mà cả Light Mode và Dark Mode.
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeletonBase || "#E2E8F0", colors.skeletonHighlight || "#F1F5F9"],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// ─── 1. DASHBOARD SKELETON ───
export const DashboardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header Skeleton */}
      <View style={[skStyles.heroBlock, { backgroundColor: colors.headerBg }]}>
        <View style={skStyles.heroTop}>
          <SkeletonLoader width={46} height={46} borderRadius={23} style={{ opacity: 0.3 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonLoader width={110} height={12} borderRadius={6} style={{ opacity: 0.25, marginBottom: 8 }} />
            <SkeletonLoader width={170} height={18} borderRadius={6} style={{ opacity: 0.3 }} />
          </View>
          <SkeletonLoader width={38} height={38} borderRadius={19} style={{ opacity: 0.2 }} />
        </View>

        {/* Balance card skeleton */}
        <View style={[skStyles.balanceCard, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <SkeletonLoader width={100} height={10} borderRadius={5} style={{ opacity: 0.2, marginBottom: 10 }} />
          <SkeletonLoader width={220} height={28} borderRadius={8} style={{ opacity: 0.25, marginBottom: 16 }} />
          <View style={skStyles.balanceRow}>
            <SkeletonLoader width="30%" height={52} borderRadius={12} style={{ opacity: 0.15 }} />
            <SkeletonLoader width="30%" height={52} borderRadius={12} style={{ opacity: 0.15 }} />
            <SkeletonLoader width="30%" height={52} borderRadius={12} style={{ opacity: 0.15 }} />
          </View>
        </View>
      </View>

      {/* Quick Actions Grid Skeleton */}
      <View style={skStyles.quickGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={skStyles.quickItem}>
            <SkeletonLoader width={50} height={50} borderRadius={16} />
            <SkeletonLoader width={52} height={10} borderRadius={5} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Bank Sync Banner Skeleton */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <SkeletonLoader width="100%" height={74} borderRadius={18} />
      </View>

      {/* Budget Section Skeleton */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <SkeletonLoader width={160} height={14} borderRadius={6} style={{ marginBottom: 10 }} />
        <View style={[skStyles.budgetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={100} height={10} borderRadius={5} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={200} height={20} borderRadius={6} style={{ marginBottom: 12 }} />
          <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginBottom: 12 }} />
          <SkeletonLoader width={180} height={10} borderRadius={5} />
        </View>
      </View>

      {/* Leaderboard List Skeleton */}
      <View style={{ paddingHorizontal: 20 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[skStyles.leaderRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonLoader width={38} height={38} borderRadius={12} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonLoader width={130} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="75%" height={8} borderRadius={4} />
            </View>
            <SkeletonLoader width={70} height={16} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── 2. GROUPS SKELETON ───
export const GroupsSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      {/* Header Skeleton */}
      <View style={[skStyles.plainHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={skStyles.plainHeaderRow}>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
          <SkeletonLoader width={90} height={22} borderRadius={8} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SkeletonLoader width={36} height={36} borderRadius={18} />
            <SkeletonLoader width={36} height={36} borderRadius={18} />
          </View>
        </View>
        <SkeletonLoader width={180} height={14} borderRadius={6} style={{ marginTop: 14 }} />
      </View>

      {/* Bento Debt Cards Skeleton */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {/* Bento Card 1 */}
          <View style={[skStyles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <SkeletonLoader width={90} height={12} borderRadius={6} />
              <SkeletonLoader width={14} height={14} borderRadius={7} />
            </View>
            <SkeletonLoader width={110} height={24} borderRadius={8} style={{ marginBottom: 6 }} />
            <SkeletonLoader width={80} height={10} borderRadius={5} />
          </View>
          {/* Bento Card 2 */}
          <View style={[skStyles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <SkeletonLoader width={90} height={12} borderRadius={6} />
              <SkeletonLoader width={14} height={14} borderRadius={7} />
            </View>
            <SkeletonLoader width={110} height={24} borderRadius={8} style={{ marginBottom: 6 }} />
            <SkeletonLoader width={80} height={10} borderRadius={5} />
          </View>
        </View>

        {/* Section Header */}
        <SkeletonLoader width={140} height={16} borderRadius={6} style={{ marginBottom: 14 }} />

        {/* Groups Grid Skeleton */}
        <View style={skStyles.groupsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[skStyles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SkeletonLoader width="100%" height={96} borderRadius={12} style={{ marginBottom: 10 }} />
              <SkeletonLoader width="80%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="50%" height={10} borderRadius={5} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── 3. HISTORY SKELETON ───
export const HistorySkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        {/* Header Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SkeletonLoader width={150} height={26} borderRadius={8} />
          <SkeletonLoader width={130} height={34} borderRadius={17} />
        </View>

        {/* Monthly Summary Hero Card */}
        <View style={[skStyles.summaryHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <View style={{ width: "48%" }}>
              <SkeletonLoader width={70} height={10} borderRadius={5} style={{ marginBottom: 6 }} />
              <SkeletonLoader width={110} height={22} borderRadius={8} />
            </View>
            <View style={{ width: "48%" }}>
              <SkeletonLoader width={70} height={10} borderRadius={5} style={{ marginBottom: 6 }} />
              <SkeletonLoader width={110} height={22} borderRadius={8} />
            </View>
          </View>
          <SkeletonLoader width="100%" height={36} borderRadius={10} />
        </View>

        {/* Search Bar Skeleton */}
        <SkeletonLoader width="100%" height={44} borderRadius={14} style={{ marginBottom: 20 }} />

        {/* Recent Transactions List Skeleton */}
        <View style={[skStyles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <SkeletonLoader width={120} height={14} borderRadius={6} />
          </View>

          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={[
                skStyles.txRow,
                { borderBottomColor: colors.borderLight, borderBottomWidth: i === 6 ? 0 : 1 },
              ]}
            >
              <SkeletonLoader width={42} height={42} borderRadius={21} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonLoader width={130} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width={80} height={10} borderRadius={5} />
              </View>
              <SkeletonLoader width={85} height={16} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── 4. BUDGET SKELETON ───
export const BudgetSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        {/* Header Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <SkeletonLoader width={130} height={26} borderRadius={8} />
          <SkeletonLoader width={120} height={34} borderRadius={17} />
        </View>

        {/* Total Budget Card Skeleton */}
        <View style={[skStyles.totalBudgetHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={120} height={12} borderRadius={6} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={220} height={28} borderRadius={8} style={{ marginBottom: 14 }} />
          <SkeletonLoader width="100%" height={10} borderRadius={5} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SkeletonLoader width={90} height={10} borderRadius={5} />
            <SkeletonLoader width={90} height={10} borderRadius={5} />
          </View>
        </View>

        {/* Search / Filter bar */}
        <SkeletonLoader width="100%" height={44} borderRadius={14} style={{ marginBottom: 18 }} />

        {/* Category Budget Items Skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[skStyles.categoryBudgetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <SkeletonLoader width={38} height={38} borderRadius={12} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonLoader width={120} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width={80} height={10} borderRadius={5} />
              </View>
              <SkeletonLoader width={70} height={16} borderRadius={6} />
            </View>
            <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <SkeletonLoader width={80} height={10} borderRadius={5} />
              <SkeletonLoader width={60} height={10} borderRadius={5} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── 5. SAVINGS SKELETON ───
export const SavingsSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        {/* Top Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonLoader width={110} height={20} borderRadius={6} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={180} height={12} borderRadius={6} />
          </View>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
        </View>

        {/* Total Savings Card */}
        <View style={[skStyles.savingsHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={130} height={12} borderRadius={6} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={210} height={28} borderRadius={8} style={{ marginBottom: 14 }} />
          <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SkeletonLoader width={100} height={10} borderRadius={5} />
            <SkeletonLoader width={60} height={10} borderRadius={5} />
          </View>
        </View>

        {/* Auto allocate banner */}
        <SkeletonLoader width="100%" height={68} borderRadius={18} style={{ marginBottom: 20 }} />

        {/* Section title */}
        <SkeletonLoader width={140} height={16} borderRadius={6} style={{ marginBottom: 14 }} />

        {/* Goals List Skeleton */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={[skStyles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <SkeletonLoader width={42} height={42} borderRadius={14} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonLoader width={140} height={15} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width={90} height={10} borderRadius={5} />
              </View>
              <SkeletonLoader width={60} height={24} borderRadius={12} />
            </View>
            <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginBottom: 10 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <SkeletonLoader width={100} height={11} borderRadius={5} />
              <SkeletonLoader width={80} height={11} borderRadius={5} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── 6. REPORT SKELETON ───
export const ReportSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
          <SkeletonLoader width={150} height={22} borderRadius={8} />
          <SkeletonLoader width={110} height={32} borderRadius={16} />
        </View>

        {/* 2x2 Stats Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14 }}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                skStyles.reportStatCard,
                { width: "48.5%", backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <SkeletonLoader width={70} height={10} borderRadius={5} style={{ marginBottom: 8 }} />
              <SkeletonLoader width={100} height={18} borderRadius={6} />
            </View>
          ))}
        </View>

        {/* Net Savings Box */}
        <View style={[skStyles.reportSavingsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={120} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
          <SkeletonLoader width={160} height={22} borderRadius={8} />
        </View>

        {/* Chart Structure Card */}
        <View style={[skStyles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={130} height={16} borderRadius={6} style={{ marginBottom: 16 }} />
          {/* Segment switch skeleton */}
          <SkeletonLoader width="100%" height={38} borderRadius={12} style={{ marginBottom: 18 }} />
          {/* Donut chart placeholder circle */}
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <SkeletonLoader width={140} height={140} borderRadius={70} />
          </View>
          {/* Breakdown item rows */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <SkeletonLoader width={12} height={12} borderRadius={6} />
              <SkeletonLoader width={100} height={12} borderRadius={6} style={{ marginLeft: 8 }} />
              <View style={{ flex: 1 }} />
              <SkeletonLoader width={70} height={12} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── 7. GROUP DETAIL SKELETON ───
export const GroupDetailSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, flexDirection: "row", alignItems: "center" }}>
        <SkeletonLoader width={36} height={36} borderRadius={18} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonLoader width={150} height={20} borderRadius={6} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={90} height={12} borderRadius={6} />
        </View>
        <SkeletonLoader width={36} height={36} borderRadius={18} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {/* Group Hero Banner */}
        <View style={[skStyles.groupHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={100} height={12} borderRadius={6} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={200} height={26} borderRadius={8} style={{ marginBottom: 14 }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SkeletonLoader width="48%" height={38} borderRadius={12} />
            <SkeletonLoader width="48%" height={38} borderRadius={12} />
          </View>
        </View>

        {/* Member list horizontal pill */}
        <View style={{ flexDirection: "row", gap: 10, marginVertical: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} width={44} height={44} borderRadius={22} />
          ))}
        </View>

        {/* Expense list */}
        <SkeletonLoader width={140} height={16} borderRadius={6} style={{ marginBottom: 12 }} />
        <View style={[skStyles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                skStyles.txRow,
                { borderBottomColor: colors.borderLight, borderBottomWidth: i === 4 ? 0 : 1 },
              ]}
            >
              <SkeletonLoader width={40} height={40} borderRadius={12} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonLoader width={130} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width={80} height={10} borderRadius={5} />
              </View>
              <SkeletonLoader width={75} height={16} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const skStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBlock: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 36,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 18,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  quickItem: {
    alignItems: "center",
  },
  budgetCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  plainHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  plainHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bentoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  groupsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  groupCard: {
    width: "48%",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryHeroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  totalBudgetHero: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  categoryBudgetCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  savingsHero: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  goalCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  reportStatCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reportSavingsBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  groupHero: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
});
