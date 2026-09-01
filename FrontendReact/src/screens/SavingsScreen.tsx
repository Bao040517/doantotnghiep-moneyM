import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Platform, StatusBar } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { BottomSheet } from "../components/ui/BottomSheet";
import { SavingsGoalCard } from "../components/features/SavingsGoalCard";
import { VietQRCard } from "../components/features/VietQRCard";
import { SavingsSkeleton } from "../components/ui/SkeletonLoader";
import { colors } from "../constants/colors";
import { useAppData } from "../hooks/useAppData";
import { useSavings } from "../hooks/useSavings";
import { useAuth } from "../hooks/useAuth";
import { financialServices } from "../services/financialServices";
import { SavingsPriority } from "../types";
import { useTheme } from "../context/ThemeContext";
import { useTopSafeInset } from "../utils/responsive";

export const SavingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
  const safeTopPadding = useTopSafeInset(10);
  const { totalWalletBalance, budgets, isLoading: appLoading, refresh: refreshApp, safeToSpend: apiSafeToSpend } = useAppData();

  const {
    goals,
    requiredReserve,
    safeToSpend,
    isSafetyFloorReached,
    hasAllocatedThisMonth,
    autoAllocate,
    isAllocating,
    refreshGoals,
  } = useSavings(totalWalletBalance, apiSafeToSpend);

  // Create Goal Modal state
  const [createVisible, setCreateVisible] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<SavingsPriority>("MEDIUM");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Deposit/Withdraw Modal state
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [fundGoalId, setFundGoalId] = useState("");
  const [fundGoalName, setFundGoalName] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [fundMode, setFundMode] = useState<"fund" | "withdraw">("fund");
  const [fundLoading, setFundLoading] = useState(false);

  // VietQR Allocate Modal state
  const [allocateQrModalVisible, setAllocateQrModalVisible] = useState(false);

  const targetSavingsBin = user?.savingsBankBin || user?.bankBin;
  const targetSavingsAccNo = user?.savingsBankAccountNo || user?.bankAccountNo;
  const targetSavingsAccName = user?.savingsBankAccountName || user?.bankAccountName || user?.name;

  const handleOpenAutoAllocateQr = () => {
    if (!targetSavingsBin || !targetSavingsAccNo) {
      Alert.alert(
        "Chưa Cấu Hình Ví Tiết Kiệm 🏦",
        "Bạn chưa thiết lập tài khoản ngân hàng nhận tiền cho Ví Tiết Kiệm. Vui lòng vào trang Cá nhân để cài đặt ngân hàng tích lũy.",
        [
          { text: "Để sau", style: "cancel" },
          {
            text: "Cài đặt ngay",
            onPress: () => navigation.navigate("Profile" as never),
          },
        ]
      );
      return;
    }
    setAllocateQrModalVisible(true);
  };

  const handleConfirmAllocation = async () => {
    try {
      const res = await autoAllocate();
      const allocated = res?.totalAllocated ?? res?.allocatedTotal ?? 0;
      setAllocateQrModalVisible(false);
      if (allocated > 0) {
        Alert.alert(
          "⚡ Tự Động Phân Bổ Thành Công!",
          `Đã phân bổ tổng cộng ${allocated.toLocaleString("vi-VN")} ₫ vào các mục tiêu tiết kiệm mà vẫn giữ nguyên Điểm Dừng An Toàn!`
        );
        refreshApp();
      } else {
        Alert.alert(
          "Thông Báo Phân Bổ",
          res?.message || "Không có mục tiêu tiết kiệm nào cần nạp thêm tiền hoặc tất cả mục tiêu đã đạt hạn mức 100%!"
        );
      }
    } catch (e: any) {
      setAllocateQrModalVisible(false);
      if (
        e.message === "SAFETY_RESERVE_VIOLATION" ||
        e.response?.data?.message?.includes("SAFETY_RESERVE_VIOLATION") ||
        e.response?.data?.errorCode === "SAFETY_RESERVE_VIOLATION"
      ) {
        Alert.alert(
          "🛡️ Vi Phạm Điểm Dừng An Toàn!",
          "Số dư hiện tại của bạn không đủ để bảo đảm các khoản ngân sách cần chi trả. Thuật toán đã tự động chặn phân bổ để bảo vệ dòng tiền!"
        );
      } else {
        Alert.alert("Lỗi phân bổ", e.response?.data?.message || "Không thể thực hiện phân bổ");
      }
    }
  };

  const openFundModal = (goalId: string, mode: "fund" | "withdraw") => {
    const goal = goals.find((g) => g.id === goalId);
    setFundGoalId(goalId);
    setFundGoalName(goal?.name || "Mục tiêu");
    setFundMode(mode);
    setFundAmount("");
    setFundModalVisible(true);
  };

  const handleFundSubmit = async () => {
    const rawNumber = parseFloat(fundAmount.replace(/\D/g, "")) || 0;
    if (rawNumber <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }
    setFundLoading(true);
    try {
      if (fundMode === "fund") {
        await financialServices.fundSavingsGoal(fundGoalId, rawNumber);
        Alert.alert("Thành công 🎉", `Đã nạp ${rawNumber.toLocaleString("vi-VN")} ₫ vào mục tiêu "${fundGoalName}"!`);
      } else {
        await financialServices.withdrawSavingsGoal(fundGoalId, rawNumber);
        Alert.alert("Thành công", `Đã rút ${rawNumber.toLocaleString("vi-VN")} ₫ từ mục tiêu "${fundGoalName}"!`);
      }
      setFundModalVisible(false);
      refreshGoals();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Thao tác thất bại");
    } finally {
      setFundLoading(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const amount = goal?.currentAmount || 0;
    const otherGoals = goals.filter((g) => g.id !== goalId && (g.currentAmount || 0) < (g.targetAmount || 0));

    const message =
      amount > 0
        ? otherGoals.length > 0
          ? `Bạn có chắc muốn xóa mục tiêu "${goal?.name}"?\n\nSố tiền đã tích lũy (${formatVND(amount)}) vẫn nằm trong tài khoản tiết kiệm và sẽ được tự động phân bổ lại vào ${otherGoals.length} mục tiêu tiết kiệm khác!`
          : `Bạn có chắc muốn xóa mục tiêu "${goal?.name}"?\n\nSố tiền đã tích lũy (${formatVND(amount)}) sẽ được thu hồi về ví chính do bạn không còn mục tiêu tiết kiệm nào khác.`
        : `Bạn có chắc muốn xóa mục tiêu "${goal?.name}"?`;

    Alert.alert(
      "Xác nhận xóa mục tiêu 🗑️",
      message,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await financialServices.deleteSavingsGoal(goalId);
              Alert.alert(
                "Đã xóa thành công 🎉",
                amount > 0 && otherGoals.length > 0
                  ? `Mục tiêu đã được xóa. Số tiền ${formatVND(amount)} đã được tự động tái phân bổ vào các mục tiêu tiết kiệm khác trong tài khoản tiết kiệm của bạn!`
                  : "Mục tiêu tiết kiệm đã được xóa thành công."
              );
              refreshGoals();
              refreshApp();
            } catch (e: any) {
              Alert.alert("Lỗi", e.response?.data?.message || "Không thể xóa mục tiêu");
            }
          },
        },
      ]
    );
  };

  const handleCreateGoal = async () => {
    const rawTarget = parseFloat(targetAmount.replace(/\D/g, "")) || 0;
    const rawMonthly = parseFloat(monthlyContribution.replace(/\D/g, "")) || 0;

    if (!goalName.trim() || rawTarget <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập tên và số tiền mục tiêu hợp lệ");
      return;
    }

    setCreateLoading(true);
    try {
      await financialServices.createSavingsGoal({
        name: goalName.trim(),
        targetAmount: rawTarget,
        targetDate: targetDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        priority,
        monthlyContribution: rawMonthly,
      });
      Alert.alert("Thành công 🎉", `Đã tạo mục tiêu tiết kiệm "${goalName.trim()}"!`);
      setGoalName("");
      setTargetAmount("");
      setTargetDate("");
      setPriority("MEDIUM");
      setMonthlyContribution("");
      setCreateVisible(false);
      refreshGoals();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể tạo mục tiêu");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAmountFormat = (text: string, setter: (v: string) => void) => {
    const raw = text.replace(/\D/g, "");
    setter(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
  };

  const formatVND = (num: number) => (num ?? 0).toLocaleString("vi-VN") + " ₫";

  // Tổng tiền trong tài khoản tiết kiệm (tích lũy tất cả mục tiêu)
  const totalSavingsBalance = goals.reduce((acc, g) => acc + (g.currentAmount || 0), 0);
  const totalTargetAmount = goals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);
  const overallSavingsProgress = totalTargetAmount > 0 ? Math.min(100, Math.round((totalSavingsBalance / totalTargetAmount) * 100)) : 0;

  if (appLoading && goals.length === 0) {
    return <SavingsSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : "#e8f5f1" }]}>
      {/* ─── STICKY HEADER ─── */}
      <View style={[styles.headerBar, { backgroundColor: isDark ? themeColors.headerBg : "rgba(232, 245, 241, 0.95)", paddingTop: safeTopPadding }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? themeColors.surface : colors.white }]}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text style={[styles.backArrow, { color: themeColors.textPrimary }]}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Tiết kiệm</Text>
            <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>Quản lý quỹ & mục tiêu tiết kiệm</Text>
          </View>

          <TouchableOpacity style={styles.createBtnHeader} onPress={() => setCreateVisible(true)}>
            <Text style={styles.createBtnHeaderText}>+ Tạo mới</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={appLoading}
            onRefresh={() => {
              refreshApp();
              refreshGoals();
            }}
            colors={[colors.indigo600]}
          />
        }
      >
        {/* ─── TỔNG TIỀN TRONG TÀI KHOẢN TIẾT KIỆM HERO CARD ─── */}
        <Card style={styles.heroSavingsCard}>
          <View style={styles.heroSavingsHeaderRow}>
            <View style={styles.heroSavingsIconBox}>
              <Text style={{ fontSize: 24 }}>🏦</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroSavingsLabel}>TỔNG TIỀN TRONG TÀI KHOẢN TIẾT KIỆM</Text>
              <Text style={styles.heroSavingsSub}>
                {targetSavingsAccNo ? `STK: ${targetSavingsAccNo} • Quỹ tích lũy ngân hàng` : "Quỹ tích lũy các mục tiêu"}
              </Text>
            </View>
          </View>

          <Text style={styles.heroSavingsAmount}>{formatVND(totalSavingsBalance)}</Text>

          {/* Mini 3-Stat Grid */}
          <View style={styles.heroSavingsStatsGrid}>
            <View style={styles.heroSavingsStatCol}>
              <Text style={styles.heroSavingsStatLabel}>MỤC TIÊU</Text>
              <Text style={styles.heroSavingsStatVal}>{goals.length} mục tiêu</Text>
            </View>
            <View style={styles.heroSavingsStatDivider} />
            <View style={styles.heroSavingsStatCol}>
              <Text style={styles.heroSavingsStatLabel}>TỔNG ĐÍCH ĐẾN</Text>
              <Text style={styles.heroSavingsStatVal}>{formatVND(totalTargetAmount)}</Text>
            </View>
            <View style={styles.heroSavingsStatDivider} />
            <View style={styles.heroSavingsStatCol}>
              <Text style={styles.heroSavingsStatLabel}>TIẾN ĐỘ</Text>
              <Text style={[styles.heroSavingsStatVal, { color: colors.emerald600 }]}>{overallSavingsProgress}%</Text>
            </View>
          </View>
        </Card>

        {/* Safety Reserve Floor Banner / New User Onboarding */}
        {totalWalletBalance <= 0 && goals.length === 0 ? (
          <Card style={styles.onboardingCard}>
            <View style={styles.onboardingHeader}>
              <View style={styles.onboardingIconBox}>
                <Text style={{ fontSize: 22 }}>🌱</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.onboardingTitle}>Bắt đầu tích lũy thông minh</Text>
                <Text style={styles.onboardingSub}>Khởi tạo mục tiêu & quản lý quỹ tiết kiệm</Text>
              </View>
            </View>
            <Text style={styles.onboardingDesc}>
              Tạo mục tiêu tiết kiệm đầu tiên và nạp tiền vào ví để kích hoạt thuật toán Điểm Dừng An Toàn & Tự động phân bổ dòng tiền.
            </Text>
            <Button
              title="+ Tạo Mục Tiêu Đầu Tiên"
              variant="primary"
              onPress={() => setCreateVisible(true)}
              style={{ marginTop: 8 }}
            />
          </Card>
        ) : (
          <Card style={[styles.reserveCard, (totalWalletBalance > 0 && safeToSpend <= 0) ? styles.warningCard : styles.safeCard]}>
            <View style={styles.reserveHeader}>
              <Text style={styles.reserveTitle}>
                {hasAllocatedThisMonth
                  ? "🛡️ ĐIỂM DÙNG AN TOÀN (ĐÃ PHÂN BỔ THÁNG NÀY)"
                  : totalWalletBalance > 0 && safeToSpend <= 0
                  ? "⚠️ CẢNH BÁO ĐIỂM DỪNG AN TOÀN"
                  : "🛡️ ĐIỂM DÙNG AN TOÀN (SAFETY RESERVE)"}
              </Text>
            </View>
            <Text style={styles.reserveDescription}>
              {hasAllocatedThisMonth
                ? `Bạn đã hoàn thành phân bổ tiết kiệm cho Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()} (Quy định 1 lần/tháng để duy trì dòng tiền ổn định). Lượt tiếp theo sẽ mở vào ngày 01 tháng sau.`
                : totalWalletBalance <= 0
                ? "Số dư ví hiện tại là 0 ₫. Vui lòng nạp tiền vào ví để kích hoạt tính năng phân bổ tự động an toàn."
                : "Số tiền tối thiểu cần giữ lại để đáp ứng 100% ngân sách sinh hoạt & các khoản nợ cần thanh toán tháng này."}
            </Text>

            <View style={styles.reserveDetailsGrid}>
              <View style={styles.reserveCol}>
                <Text style={styles.reserveLabel}>Yêu cầu dự trữ:</Text>
                <Text style={[styles.reserveVal, { color: colors.rose600 }]}>{formatVND(requiredReserve)}</Text>
              </View>
              <View style={styles.reserveCol}>
                <Text style={styles.reserveLabel}>Dư an toàn có thể gửi:</Text>
                <Text style={[styles.reserveVal, { color: (totalWalletBalance > 0 && safeToSpend <= 0) ? colors.rose600 : colors.emerald600 }]}>
                  {formatVND(safeToSpend)}
                </Text>
              </View>
            </View>

            <Button
              title={
                hasAllocatedThisMonth
                  ? `✓ Đã Gửi Tiết Kiệm Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`
                  : totalWalletBalance <= 0
                  ? "Chưa Có Số Dư Để Phân Bổ"
                  : safeToSpend <= 0
                  ? "⚠️ Số Dư Ví Không Đủ Để Trích Gửi"
                  : "🌱 Gửi Tiết Kiệm Ngay"
              }
              variant={hasAllocatedThisMonth ? "secondary" : (totalWalletBalance <= 0 || safeToSpend <= 0 ? "secondary" : "emerald")}
              onPress={handleOpenAutoAllocateQr}
              disabled={hasAllocatedThisMonth || totalWalletBalance <= 0 || safeToSpend <= 0}
              loading={isAllocating}
              style={styles.autoBtn}
            />
          </Card>
        )}

        {/* Goals List */}
        <Text style={styles.sectionTitle}>Mục tiêu tiết kiệm cá nhân</Text>

        {goals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🌱</Text>
            <Text style={styles.emptyTitle}>Chưa có mục tiêu tiết kiệm nào</Text>
            <Text style={styles.emptySub}>Bấm "+ Tạo mới" để bắt đầu tích lũy!</Text>
            <Button
              title="+ Tạo Mục Tiêu Đầu Tiên"
              variant="primary"
              onPress={() => setCreateVisible(true)}
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : (
          goals.map((g) => (
            <View key={g.id}>
              <SavingsGoalCard goal={g} onDeposit={(id) => openFundModal(id, "fund")} />
              {/* Action buttons below each card */}
              <View style={styles.goalActionRow}>
                <TouchableOpacity
                  style={styles.goalActionBtn}
                  onPress={() => openFundModal(g.id, "fund")}
                >
                  <Text style={styles.goalActionBtnText}>💰 Nạp tiền</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.goalActionBtn, { backgroundColor: colors.amber50, borderColor: colors.amber200 }]}
                  onPress={() => openFundModal(g.id, "withdraw")}
                >
                  <Text style={[styles.goalActionBtnText, { color: colors.amber700 }]}>📤 Rút tiền</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.goalActionBtn, { backgroundColor: colors.rose50, borderColor: colors.rose200 }]}
                  onPress={() => handleDeleteGoal(g.id)}
                >
                  <Text style={[styles.goalActionBtnText, { color: colors.rose600 }]}>🗑️ Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── CREATE SAVINGS GOAL BOTTOM SHEET ─── */}
      <BottomSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="Tạo Mục Tiêu Tiết Kiệm 🌱"
      >
        <View style={{ paddingTop: 4 }}>
          <Input
            label="Tên mục tiêu (*)"
            placeholder="VD: Mua laptop mới, Du lịch Nhật Bản..."
            value={goalName}
            onChangeText={setGoalName}
          />
          <Input
            label="Số tiền mục tiêu (VND) (*)"
            placeholder="VD: 10.000.000"
            keyboardType="numeric"
            value={targetAmount}
            onChangeText={(t) => handleAmountFormat(t, setTargetAmount)}
          />
          <Input
            label="Đóng góp hàng tháng (VND)"
            placeholder="VD: 1.000.000"
            keyboardType="numeric"
            value={monthlyContribution}
            onChangeText={(t) => handleAmountFormat(t, setMonthlyContribution)}
          />

          {/* Priority Selector */}
          <Text style={styles.fieldLabel}>Mức ưu tiên</Text>
          <View style={styles.priorityRow}>
            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as SavingsPriority[]).map((p) => {
              const labels: Record<SavingsPriority, string> = {
                URGENT: "🔥 Khẩn",
                HIGH: "⬆️ Cao",
                MEDIUM: "➡️ TB",
                LOW: "⬇️ Thấp",
              };
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.priorityPill, priority === p && styles.priorityPillActive]}
                >
                  <Text style={[styles.priorityPillText, priority === p && styles.priorityPillTextActive]}>
                    {labels[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.modalBtnRow}>
            <Button
              title="Hủy"
              variant="secondary"
              onPress={() => setCreateVisible(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={createLoading ? "Đang lưu..." : "🌱 Tạo Mục Tiêu"}
              variant="primary"
              onPress={handleCreateGoal}
              loading={createLoading}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </BottomSheet>

      {/* ─── FUND / WITHDRAW BOTTOM SHEET ─── */}
      <BottomSheet
        visible={fundModalVisible}
        onClose={() => setFundModalVisible(false)}
        title={fundMode === "fund" ? `Nạp tiền vào "${fundGoalName}"` : `Rút tiền từ "${fundGoalName}"`}
      >
        <View style={{ paddingTop: 4 }}>
          <Input
            label={fundMode === "fund" ? "Số tiền muốn nạp (VND) *" : "Số tiền muốn rút (VND) *"}
            placeholder="VD: 500.000"
            keyboardType="numeric"
            value={fundAmount}
            onChangeText={(t) => handleAmountFormat(t, setFundAmount)}
          />

          <View style={styles.modalBtnRow}>
            <Button
              title="Hủy"
              variant="secondary"
              onPress={() => setFundModalVisible(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={fundLoading ? "Đang xử lý..." : fundMode === "fund" ? "💰 Nạp tiền" : "📤 Rút tiền"}
              variant={fundMode === "fund" ? "primary" : "amber"}
              onPress={handleFundSubmit}
              loading={fundLoading}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </BottomSheet>

      {/* ─── ALLOCATE VIETQR BOTTOM SHEET (Ví Tiết Kiệm) ─── */}
      <BottomSheet
        visible={allocateQrModalVisible}
        onClose={() => setAllocateQrModalVisible(false)}
        title="Quét Mã Nạp Ví Tiết Kiệm 🏦"
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}>
          <Text style={{ fontSize: 13, color: colors.slate600, marginBottom: 14, lineHeight: 19 }}>
            Quét mã VietQR chuyển số dư an toàn <Text style={{ fontWeight: "900", color: colors.amber700 }}>{formatVND(safeToSpend)}</Text> vào <Text style={{ fontWeight: "800", color: colors.slate800 }}>Ví Tiết Kiệm</Text> để hoàn tất trích gửi tích lũy:
          </Text>

          <VietQRCard
            bankBin={targetSavingsBin || "970407"}
            accountNo={targetSavingsAccNo || ""}
            accountName={targetSavingsAccName || "VI TIET KIEM"}
            amount={safeToSpend}
            description={`Nap quy tiet kiem T${new Date().getMonth() + 1}`}
          />

          <View style={{ marginTop: 20, gap: 10 }}>
            <Button
              title="✓ Tôi Đã Chuyển Khoản — Hoàn Tất Phân Bổ"
              variant="amber"
              onPress={handleConfirmAllocation}
              loading={isAllocating}
            />
            <Button
              title="Đóng"
              variant="secondary"
              onPress={() => setAllocateQrModalVisible(false)}
            />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  headerBar: {
    backgroundColor: colors.white,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 8 : 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.slate800,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
  },
  headerSub: {
    fontSize: 11,
    color: colors.slate500,
    fontWeight: "500",
  },
  createBtnHeader: {
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  createBtnHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.emerald600,
  },
  scrollContent: {
    padding: 20,
  },
  heroSavingsCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroSavingsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  heroSavingsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  heroSavingsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate500,
    letterSpacing: 0.6,
  },
  heroSavingsSub: {
    fontSize: 12,
    color: colors.slate600,
    fontWeight: "500",
    marginTop: 2,
  },
  heroSavingsAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.emerald600,
    marginVertical: 10,
  },
  heroSavingsStatsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  heroSavingsStatCol: {
    flex: 1,
    alignItems: "center",
  },
  heroSavingsStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#E2E8F0",
  },
  heroSavingsStatLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.slate400,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  heroSavingsStatVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.slate800,
  },
  reserveCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  onboardingCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
  },
  onboardingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  onboardingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
  },
  onboardingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
  },
  onboardingSub: {
    fontSize: 12,
    color: "#15803d",
    marginTop: 2,
  },
  onboardingDesc: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    marginBottom: 14,
  },
  safeCard: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber100,
  },
  warningCard: {
    backgroundColor: colors.rose50,
    borderColor: colors.rose100,
  },
  reserveHeader: {
    marginBottom: 6,
  },
  reserveTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  reserveDescription: {
    fontSize: 12,
    color: colors.slate600,
    lineHeight: 18,
    marginBottom: 16,
  },
  reserveDetailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  reserveCol: {
    flex: 1,
  },
  reserveLabel: {
    fontSize: 11,
    color: colors.slate500,
    marginBottom: 4,
  },
  reserveVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  autoBtn: {
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 14,
  },
  emptyCard: {
    alignItems: "center",
    padding: 28,
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
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
  },
  goalActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  goalActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    alignItems: "center",
  },
  goalActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.emerald700,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate700,
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
  },
  priorityPillActive: {
    backgroundColor: colors.indigo600,
    borderColor: colors.indigo600,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate600,
  },
  priorityPillTextActive: {
    color: colors.white,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
});
