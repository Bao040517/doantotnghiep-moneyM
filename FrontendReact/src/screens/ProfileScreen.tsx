import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Platform, StatusBar } from "react-native";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { VietQRCard } from "../components/features/VietQRCard";
import { colors } from "../constants/colors";
import { UserSummary } from "../types";
import { authService } from "../services/authService";
import { VIETQR_BANKS } from "../constants/banks";

interface ProfileScreenProps {
  user: UserSummary | null;
  onLogout: () => void;
  onRefreshUser: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onRefreshUser }) => {
  const [bankBin, setBankBin] = useState(user?.bankBin || "970436");
  const [accountNo, setAccountNo] = useState(user?.bankAccountNo || "1012345678");
  const [accountName, setAccountName] = useState(user?.bankAccountName || user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const handleUpdatePhone = async () => {
    if (!phone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    setPhoneLoading(true);
    try {
      await authService.updatePhone(phone.trim());
      Alert.alert("Thành công 🎉", "Đã cập nhật số điện thoại cá nhân!");
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Cập nhật số điện thoại thất bại");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleUpdateVietQR = async () => {
    if (!accountNo.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số tài khoản ngân hàng");
      return;
    }
    setLoading(true);
    try {
      await authService.updateVietQRLink({
        bankBin,
        bankAccountNo: accountNo.trim(),
        bankAccountName: accountName.trim(),
      });
      Alert.alert("Thành công", "Đã cập nhật tài khoản nhận tiền VietQR Napas247!");
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || "Người dùng"}</Text>
          <Text style={styles.userEmail}>{user?.email || "email@example.com"}</Text>
        </Card>

        {/* Phone Update Card */}
        <Text style={styles.sectionTitle}>Số điện thoại liên hệ</Text>
        <Card style={styles.bankFormCard}>
          <Input label="Số điện thoại" placeholder="VD: 0912345678" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Button
            title="Lưu số điện thoại"
            variant="primary"
            onPress={handleUpdatePhone}
            loading={phoneLoading}
            style={styles.saveBtn}
          />
        </Card>

        {/* VietQR Bank Link Setup */}
        <Text style={styles.sectionTitle}>Liên kết tài khoản nhận tiền VietQR Napas247</Text>
        <Card style={styles.bankFormCard}>
          <Input label="Mã BIN ngân hàng (VD: 970436 - VCB)" value={bankBin} onChangeText={setBankBin} />
          <Input label="Số tài khoản ngân hàng" value={accountNo} onChangeText={setAccountNo} />
          <Input label="Tên chủ tài khoản" value={accountName} onChangeText={setAccountName} />

          <Button
            title="Lưu tài khoản VietQR"
            variant="primary"
            onPress={handleUpdateVietQR}
            loading={loading}
            style={styles.saveBtn}
          />
        </Card>

        {/* Live Preview QR */}
        <Text style={styles.sectionTitle}>Xem trước mã VietQR của bạn</Text>
        <VietQRCard
          bankBin={bankBin}
          accountNo={accountNo}
          accountName={accountName}
          description="Chuyen tien cho ShareMoney User"
        />

        {/* Logout Button */}
        <Button
          title="Đăng xuất tài khoản"
          variant="danger"
          onPress={onLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
  },
  userCard: {
    alignItems: "center",
    padding: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.indigo600,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.slate900,
  },
  userEmail: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 12,
  },
  bankFormCard: {
    marginBottom: 24,
  },
  saveBtn: {
    marginTop: 8,
  },
  logoutBtn: {
    marginTop: 16,
    marginBottom: 32,
  },
});
