import React, { useState, useEffect } from "react";
import { View, StyleSheet, Modal, Pressable, Text, Alert, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { authService } from "../../services/authService";
import { VIETQR_BANKS } from "../../constants/banks";

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
  currentBankBin = "970422",
  currentBankAccountNo = "",
  currentBankAccountName = "",
  onSuccess,
}) => {
  const [bankBin, setBankBin] = useState(currentBankBin || "970422");
  const [bankAccountNo, setBankAccountNo] = useState(currentBankAccountNo);
  const [bankAccountName, setBankAccountName] = useState(currentBankAccountName);
  const [loading, setLoading] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [searchBank, setSearchBank] = useState("");

  // Bank Lookup states
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupVerified, setLookupVerified] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBankBin(currentBankBin || "970422");
      setBankAccountNo(currentBankAccountNo);
      setBankAccountName(currentBankAccountName);
      setLookupVerified(false);
      setLookupMessage(null);
    }
  }, [visible, currentBankBin, currentBankAccountNo, currentBankAccountName]);

  const selectedBank = VIETQR_BANKS.find((b) => b.bin === bankBin) || VIETQR_BANKS[0];

  const filteredBanks = VIETQR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      b.shortName.toLowerCase().includes(searchBank.toLowerCase())
  );

  const handleLookupAccount = async (targetBin?: string, targetAccNo?: string) => {
    const currentBin = targetBin || bankBin;
    const currentAcc = (targetAccNo !== undefined ? targetAccNo : bankAccountNo).trim();
    if (!currentBin || currentAcc.length < 6) return;

    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const res = await authService.lookupBankAccount(currentBin, currentAcc);
      if (res.verified && res.accountName) {
        setBankAccountName(res.accountName);
        setLookupVerified(true);
        setLookupMessage("✓ Đã xác thực chính chủ từ Ngân hàng");
      } else {
        setLookupVerified(false);
        if (res.message) setLookupMessage(res.message);
      }
    } catch (e: any) {
      setLookupVerified(false);
    } finally {
      setLookupLoading(false);
    }
  };

  // Tự động tra cứu tên chủ tài khoản sau khi nhập số tài khoản (debounce 650ms)
  useEffect(() => {
    if (visible && bankBin && bankAccountNo.trim().length >= 6) {
      const timer = setTimeout(() => {
        handleLookupAccount(bankBin, bankAccountNo.trim());
      }, 650);
      return () => clearTimeout(timer);
    } else {
      setLookupVerified(false);
      setLookupMessage(null);
    }
  }, [bankBin, bankAccountNo, visible]);

  const handleSave = async () => {
    if (!bankBin.trim()) {
      Alert.alert("Lỗi", "Vui lòng chọn ngân hàng nhận tiền");
      return;
    }
    if (!bankAccountNo.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số tài khoản ngân hàng");
      return;
    }
    if (!bankAccountName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên chủ tài khoản");
      return;
    }
    setLoading(true);
    try {
      await authService.updateVietQRLink({
        bankBin: bankBin.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankAccountName: bankAccountName.trim().toUpperCase(),
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
          <Text style={styles.title}>Cấu hình nhận tiền QR 🏦</Text>
          <Text style={styles.subtitle}>Thiết lập VietQR để bạn bè quét mã trả tiền cho bạn</Text>

          <Text style={styles.fieldLabel}>Chọn ngân hàng (*)</Text>
          <TouchableOpacity
            style={styles.bankSelectBtn}
            onPress={() => setBankPickerVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.bankSelectLeft}>
              <Image source={{ uri: selectedBank.logo }} style={styles.bankSelectLogo} resizeMode="contain" />
              <View style={styles.bankSelectTextGroup}>
                <Text style={styles.bankSelectShortName}>{selectedBank.shortName}</Text>
                <Text style={styles.bankSelectFullName} numberOfLines={1}>
                  {selectedBank.name}
                </Text>
              </View>
            </View>
            <Text style={styles.bankSelectArrow}>▼</Text>
          </TouchableOpacity>

          <Input
            label="Số tài khoản (*)"
            placeholder="VD: 1012345678"
            keyboardType="number-pad"
            value={bankAccountNo}
            onChangeText={(text) => {
              setBankAccountNo(text);
              setLookupVerified(false);
            }}
          />

          {lookupLoading && (
            <View style={styles.lookupStatusRow}>
              <ActivityIndicator size="small" color={colors.indigo600} />
              <Text style={styles.lookupLoadingText}>Đang tra cứu tên từ ngân hàng...</Text>
            </View>
          )}

          {lookupVerified && (
            <View style={styles.lookupVerifiedRow}>
              <Text style={styles.lookupVerifiedText}>✓ Đã xác thực chính chủ từ {selectedBank.shortName}</Text>
            </View>
          )}

          <Input
            label="Tên chủ tài khoản (*)"
            placeholder="Nhập tên chủ tài khoản (VD: NGUYEN VAN A)"
            value={bankAccountName}
            onChangeText={setBankAccountName}
          />

          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={onClose} style={styles.flexBtn} disabled={loading} />
            <Button title="Lưu thông tin" variant="primary" onPress={handleSave} style={styles.flexBtn} loading={loading} />
          </View>
        </View>
      </View>

      {/* Bank Picker Sub-Modal */}
      <Modal
        visible={bankPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBankPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setBankPickerVisible(false)}
        >
          <TouchableOpacity style={styles.pickerContent} activeOpacity={1}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn Ngân Hàng</Text>
              <TouchableOpacity onPress={() => setBankPickerVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Input
              placeholder="🔍 Tìm ngân hàng (MB, VCB...)"
              value={searchBank}
              onChangeText={setSearchBank}
              style={{ marginBottom: 10 }}
            />

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {filteredBanks.map((bank) => {
                const isSelected = bank.bin === bankBin;
                return (
                  <TouchableOpacity
                    key={bank.bin}
                    style={[styles.bankItem, isSelected && styles.bankItemSelected]}
                    onPress={() => {
                      setBankBin(bank.bin);
                      setBankPickerVisible(false);
                      setSearchBank("");
                      if (bankAccountNo.trim().length >= 6) {
                        handleLookupAccount(bank.bin, bankAccountNo.trim());
                      }
                    }}
                  >
                    <Image source={{ uri: bank.logo }} style={styles.bankItemLogo} resizeMode="contain" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.bankItemShortName, isSelected && { color: colors.indigo600, fontWeight: "900" }]}>
                        {bank.shortName}
                      </Text>
                      <Text style={styles.bankItemFullName} numberOfLines={1}>
                        {bank.name}
                      </Text>
                    </View>
                    {isSelected && <Text style={{ color: colors.indigo600, fontWeight: "900" }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 22,
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
    marginBottom: 16,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate700,
    marginBottom: 6,
  },
  bankSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  bankSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  bankSelectLogo: {
    width: 40,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  bankSelectTextGroup: {
    flex: 1,
  },
  bankSelectShortName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  bankSelectFullName: {
    fontSize: 11,
    color: colors.slate500,
  },
  bankSelectArrow: {
    fontSize: 12,
    color: colors.slate400,
    paddingLeft: 6,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },

  /* Bank Lookup Status */
  lookupStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  lookupLoadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.indigo600,
  },
  lookupVerifiedRow: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  lookupVerifiedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  lookupNoticeRow: {
    backgroundColor: "#FFFBEB",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  lookupNoticeText: {
    fontSize: 12,
    color: "#B45309",
  },

  /* Sub modal */
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate600,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: colors.slate50,
  },
  bankItemSelected: {
    backgroundColor: colors.indigo50,
    borderColor: colors.indigo500,
    borderWidth: 1,
  },
  bankItemLogo: {
    width: 38,
    height: 26,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  bankItemShortName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
  },
  bankItemFullName: {
    fontSize: 11,
    color: colors.slate500,
  },
});
