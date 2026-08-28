import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Bell, Sparkles } from "lucide-react-native";
import { colors } from "../constants/colors";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { financialServices } from "../services/financialServices";
import { Toast } from "../components/ui/Toast";
import { NotificationBottomSheet } from "../components/modals/NotificationBottomSheet";
import { useNotifications } from "../hooks/useNotifications";
import { getCategoryEmoji } from "../constants/categories";

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
  const navigation = useNavigation<any>();
  const { user } = useAuth();
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
  const userName = user?.name ? user.name.split(" ").pop() : "Bạn";

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

  const getSmartInsight = (item: any) => {
    const suggested = Number(item.suggestedAmount || 0);
    const avg = Number(item.avgSpent3Months || 0);
    const current = item.currentBudget !== null && item.currentBudget !== undefined ? Number(item.currentBudget) : null;
    const lastBudget = item.lastMonthBudget !== null && item.lastMonthBudget !== undefined ? Number(item.lastMonthBudget) : null;

    // Has previous month budget to compare
    if (lastBudget !== null) {
      const diffFromLast = suggested - lastBudget;
      if (diffFromLast < 0) {
        return {
          icon: "📉",
          title: `Đề xuất giảm ${fmt(Math.abs(diffFromLast))} so với tháng trước`,
          description: `Tháng trước bạn đặt ${fmt(lastBudget)} nhưng thực chi TB 3 tháng qua là ${fmt(avg)}. Đề xuất tháng này hạ về ${fmt(suggested)} để tiết kiệm ${fmt(Math.abs(diffFromLast))}!`,
          bgStyle: styles.insightBgGreen,
          titleColor: "#065f46",
        };
      } else if (diffFromLast > 0) {
        return {
          icon: "📈",
          title: `Đề xuất tăng ${fmt(diffFromLast)} so với tháng trước`,
          description: `Tháng trước bạn đặt ${fmt(lastBudget)} nhưng mức chi trung bình 3 tháng gần nhất là ${fmt(avg)}. Nâng hạn mức lên ${fmt(suggested)} để tránh vỡ kế hoạch chi tiêu.`,
          bgStyle: styles.insightBgAmber,
          titleColor: "#92400e",
        };
      } else {
        return {
          icon: "⚖️",
          title: `Bám sát ngân sách tháng trước (${fmt(lastBudget)})`,
          description: `Thói quen chi tiêu 3 tháng gần nhất (TB: ${fmt(avg)}) hoàn toàn trùng khớp với hạn mức tháng trước. Giữ nguyên ${fmt(suggested)} để duy trì ổn định.`,
          bgStyle: styles.insightBgBlue,
          titleColor: "#1e40af",
        };
      }
    }

    // No previous month budget
    return {
      icon: "🎯",
      title: "Chưa có hạn mức tháng trước",
      description: `Dựa trên dữ liệu chi tiêu 3 tháng gần nhất (TB ${fmt(avg)}/tháng), hệ thống đề xuất đặt ${fmt(suggested)} để bắt đầu kiểm soát danh mục này.`,
      bgStyle: styles.insightBgGray,
      titleColor: "#475569",
    };
  };

  const getCategoryIcon = (icon?: string, name?: string) => {
    return getCategoryEmoji(icon, name);
  };

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

    // Lắng nghe sự kiện WebSocket thời gian thực từ Server
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

  // Tự động làm mới dữ liệu mỗi khi người dùng chuyển sang tab Cố Vấn (Focus tab)
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

      // Kiểm tra xem đã có ngân sách cho danh mục này trong tháng/năm này chưa
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
        // ĐÃ TỒN TẠI → CẬP NHẬT (UPDATE) — Tránh lỗi duplicate key constraint
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
        // CHƯA CÓ → TẠO MỚI (CREATE)
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

      // CẬP NHẬT TRỰC TIẾP TRÊN STATE (Optimistic update):
      // Giữ nguyên 100% vị trí cuộn màn hình và thứ tự card, chuyển nút sang màu XÁM "✓ Đã thiết lập chuẩn" ngay tại chỗ!
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
      
      // Đồng bộ ngầm trong nền mà KHÔNG kích hoạt spinner toàn màn hình
      fetchAdvisorData(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể thiết lập ngân sách", "error");
    } finally {
      setApplyingCategory(null);
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
              <Bell size={18} color="#0F172A" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => navigation.navigate("Profile" as never)}
              activeOpacity={0.8}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ─── SECTION PILLS (HORIZONTAL SCROLL) ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionScroll}
          contentContainerStyle={styles.sectionRow}
        >
          <TouchableOpacity
            onPress={() => setActiveSection("plan")}
            style={[styles.sectionPill, activeSection === "plan" && styles.sectionPillActive]}
          >
            <Text style={[styles.sectionPillText, activeSection === "plan" && styles.sectionPillTextActive]}>
              💡 Gợi ý chi tiêu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("rebalance")}
            style={[styles.sectionPill, activeSection === "rebalance" && styles.sectionPillActive]}
          >
            <Text style={[styles.sectionPillText, activeSection === "rebalance" && styles.sectionPillTextActive]}>
              ⚖️ Tái cân bằng {isAllRebalanced ? "(✓)" : activeRebalancePlan?.hasOverspending ? `(${activeRebalancePlan.overspentItems?.length || 0})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("habits")}
            style={[styles.sectionPill, activeSection === "habits" && styles.sectionPillActive]}
          >
            <Text style={[styles.sectionPillText, activeSection === "habits" && styles.sectionPillTextActive]}>
              📊 Thói quen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("alerts")}
            style={[styles.sectionPill, activeSection === "alerts" && styles.sectionPillActive]}
          >
            <Text style={[styles.sectionPillText, activeSection === "alerts" && styles.sectionPillTextActive]}>
              ⚠️ Cảnh báo ({warnings.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ─── AI ASSISTANT CHATBOT BANNER ─── */}
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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.indigo600} />
            <Text style={styles.loadingText}>Đang phân tích thói quen tài chính...</Text>
          </View>
        ) : activeSection === "rebalance" ? (
          <View style={styles.tabContent}>
            {/* Month Selector Pill */}
            <View style={styles.planMonthRow}>
              <View style={styles.monthSelectorPill}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                  <Text style={styles.monthNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  Tái cân bằng Tháng {selectedMonth}/{selectedYear}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                  <Text style={styles.monthNavText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!isRebalanceActive ? (
              <View>
                {/* Hero Safe Card */}
                <View style={styles.rebalanceSafeCard}>
                  <View style={styles.safeIconCircle}>
                    <Text style={{ fontSize: 32 }}>🛡️</Text>
                  </View>
                  <Text style={styles.rebalanceSafeTitle}>Ngân Sách Đang Rất An Toàn!</Text>
                  <Text style={styles.rebalanceSafeSub}>
                    Trong tháng {selectedMonth}/{selectedYear}, bạn chưa tiêu lố bất kỳ khoản ngân sách nào. Mọi khoản chi tiêu đều đang bám sát hạn mức kế hoạch.
                  </Text>

                  {/* 2 Stats Column */}
                  {activeBudgets.length > 0 && (
                    <View style={[styles.rebalanceStatsRow, styles.statsRowBalanced, { marginTop: 14 }]}>
                      <View style={styles.rebalanceStatBox}>
                        <Text style={styles.rebalanceStatLabel}>TỔNG HẠN MỨC ĐÃ ĐẶT</Text>
                        <Text style={[styles.rebalanceStatValue, { color: colors.indigo600 }]}>
                          {fmt(totalAllocatedBudget)}
                        </Text>
                      </View>
                      <View style={[styles.rebalanceStatDivider, styles.dividerBalanced]} />
                      <View style={styles.rebalanceStatBox}>
                        <Text style={styles.rebalanceStatLabel}>TRẠNG THÁI</Text>
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
                  <Text style={styles.rebalanceSectionHeader}>
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
                      <View key={idx} style={[styles.cutItemCard, styles.cutItemCardBalanced]}>
                        {/* Header: Icon + Name + Badge Đã cân bằng */}
                        <View style={styles.cutHeaderRow}>
                          <View style={[styles.planIconBox, { backgroundColor: "#ECFDF5" }]}>
                            <Text style={{ fontSize: 22 }}>
                              {getCategoryIcon(item.categoryIcon, item.categoryName)}
                            </Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Text style={[styles.cutItemName, styles.textMutedDark, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                                {item.categoryName}
                              </Text>
                              <View style={styles.balancedTag}>
                                <Text style={styles.balancedTagText}>✓ Đã cân bằng</Text>
                              </View>
                            </View>
                            <Text style={[styles.cutItemSub, styles.textMutedLight, { marginTop: 3 }]}>
                              Hạn mức: {fmt(limit)} • Chi TB: {fmt(avgSpent)}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar & Status Pill */}
                        <View style={styles.balancedProgressBox}>
                          <View style={styles.balancedProgressLabelRow}>
                            <Text style={styles.balancedProgressText}>
                              Mức độ sử dụng:{" "}
                              <Text style={{ fontWeight: "800", color: percentSpent >= 90 ? colors.amber600 : colors.emerald600 }}>
                                {percentSpent}%
                              </Text>
                            </Text>
                            <Text style={styles.balancedRemainingText}>
                              Còn dư:{" "}
                              <Text style={{ fontWeight: "900", color: colors.emerald600 }}>
                                {fmt(remaining)}
                              </Text>
                            </Text>
                          </View>
                          <View style={styles.balancedTrack}>
                            <View
                              style={[
                                styles.balancedFill,
                                {
                                  width: `${Math.min(100, percentSpent)}%`,
                                  backgroundColor: percentSpent >= 90 ? colors.amber500 : colors.emerald500,
                                },
                              ]}
                            />
                          </View>
                        </View>

                        {/* 2 Stats Column (Hạn mức & Trạng thái) */}
                        <View style={styles.balancedStatsRow}>
                          <View style={styles.balancedStatCol}>
                            <Text style={styles.balancedStatLabel}>HẠN MỨC THÁNG</Text>
                            <Text style={[styles.balancedStatVal, { color: colors.indigo600 }]}>{fmt(limit)}</Text>
                          </View>
                          <View style={styles.balancedStatDivider} />
                          <View style={styles.balancedStatCol}>
                            <Text style={styles.balancedStatLabel}>TRẠNG THÁI</Text>
                            <Text style={[styles.balancedStatVal, { color: colors.emerald600 }]}>
                              ✓ An Toàn
                            </Text>
                          </View>
                        </View>

                        {/* Reason Box */}
                        <View style={[styles.cutReasonBox, styles.cutReasonBoxBalanced]}>
                          <Text style={[styles.cutReasonText, styles.cutReasonTextBalanced]}>
                            💡 {item.reasoning || `Khoản chi tiêu ${item.categoryName} đang được duy trì ổn định, bám sát hạn mức.`}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                      <Text style={{ fontSize: 28 }}>💡</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Chưa thiết lập ngân sách tháng này</Text>
                    <Text style={styles.emptySub}>
                      Hãy sang tab "Gợi ý chi tiêu" để hệ thống tự động đề xuất và thiết lập hạn mức chuẩn cho các danh mục chỉ với 1 chạm!
                    </Text>
                    <TouchableOpacity
                      style={[styles.rebalanceBannerAction, { alignSelf: "center", marginTop: 12, paddingHorizontal: 20 }]}
                      onPress={() => setActiveSection("plan")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rebalanceBannerActionText}>Sang tab Gợi ý chi tiêu ➔</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {/* Hero Alert Card */}
                {isAllRebalanced ? (
                  <View style={[styles.rebalanceHeroCard, styles.heroCardBalanced]}>
                    <View style={[styles.rebalanceHeroBadge, styles.heroBadgeBalanced]}>
                      <Text style={styles.heroBadgeBalancedText}>🛡️ ĐÃ TÁI CÂN BẰNG THÀNH CÔNG</Text>
                    </View>
                    <Text style={[styles.rebalanceHeroTitle, styles.heroTitleBalanced]}>
                      Ngân Sách Đã Được Cân Bằng Hoàn Toàn
                    </Text>
                    <Text style={styles.rebalanceHeroSub}>
                      Đã tự động điều chỉnh các danh mục linh hoạt để bù đắp toàn bộ phần chi tiêu vượt hạn mức trong tháng {selectedMonth}/{selectedYear}.
                    </Text>

                    {/* 2 Stats Column */}
                    <View style={[styles.rebalanceStatsRow, styles.statsRowBalanced]}>
                      <View style={styles.rebalanceStatBox}>
                        <Text style={styles.rebalanceStatLabel}>TỔNG ĐÃ BÙ ĐẮP</Text>
                        <Text style={[styles.rebalanceStatValue, { color: colors.emerald600 }]}>
                          +{fmt(activeRebalancePlan?.totalCompensated)}
                        </Text>
                      </View>
                      <View style={[styles.rebalanceStatDivider, styles.dividerBalanced]} />
                      <View style={styles.rebalanceStatBox}>
                        <Text style={styles.rebalanceStatLabel}>TRẠNG THÁI</Text>
                        <Text style={[styles.rebalanceStatValue, { color: colors.slate700 }]}>
                          ✓ Đã cân bằng
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rebalanceHeroCard}>
                    <View style={styles.rebalanceHeroBadge}>
                      <Text style={styles.rebalanceHeroBadgeText}>🚨 CẦN TÁI CÂN BẰNG NGÂN SÁCH</Text>
                    </View>
                    <Text style={styles.rebalanceHeroTitle}>
                      Phát Hiện Tiêu Lố {fmt(activeRebalancePlan?.totalOverspent)}
                    </Text>
                    <Text style={styles.rebalanceHeroSub}>{activeRebalancePlan?.statusMessage}</Text>

                    {/* 2 Stats Column */}
                    <View style={styles.rebalanceStatsRow}>
                      <View style={styles.rebalanceStatBox}>
                        <Text style={styles.rebalanceStatLabel}>TỔNG TIÊU LỐ</Text>
                        <Text style={[styles.rebalanceStatValue, { color: colors.rose600 }]}>
                          +{fmt(activeRebalancePlan?.totalOverspent)}
                        </Text>
                      </View>
                      <View style={styles.rebalanceStatDivider} />
                      <View style={styles.rebalanceStatBox}>
                        <Text style={styles.rebalanceStatLabel}>CÓ THỂ BÙ TRỪ</Text>
                        <Text style={[styles.rebalanceStatValue, { color: colors.emerald600 }]}>
                          {fmt(activeRebalancePlan?.totalCompensated)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 🔴 Section 1: Overspent Items */}
                <View style={styles.rebalanceSectionHeaderRow}>
                  <View style={[styles.sectionHeaderDot, isAllRebalanced ? styles.dotGray : styles.dotRose]} />
                  <Text style={styles.rebalanceSectionHeader}>
                    1. Các Khoản Đã Vượt Hạn Mức ({activeRebalancePlan?.overspentItems?.length || 0})
                  </Text>
                  {isAllRebalanced && (
                    <View style={styles.sectionHeaderBadgeGray}>
                      <Text style={styles.sectionHeaderBadgeGrayText}>✓ Đã bù đắp</Text>
                    </View>
                  )}
                </View>

                <View style={styles.rebalanceNoticeBox}>
                  <Text style={styles.rebalanceNoticeText}>
                    🛡️ Các khoản Cố định/Bill (Tiền nhà, Phí liên lạc...) sẽ được giữ nguyên và chỉ dùng ngân sách Linh hoạt còn dư để bù đắp.
                  </Text>
                </View>

                {activeRebalancePlan?.overspentItems?.map((item, idx) => (
                  <View key={idx} style={[styles.overspentItemCard, isAllRebalanced && styles.itemCardBalanced]}>
                    <View style={styles.overspentHeaderRow}>
                      <View style={[styles.planIconBox, isAllRebalanced && { backgroundColor: "#f1f5f9" }]}>
                        <Text style={{ fontSize: 22 }}>
                          {getCategoryIcon(item.categoryIcon, item.categoryName)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.overspentItemName, isAllRebalanced && styles.textMutedDark]}>
                            {item.categoryName}
                          </Text>
                          {item.isFixed && (
                            <View style={styles.fixedTypeBadge}>
                              <Text style={styles.fixedTypeBadgeText}>Cố định</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.overspentItemSub, isAllRebalanced && styles.textMutedLight]}>
                          Hạn mức: {fmt(item.limitAmount)} • Thực chi: {fmt(item.spentAmount)}
                        </Text>
                      </View>
                      <View style={[styles.overspentBadge, isAllRebalanced && styles.badgeBalanced]}>
                        <Text style={[styles.overspentBadgeText, isAllRebalanced && styles.badgeBalancedText]}>
                          {isAllRebalanced ? "✓ Đã bù đắp" : `+${item.overspentPercent}%`}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.overspentAmountBox, isAllRebalanced && styles.amountBoxBalanced]}>
                      <Text style={[styles.overspentAmountLabel, isAllRebalanced && styles.textMutedDark]}>
                        {isAllRebalanced ? "Đã bù đắp đủ phần lố:" : "Vượt hạn mức:"}
                      </Text>
                      <Text style={[styles.overspentAmountValue, isAllRebalanced && { color: colors.emerald600 }]}>
                        +{fmt(item.overspentAmount)}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* 🟢 Section 2: Compensation Cuts */}
                <View style={[styles.rebalanceSectionHeaderRow, { marginTop: 22 }]}>
                  <View style={[styles.sectionHeaderDot, isAllRebalanced ? styles.dotGray : styles.dotEmerald]} />
                  <Text style={styles.rebalanceSectionHeader}>
                    2. Đề Xuất Cắt Giảm Bù Vào ({activeRebalancePlan?.compensationCuts?.length || 0})
                  </Text>
                  {isAllRebalanced && (
                    <View style={styles.sectionHeaderBadgeGray}>
                      <Text style={styles.sectionHeaderBadgeGrayText}>✓ Đã cân bằng</Text>
                    </View>
                  )}
                </View>

                {(!activeRebalancePlan?.compensationCuts || activeRebalancePlan.compensationCuts.length === 0) ? (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                      <Text style={{ fontSize: 24 }}>🍃</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Không có danh mục linh hoạt nào</Text>
                    <Text style={styles.emptySub}>
                      Tất cả danh mục trong tháng này là chi phí cố định hoặc chưa được thiết lập ngân sách.
                    </Text>
                  </View>
                ) : (
                  activeRebalancePlan.compensationCuts.map((item, idx) => {
                    const cutKey = item.categoryId || item.categoryName;
                    const hasCutAmount = Number(item.suggestedCutAmount) > 0;
                    const isCutApplied =
                      isAllRebalanced ||
                      !!appliedCutIds[cutKey] ||
                      !!item.isBalanced ||
                      !hasCutAmount ||
                      Number(item.currentLimit) === Number(item.newSuggestedLimit);
                    const isApplying = applyingSingleCutId === cutKey;

                    return (
                      <View key={idx} style={[styles.cutItemCard, isCutApplied && styles.cutItemCardBalanced]}>
                        {/* Header: Icon + Name & Info + Tier Badge */}
                        <View style={styles.cutHeaderRow}>
                          <View
                            style={[
                              styles.planIconBox,
                              isCutApplied ? { backgroundColor: "#f1f5f9" } : { backgroundColor: "#ecfdf5" },
                            ]}
                          >
                            <Text style={{ fontSize: 22 }}>
                              {getCategoryIcon(item.categoryIcon, item.categoryName)}
                            </Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={[styles.cutItemName, isCutApplied && styles.textMutedDark]} numberOfLines={1}>
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
                              ) : item.tier === "TIER_2_BASIC" ? (
                                <View style={styles.tier2Badge}>
                                  <Text style={styles.tier2BadgeText}>🛒 Sinh hoạt</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.cutItemSub, isCutApplied && styles.textMutedLight]}>
                              Đã chi {fmt(item.currentSpent)} • Hạn mức {fmt(item.currentLimit)}
                            </Text>
                          </View>
                        </View>

                        {/* Mức cắt giảm highlight banner */}
                        <View style={[styles.cutHighlightBanner, isCutApplied && styles.cutHighlightBannerBalanced]}>
                          <Text style={[styles.cutHighlightLabel, isCutApplied && styles.cutHighlightLabelBalanced]}>
                            {hasCutAmount
                              ? isCutApplied
                                ? "MỨC ĐÃ ĐIỀU CHỈNH CẮT GIẢM"
                                : "MỨC ĐỀ XUẤT CẮT GIẢM"
                              : "TRẠNG THÁI NGÂN SÁCH"}
                          </Text>
                          <Text style={[styles.cutHighlightValue, isCutApplied && styles.cutHighlightValueBalanced]}>
                            {hasCutAmount ? `${fmt(item.suggestedCutAmount)}` : "✓ Đã Cân Bằng"}
                          </Text>
                        </View>

                        {/* Limits Row */}
                        <View style={[styles.cutLimitsRow, isCutApplied && styles.cutLimitsRowBalanced]}>
                          <View style={styles.cutLimitCol}>
                            <Text style={styles.cutLimitLabel}>
                              {hasCutAmount ? "HẠN MỨC CŨ" : "HẠN MỨC HIỆN TẠI"}
                            </Text>
                            <Text style={[styles.cutLimitOld, !hasCutAmount && { textDecorationLine: "none", color: colors.slate700 }]}>
                              {fmt(item.currentLimit)}
                            </Text>
                          </View>
                          <Text style={[styles.cutArrowText, isCutApplied && styles.cutArrowTextBalanced]}>
                            {hasCutAmount ? "➔" : "•"}
                          </Text>
                          <View style={styles.cutLimitCol}>
                            <Text style={styles.cutLimitLabel}>
                              {hasCutAmount
                                ? `HẠN MỨC MỚI ${isCutApplied ? "(ĐÃ ÁP DỤNG)" : "ĐỀ XUẤT"}`
                                : "THỰC CHI HIỆN TẠI"}
                            </Text>
                            <Text style={[styles.cutLimitNew, isCutApplied && styles.cutLimitNewBalanced]}>
                              {fmt(hasCutAmount ? item.newSuggestedLimit : item.currentSpent)}
                            </Text>
                          </View>
                        </View>

                        {/* Reason Box */}
                        <View style={[styles.cutReasonBox, isCutApplied && styles.cutReasonBoxBalanced]}>
                          <Text style={[styles.cutReasonText, isCutApplied && styles.cutReasonTextBalanced]}>
                            💡 {item.reason}
                          </Text>
                        </View>

                        {/* Individual Apply Action Button on each card */}
                        <TouchableOpacity
                          style={[
                            styles.cutApplySingleBtn,
                            isCutApplied && styles.cutApplySingleBtnDone,
                            isApplying && styles.applyBudgetBtnDisabled,
                          ]}
                          onPress={() => handleApplySingleCut(item)}
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
                  })
                )}

                {/* Section 3: 1-Click Apply Action Button */}
                {activeRebalancePlan?.compensationCuts && activeRebalancePlan.compensationCuts.length > 0 && (
                  <View style={styles.rebalanceActionBox}>
                    {activeRebalancePlan.compensationCuts.some(
                      (c) =>
                        !isAllRebalanced &&
                        !appliedCutIds[c.categoryId || c.categoryName] &&
                        !c.isBalanced &&
                        Number(c.suggestedCutAmount) > 0
                    ) ? (
                      <TouchableOpacity
                        style={[styles.rebalanceApplyBtn, rebalancing && styles.applyBudgetBtnDisabled]}
                        onPress={handleApplyRebalance}
                        disabled={rebalancing}
                        activeOpacity={0.85}
                      >
                        {rebalancing ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.rebalanceApplyBtnText}>Áp Dụng Tất Cả Ngay</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.rebalanceApplyBtnDone}>
                        <Text style={styles.rebalanceApplyBtnTextDone}>
                          ✓ Đã Cân Bằng Toàn Bộ Ngân Sách
                        </Text>
                      </View>
                    )}
                    <Text style={styles.rebalanceHintText}>
                      * Hệ thống tự động tối ưu hóa và cân bằng ngân sách để tổng chi tiêu không bị thâm hụt.
                    </Text>
                  </View>
                )}
              </View>
            )}
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
            {/* Month Selector Pill specifically inside Gợi ý chi tiêu Tab */}
            <View style={styles.planMonthRow}>
              <View style={styles.monthSelectorPill}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                  <Text style={styles.monthNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  Gợi ý cho Tháng {selectedMonth}/{selectedYear}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                  <Text style={styles.monthNavText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 🚨 Overspending Highlight Banner if active */}
            {rebalancePlan?.hasOverspending && (
              <TouchableOpacity
                style={styles.rebalanceBannerCard}
                onPress={() => setActiveSection("rebalance")}
                activeOpacity={0.9}
              >
                <View style={styles.rebalanceBannerLeft}>
                  <Text style={{ fontSize: 24, marginRight: 10 }}>🚨</Text>
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
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📭</Text>
                <Text style={styles.emptyTitle}>Chưa đủ dữ liệu gợi ý</Text>
                <Text style={styles.emptySub}>
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
                  <View key={idx} style={styles.planCard}>
                    {/* Top Row: Icon & Category Name */}
                    <View style={styles.planHeader}>
                      <View style={styles.planIconBox}>
                        <Text style={{ fontSize: 24 }}>
                          {getCategoryIcon(item.categoryIcon, item.categoryName)}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.planCategory}>{item.categoryName}</Text>
                        <Text style={styles.planSub}>
                          Dựa trên dữ liệu phân tích 3 tháng & tháng trước
                        </Text>
                      </View>
                    </View>

                    {/* 3-Pillar Data Comparison Row */}
                    <View style={styles.metricsCompareRow}>
                      <View style={styles.metricColumn}>
                        <Text style={styles.metricColumnLabel}>TB 3 THÁNG</Text>
                        <Text style={styles.metricColumnValue}>{fmt(item.avgSpent3Months)}</Text>
                      </View>

                      <View style={styles.metricDivider} />

                      <View style={styles.metricColumn}>
                        <Text style={styles.metricColumnLabel}>THÁNG TRƯỚC</Text>
                        <Text
                          style={[
                            styles.metricColumnValue,
                            !(item as any).lastMonthBudget && { color: colors.slate400, fontSize: 13 },
                          ]}
                        >
                          {(item as any).lastMonthBudget ? fmt((item as any).lastMonthBudget) : "Chưa đặt"}
                        </Text>
                      </View>

                      <View style={styles.metricDivider} />

                      <View style={[styles.metricColumn, styles.metricColumnHighlight]}>
                        <Text style={[styles.metricColumnLabel, { color: colors.emerald700 }]}>
                          ĐỀ XUẤT THÁNG NÀY
                        </Text>
                        <Text style={[styles.metricColumnValue, { color: colors.emerald700, fontWeight: "900" }]}>
                          {fmt(item.suggestedAmount)}
                        </Text>
                      </View>
                    </View>

                    {/* Single Smart AI Insight Box (Combines 3-Month + Last Month comparison) */}
                    <View style={[styles.smartInsightCard, insight.bgStyle]}>
                      <View style={styles.smartInsightHeader}>
                        <Text style={{ fontSize: 16, marginRight: 6 }}>{insight.icon}</Text>
                        <Text style={[styles.smartInsightTitle, { color: insight.titleColor }]}>
                          {insight.title}
                        </Text>
                      </View>
                      <Text style={styles.smartInsightDesc}>{insight.description}</Text>
                    </View>

                    {/* Action Button: Thêm ngân sách / Đã có ngân sách */}
                    <View style={styles.planActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.applyBudgetBtn,
                          hasCurrentBudget && styles.applyBudgetBtnDisabled,
                        ]}
                        onPress={() => handleApplyBudget(item)}
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
                          <Text style={styles.applyBudgetBtnText}>
                            + Thêm ngân sách
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* Link to Full Budget Manager Screen */}
            <TouchableOpacity
              style={styles.fullBudgetLinkCard}
              onPress={() => navigation.navigate("Budget")}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.fullBudgetLinkTitle}>🎯 Xem danh sách Hạn mức đầy đủ</Text>
                <Text style={styles.fullBudgetLinkSub}>
                  Kiểm tra tiến độ chi tiêu, phân bổ và ưu tiên thanh toán
                </Text>
              </View>
              <Text style={styles.fullBudgetLinkArrow}>›</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* Header Description */}
            <View style={styles.alertsHeaderCard}>
              <View style={styles.alertsHeaderIconBox}>
                <Text style={{ fontSize: 22 }}>⚡</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.alertsHeaderTitle}>Cảnh báo Chi tiêu Bất thường ({warnings.length})</Text>
                <Text style={styles.alertsHeaderSub}>
                  Hệ thống AI theo dõi tốc độ đốt tiền (Burn-rate) và so sánh với trung bình 3 tháng để cảnh báo nguy cơ thâm hụt sớm.
                </Text>
              </View>
            </View>

            {warnings.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Text style={{ fontSize: 32 }}>🎉</Text>
                </View>
                <Text style={styles.emptyTitle}>Tốc độ chi tiêu an toàn!</Text>
                <Text style={styles.emptySub}>
                  Không phát hiện khoản chi nào tăng đột biến so với thói quen 3 tháng qua. Bạn đang kiểm soát dòng tiền rất tốt.
                </Text>
              </View>
            ) : (
              warnings.map((w, idx) => {
                const isHigh = w.severity === "HIGH";
                return (
                  <View key={idx} style={[styles.smartWarningCard, isHigh ? styles.warningCardHigh : styles.warningCardMed]}>
                    {/* Header */}
                    <View style={styles.warningHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={[styles.warningIconCircle, isHigh ? styles.iconCircleHigh : styles.iconCircleMed]}>
                          <Text style={{ fontSize: 20 }}>
                            {getCategoryIcon(w.categoryIcon, w.categoryName)}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.warningCatName}>{w.categoryName}</Text>
                          <Text style={[styles.warningBurnText, { color: isHigh ? colors.rose600 : colors.amber600 }]}>
                            Tốc độ: {fmt(w.dailyBurnRate)}/ngày
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.warningSeverityBadge, isHigh ? styles.badgeHigh : styles.badgeMed]}>
                        <Text style={[styles.warningSeverityText, isHigh ? styles.textHigh : styles.textMed]}>
                          {isHigh ? "🔴 Rủi ro cao" : "⚠️ Cần chú ý"} (+{w.increasePercent}%)
                        </Text>
                      </View>
                    </View>

                    {/* 3 Metric Stats */}
                    <View style={styles.warningStatsGrid}>
                      <View style={styles.warningStatCol}>
                        <Text style={styles.warningStatLabel}>ĐÃ CHI THÁNG</Text>
                        <Text style={[styles.warningStatVal, { color: colors.rose600 }]}>
                          {fmt(w.currentMonthSpent)}
                        </Text>
                      </View>
                      <View style={styles.warningStatDivider} />
                      <View style={styles.warningStatCol}>
                        <Text style={styles.warningStatLabel}>TB 3 THÁNG</Text>
                        <Text style={styles.warningStatVal}>
                          {fmt(w.avg3MonthSpent)}
                        </Text>
                      </View>
                      <View style={styles.warningStatDivider} />
                      <View style={styles.warningStatCol}>
                        <Text style={styles.warningStatLabel}>DỰ KIẾN CẢ THÁNG</Text>
                        <Text style={[styles.warningStatVal, { color: isHigh ? colors.rose700 : colors.amber700 }]}>
                          ~{fmt(w.projectedMonthEnd)}
                        </Text>
                      </View>
                    </View>

                    {/* Impact / Forecast Message */}
                    <View style={[styles.warningImpactBox, isHigh ? styles.impactBoxHigh : styles.impactBoxMed]}>
                      <Text style={[styles.warningImpactText, isHigh ? styles.impactTextHigh : styles.impactTextMed]}>
                        📊 {w.impactSummary || w.message}
                      </Text>
                    </View>

                    {/* Actionable Advice Box */}
                    {w.actionableTip && (
                      <View style={styles.warningActionTipBox}>
                        <Text style={styles.warningActionTipText}>
                          {w.actionableTip}
                        </Text>
                      </View>
                    )}

                    {/* Quick CTA Actions */}
                    <View style={styles.warningBtnRow}>
                      <TouchableOpacity
                        style={styles.warningRebalanceBtn}
                        onPress={() => setActiveSection("rebalance")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.warningRebalanceBtnText}>🎯 Tái cân bằng ngân sách</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.warningPlanBtn}
                        onPress={() => setActiveSection("plan")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.warningPlanBtnText}>⚙️ Sửa hạn mức</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Notification Bottom Sheet */}
      <NotificationBottomSheet
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />

      {/* Toast Feedback */}
      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
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
  planMonthRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  monthSelectorPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    gap: 14,
  },
  monthNavBtn: {
    paddingHorizontal: 6,
  },
  monthNavText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#047857",
  },
  monthText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#065f46",
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
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 11,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  planBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 6,
  },
  planBannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e40af",
    marginBottom: 3,
  },
  planBannerSub: {
    fontSize: 12.5,
    color: "#3b82f6",
    lineHeight: 17,
    fontWeight: "500",
  },
  planBannerAddBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  planBannerAddBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  planIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  planCategory: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 2,
  },
  planSub: {
    fontSize: 13,
    color: colors.slate600,
    fontWeight: "500",
  },
  planSuggestedLabel: {
    fontSize: 11.5,
    fontWeight: "900",
    color: colors.emerald600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.emerald700,
  },
  metricsCompareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
  },
  metricColumnHighlight: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  metricColumnLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.slate500,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricColumnValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 4,
  },
  insightBgGray: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  insightBgBlue: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  insightBgAmber: {
    backgroundColor: "#fffbeb",
    borderColor: "#fef08a",
  },
  insightBgGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
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
    fontSize: 13.5,
    fontWeight: "800",
    flex: 1,
  },
  smartInsightDesc: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
    fontWeight: "500",
  },
  planActionRow: {
    width: "100%",
  },
  applyBudgetBtn: {
    backgroundColor: colors.emerald600,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emerald600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyBudgetBtnDisabled: {
    backgroundColor: "#e2e8f0",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  applyBudgetBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.white,
  },
  applyBudgetBtnTextDisabled: {
    color: "#64748b",
  },
  fullBudgetLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 6,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.emerald200,
    shadowColor: colors.emerald600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  fullBudgetLinkTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.emerald900,
    marginBottom: 2,
  },
  fullBudgetLinkSub: {
    fontSize: 11,
    color: colors.slate500,
  },
  fullBudgetLinkArrow: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.emerald600,
    marginLeft: 8,
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
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginVertical: 4,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.slate800,
    textAlign: "center",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
    paddingHorizontal: 12,
  },
  sectionScroll: {
    marginBottom: 16,
  },
  // ─── REBALANCE STYLES ───
  safeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  rebalanceSafeCard: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  rebalanceSafeTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#065f46",
    marginBottom: 6,
  },
  rebalanceSafeSub: {
    fontSize: 13,
    color: "#047857",
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
  },
  rebalanceHeroCard: {
    backgroundColor: "#fff1f2",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#fecdd3",
    marginBottom: 18,
    shadowColor: colors.rose600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroCardBalanced: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    shadowColor: "#64748b",
    shadowOpacity: 0.05,
  },
  rebalanceHeroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ffe4e6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fda4af",
    marginBottom: 8,
  },
  heroBadgeBalanced: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  rebalanceHeroBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.rose700,
    letterSpacing: 0.5,
  },
  heroBadgeBalancedText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#475569",
    letterSpacing: 0.5,
  },
  rebalanceHeroTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.rose800,
    marginBottom: 4,
  },
  heroTitleBalanced: {
    color: colors.slate800,
  },
  rebalanceHeroSub: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: "500",
  },
  rebalanceStatsRow: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  statsRowBalanced: {
    borderColor: "#e2e8f0",
    backgroundColor: colors.white,
  },
  rebalanceStatBox: {
    flex: 1,
    alignItems: "center",
  },
  rebalanceStatLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate400,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  rebalanceStatValue: {
    fontSize: 15,
    fontWeight: "900",
  },
  rebalanceStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#fecdd3",
  },
  dividerBalanced: {
    backgroundColor: "#e2e8f0",
  },
  rebalanceSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  sectionHeaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotRose: {
    backgroundColor: colors.rose500,
  },
  dotEmerald: {
    backgroundColor: colors.emerald500,
  },
  dotGray: {
    backgroundColor: colors.slate400,
  },
  rebalanceSectionHeader: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.slate800,
    letterSpacing: -0.2,
  },
  sectionHeaderBadgeGray: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeaderBadgeGrayText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },
  rebalanceNoticeBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 12,
  },
  rebalanceNoticeText: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 17.5,
    fontWeight: "600",
  },
  fixedTypeBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  fixedTypeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  overspentItemCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    shadowColor: colors.rose500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemCardBalanced: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    shadowOpacity: 0.02,
    shadowColor: "#000",
  },
  overspentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overspentItemName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.slate900,
  },
  overspentItemSub: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    fontWeight: "500",
  },
  overspentBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  overspentBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.rose700,
  },
  badgeBalanced: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  badgeBalancedText: {
    color: "#475569",
    fontWeight: "800",
  },
  overspentAmountBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff1f2",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 10,
  },
  amountBoxBalanced: {
    backgroundColor: "#f1f5f9",
  },
  overspentAmountLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.rose800,
  },
  overspentAmountValue: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.rose700,
  },
  cutItemCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
    shadowColor: colors.emerald500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cutItemCardBalanced: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    shadowOpacity: 0.02,
    shadowColor: "#000",
  },
  cutHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cutItemName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.slate900,
  },
  tier1Badge: {
    backgroundColor: "#faf5ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d8b4fe",
  },
  tier1BadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#7e22ce",
  },
  tier2Badge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  tier2BadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803d",
  },
  balancedTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  balancedTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
  },
  cutItemSub: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    fontWeight: "500",
  },
  cutBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6ee7b7",
  },
  cutBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#047857",
  },
  cutHighlightBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  cutHighlightBannerBalanced: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  cutHighlightLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
    letterSpacing: 0.4,
  },
  cutHighlightLabelBalanced: {
    color: "#64748b",
  },
  cutHighlightValue: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#059669",
  },
  cutHighlightValueBalanced: {
    color: "#475569",
  },
  balancedProgressBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  balancedProgressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balancedProgressText: {
    fontSize: 12,
    color: colors.slate600,
    fontWeight: "600",
  },
  balancedRemainingText: {
    fontSize: 12,
    color: colors.slate600,
    fontWeight: "600",
  },
  balancedTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  balancedFill: {
    height: "100%",
    borderRadius: 3,
  },
  balancedStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  balancedStatCol: {
    flex: 1,
    alignItems: "center",
  },
  balancedStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
  },
  balancedStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.slate500,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  balancedStatVal: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.slate900,
  },
  cutLimitsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cutLimitsRowBalanced: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  cutLimitCol: {
    flex: 1,
  },
  cutLimitLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.slate400,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  cutLimitOld: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.slate400,
    textDecorationLine: "line-through",
  },
  cutLimitNew: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#065f46",
  },
  cutLimitNewBalanced: {
    color: "#334155",
  },
  cutArrowText: {
    fontSize: 16,
    color: "#059669",
    marginHorizontal: 8,
    fontWeight: "900",
  },
  cutArrowTextBalanced: {
    color: "#94a3b8",
  },
  cutReasonBox: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 8,
  },
  cutReasonBoxBalanced: {
    backgroundColor: "#f1f5f9",
  },
  cutReasonText: {
    fontSize: 12,
    color: "#065f46",
    fontWeight: "500",
    lineHeight: 16.5,
  },
  cutReasonTextBalanced: {
    color: "#64748b",
  },
  cutApplySingleBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cutApplySingleBtnDone: {
    backgroundColor: "#f1f5f9",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cutApplySingleBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  cutApplySingleBtnTextDone: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748b",
  },
  rebalanceActionBox: {
    marginTop: 14,
    marginBottom: 24,
  },
  rebalanceApplyBtn: {
    backgroundColor: "#059669",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  rebalanceApplyBtnDone: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rebalanceApplyBtnText: {
    fontSize: 15.5,
    fontWeight: "900",
    color: colors.white,
  },
  rebalanceApplyBtnTextDone: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#64748b",
  },
  rebalanceHintText: {
    fontSize: 11.5,
    color: colors.slate500,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
    fontStyle: "italic",
  },
  rebalanceBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff1f2",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#fecdd3",
    marginBottom: 14,
    shadowColor: colors.rose500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rebalanceBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  rebalanceBannerTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: colors.rose800,
    marginBottom: 2,
  },
  rebalanceBannerSub: {
    fontSize: 11.5,
    color: colors.slate600,
    lineHeight: 15,
  },
  rebalanceBannerAction: {
    backgroundColor: colors.rose600,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  rebalanceBannerActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  textMutedDark: {
    color: "#334155",
  },
  textMutedLight: {
    color: "#64748b",
  },

  /* ─── NEW ACTIONABLE ALERTS STYLES ─── */
  alertsHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#dbeafe",
    marginBottom: 16,
  },
  alertsHeaderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.indigo600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertsHeaderTitle: {
    fontSize: 14.5,
    fontWeight: "900",
    color: colors.indigo900,
    marginBottom: 2,
  },
  alertsHeaderSub: {
    fontSize: 11.5,
    color: colors.slate600,
    lineHeight: 16,
  },

  smartWarningCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  warningCardHigh: {
    borderColor: "#fecdd3",
  },
  warningCardMed: {
    borderColor: "#fed7aa",
  },
  warningHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  warningIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleHigh: {
    backgroundColor: "#ffe4e6",
  },
  iconCircleMed: {
    backgroundColor: "#ffedd5",
  },
  warningCatName: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900,
  },
  warningBurnText: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 2,
  },
  warningSeverityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeHigh: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  badgeMed: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  warningSeverityText: {
    fontSize: 11,
    fontWeight: "900",
  },
  textHigh: {
    color: colors.rose700,
  },
  textMed: {
    color: colors.amber700,
  },

  warningStatsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  warningStatCol: {
    flex: 1,
    alignItems: "center",
  },
  warningStatLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  warningStatVal: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate800,
  },
  warningStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e2e8f0",
  },

  warningImpactBox: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  impactBoxHigh: {
    backgroundColor: "#fff1f2",
    borderColor: "#ffe4e6",
  },
  impactBoxMed: {
    backgroundColor: "#fff7ed",
    borderColor: "#ffedd5",
  },
  warningImpactText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  impactTextHigh: {
    color: colors.rose800,
  },
  impactTextMed: {
    color: colors.amber800,
  },

  warningActionTipBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  warningActionTipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
    lineHeight: 17,
  },

  warningBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  warningRebalanceBtn: {
    flex: 1.4,
    backgroundColor: colors.indigo600,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  warningRebalanceBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  warningPlanBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  warningPlanBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate700,
  },
  aiBannerCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#1e1b4b",
    borderWidth: 1.5,
    borderColor: "#4338ca",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#4338ca",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  aiBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiBannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f8fafc",
  },
  aiBannerBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBannerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fbbf24",
  },
  aiBannerSub: {
    fontSize: 11,
    color: "#cbd5e1",
    lineHeight: 15,
    marginTop: 2,
  },
  aiBannerCta: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBannerCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
});
