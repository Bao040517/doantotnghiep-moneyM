import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Sparkles } from "lucide-react-native";
import { colors } from "../constants/colors";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { financialServices } from "../services/financialServices";
import { Toast } from "../components/ui/Toast";
import { NotificationBottomSheet } from "../components/modals/NotificationBottomSheet";
import { useNotifications } from "../hooks/useNotifications";
import { useTheme } from "../context/ThemeContext";

// Modular Reusable Components
import { ScreenHeader } from "../components/common/ScreenHeader";
import { MonthNavigator } from "../components/common/MonthNavigator";
import { HabitAnalysisCard } from "../components/advisor/HabitAnalysisCard";
import { BudgetPlanSection } from "../components/advisor/BudgetPlanSection";
import { RebalancePlanSection } from "../components/advisor/RebalancePlanSection";
import { AnomalyWarningsSection } from "../components/advisor/AnomalyWarningsSection";

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
  }>;
  warnings?: Array<{
    categoryName: string;
    categoryIcon?: string;
    warningType?: "BURN_RATE" | "BILL_SPIKE";
    message: string;
    severity: "HIGH" | "MEDIUM";
    increasePercent: number;
    increaseVsLastMonth?: number;
    currentMonthSpent: number;
    lastMonthSpent?: number;
    avg3MonthSpent: number;
    projectedMonthEnd?: number;
    dailyBurnRate?: number;
    recommendedDailyLimit?: number;
    remainingDays?: number;
    actionableTip?: string;
    impactSummary?: string;
  }>;
  rebalancePlan?: {
    hasOverspending: boolean;
    totalOverspent: number;
    totalCompensated: number;
    remainingDeficit: number;
    statusMessage: string;
    overspentItems: Array<{
      categoryId?: string;
      categoryName: string;
      categoryIcon: string;
      limitAmount: number;
      spentAmount: number;
      overspentAmount: number;
      overspentPercent: number;
      isFixed?: boolean;
      categoryType?: string;
    }>;
    compensationCuts: Array<{
      categoryId?: string;
      categoryName: string;
      categoryIcon: string;
      currentLimit: number;
      currentSpent: number;
      availableRemaining: number;
      suggestedCutAmount: number;
      newSuggestedLimit: number;
      tier?: string;
      tierLabel?: string;
      reason: string;
      isBalanced?: boolean;
    }>;
  };
}

