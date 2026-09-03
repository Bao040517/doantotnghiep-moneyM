import React from "react";
import { View, StyleSheet, ScrollView, Text, Share } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Transaction } from "../../types";
import { colors } from "../../constants/colors";
import { CategoryIcon } from "../ui/CategoryIcon";

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  if (!transaction) return null;

  const isIncome = transaction.type === "INCOME";
  const amountFormatted = Math.round(Number(transaction.amount) || 0).toLocaleString("vi-VN") + " ₫";
  const catName = transaction.categoryName || (transaction as any).category?.name || "Khác";

  const isCash =
    transaction.paymentMethod === "CASH" ||
    (transaction.note && (transaction.note.includes("tiền mặt") || transaction.note.includes("Tiền mặt")));

  const formatDateStr = (rawDateStr?: string) => {
    if (!rawDateStr) return "";
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return rawDateStr;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const DD = String(d.getDate()).padStart(2, "0");
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const YYYY = d.getFullYear();
      return `${hh}:${mm} - ${DD}/${MM}/${YYYY}`;
    } catch (e) {
      return rawDateStr;
    }
  };

  const invoiceCode = transaction.id
    ? `#HD-${transaction.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
    : `#HD-${Date.now().toString().slice(-6)}`;

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: `🧾 HÓA ĐƠN GIAO DỊCH SHAREMONEY\n- Mã HĐ: ${invoiceCode}\n- Số tiền: ${isIncome ? "+" : "-"}${amountFormatted}\n- Danh mục: ${catName}\n- Hình thức: ${isCash ? "Đã thanh toán" : "Chuyển khoản VietQR"}\n- Nội dung: ${transaction.note || catName}\n- Thời gian: ${formatDateStr(transaction.transactionDate || transaction.createdAt)}`,
      });
    } catch (e) {}
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Chi Tiết Hóa Đơn 🧾">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ─── HERO AMOUNT & STATUS CARD ─── */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isIncome ? "#ECFDF5" : "#FFF1F2" },
            ]}
          >
            <CategoryIcon name={catName} size={32} />
          </View>

          <Text
            style={[
              styles.amountText,
              { color: isIncome ? colors.emerald600 : colors.rose600 },
            ]}
          >
            {isIncome ? "+" : "-"}
            {amountFormatted}
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>✓ Giao dịch thành công</Text>
          </View>

          <Text style={styles.dateText}>
            {formatDateStr(transaction.transactionDate || transaction.createdAt)}
          </Text>
        </View>

        {/* ─── RECEIPT DETAILS TICKET ─── */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptHeaderTitle}>THÔNG TIN HÓA ĐƠN</Text>
            <Text style={styles.invoiceCodeText}>{invoiceCode}</Text>
          </View>

          <View style={styles.divider} />

          {/* Row: Loại giao dịch */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Loại giao dịch</Text>
            <View style={styles.detailValueRow}>
              <Text
                style={[
                  styles.detailValueBold,
                  { color: isIncome ? colors.emerald600 : colors.slate800 },
                ]}
              >
                {isIncome ? "Khoản thu nhập" : "Khoản chi tiêu"}
              </Text>
            </View>
          </View>

          {/* Row: Hình thức thanh toán */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hình thức</Text>
            <View style={styles.detailValueRow}>
              {isCash ? (
                <View style={styles.cashBadge}>
                  <Text style={styles.cashBadgeText}>💵 Đã thanh toán</Text>
                </View>
              ) : (
                <View style={styles.transferBadge}>
                  <Text style={styles.transferBadgeText}>⚡ Chuyển khoản VietQR</Text>
                </View>
              )}
            </View>
          </View>

          {/* Row: Danh mục */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Danh mục</Text>
            <View style={styles.detailValueRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{catName}</Text>
              </View>
            </View>
          </View>

          {/* Row: Nội dung / Ghi chú (Bố trí dọc thông thoáng khi nội dung dài) */}
          <View style={styles.noteSection}>
            <Text style={styles.detailLabel}>Nội dung</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                {transaction.note || catName || "Chi tiêu thông thường"}
              </Text>
            </View>
          </View>

          {/* Row: Người nhận (nếu có) */}
          {transaction.payeeName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Người nhận</Text>
              <Text style={styles.detailValueBold}>{transaction.payeeName}</Text>
            </View>
          ) : null}

          {/* Row: Ví nguồn (nếu có) */}
          {transaction.walletName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tài khoản nguồn</Text>
              <Text style={styles.detailValue}>💳 {transaction.walletName}</Text>
            </View>
          ) : null}

          {/* Row: Khoản chi nhóm (nếu có) */}
          {transaction.linkedExpenseId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nguồn gốc</Text>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>👥 Hóa đơn chia tiền nhóm</Text>
              </View>
            </View>
          ) : null}

          {/* Row: Ngân sách liên kết (nếu có) */}
          {transaction.linkedBudgetId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sổ ngân sách</Text>
              <View style={styles.budgetBadge}>
                <Text style={styles.budgetBadgeText}>🎯 Đã khớp ngân sách</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 14,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  amountText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statusPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 6,
  },
  statusPillText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 13,
    color: colors.slate500,
    fontWeight: "500",
  },
  receiptCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 28,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  receiptHeaderTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  invoiceCodeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.indigo600,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  noteSection: {
    paddingVertical: 8,
  },
  noteBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  noteText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate800,
    lineHeight: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.slate600,
    fontWeight: "600",
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailValue: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "600",
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
  },
  cashBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cashBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  transferBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  transferBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.indigo700,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },
  groupBadge: {
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7E22CE",
  },
  budgetBadge: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  budgetBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
});
