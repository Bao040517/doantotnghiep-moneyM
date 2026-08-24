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
  TextInput,
  Pressable,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Star, X } from "lucide-react-native";
import { Toast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { BottomSheet } from "../components/ui/BottomSheet";
import { colors } from "../constants/colors";
import { VIETQR_BANKS } from "../constants/banks";
import { useAuth } from "../hooks/useAuth";
import { financialServices, Category } from "../services/financialServices";
import { BudgetSummary } from "../types";
import { api } from "../services/api";
import { PaymentSandboxModal } from "../components/modals/PaymentSandboxModal";
import { BudgetTransactionsBottomSheet } from "../components/modals/BudgetTransactionsBottomSheet";
import { PayeeSelectorModal } from "../components/modals/PayeeSelectorModal";
import { Payee } from "../types/payee";
import { payeeService } from "../services/payeeService";
import { authService } from "../services/authService";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { VietnameseTextInput } from "../components/ui/VietnameseTextInput";
import { CATEGORY_ICONS, getCategoryEmoji } from "../constants/categories";

// The absolute core text input that NEVER re-renders to prevent ANY React Native interference with IME
const SearchInputCore = React.memo(
  React.forwardRef<TextInput, { onText: (val: string) => void }>((props, ref) => {
    return (
      <TextInput
        ref={ref}
        placeholder="Tìm kiếm ngân sách theo tên, danh mục..."
        placeholderTextColor={colors.slate400}
        onChangeText={props.onText}
        style={styles.searchInput}
      />
    );
  }),
  () => true // Never re-render, period.
);

// Memoized SearchBar
const MemoizedSearchBar = React.memo(({ onSearch }: { onSearch: (val: string) => void }) => {
  const [hasText, setHasText] = useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const handleText = React.useCallback((text: string) => {
    setHasText(text.length > 0);
    onSearch(text);
  }, [onSearch]);

  const handleClear = React.useCallback(() => {
    setHasText(false);
    onSearch("");
    inputRef.current?.clear();
  }, [onSearch]);

  return (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchIconBox}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
      </View>
      
      <SearchInputCore ref={inputRef} onText={handleText} />
      
      {hasText && (
        <TouchableOpacity onPress={handleClear} style={styles.searchClearBtn}>
          <Text style={{ fontSize: 13, color: colors.slate500, fontWeight: "800" }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export const BudgetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const targetBudgetId = route.params?.targetBudgetId;

  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [advisorSuggestions, setAdvisorSuggestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedBudgetId, setFocusedBudgetId] = useState<string | null>(null);

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const budgetNameInputRef = React.useRef<TextInput>(null);
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
    walletId?: string;
    prevSpentAmount?: number;
  } | null>(null);

  // Payee Selector Modal state (thay thế PayeeSetupModal cũ)
  const [payeeSelectorVisible, setPayeeSelectorVisible] = useState(false);
  const [pendingPayBudget, setPendingPayBudget] = useState<{
    budget: BudgetSummary;
    walletId: string;
    remaining: number;
  } | null>(null);

  // Budget Transactions Breakdown Sheet state
  const [selectedBudgetForDetail, setSelectedBudgetForDetail] = useState<BudgetSummary | null>(null);
  const [budgetTxSheetVisible, setBudgetTxSheetVisible] = useState(false);

  // Create Budget Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [payeeBankBin, setPayeeBankBin] = useState("970422");
  const [payeeBankAccount, setPayeeBankAccount] = useState("");
  const [payeeAccountName, setPayeeAccountName] = useState("");
  const [showPayeeSetup, setShowPayeeSetup] = useState(false);
  const [budgetBankPickerVisible, setBudgetBankPickerVisible] = useState(false);
  const [budgetSearchBank, setBudgetSearchBank] = useState("");
  const [budgetLookupLoading, setBudgetLookupLoading] = useState(false);
  const [budgetLookupVerified, setBudgetLookupVerified] = useState(false);

  // Debounce auto lookup account owner
  const handleBudgetAccountLookup = async (bin?: string, accNo?: string) => {
    const targetBin = bin || payeeBankBin || "970422";
    const targetAcc = (accNo !== undefined ? accNo : payeeBankAccount).trim();
    if (!targetBin || targetAcc.length < 6) return;

    setBudgetLookupLoading(true);
    try {
      const res = await authService.lookupBankAccount(targetBin, targetAcc);
      if (res.verified && res.accountName) {
        setPayeeAccountName(res.accountName);
        setBudgetLookupVerified(true);
      } else {
        setBudgetLookupVerified(false);
      }
    } catch {
      setBudgetLookupVerified(false);
    } finally {
      setBudgetLookupLoading(false);
    }
  };

  useEffect(() => {
    if (showPayeeSetup && payeeBankBin && payeeBankAccount.trim().length >= 6) {
      const timer = setTimeout(() => {
        handleBudgetAccountLookup(payeeBankBin, payeeBankAccount.trim());
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setBudgetLookupVerified(false);
    }
  }, [showPayeeSetup, payeeBankBin, payeeBankAccount]);

  useEffect(() => {
    if (!modalVisible) {
      setBudgetName("");
      setLimitAmount("");
      setPayeeBankBin("970422");
      setPayeeBankAccount("");
      setPayeeAccountName("");
      setShowPayeeSetup(false);
      setBudgetBankPickerVisible(false);
      setBudgetSearchBank("");
      setBudgetLookupVerified(false);
      budgetNameInputRef.current?.clear();
    }
  }, [modalVisible]);
  const [limitAmount, setLimitAmount] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [type, setType] = useState<"FLEXIBLE" | "BILL">("FLEXIBLE");
  const [submitting, setSubmitting] = useState(false);

  // Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

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
    setLoadingCategories(true);
    financialServices
      .getCategories()
      .then((data) => {
        setCategories(data || []);
        if (data && data.length > 0) {
          const expenses = data.filter(c => c.type === "EXPENSE");
          setSelectedCategoryId(expenses.length > 0 ? expenses[0].id : data[0].id);
        }
      })
      .catch((err) => console.log(err))
      .finally(() => setLoadingCategories(false));

    if (user?.id) {
      api
        .get(`/advisor/insights`)
        .then((res) => {
          if (res.data?.budgetPlan) {
            setAdvisorSuggestions(res.data.budgetPlan);
          }
        })
        .catch((err) => console.log("Advisor insights fetch in budget error:", err));
    }
  }, [user?.id]);

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
        const mKey = match.budgetId || match.categoryId;
        setFocusedBudgetId(mKey || null);
        setTimeout(() => {
          const yPos = mKey ? itemPositions.current[mKey] : undefined;
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

  const handleQuickPay = async (b: BudgetSummary) => {
    const remaining = Math.max(0, b.limitAmount - b.spentAmount);
    if (remaining <= 0) return;

    try {
      const walletRes = await financialServices.getWallets();
      const targetWallet = walletRes && walletRes.length > 0 ? walletRes[0] : null;
      if (!targetWallet) {
        showToast("Vui lòng tạo ví tiền trước khi thanh toán", "error");
        return;
      }

      // Cách 2 (Khuyên dùng): Luôn mở màn hình xác nhận người nhận trước khi quét QR
      // Người nhận gần nhất được ghim nổi bật ở đầu trang ➔ Bấm 1 chạm là chuyển đúng người, không bao giờ nhầm!
      setPendingPayBudget({ budget: b, walletId: targetWallet.id, remaining });
      setPayeeSelectorVisible(true);
    } catch (err) {
      showToast("Lỗi khi tải thông tin ví", "error");
    }
  };

  /**
   * Callback khi người dùng đã chọn hoặc tạo người nhận từ PayeeSelectorModal.
   * Tự động lưu payeeId vào budget (nếu người dùng chọn lưu mặc định) và mở PaymentSandboxModal.
   */
  const handlePayeeSelected = async (payee: Payee, saveAsDefault?: boolean) => {
    if (!pendingPayBudget) return;
    const { budget: b, walletId, remaining } = pendingPayBudget;

    // Nếu người dùng chọn lưu mặc định hoặc payee đã có id → liên kết vào budget cho các tháng sau
    if (saveAsDefault || payee.id) {
      const bId = b.budgetId || (b as any).id;
      if (bId) {
        try {
          await financialServices.updateBudget(bId, {
            categoryId: b.categoryId,
            limitAmount: b.limitAmount,
            name: b.name || b.categoryName,
            year,
            month,
            type: b.type || "BILL",
            isMandatory: b.isMandatory ?? true,
            isRecurring: b.isRecurring ?? false,
            payeeId: payee.id,        // ← Liên kết payeeId
            payeeBankBin: payee.bankBin,
            payeeBankAccount: payee.bankAccount,
            payeeAccountName: payee.accountName || payee.name,
            id: bId,
          });
          fetchBudgets(); // Refresh để cập nhật người nhận mới
        } catch {
          // Không block thanh toán nếu update thất bại
        }
      }
    }

    // Mở modal thanh toán ngay với thông tin người vừa chọn
    setSandboxDebtInfo({
      amount: remaining,
      toName: payee.accountName || payee.name,
      toBankBin: payee.bankBin || "970422",
      toAccountNo: payee.bankAccount,
      groupName: b.name || b.categoryName,
      budgetId: b.budgetId,
      categoryId: b.categoryId,
      walletId,
      prevSpentAmount: b.spentAmount,
    });
    setSandboxVisible(true);
  };

  /**
   * Xử lý thanh toán ngoài (tiền mặt / chuyển khoản ngoài app cho người lạ / không có trong danh bạ)
   */
  const handleOfflineSettle = async (payeeName: string, note?: string) => {
    if (!pendingPayBudget) return;
    const { budget: b, walletId, remaining } = pendingPayBudget;

    try {
      if (walletId && b.categoryId) {
        await financialServices.createTransaction(walletId, {
          amount: remaining,
          type: "EXPENSE",
          categoryId: b.categoryId,
          linkedBudgetId: b.budgetId,
          note: note?.trim() || `Đã thanh toán cho ${payeeName.trim() || b.name || b.categoryName}`,
        });
      }

      const newData = await financialServices.getBudgetSummary(year, month);
      setBudgets(newData || []);
      showToast(`Đã ghi nhận chi tiêu ${remaining.toLocaleString("vi-VN")} ₫ cho ${payeeName.trim()}! 🎉`, "success");
      setPendingPayBudget(null);
      setPayeeSelectorVisible(false);
    } catch (err: any) {
      showToast("Không thể ghi nhận giao dịch", "error");
    }
  };


  const handleSandboxPaymentSuccess = async (amount: number) => {
    if (!sandboxDebtInfo) return;

    try {
      if (sandboxDebtInfo.walletId && sandboxDebtInfo.categoryId) {
        // Tự động tạo giao dịch chi tiêu ghi nhận vào ví & ngân sách
        await financialServices.createTransaction(sandboxDebtInfo.walletId, {
          amount: amount,
          type: "EXPENSE",
          categoryId: sandboxDebtInfo.categoryId,
          linkedBudgetId: sandboxDebtInfo.budgetId,
          note: `Thanh toán VietQR cho ${sandboxDebtInfo.toName || sandboxDebtInfo.groupName || "ngân sách"}`,
        });
      }

      const newData = await financialServices.getBudgetSummary(year, month);
      setBudgets(newData || []);
      showToast(`Đã thanh toán ${(amount || 0).toLocaleString("vi-VN")} ₫ thành công! 🎉`, "success");
    } catch (err: any) {
      console.error("[Budget] Payment success sync error:", err);
      try {
        const newData = await financialServices.getBudgetSummary(year, month);
        setBudgets(newData || []);
      } catch (e) {}
      showToast(`Đã thanh toán ${(amount || 0).toLocaleString("vi-VN")} ₫! 🎉`, "success");
    }
  };

  const handleCreateBudget = async () => {
    const rawNumber = parseFloat(limitAmount.replace(/\D/g, ""));
    if (!rawNumber || rawNumber <= 0) {
      showToast("Vui lòng nhập số tiền hạn mức hợp lệ", "error");
      return;
    }
    if (!selectedCategoryId) {
      showToast("Vui lòng chọn danh mục áp dụng", "error");
      return;
    }

    setSubmitting(true);
    try {
      await financialServices.createBudget({
        categoryId: selectedCategoryId,
        name: budgetName.trim() || undefined,
        limitAmount: rawNumber,
        year,
        month,
        isMandatory: isMandatory,
        type: type,
        isRecurring: isRecurring,
        payeeBankBin: payeeBankBin || undefined,
        payeeBankAccount: payeeBankAccount.trim() || undefined,
        payeeAccountName: payeeAccountName.trim() || undefined,
      });

      showToast("Đã tạo ngân sách chi tiêu mới! 🎉", "success");
      setBudgetName("");
      setLimitAmount("");
      setPayeeBankBin("");
      setPayeeBankAccount("");
      setPayeeAccountName("");
      setShowPayeeSetup(false);
      setIsMandatory(false);
      setIsRecurring(false);
      setType("FLEXIBLE");
      setModalVisible(false);
      fetchBudgets();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể tạo ngân sách", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n?: number) => new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0));

  const filteredBudgets = React.useMemo(() => {
    let list = [...budgets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          (b.name && b.name.toLowerCase().includes(q)) ||
          (b.categoryName && b.categoryName.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      const aMandatory = a.isMandatory || (a as any).mandatory ? 1 : 0;
      const bMandatory = b.isMandatory || (b as any).mandatory ? 1 : 0;
      if (aMandatory !== bMandatory) {
        return bMandatory - aMandatory;
      }
      return 0;
    });
  }, [budgets, searchQuery]);

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

        {/* ─── ISOLATED MEMOIZED SEARCH INPUT FIELD ─── */}
        <MemoizedSearchBar 
          onSearch={React.useCallback((text: string) => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
              setSearchQuery(text);
            }, 300);
          }, [])}
        />

        {/* ─── BUDGET LIST ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.emerald600} />
            <Text style={styles.loadingText}>Đang tải danh sách ngân sách...</Text>
          </View>
        ) : filteredBudgets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>{searchQuery ? "🔍" : "🎯"}</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? "Không tìm thấy ngân sách" : "Chưa có khoản chi nào"}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `Không có ngân sách nào khớp với "${searchQuery}".`
                : "Đặt giới hạn chi tiêu để kiểm soát tài chính hiệu quả!"}
            </Text>
            {!searchQuery && (
              <Button
                title="+ Tạo Ngân Sách Đầu Tiên"
                variant="primary"
                onPress={() => setModalVisible(true)}
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        ) : (
          filteredBudgets.map((b) => {
            const isMandatoryFlag = b.isMandatory || (b as any).mandatory;
            const isFixedType = (b as any).type === "FIXED" || (b as any).type === "BILL" || isMandatoryFlag;
            const isPaid = b.spentAmount >= b.limitAmount;
            const remaining = Math.max(0, b.limitAmount - b.spentAmount);
            const pct = b.limitAmount > 0 ? Math.min(100, Math.round((b.spentAmount / b.limitAmount) * 100)) : 0;
            const isFocused = focusedBudgetId === b.budgetId;

            let badgeText = `Còn ${fmt(remaining)}đ`;
            let badgeStyle = styles.badgeGreen;

            if (b.spentAmount > b.limitAmount) {
              badgeText = `Vượt ${fmt(b.spentAmount - b.limitAmount)}đ ⚠️`;
              badgeStyle = styles.badgeRed;
            } else if (isPaid) {
              badgeText = isFixedType ? "Đã thanh toán ✓" : "Hết hạn mức";
              badgeStyle = styles.badgeGreen;
            } else if (isFixedType) {
              badgeText = `Cần trả ${fmt(remaining)}đ`;
              badgeStyle = styles.badgeAmber;
            } else if (pct >= 80) {
              badgeText = `Còn ${fmt(remaining)}đ`;
              badgeStyle = styles.badgeAmber;
            }

            return (
              <TouchableOpacity
                key={b.budgetId || b.categoryId}
                activeOpacity={0.88}
                onPress={() => {
                  setSelectedBudgetForDetail(b);
                  setBudgetTxSheetVisible(true);
                }}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  if (b.budgetId) itemPositions.current[b.budgetId] = y;
                  if (b.categoryId) itemPositions.current[b.categoryId] = y;
                }}
                style={[
                  styles.budgetCard,
                  isMandatoryFlag ? styles.budgetCardMandatory : styles.budgetCardUnstar,
                  isFocused && styles.budgetCardFocused,
                  pct >= 100 && styles.budgetCardOverBorder,
                ]}
              >
                {/* Top Row: Icon, Title, Actions */}
                <View style={styles.cardTopRow}>
                  <View style={styles.catIconBg}>
                    <CategoryIcon name={b.categoryName || b.name || b.categoryIcon} size={28} />
                  </View>

                  <View style={styles.cardTitleBox}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {(b.name || b.categoryName || "").replace(/^Ngân sách\s+/i, "")}
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

                {/* Dedicated Full-Width Smart Advisor Banner */}
                {(() => {
                  const matched = advisorSuggestions.find(
                    (s) =>
                      (s.categoryId && s.categoryId === b.categoryId) ||
                      (b.categoryName && s.categoryName && s.categoryName.toLowerCase() === b.categoryName.toLowerCase()) ||
                      (b.name && s.categoryName && b.name.toLowerCase().includes(s.categoryName.toLowerCase()))
                  );
                  if (!matched) return null;
                  return (
                    <View style={styles.cardAdvisorBanner}>
                      <Text style={styles.cardAdvisorBannerText}>
                        💡 Gợi ý: <Text style={{ fontWeight: "900", color: "#065f46" }}>{fmt(matched.suggestedAmount)}đ</Text>
                        {matched.lastMonthBudget ? ` • T.trước: ${fmt(matched.lastMonthBudget)}đ` : ""}
                      </Text>
                    </View>
                  );
                })()}

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

                    {/* Nút Trả Ngay CHỈ HIỂN THỊ cho Khoản chi Cố định / Bắt buộc (isFixedType) và khi chưa trả hết (!isPaid) */}
                    {isFixedType && !isPaid && (
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
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ─── CREATE BUDGET BOTTOM SHEET ─── */}
      <BottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Tạo Ngân Sách Mới 🎯"
      >
        <ScrollView 
          style={styles.modalScrollForm} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => categoryDropdownOpen && setCategoryDropdownOpen(false)}>
            {/* Header Badge */}
            <View style={styles.modalBadgeRow}>
              <View style={styles.modalBadge}>
                <Text style={styles.modalBadgeText}>✨ Quản lý hạn mức chi tiêu</Text>
              </View>
            </View>

            {/* Field 1: Amount Limit */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldBlockLabel}>
                HẠN MỨC SỐ TIỀN <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.fieldCard}>
                <View style={styles.fieldCardIconBox}>
                  <Text style={{ fontSize: 20 }}>🪙</Text>
                </View>
                <TextInput
                  placeholder="VD: 5.000.000"
                  placeholderTextColor={colors.slate400}
                  keyboardType="numeric"
                  value={limitAmount}
                  onFocus={() => setCategoryDropdownOpen(false)}
                  onChangeText={(text) => {
                    const raw = text.replace(/\D/g, "");
                    setLimitAmount(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
                  }}
                  style={styles.fieldCardAmountInput}
                />
                <View style={styles.currencyTag}>
                  <Text style={styles.currencyTagText}>VNĐ</Text>
                </View>
              </View>
            </View>

          {/* Field 2: Category Selector Dropdown */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldBlockLabel}>
              DANH MỤC ÁP DỤNG <Text style={styles.requiredStar}>*</Text>
            </Text>
            
            {/* Dropdown Trigger */}
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                categoryDropdownOpen && styles.dropdownTriggerActive,
              ]}
              onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownSelectedContent}>
                {(() => {
                  const selectedCat = categories.find((c) => c.id === selectedCategoryId);
                  return (
                    <>
                      <View style={{ marginRight: 8 }}>
                        <CategoryIcon name={selectedCat ? selectedCat.name : "Khác"} size={22} />
                      </View>
                      <Text style={[
                        styles.dropdownSelectedText,
                        !selectedCat && { color: colors.slate400, fontWeight: "500" }
                      ]}>
                        {selectedCat ? selectedCat.name : "Chọn danh mục chi tiêu..."}
                      </Text>
                    </>
                  );
                })()}
              </View>
              <Text style={styles.dropdownChevron}>
                {categoryDropdownOpen ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {/* Dropdown List */}
            {categoryDropdownOpen && (
              <View style={styles.dropdownListCard}>
                {loadingCategories ? (
                  <ActivityIndicator size="small" color={colors.emerald600} style={{ paddingVertical: 14, alignSelf: "center" }} />
                ) : (
                  <ScrollView
                    nestedScrollEnabled={true}
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {categories
                      .filter((c) => c.type === "EXPENSE" && c.name !== "Mục tiêu tiết kiệm")
                      .map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setSelectedCategoryId(cat.id);
                              setCategoryDropdownOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.dropdownItemLeft}>
                              <View style={[styles.dropdownItemIconBox, isSelected && styles.dropdownItemIconBoxActive]}>
                                <CategoryIcon name={cat.name} size={20} />
                              </View>
                              <Text style={[
                                styles.dropdownItemText,
                                isSelected && styles.dropdownItemTextActive,
                              ]}>
                                {cat.name}
                              </Text>
                            </View>
                            {isSelected && (
                              <View style={styles.dropdownCheckBadge}>
                                <Text style={{ fontSize: 12, color: "#059669", fontWeight: "900" }}>✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Smart Advisor AI Suggestion Box */}
            {(() => {
              const selectedCat = categories.find((c) => c.id === selectedCategoryId);
              const matched = advisorSuggestions.find(
                (s) =>
                  (s.categoryId && s.categoryId === selectedCategoryId) ||
                  (selectedCat && s.categoryName && s.categoryName.toLowerCase() === selectedCat.name.toLowerCase())
              );
              if (!matched) return null;
              return (
                <View style={styles.modalAdvisorBox}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.modalAdvisorTitle}>
                      💡 Gợi ý: {fmt(matched.suggestedAmount)}đ
                    </Text>
                    <Text style={styles.modalAdvisorSub}>
                      {matched.lastMonthBudget
                        ? `Tháng trước: ${fmt(matched.lastMonthBudget)}đ • TB 3 tháng: ${fmt(matched.avgSpent3Months)}đ`
                        : `TB 3 tháng: ${fmt(matched.avgSpent3Months)}đ • Chưa đặt tháng trước`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalAdvisorApplyBtn}
                    onPress={() => {
                      setLimitAmount(parseInt(String(matched.suggestedAmount), 10).toLocaleString("vi-VN"));
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalAdvisorApplyBtnText}>Áp dụng ✨</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>

          {/* Field 3: Budget Name (Optional) */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldBlockLabel}>
              TÊN GỢI NHỚ <Text style={styles.optionalNote}>(Tùy chọn)</Text>
            </Text>
            <View style={styles.fieldCard}>
              <View style={styles.fieldCardIconBoxGray}>
                <Text style={{ fontSize: 16 }}>✏️</Text>
              </View>
              <TextInput
                ref={budgetNameInputRef}
                placeholder="VD: Ngân sách Ăn uống T7"
                placeholderTextColor={colors.slate400}
                onFocus={() => setCategoryDropdownOpen(false)}
                onChangeText={setBudgetName}
                style={styles.fieldCardTextInput}
              />
            </View>
          </View>

          {/* Field 4: Budget Type (FLEXIBLE vs BILL) */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldBlockLabel}>PHÂN LOẠI CHI TIÊU</Text>
            <View style={styles.typeSegmentBox}>
              <TouchableOpacity
                style={[styles.typeSegmentItem, type === "FLEXIBLE" && styles.typeSegmentItemActive]}
                onPress={() => {
                  setType("FLEXIBLE");
                  setCategoryDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeSegmentItemText, type === "FLEXIBLE" && styles.typeSegmentItemTextActive]}>
                  🎯 Linh hoạt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeSegmentItem, type === "BILL" && styles.typeSegmentItemActive]}
                onPress={() => {
                  setType("BILL");
                  setCategoryDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeSegmentItemText, type === "BILL" && styles.typeSegmentItemTextActive]}>
                  📌 Hóa đơn cố định
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Field 4.1: Tài khoản chuyển tiền nhanh VietQR (CHỈ HIỂN THỊ KHI LÀ HÓA ĐƠN CỐ ĐỊNH - TÙY CHỌN KHÔNG BẮT BUỘC) */}
          {type === "BILL" && (
            <View style={styles.payeeAccordionCard}>
              <TouchableOpacity
                style={styles.payeeAccordionHeader}
                onPress={() => setShowPayeeSetup(!showPayeeSetup)}
                activeOpacity={0.8}
              >
                <View style={styles.payeeAccordionHeaderLeft}>
                  <Text style={{ fontSize: 16 }}>💳</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payeeAccordionTitle}>Tài khoản chuyển tiền nhanh (VietQR)</Text>
                    <Text style={styles.payeeAccordionSub}>
                      {showPayeeSetup
                        ? "Lưu STK chủ trọ, tiền điện... để tạo nút Trả ngay"
                        : "Tùy chọn • Có thể thêm sau khi thanh toán"}
                    </Text>
                  </View>
                </View>
                <View style={[styles.payeeAccordionToggleBtn, showPayeeSetup && styles.payeeAccordionToggleBtnActive]}>
                  <Text style={[styles.payeeAccordionToggleBtnText, showPayeeSetup && { color: "#4F46E5" }]}>
                    {showPayeeSetup ? "Thu gọn ▲" : "+ Thêm STK ▼"}
                  </Text>
                </View>
              </TouchableOpacity>

              {showPayeeSetup && (
                <View style={styles.payeeAccordionBody}>
                  {/* 1. Chọn Ngân Hàng */}
                  <Text style={styles.payeeFieldLabel}>Ngân hàng nhận tiền *</Text>
                  <TouchableOpacity
                    style={styles.budgetBankSelectBtn}
                    onPress={() => setBudgetBankPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.budgetBankSelectLeft}>
                      <View style={styles.budgetBankLogoBox}>
                        <Image
                          source={{ uri: (VIETQR_BANKS.find(b => b.bin === payeeBankBin) || VIETQR_BANKS[0]).logo }}
                          style={styles.budgetBankLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.budgetBankShortName}>
                          {(VIETQR_BANKS.find(b => b.bin === payeeBankBin) || VIETQR_BANKS[0]).shortName}
                        </Text>
                        <Text style={styles.budgetBankFullName} numberOfLines={1}>
                          {(VIETQR_BANKS.find(b => b.bin === payeeBankBin) || VIETQR_BANKS[0]).name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.budgetBankChangeBadge}>
                      <Text style={styles.budgetBankChangeText}>Đổi ▼</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. Số tài khoản */}
                  <Text style={styles.payeeFieldLabel}>Số tài khoản nhận</Text>
                  <View style={styles.payeeInputWrap}>
                    <TextInput
                      placeholder="VD: 0987654321, 1012345678..."
                      placeholderTextColor={colors.slate400}
                      keyboardType="numeric"
                      value={payeeBankAccount}
                      onChangeText={(val) => {
                        setPayeeBankAccount(val);
                        setBudgetLookupVerified(false);
                      }}
                      style={styles.payeeInput}
                    />
                    {payeeBankAccount.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setPayeeBankAccount("");
                          setBudgetLookupVerified(false);
                        }}
                        style={{ paddingHorizontal: 10 }}
                      >
                        <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "800" }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Lookup status */}
                  {budgetLookupLoading && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 }}>
                      <ActivityIndicator size="small" color="#6366F1" />
                      <Text style={{ fontSize: 11.5, color: "#6366F1", fontWeight: "600" }}>
                        Đang tra cứu tên từ ngân hàng...
                      </Text>
                    </View>
                  )}
                  {budgetLookupVerified && (
                    <View style={styles.budgetLookupVerifiedBox}>
                      <Text style={styles.budgetLookupVerifiedText}>
                        ✓ Đã xác thực: {payeeAccountName}
                      </Text>
                    </View>
                  )}

                  {/* 3. Tên người nhận */}
                  <Text style={styles.payeeFieldLabel}>Tên người nhận / Tên gợi nhớ</Text>
                  <View style={styles.payeeInputWrap}>
                    <VietnameseTextInput
                      placeholder="VD: Cô Lan chủ nhà, EVN HCMC..."
                      placeholderTextColor={colors.slate400}
                      value={payeeAccountName}
                      onChangeText={setPayeeAccountName}
                      style={styles.payeeInput}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Field 5: Advanced Options (Toggles) */}
          <View style={styles.togglesCard}>
            {/* Priority Toggle */}
            <View style={styles.toggleRowItem}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.toggleTitleRow}>
                  <Text style={{ fontSize: 15, marginRight: 6 }}>⭐</Text>
                  <Text style={styles.toggleRowTitle}>Ưu tiên thanh toán (Bắt buộc)</Text>
                </View>
                <Text style={styles.toggleRowSub}>
                  Hệ thống sẽ ưu tiên trích tiền từ ví cho khoản này trước.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsMandatory(!isMandatory);
                  setCategoryDropdownOpen(false);
                }}
                style={[styles.customSwitchTrack, isMandatory && styles.customSwitchTrackAmber]}
                activeOpacity={0.8}
              >
                <View style={[styles.customSwitchThumb, isMandatory && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleDivider} />

            {/* Recurring Toggle */}
            <View style={styles.toggleRowItem}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.toggleTitleRow}>
                  <Text style={{ fontSize: 15, marginRight: 6 }}>🔁</Text>
                  <Text style={styles.toggleRowTitle}>Tự động lặp lại hàng tháng</Text>
                </View>
                <Text style={styles.toggleRowSub}>
                  Duy trì hạn mức này sang tháng sau mà không cần thiết lập lại.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsRecurring(!isRecurring);
                  setCategoryDropdownOpen(false);
                }}
                style={[styles.customSwitchTrack, isRecurring && styles.customSwitchTrackEmerald]}
                activeOpacity={0.8}
              >
                <View style={[styles.customSwitchThumb, isRecurring && styles.customSwitchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActionBtnRow}>
            <TouchableOpacity
              style={styles.modalActionCancelBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalActionCancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionSubmitBtn}
              onPress={handleCreateBudget}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.modalActionSubmitText}>🎯 Lưu Ngân Sách</Text>
              )}
            </TouchableOpacity>
          </View>
          </Pressable>
        </ScrollView>
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

      {/* ─── PAYEE SELECTOR MODAL: Chọn người thụ hưởng (Đã lưu / Bạn bè / Thêm mới) ─── */}
      <PayeeSelectorModal
        visible={payeeSelectorVisible}
        onClose={() => {
          setPayeeSelectorVisible(false);
          // Chỉ xóa pendingPayBudget nếu sandbox chưa mở
          // (nếu đang mở sandbox thì giữ lại để nút đổi người nhận hoạt động)
          if (!sandboxVisible) setPendingPayBudget(null);
        }}
        onSelectPayee={handlePayeeSelected}
        preselectedPayeeId={(pendingPayBudget?.budget as any)?.payeeId}
        defaultAmount={pendingPayBudget?.remaining}
        onOfflineSettle={handleOfflineSettle}
        recentPayee={
          pendingPayBudget?.budget.payeeBankAccount
            ? {
                bankBin: pendingPayBudget.budget.payeeBankBin,
                bankAccount: pendingPayBudget.budget.payeeBankAccount,
                accountName: pendingPayBudget.budget.payeeAccountName,
                name: pendingPayBudget.budget.name || pendingPayBudget.budget.categoryName,
              }
            : undefined
        }
      />


      {/* ─── COMMERCIAL PAYMENT SANDBOX MODAL ─── */}
      <PaymentSandboxModal
        visible={sandboxVisible}
        debtInfo={sandboxDebtInfo}
        onClose={() => {
          setSandboxVisible(false);
          setSandboxDebtInfo(null);
          setPendingPayBudget(null); // Clear khi đóng hoàn toàn
        }}
        onPaymentSuccess={handleSandboxPaymentSuccess}
        onChangePayee={
          // Chỉ có thể đổi người nhận nếu khoản này gắn với 1 budget đang pending
          pendingPayBudget
            ? () => {
                setSandboxVisible(false);
                setSandboxDebtInfo(null);
                setPayeeSelectorVisible(true);
              }
            : undefined
        }
      />

      {/* ─── BUDGET TRANSACTIONS INVOICE BREAKDOWN BOTTOM SHEET ─── */}
      <BudgetTransactionsBottomSheet
        visible={budgetTxSheetVisible}
        onClose={() => setBudgetTxSheetVisible(false)}
        budget={selectedBudgetForDetail}
        year={year}
        month={month}
      />

      {/* ─── TOAST NOTIFICATION ─── */}
      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />

      {/* ─── BUDGET BANK PICKER SUB-MODAL ─── */}
      <Modal
        visible={budgetBankPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBudgetBankPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.budgetBankPickerOverlay}
          activeOpacity={1}
          onPress={() => setBudgetBankPickerVisible(false)}
        >
          <TouchableOpacity style={styles.budgetBankPickerContent} activeOpacity={1}>
            <View style={styles.budgetBankPickerHeader}>
              <Text style={styles.budgetBankPickerTitle}>Chọn Ngân Hàng Thụ Hưởng 🏦</Text>
              <TouchableOpacity
                onPress={() => setBudgetBankPickerVisible(false)}
                style={styles.budgetBankPickerCloseBtn}
              >
                <Text style={styles.budgetBankPickerCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.budgetBankPickerSearchBox}>
              <Text style={{ fontSize: 15 }}>🔍</Text>
              <TextInput
                placeholder="Tìm tên hoặc mã ngân hàng (MB, VCB, BIDV...)"
                placeholderTextColor="#94A3B8"
                value={budgetSearchBank}
                onChangeText={setBudgetSearchBank}
                style={styles.budgetBankPickerSearchInput}
              />
              {budgetSearchBank.length > 0 && (
                <TouchableOpacity onPress={() => setBudgetSearchBank("")}>
                  <Text style={{ color: "#94A3B8", fontSize: 15 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {VIETQR_BANKS.filter(
                (b) =>
                  b.name.toLowerCase().includes(budgetSearchBank.toLowerCase()) ||
                  b.shortName.toLowerCase().includes(budgetSearchBank.toLowerCase())
              ).map((bank) => {
                const isSelected = bank.bin === payeeBankBin;
                return (
                  <TouchableOpacity
                    key={bank.bin}
                    style={[styles.budgetBankPickerItem, isSelected && styles.budgetBankPickerItemSelected]}
                    onPress={() => {
                      setPayeeBankBin(bank.bin);
                      setBudgetBankPickerVisible(false);
                      setBudgetSearchBank("");
                      if (payeeBankAccount.trim().length >= 6) {
                        handleBudgetAccountLookup(bank.bin, payeeBankAccount.trim());
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.budgetBankPickerItemLogoWrap}>
                      <Image source={{ uri: bank.logo }} style={styles.budgetBankPickerItemLogo} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.budgetBankPickerItemShortName, isSelected && { color: "#4F46E5", fontWeight: "900" }]}>
                        {bank.shortName}
                      </Text>
                      <Text style={styles.budgetBankPickerItemFullName} numberOfLines={1}>
                        {bank.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.budgetBankPickerCheckmark}>
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    color: colors.emerald700,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.slate900,
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
  /* Search Bar Styles */
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIconBox: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate900,
    paddingVertical: 6,
  },
  searchClearBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.slate100,
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
  budgetCardOverBorder: {
    borderColor: "#FECDD3",
    borderWidth: 1.5,
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
  cardAdvisorBanner: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  cardAdvisorBannerText: {
    fontSize: 11.5,
    color: "#166534",
    fontWeight: "600",
    lineHeight: 16,
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
  // ─── REDESIGNED MODAL STYLES ───
  modalScrollForm: {
    maxHeight: 520,
  },
  modalBadgeRow: {
    marginBottom: 14,
  },
  modalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065f46",
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldBlockLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate600,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  requiredStar: {
    color: colors.rose500,
  },
  optionalNote: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.slate400,
  },
  fieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  fieldCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fieldCardIconBoxGray: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fieldCardAmountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    padding: 0,
  },
  fieldCardTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate900,
    padding: 0,
  },
  currencyTag: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  currencyTagText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#059669",
  },
  // ─── DROPDOWN SELECTOR STYLES ───
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownTriggerActive: {
    borderColor: colors.emerald600,
    backgroundColor: "#f0fdf4",
  },
  dropdownSelectedContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownSelectedIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownSelectedText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  dropdownChevron: {
    fontSize: 12,
    color: colors.slate500,
    marginLeft: 8,
    fontWeight: "800",
  },
  dropdownListCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dropdownItemActive: {
    backgroundColor: "#ecfdf5",
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardAdvisorChip: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  cardAdvisorChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#047857",
  },
  modalAdvisorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  modalAdvisorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e40af",
    marginBottom: 2,
  },
  modalAdvisorSub: {
    fontSize: 11,
    color: "#3b82f6",
    fontWeight: "500",
  },
  modalAdvisorApplyBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  modalAdvisorApplyBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate700,
  },
  dropdownItemTextActive: {
    color: "#065f46",
    fontWeight: "900",
  },
  dropdownCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  typeSegmentBox: {
    flexDirection: "row",
    backgroundColor: colors.slate100,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  typeSegmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeSegmentItemActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typeSegmentItemText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
  },
  typeSegmentItemTextActive: {
    color: "#047857",
    fontWeight: "800",
  },
  togglesCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  toggleRowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate800,
  },
  toggleRowSub: {
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 15,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  customSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.slate200,
    padding: 2,
    justifyContent: "center",
  },
  customSwitchTrackAmber: {
    backgroundColor: "#f59e0b",
  },
  customSwitchTrackEmerald: {
    backgroundColor: colors.emerald600,
  },
  customSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  customSwitchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalActionBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  modalActionCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  modalActionCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate600,
  },
  modalActionSubmitBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.emerald600,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emerald600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionSubmitText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.white,
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
  dropdownItemIconBoxActive: {
    backgroundColor: colors.emerald100,
  },
  // Payee Setup Accordion in Create Budget BottomSheet
  payeeAccordionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    overflow: "hidden",
  },
  payeeAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  payeeAccordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  payeeAccordionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  payeeAccordionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  payeeAccordionToggleBtn: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  payeeAccordionToggleBtnActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#C4B5FD",
  },
  payeeAccordionToggleBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#4F46E5",
  },
  payeeAccordionBody: {
    padding: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  payeeFieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
    textTransform: "uppercase",
  },
  budgetBankSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    padding: 10,
    marginBottom: 8,
  },
  budgetBankSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  budgetBankLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  budgetBankLogo: {
    width: "100%",
    height: "100%",
  },
  budgetBankShortName: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0F172A",
  },
  budgetBankFullName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  budgetBankChangeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  budgetBankChangeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  payeeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 4,
  },
  payeeInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  budgetLookupVerifiedBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  budgetLookupVerifiedText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#059669",
  },

  // Bank Picker Modal Styles
  budgetBankPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  budgetBankPickerContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  budgetBankPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  budgetBankPickerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  budgetBankPickerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  budgetBankPickerCloseBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  budgetBankPickerSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  budgetBankPickerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  budgetBankPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  budgetBankPickerItemSelected: {
    backgroundColor: "#EEF2FF",
  },
  budgetBankPickerItemLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  budgetBankPickerItemLogo: {
    width: "100%",
    height: "100%",
  },
  budgetBankPickerItemShortName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  budgetBankPickerItemFullName: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  budgetBankPickerCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
});
