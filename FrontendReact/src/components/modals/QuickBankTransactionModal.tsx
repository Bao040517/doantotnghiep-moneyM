import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import {
  Zap,
  Check,
  X,
  ArrowDownRight,
  ArrowUpRight,
  Wallet as WalletIcon,
  Tag as TagIcon,
  ChevronDown,
  Building2,
  Sparkles,
  Edit2,
} from "lucide-react-native";
import { ParsedBankNotification } from "../../utils/bankNotificationParser";
import { financialServices, Category } from "../../services/financialServices";
import { Wallet } from "../../types";
import {
  STANDARD_EXPENSE_CATEGORIES,
  STANDARD_INCOME_CATEGORIES,
  getCategoryEmoji,
  getCategoryColor,
} from "../../constants/categories";

interface QuickBankTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  parsedData: ParsedBankNotification | null;
  wallets: Wallet[];
  categories: Category[];
  onSuccess?: () => void;
}

export const QuickBankTransactionModal: React.FC<QuickBankTransactionModalProps> = ({
  visible,
  onClose,
  parsedData,
  wallets,
  categories,
  onSuccess,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [isExpense, setIsExpense] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);

  useEffect(() => {
    if (parsedData && parsedData.isValid) {
      setAmount(parsedData.amount || 0);
      setIsExpense(parsedData.type === "EXPENSE");
      setNote(parsedData.note || "");

      // 1. Tự động tìm ví tương ứng theo tên ngân hàng hoặc số tài khoản
      let matchedWallet = wallets.find((w) => {
        const wName = w.name?.toLowerCase() || "";
        const bankName = parsedData.bankName?.toLowerCase() || "";
        const accNo = w.bankAccountNo || "";
        return (
          (bankName && wName.includes(bankName)) ||
          (parsedData.accountSnippet && accNo && accNo.includes(parsedData.accountSnippet))
        );
      });

      if (!matchedWallet) {
        // Ưu tiên ví chính không phải nợ
        matchedWallet = wallets.find((w) => !w.isLiability) || wallets[0];
      }

      if (matchedWallet) {
        setSelectedWalletId(matchedWallet.id);
      }

      // 2. Tìm Category ID theo suggestedCategoryName
      const targetCat = categories.find(
        (c) =>
          c.name.toLowerCase() === parsedData.suggestedCategoryName.toLowerCase() &&
          (isExpense ? c.type === "EXPENSE" : c.type === "INCOME")
      ) || categories.find(
        (c) => c.name.toLowerCase() === parsedData.suggestedCategoryName.toLowerCase()
      );

      if (targetCat) {
        setSelectedCategoryId(targetCat.id);
        setSelectedCategoryName(targetCat.name);
      } else {
        // Fallback danh mục đầu tiên
        const defaultCat = categories.find((c) =>
          isExpense ? c.type === "EXPENSE" : c.type === "INCOME"
        ) || categories[0];
        if (defaultCat) {
          setSelectedCategoryId(defaultCat.id);
          setSelectedCategoryName(defaultCat.name);
        }
      }
    }
  }, [parsedData, wallets, categories]);

  if (!parsedData || !parsedData.isValid) return null;

  const handleSelectCategory = (cat: { id?: string; name: string }) => {
    const existing = categories.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
    if (existing) {
      setSelectedCategoryId(existing.id);
      setSelectedCategoryName(existing.name);
    } else {
      setSelectedCategoryName(cat.name);
    }
    setShowAllCategories(false);
  };

  const handleSaveTransaction = async () => {
    if (!selectedWalletId) {
      Alert.alert("Thông báo", "Vui lòng chọn ví để ghi nhận giao dịch.");
      return;
    }

    if (!selectedCategoryId) {
      // Tìm category id tương ứng
      const cat = categories.find(
        (c) => c.name.toLowerCase() === selectedCategoryName.toLowerCase()
      ) || categories[0];
      if (cat) {
        setSelectedCategoryId(cat.id);
      } else {
        Alert.alert("Thông báo", "Vui lòng chọn danh mục.");
        return;
      }
    }

    try {
      setLoading(true);
      const catId =
        selectedCategoryId ||
        categories.find((c) => c.name.toLowerCase() === selectedCategoryName.toLowerCase())?.id ||
        categories[0]?.id;

      await financialServices.createTransaction(selectedWalletId, {
        amount: amount,
        type: isExpense ? "EXPENSE" : "INCOME",
        categoryId: catId,
        note: note.trim() || (isExpense ? "Chi tiêu ngân hàng" : "Thu nhập ngân hàng"),
        transactionDate: new Date().toISOString(),
        paymentMethod: "TRANSFER",
      });

      setLoading(false);
      Alert.alert(
        "🎉 Ghi nhận thành công!",
        `Đã lưu giao dịch ${isExpense ? "-" : "+"}${amount.toLocaleString("vi-VN")} ₫ vào danh mục "${selectedCategoryName}".`,
        [
          {
            text: "Đồng ý",
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Lỗi", err?.response?.data?.message || "Không thể ghi nhận giao dịch.");
    }
  };

  // Danh mục đổi nhanh (Quick Chips)
  const quickExpenseCategories = [
    { name: "Ăn uống", emoji: "🍽️" },
    { name: "Chi tiêu hàng ngày", emoji: "🧴" },
    { name: "Tiền nhà", emoji: "🏠" },
    { name: "Tiền điện", emoji: "💡" },
    { name: "Tiền nước", emoji: "🚿" },
    { name: "Quần áo", emoji: "👕" },
    { name: "Đi lại", emoji: "🚗" },
    { name: "Phí liên lạc", emoji: "📱" },
    { name: "Y tế", emoji: "💊" },
  ];

  const quickIncomeCategories = [
    { name: "Tiền lương", emoji: "💰" },
    { name: "Thưởng", emoji: "🎁" },
    { name: "Thu nhập phụ", emoji: "🪙" },
    { name: "Đầu tư", emoji: "📈" },
  ];

  const quickList = isExpense ? quickExpenseCategories : quickIncomeCategories;
  const fullCategoryList = isExpense ? STANDARD_EXPENSE_CATEGORIES : STANDARD_INCOME_CATEGORIES;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBadge, { backgroundColor: isExpense ? "#FEE2E2" : "#DCFCE7" }]}>
                <Zap size={20} color={isExpense ? "#DC2626" : "#16A34A"} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Biến động số dư ngân hàng</Text>
                <Text style={styles.headerSubtitle}>Tự động nhận diện trong 0ms (Offline)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Bank Card Info */}
            <View style={styles.bankCard}>
              <View style={styles.bankHeaderRow}>
                <View style={styles.bankBadge}>
                  <Building2 size={14} color="#2563EB" />
                  <Text style={styles.bankBadgeText}>{parsedData.bankName}</Text>
                </View>
                {parsedData.accountSnippet && (
                  <Text style={styles.accountText}>TK: {parsedData.accountSnippet}</Text>
                )}
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: isExpense ? "#FEE2E2" : "#DCFCE7" },
                  ]}
                >
                  {isExpense ? (
                    <ArrowDownRight size={12} color="#DC2626" />
                  ) : (
                    <ArrowUpRight size={12} color="#16A34A" />
                  )}
                  <Text
                    style={[
                      styles.typeBadgeText,
                      { color: isExpense ? "#DC2626" : "#16A34A" },
                    ]}
                  >
                    {isExpense ? "Chi tiền" : "Nhận tiền"}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.amountContainer}>
                <Text
                  style={[
                    styles.amountText,
                    { color: isExpense ? "#DC2626" : "#16A34A" },
                  ]}
                >
                  {isExpense ? "-" : "+"} {amount.toLocaleString("vi-VN")}{" "}
                  <Text style={styles.currencyText}>₫</Text>
                </Text>
              </View>

              {/* Note / Description */}
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Nội dung chuyển khoản:</Text>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ghi chú giao dịch..."
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>
            </View>

            {/* Target Wallet Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                <WalletIcon size={14} color="#64748B" /> Ví ghi nhận:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
                {wallets.map((w) => {
                  const isSelected = w.id === selectedWalletId;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[
                        styles.walletChip,
                        isSelected && styles.walletChipSelected,
                      ]}
                      onPress={() => setSelectedWalletId(w.id)}
                    >
                      <Text
                        style={[
                          styles.walletChipText,
                          isSelected && styles.walletChipTextSelected,
                        ]}
                      >
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Category Selector with Smart Rules */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>
                  <TagIcon size={14} color="#64748B" /> Danh mục phân loại:
                </Text>
                <View style={styles.autoBadge}>
                  <Sparkles size={12} color="#D97706" />
                  <Text style={styles.autoBadgeText}>Khớp Rule 0ms</Text>
                </View>
              </View>

              {/* Current Active Category Card */}
              <TouchableOpacity
                style={styles.currentCategoryCard}
                onPress={() => setShowAllCategories(!showAllCategories)}
              >
                <View style={styles.currentCategoryLeft}>
                  <View
                    style={[
                      styles.categoryEmojiBox,
                      { backgroundColor: getCategoryColor(selectedCategoryName) + "20" },
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>
                      {getCategoryEmoji(undefined, selectedCategoryName)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.categoryNameText}>{selectedCategoryName}</Text>
                    <Text style={styles.categoryHintText}>Bấm để mở toàn bộ 16 danh mục</Text>
                  </View>
                </View>
                <View style={styles.changeBtnBadge}>
                  <Edit2 size={13} color="#2563EB" />
                  <Text style={styles.changeBtnText}>Đổi</Text>
                </View>
              </TouchableOpacity>

              {/* Quick 1-Touch Chips */}
              <Text style={styles.quickLabel}>⚡ Đổi nhanh 1-chạm:</Text>
              <View style={styles.quickGrid}>
                {quickList.map((item) => {
                  const isSelected = selectedCategoryName === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.quickChip,
                        isSelected && styles.quickChipSelected,
                      ]}
                      onPress={() => handleSelectCategory(item)}
                    >
                      <Text style={styles.quickChipEmoji}>{item.emoji}</Text>
                      <Text
                        style={[
                          styles.quickChipText,
                          isSelected && styles.quickChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Expanded Full Categories Picker */}
              {showAllCategories && (
                <View style={styles.fullCategoryPicker}>
                  <Text style={styles.fullPickerTitle}>Tất cả danh mục chuẩn:</Text>
                  <View style={styles.fullPickerGrid}>
                    {fullCategoryList.map((item) => {
                      const isSelected = selectedCategoryName === item.name;
                      return (
                        <TouchableOpacity
                          key={item.name}
                          style={[
                            styles.fullCatItem,
                            isSelected && styles.fullCatItemSelected,
                          ]}
                          onPress={() => handleSelectCategory(item)}
                        >
                          <Text style={styles.fullCatEmoji}>{item.emoji}</Text>
                          <Text
                            style={[
                              styles.fullCatText,
                              isSelected && styles.fullCatTextSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.ignoreButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.ignoreButtonText}>Bỏ qua</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: isExpense ? "#2563EB" : "#16A34A" },
              ]}
              onPress={handleSaveTransaction}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    Lưu Ngay ({amount.toLocaleString("vi-VN")} ₫)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  bankCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  bankHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bankBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  accountText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  amountContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  amountText: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  currencyText: {
    fontSize: 20,
    fontWeight: "600",
  },
  noteBox: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noteLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 4,
  },
  noteInput: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "500",
    lineHeight: 18,
    padding: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  autoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  walletScroll: {
    flexDirection: "row",
  },
  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  walletChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  walletChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  walletChipTextSelected: {
    color: "#FFFFFF",
  },
  currentCategoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: "#2563EB",
    marginBottom: 10,
  },
  currentCategoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  categoryHintText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  changeBtnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickChipSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  quickChipEmoji: {
    fontSize: 13,
  },
  quickChipText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  quickChipTextSelected: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  fullCategoryPicker: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fullPickerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  fullPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  fullCatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fullCatItemSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  fullCatEmoji: {
    fontSize: 14,
  },
  fullCatText: {
    fontSize: 12,
    color: "#334155",
  },
  fullCatTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  ignoreButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  ignoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
