import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, Text, Alert } from "react-native";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { authService } from "../../services/authService";

interface UpdatePhoneModalProps {
  visible: boolean;
  onClose: () => void;
  currentPhone?: string;
  onSuccess: () => void;
}

export const UpdatePhoneModal: React.FC<UpdatePhoneModalProps> = ({
  visible,
  onClose,
  currentPhone = "",
  onSuccess,
}) => {
  const [phone, setPhone] = useState(currentPhone);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!phone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    setLoading(true);
    try {
      await authService.updatePhone(phone.trim());
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật số điện thoại");
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
          <Text style={styles.title}>Cập nhật số điện thoại</Text>
          <Text style={styles.subtitle}>Số điện thoại giúp bạn dễ dàng tìm bạn bè hoặc nhóm</Text>

          <Input
            label="Số điện thoại"
            placeholder="VD: 0912345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={onClose} style={styles.flexBtn} disabled={loading} />
            <Button title="Lưu" variant="primary" onPress={handleSave} style={styles.flexBtn} loading={loading} />
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