export const AdvisorScreen: React.FC = () => {
  const { user } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
  const { unreadCount } = useNotifications();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const changeMonth = (offset: number) => {
    let m = selectedMonth + offset;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setAppliedCutIds({});
    setAppliedCategoryMap({});
    setIsAllRebalanced(false);
    setRebalancePlanSnapshot(null);
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const [data, setData] = useState<AdviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"plan" | "rebalance" | "habits" | "alerts">("plan");
  const [notifVisible, setNotifVisible] = useState(false);
  const [applyingCategory, setApplyingCategory] = useState<string | null>(null);
  const [appliedCategoryMap, setAppliedCategoryMap] = useState<Record<string, boolean>>({});
  const [rebalancing, setRebalancing] = useState(false);
  const [applyingSingleCutId, setApplyingSingleCutId] = useState<string | null>(null);
  const [appliedCutIds, setAppliedCutIds] = useState<Record<string, boolean>>({});
  const [isAllRebalanced, setIsAllRebalanced] = useState(false);
  const [rebalancePlanSnapshot, setRebalancePlanSnapshot] = useState<AdviceData["rebalancePlan"] | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const fmt = (n?: number) => Math.abs(Math.round(Number(n) || 0)).toLocaleString("vi-VN") + "đ";

  const fetchAdvisorData = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/advisor/insights`, {
        params: { year: selectedYear, month: selectedMonth },
      });
      setData(res.data);
      if (res.data?.rebalancePlan?.hasOverspending) {
        setRebalancePlanSnapshot(res.data.rebalancePlan);
      }
    } catch (err) {
      console.log("Error fetching advisor data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisorData();

    const subPfm = DeviceEventEmitter.addListener("pfm_event_updated", () => {
      fetchAdvisorData(true);
    });
    const subNotif = DeviceEventEmitter.addListener("new_notification", () => {
      fetchAdvisorData(true);
    });

    return () => {
      subPfm.remove();
      subNotif.remove();
    };
  }, [user?.id, selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchAdvisorData(true);
    }, [user?.id, selectedYear, selectedMonth])
  );

  const handleApplyBudget = async (item: any) => {
    if (!user?.id) return;
    setApplyingCategory(item.categoryName);
    try {
      let catId = item.categoryId;
      if (!catId) {
        const cats = await financialServices.getCategories();
        const found = cats.find((c) => c.name.toLowerCase() === item.categoryName.toLowerCase());
        if (found) catId = found.id;
      }

      if (!catId) {
        showToast("Không tìm thấy mã danh mục để tạo ngân sách", "error");
        return;
      }

      let existingBudgetId = item.budgetId;
      if (!existingBudgetId) {
        try {
          const existingBudgets = await financialServices.getBudgetSummary(selectedYear, selectedMonth);
          const foundB = existingBudgets.find((b: any) => b.categoryId === catId);
          if (foundB) {
            existingBudgetId = foundB.budgetId || foundB.id;
          }
        } catch {}
      }

      if (existingBudgetId) {
        await financialServices.updateBudget(existingBudgetId, {
          categoryId: catId,
          limitAmount: item.suggestedAmount,
          month: selectedMonth,
          year: selectedYear,
          name: `Ngân sách ${item.categoryName}`,
          type: "FLEXIBLE",
          isMandatory: false,
          isRecurring: false,
          id: existingBudgetId,
        });
      } else {
        await financialServices.createBudget({
          categoryId: catId,
          limitAmount: item.suggestedAmount,
          month: selectedMonth,
          year: selectedYear,
          name: `Ngân sách ${item.categoryName}`,
          type: "FLEXIBLE",
          isMandatory: false,
        });
      }

      setData((prev) => {
        if (!prev || !prev.budgetPlan) return prev;
        return {
          ...prev,
          budgetPlan: prev.budgetPlan.map((p) =>
            p.categoryName === item.categoryName
              ? { ...p, currentBudget: item.suggestedAmount }
              : p
          ),
        };
      });

      showToast(`Đã cập nhật ngân sách ${item.categoryName} (${fmt(item.suggestedAmount)})! 🎉`, "success");
      fetchAdvisorData(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể thiết lập ngân sách", "error");
    } finally {
      setApplyingCategory(null);
    }
  };

  const handleApplySingleCut = async (item: any) => {
    if (!user?.id || applyingSingleCutId) return;
    const catId = item.categoryId;
    const cutKey = catId || item.categoryName;
    setApplyingSingleCutId(cutKey);
    try {
      const res = await financialServices.applyBudgetRebalance(
        selectedYear,
        selectedMonth,
        [{ categoryId: catId, cutAmount: item.suggestedCutAmount, newLimit: item.newSuggestedLimit }]
      );
      if (res.success) {
        setAppliedCutIds((prev) => {
          const next: Record<string, boolean> = { ...prev, [cutKey]: true };
          const activeCuts = (rebalancePlanSnapshot || data?.rebalancePlan)?.compensationCuts || [];
          if (activeCuts.length > 0 && activeCuts.every((c) => next[c.categoryId || c.categoryName])) {
            setIsAllRebalanced(true);
          }
          return next;
        });
        showToast(`Đã điều chỉnh ngân sách ${item.categoryName} (${fmt(item.newSuggestedLimit)})! 🎉`, "success");
        await fetchAdvisorData(true);
      } else {
        showToast(res.message || "Không thể áp dụng", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Lỗi khi áp dụng", "error");
    } finally {
      setApplyingSingleCutId(null);
    }
  };

  const handleApplyRebalance = async () => {
    if (!user?.id || rebalancing) return;
    setRebalancing(true);
    try {
      const res = await financialServices.applyBudgetRebalance(selectedYear, selectedMonth);
      if (res.success) {
        setIsAllRebalanced(true);
        const activeCuts = (rebalancePlanSnapshot || data?.rebalancePlan)?.compensationCuts || [];
        const newAppliedMap: Record<string, boolean> = {};
        activeCuts.forEach((c) => {
          newAppliedMap[c.categoryId || c.categoryName] = true;
        });
        setAppliedCutIds(newAppliedMap);

        showToast(res.message || "Tái cân bằng ngân sách thành công! 🎉", "success");
        await fetchAdvisorData(true);
      } else {
        showToast(res.message || "Không thể thực hiện tái cân bằng", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Lỗi khi áp dụng tái cân bằng", "error");
    } finally {
      setRebalancing(false);
    }
  };

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

  const plan = data?.budgetPlan || [];
  const activeBudgets: any[] = plan.filter(
    (p: any) => p.hasBudget || (p.currentBudget !== null && p.currentBudget !== undefined && Number(p.currentBudget) > 0)
  );
  const totalAllocatedBudget = activeBudgets.reduce(
    (sum: number, p: any) => sum + (Number(p.currentBudget) || 0),
    0
  );

  const warnings = data?.warnings || [];
  const rebalancePlan = data?.rebalancePlan;
  const activeRebalancePlan = rebalancePlanSnapshot || rebalancePlan;
  const isRebalanceActive = !!activeRebalancePlan?.hasOverspending || isAllRebalanced;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : "#e8f5f1" }]}>
      {/* ─── REUSABLE SCREEN HEADER ─── */}
      <ScreenHeader
        title="Tư vấn"
        showBack={true}
        showNotif={true}
        onNotifPress={() => setNotifVisible(true)}
        unreadCount={unreadCount}
        showAvatar={true}
        avatarUrl={user?.avatarUrl}
        userName={user?.name}
      />

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ─── SECTION TABS PILLS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionScroll}
          contentContainerStyle={styles.sectionRow}
        >
          <TouchableOpacity
            onPress={() => setActiveSection("plan")}
            style={[
              styles.sectionPill,
              {
                backgroundColor: isDark ? themeColors.surface : colors.white,
                borderColor: isDark ? themeColors.border : colors.slate200,
              },
              activeSection === "plan" && styles.sectionPillActive,
            ]}
          >
            <Text
              style={[
                styles.sectionPillText,
                { color: isDark ? themeColors.textSecondary : colors.slate600 },
                activeSection === "plan" && styles.sectionPillTextActive,
              ]}
            >
              💡 Gợi ý chi tiêu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("rebalance")}
            style={[
              styles.sectionPill,
              {
                backgroundColor: isDark ? themeColors.surface : colors.white,
                borderColor: isDark ? themeColors.border : colors.slate200,
              },
              activeSection === "rebalance" && styles.sectionPillActive,
            ]}
          >
            <Text
              style={[
                styles.sectionPillText,
                { color: isDark ? themeColors.textSecondary : colors.slate600 },
                activeSection === "rebalance" && styles.sectionPillTextActive,
              ]}
            >
              ⚖️ Tái cân bằng {isAllRebalanced ? "(✓)" : activeRebalancePlan?.hasOverspending ? `(${activeRebalancePlan.overspentItems?.length || 0})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("habits")}
            style={[
              styles.sectionPill,
              {
                backgroundColor: isDark ? themeColors.surface : colors.white,
                borderColor: isDark ? themeColors.border : colors.slate200,
              },
              activeSection === "habits" && styles.sectionPillActive,
            ]}
          >
            <Text
              style={[
                styles.sectionPillText,
                { color: isDark ? themeColors.textSecondary : colors.slate600 },
                activeSection === "habits" && styles.sectionPillTextActive,
              ]}
            >
              📊 Thói quen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("alerts")}
            style={[
              styles.sectionPill,
              {
                backgroundColor: isDark ? themeColors.surface : colors.white,
                borderColor: isDark ? themeColors.border : colors.slate200,
              },
              activeSection === "alerts" && styles.sectionPillActive,
            ]}
          >
            <Text
              style={[
                styles.sectionPillText,
                { color: isDark ? themeColors.textSecondary : colors.slate600 },
                activeSection === "alerts" && styles.sectionPillTextActive,
              ]}
            >
              ⚠️ Cảnh báo ({warnings.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ─── AI ASSISTANT BANNER ─── */}
        <TouchableOpacity
          style={styles.aiBannerCard}
          onPress={() => DeviceEventEmitter.emit("OPEN_AI_CHATBOT")}
          activeOpacity={0.88}
        >
          <View style={styles.aiBannerLeft}>
            <View style={styles.aiBannerIconWrap}>
              <Sparkles size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.aiBannerTitle}>Trợ lý AI & Lập Kế Hoạch</Text>
                <View style={styles.aiBannerBadge}>
                  <Text style={styles.aiBannerBadgeText}>TRENDY 🚀</Text>
                </View>
              </View>
              <Text style={styles.aiBannerSub}>
                Lên kế hoạch 3 tháng mua món đồ bạn thích, hỏi đáp dòng tiền & ghi chép nhanh
              </Text>
            </View>
          </View>
          <View style={styles.aiBannerCta}>
            <Text style={styles.aiBannerCtaText}>Chat ngay ✨</Text>
          </View>
        </TouchableOpacity>

        {/* ─── MAIN CONTENT BODY ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.indigo600} />
            <Text style={styles.loadingText}>Đang phân tích thói quen tài chính...</Text>
          </View>
        ) : activeSection === "rebalance" ? (
          <View style={styles.tabContent}>
            <MonthNavigator
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChangeMonth={changeMonth}
              labelPrefix="Tái cân bằng Tháng"
            />
            <RebalancePlanSection
              activeRebalancePlan={activeRebalancePlan}
              activeBudgets={activeBudgets}
              plan={plan}
              isRebalanceActive={isRebalanceActive}
              isAllRebalanced={isAllRebalanced}
              appliedCutIds={appliedCutIds}
              applyingSingleCutId={applyingSingleCutId}
              rebalancing={rebalancing}
              onApplySingleCut={handleApplySingleCut}
              onApplyRebalance={handleApplyRebalance}
              totalAllocatedBudget={totalAllocatedBudget}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              fmt={fmt}
            />
          </View>
        ) : activeSection === "habits" ? (
          <View style={styles.tabContent}>
            <HabitAnalysisCard habits={habits} fmt={fmt} />
          </View>
        ) : activeSection === "plan" ? (
          <View style={styles.tabContent}>
            <MonthNavigator
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChangeMonth={changeMonth}
              labelPrefix="Gợi ý cho Tháng"
            />
            <BudgetPlanSection
              plan={plan}
              rebalancePlan={rebalancePlan}
              appliedCategoryMap={appliedCategoryMap}
              applyingCategory={applyingCategory}
              onApplyBudget={handleApplyBudget}
              onNavigateToRebalance={() => setActiveSection("rebalance")}
              fmt={fmt}
            />
          </View>
        ) : (
          <View style={styles.tabContent}>
            <AnomalyWarningsSection warnings={warnings} fmt={fmt} />
          </View>
        )}
      </ScrollView>

      {/* ─── TOAST NOTIFICATION ─── */}
      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />

      {/* ─── NOTIFICATION BOTTOM SHEET ─── */}
      <NotificationBottomSheet
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionScroll: {
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 8,
  },
  sectionPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionPillActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  sectionPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionPillTextActive: {
    color: colors.white,
  },
  aiBannerCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  aiBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  aiBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  aiBannerBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBannerBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#000000",
  },
  aiBannerSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    lineHeight: 15,
  },
  aiBannerCta: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
  },
  aiBannerCtaText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "800",
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
});
