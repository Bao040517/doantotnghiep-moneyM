import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
  LayoutAnimation,
  UIManager,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Star, X } from "lucide-react-native";
import { Toast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { BottomSheet } from "../components/ui/BottomSheet";
import { colors } from "../constants/colors";
import { financialServices } from "../services/financialServices";
import { BudgetSummary } from "../types";
import { api } from "../services/api";
import { PaymentSandboxModal } from "../components/modals/PaymentSandboxModal";

export const BudgetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const targetBudgetId = route.params?.targetBudgetId;

  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedBudgetId, setFocusedBudgetId] = useState<string | null>(null);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const itemPositions = React.useRef<{ [key: string]: number }>({});

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Confirmation Modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingToggleBudget, setPendingToggleBudget] = useState<{
    id: string;
    isMandatory: boolean;
    name: string;
  } | null>(null);

  // Payment Sandbox Modal state
  const [sandboxVisible, setSandboxVisible] = useState(false);
  const [sandboxDebtInfo, setSandboxDebtInfo] = useState<{
    amount: number;
    toName: string;
    toBankBin?: string;
    toAccountNo?: string;
    toUserId?: string;
    groupName?: string;
    budgetId?: string;
    categoryId?: string;
  } | null>(null);

  // Create Budget Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchBudgets = async () => {
    try {
      const data = await financialServices.getBudgetSummary(year, month);
      setBudgets(data || []);
    } catch (err) {
      console.log("Error fetching budgets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    if (targetBudgetId && budgets.length > 0) {
      const match = budgets.find(
        (b) =>
          b.budgetId === targetBudgetId ||
          b.categoryId === targetBudgetId ||
          (b.categoryName && b.categoryName.toLowerCase().includes(String(targetBudgetId).toLowerCase())) ||
          (b.name && b.name.toLowerCase().includes(String(targetBudgetId).toLowerCase()))
      );

      if (match) {
        setFocusedBudgetId(match.budgetId);
        setTimeout(() => {
          const yPos = itemPositions.current[match.budgetId] ?? itemPositions.current[match.categoryId];
          if (yPos !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, yPos - 60), animated: true });
          }
        }, 350);

        const timer = setTimeout(() => setFocusedBudgetId(null), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [targetBudgetId, budgets]);

  const confirmToggleMandatory = async (id: string, isUpgrading: boolean) => {
    // Enable smooth LayoutAnimation for instant re-ordering without stutter
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Instant local state update
    setBudgets((prev) =>
      prev.map((b) => {
        const bId = b.budgetId || (b as any).id || b.categoryId;
        if (bId === id || b.budgetId === id || b.categoryId === id) {
          const currentFlag = b.isMandatory || (b as any).mandatory || false;
          return { ...b, isMandatory: !currentFlag, mandatory: !currentFlag };
        }
        return b;
      })
    );

    try {
      await financialServices.toggleMandatoryBudget(id);
      if (isUpgrading) {
        showToast("Đã nâng cấp lên ngân sách ưu tiên! ⭐", "success");
      } else {
        showToast("Đã chuyển về ngân sách thông thường!", "info");
      }
    } catch (err) {
      showToast("Không thể cập nhật mức ưu tiên", "error");
      fetchBudgets(); // Revert back if network error occurs
    }
  };

  const handleToggleMandatory = (b: BudgetSummary) => {
    const bId = b.budgetId || (b as any).id || b.categoryId;
    if (!bId) return;

    const currentFlag = b.isMandatory || (b as any).mandatory || false;
    setPendingToggleBudget({
      id: bId,
      isMandatory: currentFlag,
      name: b.name || b.categoryName || "Khoản ngân sách",
    });
    setConfirmModalVisible(true);
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await financialServices.deleteBudget(id);
      showToast("Đã xóa khoản ngân sách thành công!", "success");
      fetchBudgets();
    } catch (err) {
      showToast("Không thể xóa khoản ngân sách này", "error");
    }
  };

  const handleQuickPay = (b: BudgetSummary) => {
    const remaining = Math.max(0, b.limitAmount - b.spentAmount);
    if (remaining <= 0) return;

    setSandboxDebtInfo({
      amount: remaining,
      toName: b.payeeAccountName || b.name || b.categoryName,
      toBankBin: b.payeeBankBin || "970422",
      toAccountNo: b.payeeBankAccount || "10908888999",
      groupName: b.name || b.categoryName,
      budgetId: b.budgetId,
      categoryId: b.categoryId,
    });
    setSandboxVisible(true);
  };

  const handleSandboxPaymentSuccess = async (amount: number) => {
    if (!sandboxDebtInfo) return;

    try {
      const walletRes = await financialServices.getWallets();
      const availableWallets = (walletRes || []).filter((w) => !w.isLiability);
      const targetWallet = availableWallets.length > 0 ? availableWallets[0] : (walletRes || [])[0];

      if (!targetWallet) {
        showToast("Vui lòng tạo ví tiền trước khi thanh toán", "error");
        return;
      }

      await api.post(`/transactions/${targetWallet.id}`, {
        amount: amount,
        categoryId: sandboxDebtInfo.categoryId,
        note: sandboxDebtInfo.groupName,
        linkedBudgetId: sandboxDebtInfo.budgetId,
      });

      showToast(`Đã chuyển tiền Sandbox thành công cho ${sandboxDebtInfo.groupName}! 🎉`, "success");
      fetchBudgets();
    } catch (err) {
      showToast("Lỗi khi ghi nhận giao dịch thanh toán", "error");
    }
  };

  const handleCreateBudget = async () => {
    const rawNumber = parseFloat(limitAmount.replace(/\D/g, ""));
    if (!rawNumber || rawNumber <= 0) {
      showToast("Vui lòng nhập số tiền hạn mức hợp lệ", "error");
      return;
    }

    setSubmitting(true);
    try {
      await financialServices.createBudget({
        name: budgetName.trim() || "Ngân sách chi tiêu",
        limitAmount: rawNumber,
        year,
        month,
        mandatory: isMandatory,
        type: "BILL",
      });

      showToast("Đã tạo ngân sách chi tiêu mới! 🎉", "success");
      setBudgetName("");
      setLimitAmount("");
      setIsMandatory(false);
      setModalVisible(false);
      fetchBudgets();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể tạo ngân sách", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n?: number) => new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0));

  const sortedBudgets = React.useMemo(() => {
    return [...budgets].sort((a, b) => {
      const aMandatory = a.isMandatory || (a as any).mandatory ? 1 : 0;
      const bMandatory = b.isMandatory || (b as any).mandatory ? 1 : 0;
      if (aMandatory !== bMandatory) {
        return bMandatory - aMandatory; // Ưu tiên (1) đứng trên, bỏ ưu tiên (0) xuống dưới
      }
      return 0;
    });
  }, [budgets]);

  const totalLimit = budgets.reduce((sum, b) => sum + (b.limitAmount || 0), 0);

  return (
    <View style={styles.container}>
      {/* ─── STICKY HEADER ─── */}
      <View style={styles.headerBar}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Dashboard")}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Quản lý Ngân sách</Text>
            <Text style={styles.headerSub}>Đặt hạn mức chi tiêu hàng tháng</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBudgets(); }} colors={[colors.emerald600]} />}
      >
        {/* ─── SUB HEADER ROW ─── */}
        <View style={styles.subHeaderRow}>
          <View>
            <Text style={styles.subHeaderTitle}>Ngân sách chi tiêu</Text>
            <Text style={styles.subHeaderSub}>Đặt hạn mức để không tiêu lố tay</Text>
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.createBtnText}>+ Tạo thêm</Text>
          </TouchableOpacity>
        </View>

        {/* ─── SUMMARY CARD ─── */}
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Tổng ngân sách tháng</Text>
            <Text style={styles.summaryValue}>
              {fmt(totalLimit)} <Text style={styles.summaryCurrency}>đ</Text>
            </Text>
          </View>
          <View style={styles.summaryIconBg}>
            <Text style={{ fontSize: 24 }}>🧾</Text>
          </View>
        </View>

        {/* ─── BUDGET LIST ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.emerald600} />
            <Text style={styles.loadingText}>Đang tải danh sách ngân sách...</Text>
          </View>
        ) : sortedBudgets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🎯</Text>
            <Text style={styles.emptyTitle}>Chưa có khoản chi nào</Text>
            <Text style={styles.emptySub}>Đặt giới hạn chi tiêu để kiểm soát tài chính hiệu quả!</Text>
            <Button
              title="+ Tạo Ngân Sách Đầu Tiên"
              variant="primary"
              onPress={() => setModalVisible(true)}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          sortedBudgets.map((b) => {
            const isPaid = b.spentAmount >= b.limitAmount;
            const remaining = Math.max(0, b.limitAmount - b.spentAmount);
            const pct = b.limitAmount > 0 ? Math.min(100, Math.round((b.spentAmount / b.limitAmount) * 100)) : 0;
            const isMandatoryFlag = b.isMandatory || (b as any).mandatory;
            const isFocused = focusedBudgetId === b.budgetId;

            let badgeText = "Đã đủ tiền trả";
            let badgeStyle = styles.badgeGreen;

            if (b.spentAmount > b.limitAmount) {
              badgeText = `Vượt ${fmt(b.spentAmount - b.limitAmount)}đ`;
              badgeStyle = styles.badgeRed;
            } else if (isPaid) {
              badgeText = "Đã thanh toán";
              badgeStyle = styles.badgeGreen;
            } else if (pct >= 80) {
              badgeText = `Còn ${fmt(remaining)}đ`;
              badgeStyle = styles.badgeAmber;
            }

            return (
              <View
                key={b.budgetId}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  itemPositions.current[b.budgetId] = y;
                  if (b.categoryId) itemPositions.current[b.categoryId] = y;
                }}
                style={[
                  styles.budgetCard,
                  isMandatoryFlag ? styles.budgetCardMandatory : styles.budgetCardUnstar,
                  isFocused && styles.budgetCardFocused,
                ]}
              >
                {/* Top Row: Icon, Title, Actions */}
                <View style={styles.cardTopRow}>
                  <View style={styles.catIconBg}>
                    <Text style={{ fontSize: 24 }}>{b.categoryIcon || "💵"}</Text>
                  </View>

                  <View style={styles.cardTitleBox}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {b.name || b.categoryName}
                    </Text>
                    <Text style={styles.cardSubText}>
                      Hạn ngạch: {fmt(b.limitAmount)}đ
                    </Text>
                  </View>

                  <View style={styles.cardActionRow}>
                    {isMandatoryFlag && (
                      <View style={styles.priorityTag}>
                        <Text style={styles.priorityTagText}>ƯU TIÊN</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleToggleMandatory(b)}
                      style={styles.actionIconBtn}
                    >
                      {isMandatoryFlag ? (
                        <Star size={20} color="#f59e0b" fill="#f59e0b" />
                      ) : (
                        <Star size={20} color="#94a3b8" fill="none" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteBudget(b.budgetId || b.categoryId)}
                      style={styles.actionIconBtn}
                    >
                      <X size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Amount Details */}
                <View style={styles.cardAmountRow}>
                  <View>
                    <Text style={styles.limitMainText}>{fmt(b.limitAmount)}đ</Text>
                    <Text style={styles.spentSubText}>
                      Đã chi: <Text style={{ fontWeight: "800", color: colors.slate800 }}>{fmt(b.spentAmount)}đ</Text>
                    </Text>
                  </View>

                  <View style={styles.cardRightBadgeRow}>
                    <View style={[styles.statusBadge, badgeStyle]}>
                      <Text style={styles.statusBadgeText}>{badgeText}</Text>
                    </View>

                    {!isPaid && (
                      <TouchableOpacity
                        onPress={() => handleQuickPay(b)}
                        style={styles.payBtn}
                      >
                        <Text style={styles.payBtnText}>✓ Trả ngay</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor:
                          pct >= 100 ? colors.rose500 : pct >= 80 ? colors.amber500 : colors.emerald500,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── CREATE BUDGET BOTTOM SHEET ─── */}
      <BottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Đặt Ngân Sách Chi Tiêu 🎯"
      >
        <View style={styles.formBox}>
          {/* Budget Name Input with Pencil Icon */}
          <View style={styles.inputCard}>
            <Text style={styles.inputIcon}>✏️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputCardLabel}>Tên khoản chi (*)</Text>
              <Input
                placeholder="VD: Ngân sách Tiền điện, Tiền nhà..."
                value={budgetName}
                onChangeText={setBudgetName}
                style={styles.borderlessInput}
              />
            </View>
          </View>

          {/* Amount Input with Coin Icon */}
          <View style={styles.inputCard}>
            <Text style={styles.inputIcon}>🪙</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputCardLabel}>Số tiền hạn mức (VND) (*)</Text>
              <Input
                placeholder="VD: 2.000.000"
                keyboardType="numeric"
                value={limitAmount}
                onChangeText={(text) => {
                  const raw = text.replace(/\D/g, "");
                  setLimitAmount(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
                }}
                style={styles.borderlessInput}
              />
            </View>
          </View>

          {/* Toggles */}
          <TouchableOpacity
            onPress={() => setIsMandatory(!isMandatory)}
            style={[styles.toggleBox, isMandatory && styles.toggleBoxActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>⭐ Ưu tiên thanh toán (Bắt buộc)</Text>
              <Text style={styles.toggleSub}>Hệ thống sẽ ưu tiên trích tiền từ ví cho khoản này trước.</Text>
            </View>
            <View style={[styles.switchTrack, isMandatory && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, isMandatory && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          <View style={styles.modalBtnRow}>
            <Button
              title="Hủy"
              variant="secondary"
              onPress={() => setModalVisible(false)}
              style={styles.cancelBtn}
            />
            <Button
              title={submitting ? "Đang lưu..." : "🎯 Lưu Ngân Sách"}
              variant="primary"
              onPress={handleCreateBudget}
              loading={submitting}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </BottomSheet>

      {/* ─── CUSTOM DUAL-THEME CONFIRMATION POPUP MODAL ─── */}
      {(() => {
        const isUpgrading = pendingToggleBudget ? !pendingToggleBudget.isMandatory : true;
        return (
          <Modal
            visible={confirmModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setConfirmModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setConfirmModalVisible(false)}
            >
              <TouchableOpacity
                style={[
                  styles.confirmPopupCard,
                  {
                    borderColor: isUpgrading ? "#f59e0b" : "#475569",
                    shadowColor: isUpgrading ? "#f59e0b" : "#475569",
                  },
                ]}
                activeOpacity={1}
              >
                {/* Header Star Badge Icon */}
                <View
                  style={[
                    styles.confirmIconBg,
                    {
                      backgroundColor: isUpgrading ? "#fef3c7" : "#f1f5f9",
                      borderColor: isUpgrading ? "#fde68a" : "#cbd5e1",
                    },
                  ]}
                >
                  {isUpgrading ? (
                    <Star size={32} color="#f59e0b" fill="#f59e0b" />
                  ) : (
                    <Star size={32} color="#475569" fill="none" />
                  )}
                </View>

                {/* Title & Description */}
                <Text style={styles.confirmPopupTitle}>
                  {isUpgrading ? "Nâng Cấp Ngân Sách Ưu Tiên ⭐" : "Bỏ Ngân Sách Ưu Tiên 📉"}
                </Text>
                <Text style={styles.confirmPopupSub}>
                  {isUpgrading
                    ? `Bạn có chắc muốn nâng "${pendingToggleBudget?.name}" thành khoản BẮT BUỘC? Khoản này sẽ được đẩy lên đầu và ưu tiên trích tiền thanh toán.`
                    : `Bạn có chắc muốn đưa "${pendingToggleBudget?.name}" về khoản CHI THƯỜNG? Khoản này sẽ chuyển xuống dưới danh sách.`}
                </Text>

                {/* Action Buttons Row */}
                <View style={styles.confirmPopupBtnRow}>
                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={() => setConfirmModalVisible(false)}
                  >
                    <Text style={styles.confirmCancelBtnText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmOkBtn,
                      {
                        backgroundColor: isUpgrading ? "#f59e0b" : "#475569",
                        shadowColor: isUpgrading ? "#f59e0b" : "#475569",
                      },
                    ]}
                    onPress={() => {
                      setConfirmModalVisible(false);
                      if (pendingToggleBudget) {
                        confirmToggleMandatory(pendingToggleBudget.id, isUpgrading);
                        setPendingToggleBudget(null);
                      }
                    }}
                  >
                    <Text style={styles.confirmOkBtnText}>
                      {isUpgrading ? "✓ Nâng ưu tiên" : "✓ Bỏ ưu tiên"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      {/* ─── COMMERCIAL PAYMENT SANDBOX MODAL ─── */}
      <PaymentSandboxModal
        visible={sandboxVisible}
        debtInfo={sandboxDebtInfo}
        onClose={() => {
          setSandboxVisible(false);
          setSandboxDebtInfo(null);
        }}
        onPaymentSuccess={handleSandboxPaymentSuccess}
      />

      {/* ─── TOAST NOTIFICATION ─── */}
      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f5f1",
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 14,
    backgroundColor: "rgba(232, 245, 241, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
  },
  headerSub: {
    fontSize: 11,
    color: colors.slate500,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
  },
  subHeaderSub: {
    fontSize: 12,
    color: colors.slate500,
  },
  createBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.emerald600,
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.emerald800,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.emerald950,
  },
  summaryCurrency: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.emerald700,
  },
  summaryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "center",
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
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
  },
  emptySub: {
    fontSize: 12,
    color: colors.slate500,
    textAlign: "center",
    marginTop: 4,
  },
  budgetCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  budgetCardMandatory: {
    borderColor: "#f59e0b",
    borderWidth: 2,
    backgroundColor: colors.white,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  budgetCardUnstar: {
    borderColor: "#e2e8f0",
    borderWidth: 1,
    backgroundColor: "#fafafa",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  budgetCardFocused: {
    borderColor: colors.rose600,
    borderWidth: 2,
    backgroundColor: "#FFF1F2",
    shadowColor: colors.rose600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  catIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
    flexShrink: 1,
  },
  priorityTag: {
    backgroundColor: colors.amber100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginRight: 2,
  },
  priorityTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.amber700,
    letterSpacing: 0.3,
  },
  cardSubText: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  limitMainText: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.slate900,
  },
  spentSubText: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  cardRightBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
  },
  badgeAmber: {
    backgroundColor: "#fef3c7",
  },
  badgeRed: {
    backgroundColor: "#ffe4e6",
  },
  payBtn: {
    backgroundColor: colors.emerald600,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.slate100,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  formBox: {
    paddingTop: 8,
    gap: 14,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0faf8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#66c2b1",
  },
  inputIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  inputCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f4d44",
    marginBottom: -4,
  },
  borderlessInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900,
  },
  toggleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  toggleBoxActive: {
    backgroundColor: "#f0faf8",
    borderColor: "#66c2b1",
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 15,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.slate200,
    padding: 2,
    justifyContent: "center",
  },
  switchTrackActive: {
    backgroundColor: "#66c2b1",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 1.5,
    backgroundColor: "#10b981",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmPopupCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f59e0b",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmPopupTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    textAlign: "center",
  },
  confirmPopupSub: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  confirmPopupBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate600,
  },
  confirmOkBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmOkBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.white,
  },
  payConfirmDetailCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    marginTop: 4,
  },
  payDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payDetailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
  },
  payDetailValueBold: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate800,
    maxWidth: "60%",
  },
  payDetailAmountText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
  },
  payDetailWalletText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.indigo600,
  },
  payDetailDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
});
