import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { NotificationBottomSheet } from "../components/modals/NotificationBottomSheet";

interface AdviceData {
  habitAnalysis?: {
    verdict: string;
    needsPercent: number;
    wantsPercent: number;
    savingsPercent: number;
    needsAmount: number;
    wantsAmount: number;
    savingsAmount: number;
    recommendations: string[];
  };
  budgetPlan?: Array<{
    categoryName: string;
    categoryIcon: string;
    suggestedAmount: number;
    avgSpent3Months: number;
    reasoning: string;
  }>;
  warnings?: Array<{
    categoryName: string;
    message: string;
    severity: "HIGH" | "MEDIUM";
    increasePercent: number;
    currentMonthSpent: number;
    avg3MonthSpent: number;
  }>;
}

export const AdvisorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [data, setData] = useState<AdviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"habits" | "plan" | "alerts">("habits");
  const [notifVisible, setNotifVisible] = useState(false);

  const fmt = (n?: number) => new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0)) + "đ";
  const userName = user?.name ? user.name.split(" ").pop() : "Bạn";

  useEffect(() => {
    const fetchAdvisorData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const res = await api.get(`/advisor/insights/${user.id}`);
        setData(res.data);
      } catch (err) {
        console.log("Advisor fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdvisorData();
  }, [user?.id]);

  const habits = data?.habitAnalysis || {
    verdict: "Tài chính của bạn khá cân bằng. Tiết kiệm đang chiếm 20% tổng thu nhập.",
    needsPercent: 45,
    wantsPercent: 35,
    savingsPercent: 20,
    needsAmount: 9000000,
    wantsAmount: 7000000,
    savingsAmount: 4000000,
    recommendations: [
      "Chi tiêu thiết yếu đang ở mức an toàn (45%).",
      "Hãy duy trì mục tiêu gửi tiết kiệm hàng tháng tối thiểu 20%.",
    ],
  };

  const plan = data?.budgetPlan || [
    {
      categoryName: "Ăn uống",
      categoryIcon: "🍜",
      suggestedAmount: 4000000,
      avgSpent3Months: 4200000,
      reasoning: "Dựa trên trung bình 3 tháng gần nhất, hãy duy trì mức 4.000.000đ.",
    },
    {
      categoryName: "Di chuyển",
      categoryIcon: "🚗",
      suggestedAmount: 1500000,
      avgSpent3Months: 1400000,
      reasoning: "Khoản chi đi lại tăng nhẹ trong tháng vừa qua.",
    },
  ];

  const warnings = data?.warnings || [];

  return (
    <View style={styles.container}>
      {/* ─── STICKY HEADER ─── */}
      <View style={styles.headerBar}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Dashboard")}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tư vấn</Text>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => setNotifVisible(true)}>
              <Text style={{ fontSize: 15 }}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate("Profile")}>
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            </TouchableOpacity>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || "U"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.greetingText}>
          Chào ngày mới, <Text style={styles.greetingName}>{userName} 👋</Text>
        </Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ─── SECTION PILLS ─── */}
        <View style={styles.sectionRow}>
          <TouchableOpacity
            onPress={() => setActiveSection("habits")}
            style={[styles.sectionPill, activeSection === "habits" && styles.sectionPillActive]}
          >
            <Text style={[styles.sectionPillText, activeSection === "habits" && styles.sectionPillTextActive]}>
              📊 Thói quen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("plan")}
            style={[styles.sectionPill, activeTabStyle(activeSection === "plan")]}
          >
            <Text style={[styles.sectionPillText, activeSection === "plan" && styles.sectionPillTextActive]}>
              📅 Kế hoạch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("alerts")}
            style={[styles.sectionPill, activeTabStyle(activeSection === "alerts")]}
          >
            <Text style={[styles.sectionPillText, activeSection === "alerts" && styles.sectionPillTextActive]}>
              ⚠️ Cảnh báo ({warnings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.indigo600} />
            <Text style={styles.loadingText}>Đang phân tích thói quen tài chính...</Text>
          </View>
        ) : activeSection === "habits" ? (
          <View style={styles.tabContent}>
            {/* Verdict Hero Card */}
            <View style={styles.verdictCard}>
              <Text style={styles.verdictTitle}>Phân tích theo chuẩn 50/30/20 📈</Text>
              <Text style={styles.verdictSub}>Mô hình quản lý tài chính cá nhân quốc tế</Text>
              <View style={styles.verdictBox}>
                <Text style={styles.verdictText}>{habits.verdict}</Text>
              </View>
            </View>

            {/* 50/30/20 Breakdown Bars */}
            <View style={styles.breakdownCard}>
              <Text style={styles.cardHeaderTitle}>Cơ cấu Chi tiêu / Thu nhập</Text>

              {/* Needs */}
              <View style={styles.barItem}>
                <View style={styles.barHeader}>
                  <Text style={styles.barLabel}>🏠 Thiết yếu (Chuẩn ≤ 50%)</Text>
                  <Text style={[styles.barPct, { color: habits.needsPercent > 50 ? colors.rose600 : colors.emerald600 }]}>
                    {habits.needsPercent.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, habits.needsPercent)}%`, backgroundColor: habits.needsPercent > 50 ? colors.rose500 : colors.emerald500 }]} />
                </View>
                <Text style={styles.barSub}>{fmt(habits.needsAmount)} — Tiền nhà, ăn uống, điện nước...</Text>
              </View>

              {/* Wants */}
              <View style={styles.barItem}>
                <View style={styles.barHeader}>
                  <Text style={styles.barLabel}>🎉 Linh hoạt (Chuẩn ≤ 30%)</Text>
                  <Text style={[styles.barPct, { color: habits.wantsPercent > 30 ? colors.amber600 : colors.emerald600 }]}>
                    {habits.wantsPercent.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, habits.wantsPercent)}%`, backgroundColor: habits.wantsPercent > 30 ? colors.amber500 : colors.emerald500 }]} />
                </View>
                <Text style={styles.barSub}>{fmt(habits.wantsAmount)} — Mua sắm, giải trí, mua sắm...</Text>
              </View>

              {/* Savings */}
              <View style={styles.barItem}>
                <View style={styles.barHeader}>
                  <Text style={styles.barLabel}>🌱 Tiết kiệm (Chuẩn ≥ 20%)</Text>
                  <Text style={[styles.barPct, { color: habits.savingsPercent < 20 ? colors.rose600 : colors.emerald600 }]}>
                    {habits.savingsPercent.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, habits.savingsPercent)}%`, backgroundColor: habits.savingsPercent < 20 ? colors.rose500 : colors.emerald500 }]} />
                </View>
                <Text style={styles.barSub}>{fmt(habits.savingsAmount)} — Thu nhập trừ chi tiêu</Text>
              </View>
            </View>

            {/* Recommendations */}
            {habits.recommendations.length > 0 && (
              <View style={styles.recommendCard}>
                <Text style={styles.cardHeaderTitle}>💬 Nhận xét chi tiết</Text>
                {habits.recommendations.map((rec, idx) => (
                  <View key={idx} style={styles.recItem}>
                    <Text style={styles.recText}>• {rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : activeSection === "plan" ? (
          <View style={styles.tabContent}>
            <Text style={styles.cardHeaderTitle}>📅 Kế hoạch Ngân sách Đề xuất</Text>
            {plan.map((item, idx) => (
              <View key={idx} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={{ fontSize: 20 }}>{item.categoryIcon}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.planCategory}>{item.categoryName}</Text>
                    <Text style={styles.planSub}>TB 3 tháng: {fmt(item.avgSpent3Months)}</Text>
                  </View>
                  <Text style={styles.planAmount}>{fmt(item.suggestedAmount)}</Text>
                </View>
                <Text style={styles.planReason}>{item.reasoning}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={styles.cardHeaderTitle}>⚡ Cảnh báo Chi tiêu Bất thường</Text>
            {warnings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
                <Text style={styles.emptyTitle}>Mọi thứ đều ổn định!</Text>
                <Text style={styles.emptySub}>Không phát hiện khoản chi nào tăng bất thường tháng này.</Text>
              </View>
            ) : (
              warnings.map((w, idx) => (
                <View key={idx} style={styles.warningCard}>
                  <Text style={styles.warningTitle}>{w.categoryName} (+{w.increasePercent}%)</Text>
                  <Text style={styles.warningMsg}>{w.message}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Notification Bottom Sheet */}
      <NotificationBottomSheet
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />
    </View>
  );
};

function activeTabStyle(isActive: boolean) {
  return isActive ? styles.sectionPillActive : {};
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f5f1",
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 12,
    backgroundColor: "rgba(232, 245, 241, 0.95)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.slate800,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.slate900,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  greetingText: {
    fontSize: 14,
    color: colors.slate600,
    fontWeight: "500",
  },
  greetingName: {
    fontWeight: "800",
    color: colors.slate900,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  sectionPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  sectionPillActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  sectionPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate600,
  },
  sectionPillTextActive: {
    color: colors.white,
  },
  loadingBox: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 10,
  },
  tabContent: {
    gap: 16,
  },
  verdictCard: {
    backgroundColor: "#7c3aed",
    borderRadius: 24,
    padding: 20,
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
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
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
    color: colors.slate800,
  },
  barPct: {
    fontSize: 14,
    fontWeight: "900",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate100,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  barSub: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 4,
  },
  recommendCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
  },
  recItem: {
    backgroundColor: colors.slate50,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  recText: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  planCategory: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  planSub: {
    fontSize: 11,
    color: colors.slate400,
  },
  planAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.indigo600,
  },
  planReason: {
    fontSize: 12,
    color: colors.slate600,
    backgroundColor: colors.slate50,
    padding: 10,
    borderRadius: 12,
  },
  warningCard: {
    backgroundColor: "#fff1f2",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.rose700,
    marginBottom: 4,
  },
  warningMsg: {
    fontSize: 13,
    color: colors.slate700,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: colors.white,
    borderRadius: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
  },
  emptySub: {
    fontSize: 12,
    color: colors.slate400,
    marginTop: 4,
  },
});
