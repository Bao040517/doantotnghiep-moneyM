import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Transaction } from "../../types";
import { financialServices, Category } from "../../services/financialServices";
import { colors } from "../../constants/colors";

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onRefresh: () => void;
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

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
  onRefresh,
}) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && transaction) {
      setAmount(transaction.amount ? Math.round(transaction.amount).toLocaleString("vi-VN") : "");
      setNote(transaction.note || "");
      setSelectedCategoryId(transaction.categoryId || "");

      // Load categories
      setLoadingCategories(true);
      financialServices
        .getCategories()
        .then((data) => setCategories(data || []))
        .catch(() => setCategories([]))
        .finally(() => setLoadingCategories(false));
    }
  }, [visible, transaction]);

  const handleAmountChange = (text: string) => {
    const cleanDigits = text.replace(/\D/g, "");
    if (!cleanDigits) {
      setAmount("");
      return;
    }
    const formatted = parseInt(cleanDigits, 10).toLocaleString("vi-VN");
    setAmount(formatted);
  };

  const handleUpdate = async () => {
    const rawNumber = parseFloat(amount.replace(/\./g, "")) || 0;
    if (rawNumber <= 0 || !transaction) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      await financialServices.updateTransaction(transaction.id, {
        amount: rawNumber,
        categoryId: selectedCategoryId || transaction.categoryId,
        note,
        transactionDate: transaction.transactionDate,
      });
      Alert.alert("Thành công 🎉", "Đã cập nhật giao dịch!");
      onClose();
      onRefresh();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật giao dịch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    Alert.alert(
      "Xóa giao dịch",
      "Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được tự động cập nhật lại.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await financialServices.deleteTransaction(transaction.id);
              Alert.alert("Thành công", "Đã xóa giao dịch!");
              onClose();
              onRefresh();
            } catch (e: any) {
              Alert.alert("Lỗi", e.response?.data?.message || "Không thể xóa giao dịch");
            }
          },
        },
      ]
    );
  };

  const filteredCategories = categories.filter((c) => c.type === (transaction?.type || "EXPENSE"));

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Sửa Giao Dịch ✏️">
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
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

        {/* Note Input */}
        <Input
          label="Ghi chú"
          placeholder="VD: Highlands Coffee, Ăn trưa"
          value={note}
          onChangeText={setNote}
        />

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <Button
            title="🗑️ Xóa"
            variant="danger"
            onPress={handleDelete}
            style={{ flex: 1 }}
          />
          <Button
            title="Lưu thay đổi"
            variant="primary"
            onPress={handleUpdate}
            loading={submitting}
            style={{ flex: 2 }}
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
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    marginBottom: 24,
  },
});
