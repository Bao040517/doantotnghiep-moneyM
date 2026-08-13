import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS } from "../../constants/banks";
import { vnpayService } from "../../services/vnpayService";

interface PaymentSandboxModalProps {
  visible: boolean;
  debtInfo: {
    amount: number;
    toName: string;
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
}

export const PaymentSandboxModal: React.FC<PaymentSandboxModalProps> = ({
  visible,
  debtInfo,
  onClose,
  onPaymentSuccess,
}) => {
  const [step, setStep] = useState<"review" | "vnpay_redirect">("review");
  const [txnCode] = useState(() => "SBX" + Math.floor(10000000 + Math.random() * 90000000));
  const [vnpayLoading, setVnpayLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setStep("review");
      setVnpayLoading(false);
    }
  }, [visible]);

  if (!debtInfo) return null;

  const bank = VIETQR_BANKS.find((b) => b.bin === debtInfo.toBankBin);
  const bankName = bank ? bank.shortName : "MBBank";
  const accountNo = debtInfo.toAccountNo || "10928888999";
  const accountName = (debtInfo.toName || "Người nhận").toUpperCase();
  const amountFormatted = debtInfo.amount.toLocaleString("vi-VN") + " ₫";

  // === THANH TOÁN QUA VNPAY SANDBOX THẬT ===
  const handleVNPayPayment = async () => {
    setVnpayLoading(true);
    try {
      const type = (debtInfo.budgetId || debtInfo.categoryId) ? "BUDGET" : "DEBT";
      const result = await vnpayService.createPayment(
        debtInfo.amount,
        debtInfo.groupId,
        debtInfo.toUserId,
        type,
        debtInfo.walletId,
        debtInfo.categoryId,
        debtInfo.budgetId
      );

      if (result.paymentUrl) {
        setStep("vnpay_redirect");
        // Mở trình duyệt bên ngoài để người dùng thao tác thanh toán trên VNPay
        await Linking.openURL(result.paymentUrl);
      }
    } catch (e: any) {
      console.error("[VNPay] Error creating payment URL:", e);
      setVnpayLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cổng Thanh Toán VNPay 🏦">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* VNPay Badge Banner */}
        <View style={styles.sandboxBanner}>
          <Text style={styles.sandboxBannerIcon}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sandboxBannerTitle}>THANH TOÁN TRỰC TUYẾN VNPAY</Text>
            <Text style={styles.sandboxBannerSub}>
              Kết nối trực tiếp đến cổng thanh toán VNPay an toàn và tiện lợi
            </Text>
          </View>
        </View>

        {step === "review" && (
          <View style={styles.contentBox}>
            {/* Bank & Recipient Card */}
            <View style={styles.bankCard}>
              <View style={styles.bankHeaderRow}>
                <View>
                  <Text style={styles.bankTitle}>{bankName} - Napas 247</Text>
                  <Text style={styles.accountNoText}>{accountNo}</Text>
                  <Text style={styles.accountNameText}>{accountName}</Text>
                </View>
                {bank?.logo ? (
                  <Image source={{ uri: bank.logo }} style={styles.bankLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.bankLogoFallback}>
                    <Text style={styles.bankLogoText}>MB</Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã giao dịch:</Text>
                <Text style={styles.infoValue}>{txnCode}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nội dung chuyển:</Text>
                <Text style={styles.infoValue}>
                  Trả nợ nhóm {debtInfo.groupName || "ShareMoney"}
                </Text>
              </View>
            </View>

            {/* Amount Box */}
            <View style={styles.amountBox}>
              <Text style={styles.amountBoxLabel}>Số tiền chuyển đi</Text>
              <Text style={styles.amountBoxValue}>{amountFormatted}</Text>
            </View>

            {/* === NÚT THANH TOÁN QUA VNPAY === */}
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={styles.vnpayButton}
                onPress={handleVNPayPayment}
                disabled={vnpayLoading}
                activeOpacity={0.8}
              >
                {vnpayLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.vnpayButtonText}>Thanh Toán Bằng VNPay</Text>
                    <Text style={styles.vnpayButtonSub}>Thẻ ATM, Visa, MasterCard, VNPAY-QR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 20 }} />
          </View>
        )}

        {step === "vnpay_redirect" && (
          <View style={styles.processingBox}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🌐</Text>
            <Text style={styles.processingTitle}>Đã mở cổng VNPay</Text>
            <Text style={styles.processingStatus}>
              Trình duyệt đã mở cổng thanh toán VNPay.{"\n"}
              Hãy hoàn tất thao tác thanh toán trên trình duyệt.
            </Text>
            <Text style={styles.processingSub}>
              Sau khi thanh toán xong, hệ thống sẽ tự động gạch nợ.
            </Text>
            <View style={{ marginTop: 20 }}>
              <Button
                title="Tải lại sổ nợ & Đóng"
                variant="primary"
                onPress={async () => {
                  // Chỉ gọi fetch lại, không tạo pending notifyPayment nữa
                  // vì Backend đã xử lý gạch nợ tự động qua Webhook
                  try {
                    await onPaymentSuccess(debtInfo.amount, undefined); // Truyền undefined để bỏ qua notify
                  } catch (e) {}
                  onClose();
                }}
                style={{ paddingVertical: 14, paddingHorizontal: 24 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  sandboxBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  sandboxBannerIcon: {
    fontSize: 22,
  },
  sandboxBannerTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#B91C1C",
  },
  sandboxBannerSub: {
    fontSize: 10,
    color: "#DC2626",
    marginTop: 1,
  },
  contentBox: {
    paddingBottom: 16,
  },
  bankCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  bankHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  accountNoText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.indigo600,
    marginTop: 2,
  },
  accountNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    marginTop: 1,
  },
  bankLogo: {
    width: 60,
    height: 30,
  },
  bankLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F43F5E",
    alignItems: "center",
    justifyContent: "center",
  },
  bankLogoText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.slate500,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },
  amountBox: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  amountBoxLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
  },
  amountBoxValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.indigo700,
    marginTop: 2,
  },
  vnpayButton: {
    backgroundColor: "#CF0A2C",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  vnpayButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  vnpayButtonSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  processingBox: {
    alignItems: "center",
    paddingVertical: 36,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 8,
  },
  processingStatus: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.indigo600,
    marginBottom: 4,
    textAlign: "center",
  },
  processingSub: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: "center",
  },
});
