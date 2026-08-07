import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Card } from "../ui/Card";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS } from "../../constants/banks";

import { vietQrService } from "../../services/vietQrService";

interface VietQRCardProps {
  bankBin?: string;
  accountNo?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  receiverId?: string;
}

export const VietQRCard: React.FC<VietQRCardProps> = ({
  bankBin,
  accountNo,
  accountName,
  amount,
  description,
  receiverId,
}) => {
  const [serverQrUrl, setServerQrUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (receiverId && amount && amount > 0) {
      vietQrService
        .generateQrCode({
          receiverId,
          amount,
          description: description || "Chuyen tien ShareMoney",
        })
        .then((res) => {
          if (res.qrDataURL) setServerQrUrl(res.qrDataURL);
        })
        .catch(() => setServerQrUrl(null));
    }
  }, [receiverId, amount, description]);

  if (!bankBin || !accountNo) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>⚠️ Chưa liên kết tài khoản ngân hàng VietQR Napas247</Text>
      </Card>
    );
  }

  const bank = VIETQR_BANKS.find((b) => b.bin === bankBin);
  const bankName = bank ? bank.shortName : "Bank";

  // Quick VietQR Image URL construction fallback
  const fallbackQrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount || 0}&addInfo=${encodeURIComponent(description || "Thanh toan ShareMoney")}&accountName=${encodeURIComponent(accountName || "")}`;
  const qrUrl = serverQrUrl || fallbackQrUrl;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.bankName}>{bankName} - Napas 247</Text>
          <Text style={styles.accountNo}>{accountNo}</Text>
          {accountName && <Text style={styles.accountName}>{accountName.toUpperCase()}</Text>}
        </View>
        {bank && <Image source={{ uri: bank.logo }} style={styles.bankLogo} resizeMode="contain" />}
      </View>

      <View style={styles.qrContainer}>
        <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
      </View>

      {amount ? (
        <View style={styles.amountBadge}>
          <Text style={styles.amountLabel}>Số tiền quyết toán:</Text>
          <Text style={styles.amountValue}>{(amount ?? 0).toLocaleString("vi-VN")} ₫</Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyCard: {
    padding: 16,
    alignItems: "center",
    backgroundColor: colors.slate50,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
  },
  accountNo: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.indigo600,
    marginVertical: 2,
  },
  accountName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate500,
  },
  bankLogo: {
    width: 60,
    height: 32,
  },
  qrContainer: {
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  amountBadge: {
    alignItems: "center",
    backgroundColor: colors.indigo50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    width: "100%",
  },
  amountLabel: {
    fontSize: 12,
    color: colors.slate600,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.indigo700,
  },
});
