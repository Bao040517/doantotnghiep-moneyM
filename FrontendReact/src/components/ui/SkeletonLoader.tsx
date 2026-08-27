import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * ✨ Skeleton Loader với hiệu ứng Shimmer nhấp nháy
 * Thay thế ActivityIndicator spinner, tạo cảm giác chuyên nghiệp như Facebook / Shopee.
 * Tự động thích ứng Dark Mode.
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
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeletonBase, colors.skeletonHighlight],
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

/**
 * 📊 Dashboard Skeleton Layout
 * Hiển thị bố cục giả lập Dashboard khi đang tải dữ liệu.
 */
export const DashboardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[skStyles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header Skeleton */}
      <View style={[skStyles.heroBlock, { backgroundColor: colors.headerBg }]}>
        <View style={skStyles.heroTop}>
          <SkeletonLoader width={44} height={44} borderRadius={22} style={{ opacity: 0.3 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonLoader width={120} height={12} borderRadius={6} style={{ opacity: 0.25, marginBottom: 6 }} />
            <SkeletonLoader width={180} height={16} borderRadius={6} style={{ opacity: 0.3 }} />
          </View>
          <SkeletonLoader width={36} height={36} borderRadius={18} style={{ opacity: 0.2 }} />
        </View>
        {/* Balance card skeleton */}
        <View style={[skStyles.balanceCard, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
          <SkeletonLoader width={90} height={10} borderRadius={5} style={{ opacity: 0.2, marginBottom: 10 }} />
          <SkeletonLoader width={200} height={28} borderRadius={8} style={{ opacity: 0.25, marginBottom: 14 }} />
          <View style={skStyles.balanceRow}>
            <SkeletonLoader width="30%" height={50} borderRadius={12} style={{ opacity: 0.15 }} />
            <SkeletonLoader width="30%" height={50} borderRadius={12} style={{ opacity: 0.15 }} />
            <SkeletonLoader width="30%" height={50} borderRadius={12} style={{ opacity: 0.15 }} />
          </View>
        </View>
      </View>

      {/* Quick Actions Skeleton */}
      <View style={skStyles.quickGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={skStyles.quickItem}>
            <SkeletonLoader width={48} height={48} borderRadius={14} />
            <SkeletonLoader width={50} height={10} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Bank Sync Banner Skeleton */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <SkeletonLoader width="100%" height={70} borderRadius={18} />
      </View>

      {/* Budget Section Skeleton */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <SkeletonLoader width={160} height={14} borderRadius={6} style={{ marginBottom: 10 }} />
        <View style={[skStyles.budgetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonLoader width={100} height={10} borderRadius={5} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={220} height={20} borderRadius={6} style={{ marginBottom: 12 }} />
          <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginBottom: 12 }} />
          <SkeletonLoader width={200} height={10} borderRadius={5} />
        </View>
      </View>

      {/* Leaderboard Skeleton */}
      <View style={{ paddingHorizontal: 20 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[skStyles.leaderRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonLoader width={36} height={36} borderRadius={10} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonLoader width={120} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="80%" height={6} borderRadius={3} />
            </View>
            <SkeletonLoader width={70} height={14} borderRadius={6} />
          </View>
        ))}
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
});
