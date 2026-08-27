import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { CheckCircle2, Download } from "lucide-react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { VIETQR_BANKS } from "../../constants/banks";
import { VietQRCard } from "../features/VietQRCard";
import { groupService } from "../../services/groupService";

interface PaymentSandboxModalProps {
  visible: boolean;
  debtInfo: {
    amount: number;
    toName?: string;
    toBankBin?: string;
    toAccountNo?: string;
    toUserId?: string;
    groupName?: string;
    groupId?: string;
    walletId?: string;
    categoryId?: string;
    budgetId?: string;
  } | null;
  onClose: () => void;
  onPaymentSuccess: (amount: number, toUserId?: string) => Promise<void>;
  /** Callback khi user muốn đổi người nhận */
  onChangePayee?: () => void;
}

export const PaymentSandboxModal: React.FC<PaymentSandboxModalProps> = ({
  visible,
  debtInfo,
  onClose,
  onPaymentSuccess,
  onChangePayee,
}) => {
  const [step, setStep] = useState<"pay" | "receipt">("pay");
  const [processing, setProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Actual transferred amount confirmation dialog state
  const [showAmountConfirm, setShowAmountConfirm] = useState(false);
  const [actualAmountText, setActualAmountText]   = useState("");
  const [actualAmount, setActualAmount]           = useState(0);

  useEffect(() => {
    if (!visible || !debtInfo) {
      return;
    }

    setStep("pay");
    setProcessing(false);
    setToastMsg(null);
    setShowAmountConfirm(false);
    setActualAmount(debtInfo.amount);
    setActualAmountText(debtInfo.amount.toString());
  }, [visible, debtInfo?.amount, debtInfo?.toUserId, debtInfo?.toAccountNo]);

  if (!debtInfo) return null;

  // Thông tin người nhận trực tiếp (P2P VietQR)
  const recipientBin     = debtInfo.toBankBin || "970422";
  const recipientAccNo   = debtInfo.toAccountNo || "";
  const recipientAccName = (debtInfo.toName || "Người thụ hưởng").toUpperCase();
  const directDesc       = `SM${Date.now().toString().slice(-6)}`;

  const recipientBankObj = VIETQR_BANKS.find((b) => b.bin === recipientBin);
  const recipientBankName = recipientBankObj?.shortName || (recipientBin ? `Ngân hàng (${recipientBin})` : "Ngân hàng");

  const showToast = (msg: string, duration = 3000) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), duration);
  };

  // Mở dialog xác nhận số tiền thực chuyển
  const handleOpenConfirmDialog = () => {
    setActualAmount(debtInfo.amount);
    setActualAmountText(debtInfo.amount.toString());
    setShowAmountConfirm(true);
  };

  // Xác nhận ghi nhận giao dịch với số tiền thực tế
  const handleConfirmActualAmount = async () => {
    const finalAmount = actualAmount > 0 ? actualAmount : debtInfo.amount;
    if (finalAmount <= 0) {
      Alert.alert("Số tiền không hợp lệ", "Vui lòng nhập số tiền lớn hơn 0 ₫");
      return;
    }
    setProcessing(true);
    try {
      await onPaymentSuccess(finalAmount, debtInfo.toUserId);
      setShowAmountConfirm(false);
      setStep("receipt");
    } catch {
      Alert.alert("Lỗi", "Không thể ghi nhận thanh toán. Vui lòng thử lại!");
    } finally {
      setProcessing(false);
    }
  };

  const handleCashNotify = async () => {
    if (!debtInfo.groupId || !debtInfo.toUserId) return;
    try {
      await groupService.notifyPayment(debtInfo.groupId, {
        toUserId: debtInfo.toUserId,
        amount: debtInfo.amount,
      });
      Alert.alert("Đã gửi thông báo 🎉", "Khoản nợ sẽ được gạch khi đối phương xác nhận.");
      onClose();
    } catch {
      Alert.alert("Thông báo", "Đã gửi thông báo thanh toán!");
      onClose();
    }
  };

  // ─── RECEIPT SCREEN ───
  if (step === "receipt") {
    return (
      <BottomSheet visible={visible} onClose={onClose} title="Thanh Toán Thành Công 🎉">
        <View style={styles.receiptBox}>
          <View style={styles.receiptIconWrap}>
            <CheckCircle2 size={52} color="#10B981" />
          </View>
          <Text style={styles.receiptAmount}>
            {(actualAmount || debtInfo.amount).toLocaleString("vi-VN")} <Text style={{ fontSize: 20, color: "#6366F1" }}>₫</Text>
          </Text>
          <Text style={styles.receiptLabel}>Đã chuyển thành công</Text>
          <Text style={styles.receiptTime}>
            {new Date().toLocaleTimeString("vi-VN")} • {new Date().toLocaleDateString("vi-VN")}
          </Text>

          <View style={styles.receiptCard}>
            {[
              { label: "Người nhận", value: recipientAccName },
              { label: "Ngân hàng", value: recipientBankName },
              { label: "Số tài khoản", value: recipientAccNo },
              { label: "Nội dung", value: directDesc },
              { label: "Phương thức", value: "VietQR Napas247 (Chuyển khoản trực tiếp)" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>{label}</Text>
                <Text style={styles.receiptRowValue} numberOfLines={1}>{value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>HOÀN TẤT & ĐÓNG</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }

  // ─── PAYMENT SCREEN ───
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Thanh toán khoản nợ">
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Toast thông báo */}
        {toastMsg && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        {/* ── 1. SỐ TIỀN THANH TOÁN ── */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>SỐ TIỀN THANH TOÁN</Text>
          <Text style={styles.amountValue}>
            {debtInfo.amount.toLocaleString("vi-VN")} <Text style={styles.amountUnit}>₫</Text>
          </Text>

          {onChangePayee && (
            <TouchableOpacity style={styles.changePayeeLink} onPress={onChangePayee} activeOpacity={0.75}>
              <Text style={styles.changePayeeLinkText}>🔄 Đổi người nhận / STK khác</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 2. HƯỚNG DẪN CHUYỂN TIỀN TRỰC TIẾP ── */}
        <View style={styles.directHintBox}>
          <Text style={styles.directHintText}>
            💡 Quét mã QR bằng App Ngân hàng bất kỳ để chuyển khoản nhanh Napas 24/7 tới <Text style={{ fontWeight: "800", color: "#1E293B" }}>{recipientBankName}</Text> - <Text style={{ fontWeight: "800", color: "#1E293B" }}>{recipientAccName}</Text>.
          </Text>
        </View>

        {/* ── 3. VIETQR CARD ── */}
        {recipientAccNo ? (
          <VietQRCard
            bankBin={recipientBin}
            accountNo={recipientAccNo}
            accountName={recipientAccName}
            amount={debtInfo.amount}
            description={directDesc}
            onCopySuccess={(msg) => showToast(msg)}
          />
        ) : (
          <View style={styles.emptyAccountBox}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🏦</Text>
            <Text style={styles.emptyAccountTitle}>Chưa có thông tin số tài khoản</Text>
            <Text style={styles.emptyAccountSub}>
              Người nhận chưa đăng ký STK nhận tiền. Vui lòng bấm "Đổi người nhận / STK khác" để nhập.
            </Text>
            {onChangePayee && (
              <TouchableOpacity style={styles.emptyAccountBtn} onPress={onChangePayee} activeOpacity={0.8}>
                <Text style={styles.emptyAccountBtnText}>➕ Nhập STK người nhận</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── 4. NÚT XÁC NHẬN ĐÃ CHUYỂN KHOẢN ── */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleOpenConfirmDialog}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>
                ✓ Xác nhận chuyển khoản ({debtInfo.amount.toLocaleString("vi-VN")} ₫)
              </Text>
              <Text style={styles.confirmBtnSub}>Chạm để xác nhận số tiền thực chuyển & gạch nợ</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── 5. PHƯƠNG THỨC TIỀN MẶT ── */}
        <TouchableOpacity
          style={styles.cashBtn}
          onPress={debtInfo.groupId && debtInfo.toUserId ? handleCashNotify : handleOpenConfirmDialog}
          activeOpacity={0.75}
        >
          <Text style={styles.cashBtnText}>💵 Xác nhận thanh toán tiền mặt</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── MODAL XÁC NHẬN SỐ TIỀN THỰC CHUYỂN ─── */}
      {showAmountConfirm && (
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalTitle}>Xác nhận số tiền thực chuyển</Text>
            <Text style={styles.confirmModalSub}>
              Nếu bạn đã sửa số tiền khi chuyển trong App Ngân hàng, hãy điều chỉnh tại đây để ghi sổ chính xác:
            </Text>

            <View style={styles.confirmInputBox}>
              <TextInput
                style={styles.confirmInput}
                value={actualAmountText}
                onChangeText={(text: string) => {
                  const num = text.replace(/[^0-9]/g, "");
                  setActualAmountText(num);
                  const parsed = parseInt(num, 10);
                  if (!isNaN(parsed) && parsed > 0) {
                    setActualAmount(parsed);
                  } else {
                    setActualAmount(0);
                  }
                }}
                keyboardType="numeric"
                autoFocus
                placeholder="Nhập số tiền..."
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.confirmInputUnit}>₫</Text>
            </View>

            {actualAmount > 0 && actualAmount !== debtInfo.amount && (
              <View style={styles.confirmDiffBox}>
                <Text style={styles.confirmDiffText}>
                  💡 Số tiền gốc: {debtInfo.amount.toLocaleString("vi-VN")} ₫{"\n"}
                  • Chênh lệch: {Math.abs(debtInfo.amount - actualAmount).toLocaleString("vi-VN")} ₫
                </Text>
              </View>
            )}

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowAmountConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmSubmitBtn, processing && { opacity: 0.6 }]}
                onPress={handleConfirmActualAmount}
                disabled={processing}
                activeOpacity={0.85}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmSubmitBtnText}>
                    ✓ Xác nhận ({(actualAmount > 0 ? actualAmount : debtInfo.amount).toLocaleString("vi-VN")} ₫)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 4 },

  toast: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 12,
  },
  toastText: { fontSize: 12, fontWeight: "700", color: "#065F46" },

  // Amount card
  amountCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  amountValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    textAlign: "center",
    marginTop: 2,
  },
  amountUnit: { fontSize: 20, color: "#6366F1", fontWeight: "700" },
  changePayeeLink: {
    marginTop: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    alignSelf: "center",
  },
  changePayeeLinkText: { fontSize: 11.5, fontWeight: "700", color: "#64748B" },

  directHintBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  directHintText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    textAlign: "center",
  },

  emptyAccountBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyAccountTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptyAccountSub: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyAccountBtn: {
    backgroundColor: "#6366F1",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyAccountBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  // Confirm Button
  confirmBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  confirmBtnSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 3,
  },

  // Cash button
  cashBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  cashBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },

  // Receipt
  receiptBox: {
    alignItems: "center",
    paddingVertical: 12,
  },
  receiptIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
  },
  receiptLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
    marginTop: 4,
  },
  receiptTime: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 2,
    marginBottom: 16,
  },
  receiptCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptRowLabel: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "600",
  },
  receiptRowValue: {
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  doneBtn: {
    width: "100%",
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Confirm amount overlay modal
  confirmModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 999,
  },
  confirmModalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  confirmModalSub: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    marginBottom: 12,
  },
  confirmInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    paddingVertical: 12,
  },
  confirmInputUnit: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6366F1",
  },
  confirmDiffBox: {
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  confirmDiffText: {
    fontSize: 11.5,
    color: "#92400E",
    lineHeight: 16,
    fontWeight: "600",
  },
  confirmModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  confirmSubmitBtn: {
    flex: 2,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
});
