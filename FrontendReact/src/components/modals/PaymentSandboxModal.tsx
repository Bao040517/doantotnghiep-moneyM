import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS } from "../../constants/banks";

interface PaymentSandboxModalProps {
  visible: boolean;
  debtInfo: {
    amount: number;
    toName: string;
    toBankBin?: string;
    toAccountNo?: string;
    toUserId?: string;
    groupName?: string;
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
  const [step, setStep] = useState<"review" | "processing" | "success">("review");
  const [otp, setOtp] = useState("123456");
  const [processStatus, setProcessStatus] = useState("Đang kết nối Ngân Hàng Sandbox...");
  const [txnCode] = useState(() => "SBX" + Math.floor(10000000 + Math.random() * 90000000));

  React.useEffect(() => {
    if (visible) {
      setStep("review");
      setOtp("123456");
    }
  }, [visible]);

  if (!debtInfo) return null;

  const bank = VIETQR_BANKS.find((b) => b.bin === debtInfo.toBankBin);
  const bankName = bank ? bank.shortName : "MBBank";
  const accountNo = debtInfo.toAccountNo || "10928888999";
  const accountName = (debtInfo.toName || "Người nhận").toUpperCase();
  const amountFormatted = debtInfo.amount.toLocaleString("vi-VN") + " ₫";

  const handleStartPayment = async () => {
    setStep("processing");
    setProcessStatus("1/3 Đang mở cổng kết nối Ngân Hàng Sandbox...");

    setTimeout(() => {
      setProcessStatus("2/3 Đang xác thực OTP & Trích tiền từ Tài khoản...");
    }, 1200);

    setTimeout(async () => {
      setProcessStatus("3/3 Đã chuyển tiền thành công! Đang lưu sổ nợ...");
      try {
        await onPaymentSuccess(debtInfo.amount, debtInfo.toUserId);
      } catch (e) {
        console.error("Payment sync error:", e);
      }
      setStep("success");
    }, 2400);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cổng Thanh Toán Sandbox 🏦">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Sandbox Badge Banner */}
        <View style={styles.sandboxBanner}>
          <Text style={styles.sandboxBannerIcon}>🧪</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sandboxBannerTitle}>CHẾ ĐỘ MÔ PHỎNG (PAYMENT SANDBOX)</Text>
            <Text style={styles.sandboxBannerSub}>
              Giao dịch thử nghiệm chuyển tiền trực tiếp giữa Ngân Hàng và User
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
                  Trấn nợ nhóm {debtInfo.groupName || "ShareMoney"}
                </Text>
              </View>
            </View>

            {/* Amount Box */}
            <View style={styles.amountBox}>
              <Text style={styles.amountBoxLabel}>Số tiền chuyển đi</Text>
              <Text style={styles.amountBoxValue}>{amountFormatted}</Text>
            </View>

            {/* OTP Input Simulation */}
            <View style={{ marginTop: 12 }}>
              <Input
                label="Mã OTP xác thực Sandbox (Default: 123456) *"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            {/* Primary Submit Button */}
            <View style={{ marginTop: 16, marginBottom: 20 }}>
              <Button
                title="Xác Nhận & Chuyển Tiền 🚀"
                variant="primary"
                onPress={handleStartPayment}
                style={{ paddingVertical: 16 }}
                textStyle={{ fontSize: 16, fontWeight: "900" }}
              />
            </View>
          </View>
        )}

        {step === "processing" && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={colors.indigo600} style={{ marginBottom: 16 }} />
            <Text style={styles.processingTitle}>Đang Thực Hiện Giao Dịch</Text>
            <Text style={styles.processingStatus}>{processStatus}</Text>
            <Text style={styles.processingSub}>Vui lòng không đóng màn hình trong giây lát...</Text>
          </View>
        )}

        {step === "success" && (
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Chuyển Tiền Thành Công!</Text>
            <Text style={styles.successAmount}>{amountFormatted}</Text>
            <Text style={styles.successRecipient}>Đã chuyển cho {accountName}</Text>

            <View style={styles.receiptCard}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Mã GD Ngân Hàng:</Text>
                <Text style={styles.receiptValue}>{txnCode}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Thời gian:</Text>
                <Text style={styles.receiptValue}>
                  {new Date().toLocaleTimeString("vi-VN")} - {new Date().toLocaleDateString("vi-VN")}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Trạng thái sổ nợ:</Text>
                <Text style={[styles.receiptValue, { color: colors.emerald600, fontWeight: "800" }]}>
                  ✓ Đã ghi nhận chuyển tiền
                </Text>
              </View>
            </View>

            <Button
              title="Hoàn Tất & Đóng 🎯"
              variant="primary"
              onPress={onClose}
              style={{ marginTop: 20, width: "100%", paddingVertical: 14 }}
            />
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
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
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
    color: "#1E40AF",
  },
  sandboxBannerSub: {
    fontSize: 10,
    color: "#3B82F6",
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
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 24,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.emerald50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
  },
  successAmount: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.emerald600,
    marginVertical: 4,
  },
  successRecipient: {
    fontSize: 13,
    color: colors.slate500,
    marginBottom: 16,
  },
  receiptCard: {
    width: "100%",
    backgroundColor: colors.slate50,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    gap: 8,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptLabel: {
    fontSize: 12,
    color: colors.slate500,
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },
});
