import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { TransactionPayload, Wallet } from "../../types";
import { financialServices, Category } from "../../services/financialServices";
import { colors } from "../../constants/colors";

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onAddTransaction: (walletId: string, payload: Omit<TransactionPayload, "walletId">) => Promise<void>;
  defaultType?: "EXPENSE" | "INCOME";
}

const CATEGORY_ICONS: Record<string, string> = {
  "Ăn uống": "🍽️",
  "Chi tiêu hàng ngày": "🧴",
  "Quần áo": "👕",
  "Phí giao lưu": "🥂",
  "Mỹ phẩm": "💄",
  "Tiền nhà": "🏠",
  "Tiền điện": "💡",
  "Đi lại": "🚆",
  "Phí liên lạc": "📱",
  "Y tế": "💊",
  "Giáo dục": "📚",
  "Mục tiêu tiết kiệm": "🎯",
  "Trả nợ nhóm": "💸",
  "Lương": "💰",
  "Thưởng": "🎁",
  "Thu nhập khác": "📥",
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  wallets,
  onAddTransaction,
  defaultType = "EXPENSE",
}) => {
  const [type, setType] = useState<"EXPENSE" | "INCOME">(defaultType);
  const [amount, setAmount] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Sync walletId when wallets prop changes
  useEffect(() => {
    if (wallets.length > 0 && !selectedWalletId) {
      const nonLiabilityWallet = wallets.find((w) => !w.isLiability);
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

  // Reset type when defaultType changes
  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

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
    if (rawNumber <= 0) return;
    if (!selectedWalletId) return;
    if (!selectedCategoryId) return;

    setLoading(true);
    try {
      await onAddTransaction(selectedWalletId, {
        categoryId: selectedCategoryId,
        amount: rawNumber,
        type,
        note,
        transactionDate: new Date().toISOString().split("T")[0],
      });
      setAmount("");
      setNote("");
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={type === "EXPENSE" ? "Thêm Giao Dịch Chi Tiêu" : "Thêm Giao Dịch Thu Nhập"}
    >
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <View style={styles.tabRow}>
          <Button
            title="💸 Chi tiêu"
            variant={type === "EXPENSE" ? "danger" : "secondary"}
            onPress={() => setType("EXPENSE")}
            style={styles.flexTab}
          />
          <Button
            title="💵 Thu nhập"
            variant={type === "INCOME" ? "primary" : "secondary"}
            onPress={() => setType("INCOME")}
            style={styles.flexTab}
          />
        </View>

        {/* Wallet Selector */}
        {wallets.length > 1 && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>Chọn ví thanh toán</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {wallets
                .filter((w) => !w.isLiability)
                .map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setSelectedWalletId(w.id)}
                    style={[styles.pill, selectedWalletId === w.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, selectedWalletId === w.id && styles.pillTextActive]}>
                      💳 {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Amount Input */}
        <Input
          label="Số tiền (VND) *"
          placeholder="VD: 100.000"
          keyboardType="numeric"
          value={amount}
          onChangeText={handleAmountChange}
        />

        {/* Category Selector */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>Danh mục *</Text>
          {loadingCategories ? (
            <ActivityIndicator size="small" color={colors.indigo600} style={{ marginVertical: 12 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[styles.pill, selectedCategoryId === cat.id && styles.pillActive]}
                >
                  <Text style={[styles.pillText, selectedCategoryId === cat.id && styles.pillTextActive]}>
                    {CATEGORY_ICONS[cat.name] || "📊"} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Note */}
        <Input
          label="Ghi chú"
          placeholder="VD: Highlands Coffee, Ăn trưa"
          value={note}
          onChangeText={setNote}
        />

        <Button
          title="Lưu giao dịch"
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  flexTab: {
    flex: 1,
    paddingVertical: 10,
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
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  pillActive: {
    backgroundColor: colors.indigo600,
    borderColor: colors.indigo600,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate700,
  },
  pillTextActive: {
    color: colors.white,
  },
  submitBtn: {
    marginTop: 12,
    marginBottom: 24,
  },
});
