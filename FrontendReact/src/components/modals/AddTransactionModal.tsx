import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { TransactionPayload, Wallet } from "../../types";
import { financialServices, Category } from "../../services/financialServices";
import { colors } from "../../constants/colors";
import { CategoryIcon } from "../ui/CategoryIcon";

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onAddTransaction: (walletId: string, payload: Omit<TransactionPayload, "walletId">) => Promise<void>;
  defaultType?: "EXPENSE" | "INCOME";
  initialAmount?: string;
  initialNote?: string;
}

import { CATEGORY_ICONS } from "../../constants/categories";

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  wallets,
  onAddTransaction,
  defaultType = "EXPENSE",
  initialAmount = "",
  initialNote = "",
}) => {
  const [type, setType] = useState<"EXPENSE" | "INCOME">(defaultType);
  const [amount, setAmount] = useState(initialAmount);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [note, setNote] = useState(initialNote);
  const [loading, setLoading] = useState(false);

  // Dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Reset form fields on open / close
  useEffect(() => {
    if (visible) {
      setAmount(initialAmount || "");
      setNote(initialNote || "");
      setType(defaultType);
      setCategoryDropdownOpen(false);
      setWalletDropdownOpen(false);
    } else {
      setAmount("");
      setNote("");
      setCategoryDropdownOpen(false);
      setWalletDropdownOpen(false);
    }
  }, [visible, initialAmount, initialNote, defaultType]);

  // Sync walletId when wallets prop changes
  useEffect(() => {
    if (wallets.length > 0 && !selectedWalletId) {
      const nonLiabilityWallet = wallets.find((w) => w.id); // Just get first wallet
      setSelectedWalletId(nonLiabilityWallet?.id || wallets[0].id);
    }
  }, [wallets]);

  // Fetch categories from Backend when modal opens
  useEffect(() => {
    if (visible && categories.length === 0) {
      setLoadingCategories(true);
      financialServices
        .getCategories()
        .then((data) => {
          setCategories(data || []);
          // Auto-select first matching category
          const matchType = data.filter((c) => c.type === type);
          if (matchType.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(matchType[0].id);
          }
        })
        .catch((err) => console.log("Failed to load categories:", err))
        .finally(() => setLoadingCategories(false));
    }
  }, [visible]);

  // Auto-select first category when type changes
  useEffect(() => {
    const matchType = categories.filter((c) => c.type === type);
    if (matchType.length > 0) {
      setSelectedCategoryId(matchType[0].id);
    }
  }, [type, categories]);

  const handleAmountChange = (text: string) => {
    const cleanDigits = text.replace(/\D/g, "");
    if (!cleanDigits) {
      setAmount("");
      return;
    }
    const formatted = parseInt(cleanDigits, 10).toLocaleString("vi-VN");
    setAmount(formatted);
  };

  const handleSubmit = async () => {
    const rawNumber = parseFloat(amount.replace(/\./g, "")) || 0;
    if (rawNumber <= 0) {
      Alert.alert("Thông báo", "Vui lòng nhập số tiền hợp lệ (> 0đ)!");
      return;
    }
    if (!selectedWalletId) {
      Alert.alert("Thông báo", "Vui lòng chọn ví để thực hiện giao dịch!");
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert("Thông báo", "Vui lòng chọn danh mục cho giao dịch!");
      return;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const localIsoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    setLoading(true);
    try {
      await onAddTransaction(selectedWalletId, {
        categoryId: selectedCategoryId,
        amount: rawNumber,
        type,
        note: note.trim(),
        transactionDate: localIsoDate,
      });
      setAmount("");
      setNote("");
      onClose();
    } catch (e: any) {
      console.error("Lỗi tạo giao dịch:", e);
      const errorMsg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        "Có lỗi xảy ra khi thực hiện giao dịch. Vui lòng thử lại!";
      Alert.alert("Giao dịch không thành công", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || filteredCategories[0];
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={type === "EXPENSE" ? "Thêm Giao Dịch Chi Tiêu 💸" : "Nạp Tiền / Thu Nhập Vào Ví 💳"}
    >
      <ScrollView
        style={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>

        {/* Wallet Selector (Dropdown List) */}
        {wallets.length > 1 && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>
              {type === "EXPENSE" ? "Chọn ví thanh toán trừ tiền" : "Chọn ví nhận tiền nạp vào"}
            </Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setWalletDropdownOpen(!walletDropdownOpen)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownBtnLeft}>
                <Text style={{ fontSize: 18 }}>💳</Text>
                <Text style={styles.dropdownSelectedText}>
                  {selectedWallet?.name || "Chọn ví..."}
                </Text>
              </View>
              <Text style={styles.dropdownArrow}>{walletDropdownOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {walletDropdownOpen && (
              <View style={styles.dropdownListBox}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                  {wallets
                    .map((w) => {
                      const isSelected = selectedWalletId === w.id;
                      return (
                        <TouchableOpacity
                          key={w.id}
                          style={[styles.dropdownItemRow, isSelected && styles.dropdownItemRowActive]}
                          onPress={() => {
                            setSelectedWalletId(w.id);
                            setWalletDropdownOpen(false);
                          }}
                        >
                          <View style={styles.catRowLeft}>
                            <Text style={{ fontSize: 18 }}>💳</Text>
                            <Text style={[styles.catNameText, isSelected && styles.catNameTextActive]}>
                              {w.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.checkBadge}>
                              <Text style={styles.checkBadgeText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Amount Input */}
        <Input
          label={type === "EXPENSE" ? "Số tiền chi (VND) *" : "Số tiền nạp vào ví (VND) *"}
          placeholder="VD: 100.000"
          keyboardType="numeric"
          value={amount}
          onChangeText={handleAmountChange}
        />

        {/* Category Selector (Vertical List & Dropdown) */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>
            {type === "EXPENSE" ? "Danh mục chi tiêu *" : "Nguồn thu nhập / Danh mục *"}
          </Text>
          {loadingCategories ? (
            <ActivityIndicator size="small" color={colors.indigo600} style={{ marginVertical: 12 }} />
          ) : (
            <View>
              {/* Dropdown Header */}
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownBtnLeft}>
                  <View style={{ marginRight: 8 }}>
                    <CategoryIcon name={selectedCategory ? selectedCategory.name : "Khác"} size={22} />
                  </View>
                  <Text style={styles.dropdownSelectedText}>
                    {selectedCategory ? selectedCategory.name : "Chọn danh mục..."}
                  </Text>
                </View>
                <Text style={styles.dropdownArrow}>{categoryDropdownOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {/* Vertical Category List */}
              {categoryDropdownOpen && (
                <View style={styles.dropdownListBox}>
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                    {filteredCategories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.dropdownItemRow, isSelected && styles.dropdownItemRowActive]}
                          onPress={() => {
                            setSelectedCategoryId(cat.id);
                            setCategoryDropdownOpen(false);
                          }}
                        >
                          <View style={styles.catRowLeft}>
                            <View style={{ marginRight: 10 }}>
                              <CategoryIcon name={cat.name} size={20} />
                            </View>
                            <Text style={[styles.catNameText, isSelected && styles.catNameTextActive]}>
                              {cat.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.checkBadge}>
                              <Text style={styles.checkBadgeText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Note */}
        <Input
          label="Ghi chú"
          placeholder={type === "EXPENSE" ? "VD: Highlands Coffee, Ăn trưa" : "VD: Tiền thưởng dự án, Nạp ví lương"}
          value={note}
          onChangeText={setNote}
        />

        <Button
          title={type === "EXPENSE" ? "Lưu giao dịch chi tiêu" : "Nạp tiền vào ví ngay 🚀"}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
          </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingTop: 8,
  },
  sectionBox: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate700,
    marginBottom: 8,
  },

  /* Dropdown Styles */
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.slate400,
    fontWeight: "800",
  },
  dropdownListBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    marginTop: 6,
    padding: 6,
    gap: 4,
  },
  dropdownItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  dropdownItemRowActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  catRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  catNameTextActive: {
    color: "#1D4ED8",
    fontWeight: "900",
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.emerald600,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },

  submitBtn: {
    marginTop: 12,
    marginBottom: 24,
  },
});
