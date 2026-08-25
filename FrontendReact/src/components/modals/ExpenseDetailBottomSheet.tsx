import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { groupService } from "../../services/groupService";
import { colors } from "../../constants/colors";

interface ExpenseDetailBottomSheetProps {
  visible: boolean;
  groupId: string;
  expenseId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ExpenseDetailBottomSheet: React.FC<ExpenseDetailBottomSheetProps> = ({
  visible,
  groupId,
  expenseId,
  onClose,
  onRefresh,
}) => {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!groupId || !expenseId) return;
    setLoading(true);
    try {
      const data = await groupService.getExpenseDetail(groupId, expenseId);
      setDetail(data);
      if (data) {
        setTitle(data.title || "");
        setAmount(data.amount ? Math.round(data.amount).toLocaleString("vi-VN") : "");
        setCategory(data.category || "Ăn uống");
      }
    } catch (e) {
      console.log("Error loading expense detail:", e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && expenseId) {
      setIsEditing(false);
      fetchDetail();
    }
  }, [visible, expenseId]);

  const handleUpdate = async () => {
    const rawNumber = parseFloat(amount.replace(/\D/g, "")) || 0;
    if (!title.trim() || rawNumber <= 0 || !expenseId) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề và số tiền hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      await groupService.updateExpense(groupId, expenseId, {
        paidBy: detail?.payer?.id || "",
        title: title.trim(),
        amount: rawNumber,
        category,
        splitUserIds: detail?.splits?.map((s: any) => s.user?.id || s.id) || [],
      });
      Alert.alert("Thành công 🎉", "Đã cập nhật khoản chi tiêu!");
      setIsEditing(false);
      fetchDetail();
      onRefresh();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật khoản chi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!expenseId) return;
    Alert.alert(
      "Xóa khoản chi",
      "Bạn có chắc chắn muốn xóa khoản chi này? Các khoản nợ liên quan sẽ được tự động hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.deleteExpense(groupId, expenseId);
              Alert.alert("Thành công", "Đã xóa khoản chi!");
              onClose();
              onRefresh();
            } catch (e: any) {
              Alert.alert("Lỗi", e.response?.data?.message || "Không thể xóa khoản chi");
            }
          },
        },
      ]
    );
  };

  const fmt = (n?: number) => (Math.abs(Math.round(Number(n) || 0))).toLocaleString("vi-VN") + " ₫";

  return (
    <BottomSheet visible={visible} onClose={onClose} title={isEditing ? "Chỉnh Sửa Khoản Chi" : "Chi Tiết Khoản Chi 🧾"}>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.indigo600} />
          <Text style={styles.loadingText}>Đang tải chi tiết khoản chi...</Text>
        </View>
      ) : !detail ? (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Không tìm thấy thông tin khoản chi</Text>
        </View>
      ) : isEditing ? (
        <ScrollView style={styles.formContent}>
          <Input label="Tiêu đề khoản chi *" value={title} onChangeText={setTitle} />
          <Input
            label="Số tiền (VND) *"
            keyboardType="numeric"
            value={amount}
            onChangeText={(text) => {
              const raw = text.replace(/\D/g, "");
              setAmount(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
            }}
          />
          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={() => setIsEditing(false)} style={{ flex: 1 }} />
            <Button title="Lưu thay đổi" variant="primary" onPress={handleUpdate} loading={submitting} style={{ flex: 1.5 }} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* Header summary */}
          <View style={styles.heroBox}>
            <Text style={styles.heroTitle}>{detail.title}</Text>
            <Text style={styles.heroAmount}>{fmt(detail.amount)}</Text>
            <View style={styles.payerBadge}>
              <Text style={styles.payerText}>👤 Người trả: {detail.payer?.name || "Thành viên"}</Text>
            </View>
          </View>

          {/* Split details list */}
          <Text style={styles.sectionHeader}>Danh sách chia tiền ({detail.splits?.length || 0} người)</Text>
          <View style={styles.splitsContainer}>
            {detail.splits?.map((item: any, idx: number) => (
              <View key={item.id || idx} style={styles.splitRow}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarText}>{(item.user?.name || "U").charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.splitName}>{item.user?.name || "Thành viên"}</Text>
                  <Text style={styles.splitStatus}>
                    {item.isSettled ? "✓ Đã quyết toán" : "⏳ Chưa quyết toán"}
                  </Text>
                </View>
                <Text style={styles.splitAmount}>{fmt(item.amountOwed)}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Button
              title="✏️ Sửa"
              variant="outline"
              onPress={() => setIsEditing(true)}
              style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}
              textStyle={{ fontSize: 14, fontWeight: "700" }}
            />
            <Button
              title="🗑️ Xóa"
              variant="danger"
              onPress={handleDelete}
              style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}
              textStyle={{ fontSize: 14, fontWeight: "700" }}
            />
          </View>
        </ScrollView>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 32,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 8,
  },
  formContent: {
    paddingTop: 4,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  detailContent: {
    paddingTop: 4,
  },
  heroBox: {
    backgroundColor: colors.slate50,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.emerald600,
    marginBottom: 8,
  },
  payerBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  payerText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate700,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 10,
  },
  splitsContainer: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 8,
    marginBottom: 20,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.indigo50,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.indigo600,
  },
  splitName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate900,
  },
  splitStatus: {
    fontSize: 11,
    color: colors.slate400,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
});
