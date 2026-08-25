import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  Smartphone,
  Download,
} from "lucide-react-native";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS } from "../../constants/banks";

interface VietQRCardProps {
  bankBin?: string;
  accountNo?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  receiverId?: string;
  showActions?: boolean;
  onCopySuccess?: (msg: string) => void;
}

// ─── Chuẩn hóa mã BIN ngân hàng ───
function resolveBankBin(binOrName?: string): string {
  if (!binOrName) return "970422";
  if (/^\d{6}$/.test(binOrName)) return binOrName;
  const found = VIETQR_BANKS.find(
    (b) =>
      b.bin === binOrName ||
      b.shortName.toLowerCase() === binOrName.toLowerCase() ||
      b.name.toLowerCase().includes(binOrName.toLowerCase())
  );
  return found ? found.bin : "970422";
}

// ─── Tính mã kiểm tra CRC16-CCITT (Chuẩn EMVCo Napas247) ───
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const hex = crc.toString(16).toUpperCase();
  return hex.padStart(4, "0");
}

// ─── Sinh chuỗi payload mã QR chuẩn EMVCo Napas247 / VietQR / VNPay ───
function generateEMVCoPayload(bankBin: string, accountNo: string, amount: number, memo: string) {
  const safeBin = resolveBankBin(bankBin);
  const safeAccount = accountNo.replace(/\D/g, "");
  if (!safeAccount) return "";

  const sub38_00 = "0010A000000727";
  const sub38_01_00 = "0006" + safeBin;
  const sub38_01_01 = `01${safeAccount.length < 10 ? "0" + safeAccount.length : safeAccount.length}${safeAccount}`;
  const sub38_01_content = `${sub38_01_00}${sub38_01_01}`;
  const sub38_01 = `01${sub38_01_content.length < 10 ? "0" + sub38_01_content.length : sub38_01_content.length}${sub38_01_content}`;
  const sub38_02 = "0208QRIBFTTA";
  const tag38Content = `${sub38_00}${sub38_01}${sub38_02}`;
  const tag38 = `38${tag38Content.length < 10 ? "0" + tag38Content.length : tag38Content.length}${tag38Content}`;

  const tag53 = "5303704"; // VND Currency Code
  let tag54 = "";
  if (amount > 0) {
    const amtStr = Math.round(amount).toString();
    tag54 = `54${amtStr.length < 10 ? "0" + amtStr.length : amtStr.length}${amtStr}`;
  }
  const tag58 = "5802VN";

  // Clean ASCII for description (không dấu, chỉ chữ cái và số)
  const cleanMemo = memo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(0, 25);

  let tag62 = "";
  if (cleanMemo.length > 0) {
    const tag62_08 = `08${cleanMemo.length < 10 ? "0" + cleanMemo.length : cleanMemo.length}${cleanMemo}`;
    tag62 = `62${tag62_08.length < 10 ? "0" + tag62_08.length : tag62_08.length}${tag62_08}`;
  }

  // Ghép chuỗi thô kèm Tag 63 và tính CRC16 checksum chuẩn xác 100%
  const raw = `000201010212${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
  const checksum = crc16(raw);
  return `${raw}${checksum}`;
}

export const VietQRCard: React.FC<VietQRCardProps> = ({
  bankBin = "970422",
  accountNo = "",
  accountName = "NGUOI NHAN",
  amount = 0,
  description = "Thanh toan ShareMoney",
  showActions = true,
  onCopySuccess,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savingQr, setSavingQr] = useState(false);
  const qrSvgRef = useRef<any>(null);

  const realBin = resolveBankBin(bankBin);
  const bank = VIETQR_BANKS.find((b) => b.bin === realBin);
  const bankName = bank ? bank.shortName : "Ngân hàng";
  const displayAccountNo = accountNo || "";
  const displayAccountName = (accountName || "NGUOI NHAN").toUpperCase();
  const displayDescription = description || "Thanh toan ShareMoney";
  const displayAmount = amount || 0;

  // Chuỗi QR Payload chuẩn Napas247 / VietQR có mã CRC16
  const qrPayload = useMemo(() => {
    return generateEMVCoPayload(realBin, displayAccountNo, displayAmount, displayDescription);
  }, [realBin, displayAccountNo, displayAmount, displayDescription]);

  const handleCopy = (text: string, label: string) => {
    setCopiedField(label);
    if (onCopySuccess) {
      onCopySuccess(`Đã sao chép ${label}!`);
    } else {
      Alert.alert("Đã sao chép", `${label}: ${text}`);
    }
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleSaveToGallery = async () => {
    if (!qrSvgRef.current) return;
    setSavingQr(true);
    try {
      qrSvgRef.current.toDataURL(async (dataURL: string) => {
        try {
          const filePath = `${FileSystem.cacheDirectory}vietqr_${Date.now()}.png`;
          await FileSystem.writeAsStringAsync(filePath, dataURL, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
              mimeType: "image/png",
              dialogTitle: "Lưu ảnh mã QR hoặc gửi",
              UTI: "public.png",
            });
            if (onCopySuccess) {
              onCopySuccess("Đã xuất ảnh mã QR thành công! 📸");
            }
          } else {
            Alert.alert("Thông báo", "Tính năng lưu ảnh không khả dụng trên môi trường này.");
          }
        } catch (innerErr: any) {
          console.error("Lỗi khi lưu ảnh QR:", innerErr);
          Alert.alert("Lỗi", "Không thể tạo file ảnh mã QR. Vui lòng thử lại!");
        } finally {
          setSavingQr(false);
        }
      });
    } catch (err: any) {
      console.error("Lỗi get dataURL QR:", err);
      setSavingQr(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Khung mã QR chuẩn Vector SVG sắc nét 100% kèm mã CRC16 */}
      <View style={styles.qrContainer}>
        {/* Header VietQR Napas 247 */}
        <View style={styles.qrHeaderRow}>
          {bank?.logo ? (
            <Image
              source={{ uri: bank.logo }}
              style={styles.bankLogoSmall}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.qrBankName}>{bankName} • Napas 247</Text>
            <Text style={styles.qrAccountNo}>{displayAccountNo}</Text>
          </View>
          <View style={styles.vietqrBadge}>
            <Text style={styles.vietqrBadgeText}>VietQR</Text>
          </View>
        </View>

        {/* Mã QR SVG Vector siêu nét */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrPayload}
            size={220}
            color="#0f172a"
            backgroundColor="#ffffff"
            getRef={(ref) => {
              qrSvgRef.current = ref;
            }}
          />
        </View>

        <View style={styles.qrAccountHolderBox}>
          <Text style={styles.qrAccountHolderLabel}>CHỦ TÀI KHOẢN</Text>
          <Text style={styles.qrAccountHolder}>{displayAccountName}</Text>
        </View>

        <View style={styles.qrFooterTag}>
          <Smartphone size={13} color={colors.indigo600} />
          <Text style={styles.qrFooterText}>Quét bằng App Ngân hàng hoặc VNPAY / MoMo</Text>
        </View>
      </View>

      {/* Nút Tải mã QR trực tiếp vào Bộ sưu tập */}
      {showActions && (
        <TouchableOpacity
          style={styles.downloadQrBtn}
          onPress={handleSaveToGallery}
          disabled={savingQr}
          activeOpacity={0.75}
        >
          {savingQr ? (
            <ActivityIndicator size="small" color="#334155" />
          ) : (
            <>
              <Download size={16} color="#334155" />
              <Text style={styles.downloadQrBtnText}>📥 Lưu mã QR vào Bộ sưu tập</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qrContainer: {
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    width: "100%",
  },
  qrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    gap: 10,
  },
  bankLogoSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vietqrBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vietqrBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  qrBankName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4F46E5",
  },
  qrAccountNo: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.5,
    fontFamily: "monospace",
  },
  qrAccountHolderBox: {
    alignItems: "center",
    marginTop: 10,
    gap: 1,
  },
  qrAccountHolderLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },
  qrAccountHolder: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  qrFooterTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  qrFooterText: {
    fontSize: 11,
    color: colors.slate500,
    fontWeight: "700",
  },
  downloadQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 10,
  },
  downloadQrBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
});
