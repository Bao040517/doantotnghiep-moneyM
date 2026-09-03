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
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  // Edit form state (for Payer)
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [submitting, setSubmitting] = useState(false);

  // Revision request form state (for other members)
  const [proposedTitle, setProposedTitle] = useState("");
  const [proposedAmount, setProposedAmount] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

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

        // Pre-fill proposed fields if they exist
        setProposedTitle(data.proposedTitle || data.title || "");
        setProposedAmount(data.proposedAmount ? Math.round(data.proposedAmount).toLocaleString("vi-VN") : (data.amount ? Math.round(data.amount).toLocaleString("vi-VN") : ""));
        setRevisionNote(data.revisionNote || "");
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
      setIsRequestingRevision(false);
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

  const handleSendRevisionRequest = async () => {
    if (!revisionNote.trim() && !proposedTitle.trim() && !proposedAmount.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập ghi chú hoặc đề xuất thay đổi");
      return;
    }
    const rawProposedAmount = proposedAmount ? parseFloat(proposedAmount.replace(/\D/g, "")) : undefined;
    setSubmitting(true);
    try {
      await groupService.requestExpenseRevision(groupId, expenseId!, {
        proposedTitle: proposedTitle.trim() || undefined,
        proposedAmount: rawProposedAmount,
        revisionNote: revisionNote.trim() || undefined,
      });
      Alert.alert("Đã gửi yêu cầu 📨", "Yêu cầu chỉnh sửa đã được gửi đến chủ khoản chi để xác nhận.");
      setIsRequestingRevision(false);
      fetchDetail();
      onRefresh();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể gửi yêu cầu chỉnh sửa");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyProposedRevision = () => {
    if (detail?.proposedTitle) setTitle(detail.proposedTitle);
    if (detail?.proposedAmount) setAmount(Math.round(detail.proposedAmount).toLocaleString("vi-VN"));
    setIsEditing(true);
  };

  const handleRejectRevision = () => {
    Alert.alert(
      "Từ chối yêu cầu",
      "Bạn có chắc muốn từ chối yêu cầu chỉnh sửa này và giữ nguyên khoản chi?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.rejectExpenseRevision(groupId, expenseId!);
              Alert.alert("Thành công", "Đã từ chối yêu cầu chỉnh sửa.");
              fetchDetail();
              onRefresh();
            } catch (e: any) {
              Alert.alert("Lỗi", e.response?.data?.message || "Không thể từ chối yêu cầu");
            }
          },
        },
      ]
    );
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

  const getModalTitle = () => {
    if (isEditing) return "Chỉnh Sửa Khoản Chi";
    if (isRequestingRevision) return "Yêu Cầu Chỉnh Sửa";
    return "Chi Tiết Khoản Chi";
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={getModalTitle()}>
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
      ) : isRequestingRevision ? (
        <ScrollView style={styles.formContent}>
          <Text style={styles.revisionNoticeText}>
            💡 Nhập thông tin bạn muốn đề xuất thay đổi. Chủ khoản chi ({detail.payer?.name || "Người trả"}) sẽ nhận thông báo để xác nhận.
          </Text>
          <Input
            label="Tiêu đề đề xuất"
            placeholder="Ví dụ: Ăn trưa + Nước ngọt"
            value={proposedTitle}
            onChangeText={setProposedTitle}
          />
          <Input
            label="Số tiền đề xuất (VND)"
            keyboardType="numeric"
            placeholder="Nhập số tiền chính xác hơn"
            value={proposedAmount}
            onChangeText={(text) => {
              const raw = text.replace(/\D/g, "");
              setProposedAmount(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
            }}
          />
          <Input
            label="Ghi chú / Lý do chỉnh sửa *"
            placeholder="Ví dụ: Khoản này mình không ăn món thịt, chia lại giúp mình"
            value={revisionNote}
            onChangeText={setRevisionNote}
            multiline
            numberOfLines={3}
          />
          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={() => setIsRequestingRevision(false)} style={{ flex: 1 }} />
            <Button title="Gửi yêu cầu" variant="primary" onPress={handleSendRevisionRequest} loading={submitting} style={{ flex: 1.5 }} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* Revision Banner if pending revision */}
          {detail.isPendingRevision && (
            <View style={styles.pendingRevisionCard}>
              <View style={styles.revisionHeaderRow}>
                <Text style={styles.revisionIcon}>⚠️</Text>
                <Text style={styles.revisionCardTitle}>Đang có yêu cầu chỉnh sửa</Text>
              </View>
              <Text style={styles.revisionRequesterText}>
                Từ: <Text style={{ fontWeight: "800", color: "#B45309" }}>{detail.revisionRequester?.name || "Thành viên nhóm"}</Text>
              </Text>
              {detail.revisionNote ? (
                <Text style={styles.revisionNoteContent}>"{detail.revisionNote}"</Text>
              ) : null}
              {detail.proposedTitle || detail.proposedAmount ? (
                <View style={styles.proposedBox}>
                  <Text style={styles.proposedLabel}>Đề xuất:</Text>
                  {detail.proposedTitle ? <Text style={styles.proposedValue}>• Tên: {detail.proposedTitle}</Text> : null}
                  {detail.proposedAmount ? <Text style={styles.proposedValue}>• Tiền: {fmt(detail.proposedAmount)}</Text> : null}
                </View>
              ) : null}

              {detail.canEditDirectly ? (
                <View style={styles.revisionActionRow}>
                  <TouchableOpacity style={styles.acceptRevisionBtn} onPress={handleApplyProposedRevision}>
                    <Text style={styles.acceptRevisionText}>Áp dụng & Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectRevisionBtn} onPress={handleRejectRevision}>
                    <Text style={styles.rejectRevisionText}>Từ chối</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.waitingPayerNotice}>⏳ Đang chờ chủ khoản chi xem xét và cập nhật</Text>
              )}
            </View>
          )}

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
            {detail.canEditDirectly ? (
              <Button
                title="Sửa"
                variant="outline"
                onPress={() => setIsEditing(true)}
                style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}
                textStyle={{ fontSize: 14, fontWeight: "700" }}
              />
            ) : (
              <Button
                title="Yêu cầu chỉnh sửa"
                variant="outline"
                onPress={() => setIsRequestingRevision(true)}
                style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}
                textStyle={{ fontSize: 14, fontWeight: "700" }}
              />
            )}

            {detail.canDelete && (
              <Button
                title="Xóa"
                variant="danger"
                onPress={handleDelete}
                style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}
                textStyle={{ fontSize: 14, fontWeight: "700" }}
              />
            )}
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
  revisionNoticeText: {
    fontSize: 13,
    color: colors.slate600,
    backgroundColor: colors.indigo50,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    lineHeight: 18,
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
  pendingRevisionCard: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  revisionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  revisionIcon: {
    fontSize: 16,
  },
  revisionCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400E",
  },
  revisionRequesterText: {
    fontSize: 12,
    color: "#78350F",
    marginBottom: 4,
  },
  revisionNoteContent: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#92400E",
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  proposedBox: {
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  proposedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  proposedValue: {
    fontSize: 12,
    color: "#78350F",
    marginLeft: 4,
  },
  revisionActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  acceptRevisionBtn: {
    flex: 1,
    backgroundColor: "#D97706",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptRevisionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  rejectRevisionBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectRevisionText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  waitingPayerNotice: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
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

