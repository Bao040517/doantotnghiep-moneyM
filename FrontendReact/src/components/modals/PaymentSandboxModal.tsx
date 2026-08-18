import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Platform,
  Clipboard,
  TextInput,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import QRCode from "react-native-qrcode-svg";
import { CheckCircle2, Wallet, Copy, Check, Zap } from "lucide-react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS } from "../../constants/banks";
import { VietQRCard } from "../features/VietQRCard";
import { groupService } from "../../services/groupService";
import { payosService } from "../../services/paymentLinkService";

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loadingPayOS, setLoadingPayOS] = useState(false); // true khi đang chờ PayOS API

  // Actual transferred amount confirmation dialog state
  const [showAmountConfirm, setShowAmountConfirm] = useState(false);
  const [actualAmountText, setActualAmountText]   = useState("");
  const [actualAmount, setActualAmount]           = useState(0);

  // PayOS state
  const [payosData, setPayosData] = useState<{
    orderCode: string | number;
    description: string;
    checkoutUrl: string;
    accountNumber: string;
    accountName: string;
    bin: string;
    qrCode: string;
  } | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  useEffect(() => {
    if (!visible || !debtInfo) { clearPolling(); return; }

    clearPolling();
    setStep("pay");
    setProcessing(false);
    setToastMsg(null);
    setCopiedField(null);
    setLoadingPayOS(true); // Bắt đầu loading PayOS
    setShowAmountConfirm(false);
    setActualAmount(debtInfo.amount);
    setActualAmountText(debtInfo.amount.toString());

    // Hiển thị ngay với thông tin người nhận từ debtInfo (fallback nếu PayOS chưa xong)
    const fallbackCode = Date.now().toString().slice(-8);
    const fallbackDesc = `SM${Date.now().toString().slice(-6)}`;
    setPayosData({
      orderCode: fallbackCode,
      description: fallbackDesc,
      checkoutUrl: "",
      accountNumber: debtInfo.toAccountNo || "",
      accountName:   debtInfo.toName     || "",
      bin:           debtInfo.toBankBin  || "",
      qrCode: "", // chưa có QR của PayOS
    });

    // Gọi PayOS nền để lấy checkoutUrl + polling
    (async () => {
      try {
        const safeGroup = (debtInfo.groupName || "nhom")
          .replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 15);
        const res = await payosService.createPaymentLink({
          productName: debtInfo.groupName || "ShareMoney",
          description: `ShareMoney ${safeGroup}`.trim(),
          price:      debtInfo.amount,
          groupId:    debtInfo.groupId,
          toUserId:   debtInfo.toUserId,
          walletId:   debtInfo.walletId,
          categoryId: debtInfo.categoryId,
          budgetId:   debtInfo.budgetId,
        });

        const orderCode = res.orderCode || res.txnRef || fallbackCode;
        setPayosData({
          orderCode,
          description:   res.description   || fallbackDesc,
          checkoutUrl:   res.checkoutUrl   || "",
          accountNumber: res.accountNumber || debtInfo.toAccountNo || "",
          accountName:   res.accountName   || debtInfo.toName      || "",
          bin:           res.bin           || debtInfo.toBankBin   || "",
          qrCode:        res.qrCode        || "", // ← QR thật từ PayOS
        });
        setLoadingPayOS(false); // PayOS đã trả về QR

        if (res.checkoutUrl) {
          showToast("✅ Đã kết nối PayOS — bấm nút xanh để mở trang thanh toán.");
        }

        // Polling webhook tự động
        pollingRef.current = setInterval(async () => {
          try {
            const statusRes = await payosService.getOrder(String(orderCode));
            if (statusRes?.status === "SUCCESS") {
              clearPolling();
              await onPaymentSuccess(debtInfo.amount, debtInfo.toUserId);
              setStep("receipt");
            }
          } catch (_) {}
        }, 2000);

        timeoutRef.current = setTimeout(() => {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        }, 15 * 60 * 1000);
      } catch (e) {
        console.error("[PayOS] Lỗi lấy link:", e);
        setLoadingPayOS(false);
      }
    })();

    return () => clearPolling();
  }, [visible, debtInfo?.amount, debtInfo?.toUserId]);

  if (!debtInfo) return null;

  // Resolve thông tin hiển thị — ưu tiên payosData (từ PayOS API), fallback về debtInfo
  const displayBin     = payosData?.bin           || debtInfo.toBankBin  || "";
  const displayAccNo   = payosData?.accountNumber || debtInfo.toAccountNo || "";
  const displayAccName = (payosData?.accountName  || debtInfo.toName      || "").toUpperCase();
  const displayDesc    = payosData?.description   || `SM${Date.now().toString().slice(-6)}`;

  const bank     = VIETQR_BANKS.find((b) => b.bin === displayBin);
  const bankName = bank?.shortName || (displayBin ? displayBin : "Ngân hàng");

  const showToast = (msg: string, duration = 4000) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), duration);
  };

  const handleCopy = (text: string, label: string) => {
    try { Clipboard.setString(text); } catch {}
    setCopiedField(label);
    showToast(`✅ Đã sao chép ${label}!`, 2000);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenPayOS = async () => {
    const url = payosData?.checkoutUrl;
    if (!url) {
      Alert.alert("Chưa có link PayOS", "Hệ thống đang xử lý. Vui lòng quét mã QR bên dưới.");
      return;
    }
    setLoadingCheckout(true);
    try {
      const result = await WebBrowser.openBrowserAsync(url, {
        controlsColor: "#6366F1",
        toolbarColor: "#0F172A",
        showTitle: true,
      });
      if (result.type === "dismiss" || result.type === "cancel") {
        showToast("Đã đóng trang PayOS. Nếu đã chuyển tiền, bấm xác nhận bên dưới ✓");
      }
    } catch {
      Alert.alert("Lỗi", "Không mở được trang PayOS.");
    } finally {
      setLoadingCheckout(false);
    }
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
      clearPolling();
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
          {/* Receipt Amount */}
          <Text style={styles.receiptAmount}>
            {(actualAmount || debtInfo.amount).toLocaleString("vi-VN")} <Text style={{ fontSize: 20, color: "#6366F1" }}>₫</Text>
          </Text>
          <Text style={styles.receiptLabel}>Đã chuyển thành công</Text>
          <Text style={styles.receiptTime}>
            {new Date().toLocaleTimeString("vi-VN")} • {new Date().toLocaleDateString("vi-VN")}
          </Text>

          <View style={styles.receiptCard}>
            {[
              { label: "Người nhận", value: displayAccName },
              { label: "Ngân hàng", value: bankName },
              { label: "Số tài khoản", value: displayAccNo },
              { label: "Nội dung", value: displayDesc },
              { label: "Mã đơn", value: `#${payosData?.orderCode || "SM2026"}` },
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
    <BottomSheet visible={visible} onClose={onClose} title="Thanh toán chuyển khoản 💳">
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. SỐ TIỀN THANH TOÁN (GỌN GÀNG) ── */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>SỐ TIỀN THANH TOÁN ĐỀ XUẤT</Text>
          <Text style={styles.amountValue}>
            {debtInfo.amount.toLocaleString("vi-VN")} <Text style={styles.amountUnit}>₫</Text>
          </Text>

          {/* Đổi người nhận */}
          {onChangePayee && (
            <TouchableOpacity style={styles.changePayeeLink} onPress={onChangePayee} activeOpacity={0.75}>
              <Text style={styles.changePayeeLinkText}>🔄 Đổi người nhận / STK khác</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 2. MÃ QR PAYOS (nếu có) hoặc VietQR (fallback) ── */}
        {loadingPayOS ? (
          /* Skeleton: đang chờ PayOS API trả QR */
          <View style={styles.qrLoadingCard}>
            <View style={styles.qrLoadingHeader}>
              <Image
                source={{ uri: "https://payos.vn/docs/img/logo.svg" }}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
              <Text style={styles.qrLoadingTitle}>PayOS đang tạo mã QR...</Text>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
            <View style={styles.qrSkeletonBox}>
              <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 32 }} />
              <Text style={styles.qrSkeletonText}>Trong khi chờ, quét mã bên dưới để chuyển trước</Text>
            </View>
            {/* VietQR fallback khi PayOS chưa load */}
            <VietQRCard
              bankBin={displayBin}
              accountNo={displayAccNo}
              accountName={displayAccName}
              amount={debtInfo.amount}
              description={displayDesc}
              onCopySuccess={(msg) => showToast(msg)}
            />
          </View>
        ) : payosData?.qrCode ? (
          /* ⭐ PayOS QR thật — cẩn thận: qrCode là chuỗi EMVCo từ PayOS */
          <View style={styles.payosQrCard}>
            {/* Header PayOS */}
            <View style={styles.payosQrHeader}>
              <Image
                source={{ uri: "https://payos.vn/docs/img/logo.svg" }}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
              <Text style={styles.payosQrHeaderText}>Mã QR Chính Thức PayOS</Text>
              <View style={styles.payosLiveBadge}>
                <Zap size={10} color="#fff" />
                <Text style={styles.payosLiveBadgeText}>LIVE</Text>
              </View>
            </View>

            {/* QR box */}
            <View style={styles.payosQrBox}>
              <QRCode
                value={payosData.qrCode}
                size={210}
                color="#0F172A"
                backgroundColor="#ffffff"
                logo={{ uri: "https://payos.vn/docs/img/logo.svg" }}
                logoSize={36}
                logoBackgroundColor="#fff"
                logoBorderRadius={8}
              />
            </View>

            {/* Bank + account info */}
            <View style={styles.payosQrInfo}>
              <Text style={styles.payosQrBankName}>{bankName} • Napas 247</Text>
              <Text style={styles.payosQrAccNo}>{displayAccNo}</Text>
              <Text style={styles.payosQrAccName}>{displayAccName}</Text>
            </View>

            {/* Copy actions */}
            <View style={styles.payosQrActions}>
              <TouchableOpacity
                style={styles.payosQrActionBtn}
                onPress={() => handleCopy(displayAccNo, "Số tài khoản")}
                activeOpacity={0.7}
              >
                {copiedField === "Số tài khoản"
                  ? <Check size={13} color="#10B981" />
                  : <Copy size={13} color="#6366F1" />}
                <Text style={styles.payosQrActionText}>
                  {copiedField === "Số tài khoản" ? "Đã chép STK" : "Chep STK"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.payosQrActionBtn}
                onPress={() => handleCopy(displayDesc, "Nội dung")}
                activeOpacity={0.7}
              >
                {copiedField === "Nội dung"
                  ? <Check size={13} color="#10B981" />
                  : <Copy size={13} color="#6366F1" />}
                <Text style={styles.payosQrActionText}>
                  {copiedField === "Nội dung" ? "Đã chép" : "Chép Nội dung"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.payosQrActionBtn}
                onPress={() => handleCopy(payosData.qrCode, "Mã QR")}
                activeOpacity={0.7}
              >
                {copiedField === "Mã QR"
                  ? <Check size={13} color="#10B981" />
                  : <Copy size={13} color="#6366F1" />}
                <Text style={styles.payosQrActionText}>
                  {copiedField === "Mã QR" ? "Đã chép" : "Chép mã QR"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PayOS footnote */}
            <Text style={styles.payosQrFooter}>
              🛡️ Quét bằng bất kỳ App Ngân hàng, VNPAY hoặc MoMo
            </Text>
          </View>
        ) : (
          /* Fallback: PayOS không trả qrCode — dùng VietQR tự tạo */
          <VietQRCard
            bankBin={displayBin}
            accountNo={displayAccNo}
            accountName={displayAccName}
            amount={debtInfo.amount}
            description={displayDesc}
            onCopySuccess={(msg) => showToast(msg)}
          />
        )}

        {/* ── 3. NÚT MỞ TRANG PAYOS ── */}
        {payosData?.checkoutUrl ? (
          <TouchableOpacity
            style={styles.payosBtn}
            onPress={handleOpenPayOS}
            disabled={loadingCheckout}
            activeOpacity={0.85}
          >
            {loadingCheckout ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.payosBtnText}>🌐 Mở Trang Thanh Toán PayOS</Text>
                <Text style={styles.payosBtnSub}>Chrome tích hợp — không màn trắng ✓</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* ── 4. XÁC NHẬN ĐÃ CHUYỂN ── */}
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
                ✓ Tôi đã chuyển khoản ({debtInfo.amount.toLocaleString("vi-VN")} ₫)
              </Text>
              <Text style={styles.confirmBtnSub}>Chạm để xác nhận số tiền thực chuyển & gạch nợ</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── 5. PHƯƠNG THỨC KHÁC ── */}
        <View style={styles.altRow}>
          <TouchableOpacity style={styles.altBtn} onPress={handleOpenConfirmDialog} activeOpacity={0.7}>
            <Wallet size={15} color="#D97706" />
            <Text style={styles.altBtnText}>Trừ Ví ShareMoney</Text>
          </TouchableOpacity>

          {debtInfo.groupId && debtInfo.toUserId && (
            <TouchableOpacity
              style={[styles.altBtn, { backgroundColor: "#F1F5F9" }]}
              onPress={handleCashNotify}
              activeOpacity={0.7}
            >
              <Text style={styles.altBtnText}>💵 Báo trả tiền mặt</Text>
            </TouchableOpacity>
          )}
        </View>
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

            {/* Hiển thị so sánh */}
            {actualAmount > 0 && actualAmount !== debtInfo.amount && (
              <View style={styles.confirmDiffBox}>
                <Text style={styles.confirmDiffText}>
                  💡 Hạn mức ngân sách: {debtInfo.amount.toLocaleString("vi-VN")} ₫{"\n"}
                  • Còn lại sau khi trả: {Math.max(0, debtInfo.amount - actualAmount).toLocaleString("vi-VN")} ₫
                </Text>
              </View>
            )}

            {/* Action buttons */}
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

// ─── Sub component: Info row với nút copy ───
const InfoRow = ({
  label, value, bold, highlight, copyable, onCopy, copied,
}: {
  label: string; value: string; bold?: boolean; highlight?: boolean;
  copyable?: boolean; onCopy?: () => void; copied?: boolean;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
      <Text
        style={[styles.infoValue, bold && { fontWeight: "900", color: "#0F172A" }, highlight && { color: "#6366F1", fontWeight: "900" }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {copyable && onCopy && (
        <TouchableOpacity onPress={onCopy} activeOpacity={0.7} style={styles.copyBtn}>
          {copied ? (
            <Check size={13} color="#10B981" />
          ) : (
            <Copy size={13} color="#6366F1" />
          )}
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 4 },

  // Toast
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

  // Amount card (gọn gàng, cho phép chỉnh sửa số tiền)
  amountCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  amountHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  editAmountBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  editAmountBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  amountUnit: { fontSize: 20, color: "#6366F1", fontWeight: "700" },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#6366F1",
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginVertical: 4,
  },
  amountInput: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    minWidth: 140,
    paddingVertical: 4,
  },
  amountInputUnit: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6366F1",
    marginLeft: 4,
  },
  amountDiffHint: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignSelf: "center",
  },
  amountDiffHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  changePayeeLink: {
    marginTop: 10,
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
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  infoLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  infoValue: { fontSize: 13, color: "#334155", fontWeight: "700", textAlign: "right", flexShrink: 1 },
  copyBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  changeBtn: {
    marginTop: 12,
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderColor: "#C4B5FD",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  changeBtnText: { fontSize: 13, fontWeight: "800", color: "#7C3AED" },

  // PayOS button
  payosBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  payosBtnText: { fontSize: 15, fontWeight: "900", color: "#fff" },
  payosBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginTop: 2 },

  // Confirm button
  confirmBtn: {
    backgroundColor: "#059669",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 0.2 },
  confirmBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "600", marginTop: 3 },

  // Alt methods
  altRow: { flexDirection: "row", gap: 8 },
  altBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingVertical: 11,
  },
  altBtnText: { fontSize: 12, fontWeight: "800", color: "#92400E" },

  // Receipt
  receiptBox: { alignItems: "center", paddingHorizontal: 4, paddingBottom: 20 },
  receiptIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  receiptAmount: { fontSize: 34, fontWeight: "900", color: "#0F172A", marginBottom: 4 },
  receiptLabel:  { fontSize: 14, fontWeight: "700", color: "#10B981", marginBottom: 4 },
  receiptTime:   { fontSize: 12, color: "#94A3B8", fontWeight: "600", marginBottom: 16 },
  receiptCard: {
    width: "100%", backgroundColor: "#F8FAFC",
    borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 14, marginBottom: 16,
  },
  receiptRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  receiptRowLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  receiptRowValue: { fontSize: 12, color: "#0F172A", fontWeight: "800", maxWidth: "60%", textAlign: "right" },
  doneBtn: {
    width: "100%", backgroundColor: "#0F172A",
    borderRadius: 16, paddingVertical: 15, alignItems: "center",
  },
  doneBtnText: { fontSize: 14, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },

  // ── PayOS QR Loading skeleton ──
  qrLoadingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 14,
  },
  qrLoadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  qrLoadingTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#6366F1",
  },
  qrSkeletonBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 12,
  },
  qrSkeletonText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },

  // ── PayOS QR Card (khi đã có QR thật) ──
  payosQrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#6366F1",
    padding: 16,
    marginBottom: 14,
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  payosQrHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginBottom: 14,
  },
  payosQrHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#4F46E5",
  },
  payosLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  payosLiveBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  payosQrBox: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  payosQrInfo: {
    alignItems: "center",
    marginBottom: 14,
    gap: 2,
  },
  payosQrBankName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6366F1",
  },
  payosQrAccNo: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  payosQrAccName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  payosQrActions: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 10,
  },
  payosQrActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  payosQrActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  payosQrFooter: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Modal xác nhận số tiền thực chuyển ──
  confirmModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(2, 6, 23, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 100,
  },
  confirmModalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
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
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#6366F1",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  confirmInput: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    minWidth: 160,
  },
  confirmInputUnit: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6366F1",
    marginLeft: 6,
  },
  confirmDiffBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  confirmDiffText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  confirmModalActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  confirmSubmitBtn: {
    flex: 2,
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmSubmitBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
});
