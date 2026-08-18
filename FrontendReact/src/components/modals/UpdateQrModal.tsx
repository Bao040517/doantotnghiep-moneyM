import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, Text, Alert } from "react-native";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { authService } from "../../services/authService";

interface UpdateQrModalProps {
  visible: boolean;
  onClose: () => void;
  currentBankBin?: string;
  currentBankAccountNo?: string;
  currentBankAccountName?: string;
  onSuccess: () => void;
}

export const UpdateQrModal: React.FC<UpdateQrModalProps> = ({
  visible,
  onClose,
  currentBankBin = "",
  currentBankAccountNo = "",
  currentBankAccountName = "",
  onSuccess,
}) => {
  const [bankBin, setBankBin] = useState(currentBankBin);
  const [bankAccountNo, setBankAccountNo] = useState(currentBankAccountNo);
  const [bankAccountName, setBankAccountName] = useState(currentBankAccountName);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await authService.updateVietQRLink({
        bankBin: bankBin.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankAccountName: bankAccountName.trim(),
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật mã QR thanh toán");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          <Text style={styles.title}>Cấu hình nhận tiền QR</Text>
          <Text style={styles.subtitle}>Thiết lập VietQR để bạn bè quét mã trả tiền cho bạn</Text>

          <Input
            label="Mã ngân hàng (BIN)"
            placeholder="VD: 970436 (Vietcombank)"
            value={bankBin}
            onChangeText={setBankBin}
          />
          <Input
            label="Số tài khoản"
            placeholder="VD: 1012345678"
            value={bankAccountNo}
            onChangeText={setBankAccountNo}
          />
          <Input
            label="Tên chủ tài khoản"
            placeholder="VD: NGUYEN VAN A"
            value={bankAccountName}
            onChangeText={setBankAccountName}
          />

          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={onClose} style={styles.flexBtn} disabled={loading} />
            <Button title="Lưu thông tin" variant="primary" onPress={handleSave} style={styles.flexBtn} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.slate500,
    marginBottom: 20,
    textAlign: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
});
