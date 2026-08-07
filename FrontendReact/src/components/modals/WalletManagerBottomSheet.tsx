import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { colors } from "../../constants/colors";
import { Wallet, WalletPayload } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface WalletManagerBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onAddWallet: (payload: WalletPayload) => Promise<void>;
}

export const WalletManagerBottomSheet: React.FC<WalletManagerBottomSheetProps> = ({
  visible,
  onClose,
  wallets,
  onAddWallet,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [loading, setLoading] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      setIsAdding(false);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateX, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleBalanceChange = (text: string) => {
    const cleanDigits = text.replace(/\D/g, "");
    if (!cleanDigits) {
      setBalance("");
      return;
    }
    const formatted = parseInt(cleanDigits, 10).toLocaleString("vi-VN");
    setBalance(formatted);
  };

  const handleSave = async () => {
    const rawNumber = parseFloat(balance.replace(/\./g, "")) || 0;
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAddWallet({
        name: name.trim(),
        balance: rawNumber,
        bankAccountNo: bankAccountNo.trim() || undefined,
      });
      setName("");
      setBalance("");
      setBankAccountNo("");
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Backdrop overlay */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Animated Left Hamburger Side Drawer */}
        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.hamburgerIconBg}>
                <Text style={{ fontSize: 18 }}>☰</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isAdding ? "Tạo Ví Mới" : "Danh sách Ví & Tài khoản"}
                </Text>
                <Text style={styles.headerSub}>Quản lý nguồn tiền chi tiêu</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {isAdding ? (
            <View style={styles.formContainer}>
              <Input
                label="Tên ví / Tài khoản (*)"
                placeholder="VD: Ví MoMo, Vietcombank"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Số dư ban đầu (VND) (*)"
                placeholder="VD: 5.000.000"
                keyboardType="numeric"
                value={balance}
                onChangeText={handleBalanceChange}
              />
              <Input
                label="Số tài khoản ngân hàng (tùy chọn)"
                placeholder="VD: 1012345678"
                value={bankAccountNo}
                onChangeText={setBankAccountNo}
              />

              <View style={styles.btnRow}>
                <Button
                  title="Hủy"
                  variant="secondary"
                  onPress={() => setIsAdding(false)}
                  style={styles.flexBtn}
                />
                <Button
                  title="Lưu Ví"
                  variant="primary"
                  onPress={handleSave}
                  loading={loading}
                  style={styles.flexBtn}
                />
              </View>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <FlatList
                data={wallets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={styles.walletCard}>
                    <View style={styles.walletIconBg}>
                      <Text style={{ fontSize: 20 }}>{item.isLiability ? "💳" : "💰"}</Text>
                    </View>
                    <View style={styles.walletDetails}>
                      <Text style={styles.walletName}>{item.name}</Text>
                      <Text style={styles.walletAccount}>
                        {item.bankAccountNo ? `STK: ${item.bankAccountNo}` : item.currency || "VND"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.walletBalance,
                        { color: item.isLiability ? colors.rose600 : colors.emerald600 },
                      ]}
                    >
                      {(item.balance ?? 0).toLocaleString("vi-VN")} ₫
                    </Text>
                  </View>
                )}
              />

              <View style={styles.bottomActionBox}>
                <Button
                  title="+ Thêm ví mới"
                  variant="outline"
                  onPress={() => setIsAdding(true)}
                  style={styles.addBtn}
                />
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: colors.white,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  hamburgerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
  },
  headerSub: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate600,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.slate50,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  walletIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  walletDetails: {
    flex: 1,
  },
  walletName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  walletAccount: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 14,
    fontWeight: "900",
  },
  bottomActionBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  addBtn: {
    borderColor: colors.emerald600,
  },
  formContainer: {
    flex: 1,
    gap: 12,
    paddingTop: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  flexBtn: {
    flex: 1,
  },
});
