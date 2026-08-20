import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { VietQRCard } from "../components/features/VietQRCard";
import { colors } from "../constants/colors";
import { UserSummary } from "../types";
import { authService } from "../services/authService";
import { VIETQR_BANKS } from "../constants/banks";
import { useAuth } from "../hooks/useAuth";

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/png?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/png?seed=Milo",
  "https://api.dicebear.com/7.x/bottts/png?seed=Sparky",
  "https://api.dicebear.com/7.x/bottts/png?seed=Cosmo",
  "https://api.dicebear.com/7.x/bottts/png?seed=Buster",
  "https://api.dicebear.com/7.x/bottts/png?seed=Bandit",
  "https://api.dicebear.com/7.x/adventurer/png?seed=Alex",
  "https://api.dicebear.com/7.x/adventurer/png?seed=Luna",
  "https://api.dicebear.com/7.x/adventurer/png?seed=Leo",
  "https://api.dicebear.com/7.x/adventurer/png?seed=Zoe",
  "https://api.dicebear.com/7.x/adventurer/png?seed=Jasper",
  "https://api.dicebear.com/7.x/adventurer/png?seed=Maya",
];

interface ProfileScreenProps {
  user?: UserSummary | null;
  onLogout?: () => void;
  onRefreshUser?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user: propUser,
  onLogout: propLogout,
  onRefreshUser: propRefreshUser,
}) => {
  const { user: contextUser, logout: contextLogout, refreshProfile: contextRefreshProfile } = useAuth();
  const user = propUser !== undefined ? propUser : contextUser;
  const onLogout = propLogout || contextLogout;
  const onRefreshUser = propRefreshUser || contextRefreshProfile;

  const [bankBin, setBankBin] = useState(user?.bankBin || "970422");
  const [accountNo, setAccountNo] = useState(user?.bankAccountNo || "");
  const [accountName, setAccountName] = useState(user?.bankAccountName || user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [searchBank, setSearchBank] = useState("");

  // Edit / Lock states: Mặc định khóa để tránh vô tình chạm vào nhảy thông tin
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingVietQr, setIsEditingVietQr] = useState(false);

  // Bank Lookup states
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupVerified, setLookupVerified] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const cleanAccountName = (name: string): string => {
    if (!name) return "";
    return name.replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
  };

  React.useEffect(() => {
    if (user) {
      const bBin = user.bankBin || "970422";
      const accNo = user.bankAccountNo || "";
      setBankBin(bBin);
      setAccountNo(accNo);
      setAccountName(cleanAccountName(user.bankAccountName || user.name || ""));
      setPhone(user.phone || "");
    }
  }, [user]);

  const selectedBank = VIETQR_BANKS.find((b) => b.bin === bankBin) || VIETQR_BANKS[0];

  const filteredBanks = VIETQR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      b.shortName.toLowerCase().includes(searchBank.toLowerCase())
  );

  const handleLookupAccount = async (targetBin?: string, targetAccNo?: string) => {
    const currentBin = targetBin || bankBin;
    const currentAcc = (targetAccNo !== undefined ? targetAccNo : accountNo).trim();
    if (!currentBin || currentAcc.length < 6) return;

    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const res = await authService.lookupBankAccount(currentBin, currentAcc);
      if (res.verified && res.accountName) {
        setAccountName(res.accountName);
        setLookupVerified(true);
        setLookupMessage(`✓ Đã tự động khớp chủ tài khoản từ ${selectedBank.shortName}`);
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

  // Tự động tra cứu và nhảy tên chủ tài khoản sau khi nhập số tài khoản (debounce 400ms)
  React.useEffect(() => {
    if (isEditingVietQr && bankBin && accountNo.trim().length >= 6) {
      const timer = setTimeout(() => {
        handleLookupAccount(bankBin, accountNo.trim());
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setLookupVerified(false);
      setLookupMessage(null);
    }
  }, [bankBin, accountNo, isEditingVietQr]);

  const handlePickAvatarFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh để đổi avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const avatarUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setAvatarModalVisible(false);
        await handleSaveAvatar(avatarUri);
      }
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể chọn ảnh từ máy");
    }
  };

  const handleSaveAvatar = async (avatarUrl: string) => {
    setAvatarLoading(true);
    try {
      await authService.updateAvatar(avatarUrl);
      Alert.alert("Thành công 🎉", "Đã cập nhật ảnh đại diện mới!");
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật ảnh đại diện");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!phone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    setPhoneLoading(true);
    try {
      await authService.updatePhone(phone.trim());
      Alert.alert("Thành công 🎉", "Đã cập nhật số điện thoại cá nhân!");
      setIsEditingPhone(false);
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Cập nhật số điện thoại thất bại");
    } finally {
      setPhoneLoading(false);
    }
  };

  const isVietQrConfigured = Boolean(
    bankBin && bankBin.trim().length >= 4 &&
    accountNo && accountNo.trim().length >= 4 &&
    accountName && accountName.trim().length > 0
  );

  const handleUpdateVietQR = async () => {
    if (!bankBin.trim()) {
      Alert.alert("Lỗi", "Vui lòng chọn ngân hàng nhận tiền");
      return;
    }
    if (!accountNo.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số tài khoản ngân hàng");
      return;
    }
    if (!accountName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên chủ tài khoản ngân hàng");
      return;
    }
    setLoading(true);
    try {
      await authService.updateVietQRLink({
        bankBin: bankBin.trim(),
        bankAccountNo: accountNo.trim(),
        bankAccountName: accountName.trim().toUpperCase(),
      });
      Alert.alert("Thành công 🎉", "Đã cập nhật tài khoản nhận tiền VietQR Napas247!");
      setIsEditingVietQr(false);
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
        {/* User Card with Interactive Avatar */}
        <Card style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.8}
          >
            {avatarLoading ? (
              <View style={[styles.avatar, styles.avatarLoadingBox]}>
                <ActivityIndicator size="small" color={colors.white} />
              </View>
            ) : user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAvatarModalVisible(true)} style={styles.changeAvatarBtn}>
            <Text style={styles.changeAvatarText}>Đổi ảnh đại diện</Text>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name || "Người dùng"}</Text>
          <Text style={styles.userEmail}>{user?.email || "Chưa thiết lập email"}</Text>
        </Card>

        {/* Phone Update Card */}
        <Text style={styles.sectionTitle}>Số điện thoại liên hệ</Text>
        <Card style={styles.bankFormCard}>
          <Input
            label="Số điện thoại cá nhân"
            placeholder="VD: 0912345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={isEditingPhone}
          />
          {isEditingPhone ? (
            <View style={styles.actionBtnRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Hủy"
                  variant="secondary"
                  onPress={() => {
                    setPhone(user?.phone || "");
                    setIsEditingPhone(false);
                  }}
                  disabled={phoneLoading}
                />
              </View>
              <View style={{ flex: 1.6 }}>
                <Button
                  title="Lưu số điện thoại"
                  variant="primary"
                  onPress={handleUpdatePhone}
                  loading={phoneLoading}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editOutlineBtn}
              onPress={() => setIsEditingPhone(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.editOutlineBtnText}>Chỉnh sửa số điện thoại</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* VietQR Bank Configuration Card */}
        <Text style={styles.sectionTitle}>Cấu hình nhận tiền VietQR Napas247</Text>
        <Card style={styles.bankFormCard}>
          <Text style={styles.fieldLabel}>Chọn ngân hàng (*)</Text>
          <TouchableOpacity
            style={[styles.bankSelectBtn, !isEditingVietQr && styles.bankSelectBtnDisabled]}
            onPress={() => isEditingVietQr && setBankModalVisible(true)}
            activeOpacity={isEditingVietQr ? 0.8 : 1}
            disabled={!isEditingVietQr}
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
            <View style={styles.bankSelectArrowBox}>
              <Text style={styles.bankSelectArrow}>▼</Text>
            </View>
          </TouchableOpacity>

          <Input
            label="Số tài khoản ngân hàng (*)"
            placeholder="Nhập số tài khoản ngân hàng của bạn"
            keyboardType="number-pad"
            value={accountNo}
            onChangeText={(text) => {
              setAccountNo(text);
              setLookupVerified(false);
            }}
            editable={isEditingVietQr}
          />

          {isEditingVietQr && lookupLoading && (
            <View style={styles.lookupStatusRow}>
              <ActivityIndicator size="small" color={colors.indigo600} />
              <Text style={styles.lookupLoadingText}>Đang tra cứu tên từ ngân hàng...</Text>
            </View>
          )}

          {isEditingVietQr && lookupVerified && (
            <View style={styles.lookupVerifiedRow}>
              <Text style={styles.lookupVerifiedText}>✓ Đã xác thực chính chủ từ {selectedBank.shortName}</Text>
            </View>
          )}

          <Input
            label="Tên chủ tài khoản (*)"
            placeholder="Tự động điền theo số tài khoản ngân hàng..."
            value={accountName}
            onChangeText={setAccountName}
            editable={isEditingVietQr}
          />

          {isEditingVietQr ? (
            <View style={styles.actionBtnRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Hủy"
                  variant="secondary"
                  onPress={() => {
                    setBankBin(user?.bankBin || "970422");
                    setAccountNo(user?.bankAccountNo || "");
                    setAccountName(cleanAccountName(user?.bankAccountName || user?.name || ""));
                    setIsEditingVietQr(false);
                    setLookupVerified(false);
                    setLookupMessage(null);
                  }}
                  disabled={loading}
                />
              </View>
              <View style={{ flex: 1.6 }}>
                <Button
                  title="Lưu tài khoản VietQR"
                  variant="primary"
                  onPress={handleUpdateVietQR}
                  loading={loading}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editOutlineBtn}
              onPress={() => {
                setIsEditingVietQr(true);
                if (bankBin && accountNo.trim().length >= 6) {
                  handleLookupAccount(bankBin, accountNo.trim());
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.editOutlineBtnText}>Chỉnh sửa thông tin VietQR</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Live Preview QR */}
        <Text style={styles.sectionTitle}>Xem trước mã VietQR của bạn</Text>
        {isVietQrConfigured ? (
          <VietQRCard
            bankBin={bankBin.trim()}
            accountNo={accountNo.trim()}
            accountName={accountName.trim().toUpperCase()}
            description={`Chuyen tien cho ${accountName.trim() || user?.name || "ShareMoney"}`}
          />
        ) : (
          <Card style={styles.emptyQrCard}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>💳</Text>
            <Text style={styles.emptyQrTitle}>Chưa đủ thông tin tạo mã VietQR</Text>
            <Text style={styles.emptyQrSub}>
              Vui lòng chọn Ngân hàng, nhập Số tài khoản và Tên chủ tài khoản ở trên để hiển thị mã QR nhận tiền.
            </Text>
          </Card>
        )}

        {/* Logout Button */}
        <Button
          title="Đăng xuất tài khoản"
          variant="danger"
          onPress={onLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>

      {/* ─── BANK SELECTION MODAL ─── */}
      <Modal
        visible={bankModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBankModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBankModalVisible(false)}
        >
          <TouchableOpacity style={[styles.modalContent, { maxHeight: "85%" }]} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Ngân Hàng Nhận Tiền 🏦</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBankModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Input
              placeholder="🔍 Tìm ngân hàng (MB, VCB, TCB...)"
              value={searchBank}
              onChangeText={setSearchBank}
              style={{ marginBottom: 12 }}
            />

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {filteredBanks.map((bank) => {
                const isSelected = bank.bin === bankBin;
                return (
                  <TouchableOpacity
                    key={bank.bin}
                    style={[styles.bankItemRow, isSelected && styles.bankItemRowSelected]}
                    onPress={() => {
                      setBankBin(bank.bin);
                      setBankModalVisible(false);
                      setSearchBank("");
                      if (accountNo.trim().length >= 6) {
                        handleLookupAccount(bank.bin, accountNo.trim());
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: bank.logo }} style={styles.bankItemLogo} resizeMode="contain" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.bankItemShortName, isSelected && { color: colors.indigo600, fontWeight: "900" }]}>
                        {bank.shortName}
                      </Text>
                      <Text style={styles.bankItemFullName} numberOfLines={1}>
                        {bank.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.bankCheckCircle}>
                        <Text style={styles.bankCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── AVATAR SELECTION MODAL ─── */}
      <Modal
        visible={avatarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAvatarModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Ảnh Đại Diện 👤</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAvatarModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Gallery Upload Button */}
            <TouchableOpacity
              style={styles.galleryPickBtn}
              onPress={handlePickAvatarFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.galleryIconCircle}>
                <Text style={{ fontSize: 20 }}>📸</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.galleryPickTitle}>Tải ảnh từ điện thoại</Text>
                <Text style={styles.galleryPickSub}>Chọn bất kỳ hình ảnh nào từ thư viện máy của bạn</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC CHỌN AVATAR CÓ SẴN</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Presets Grid */}
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              <View style={styles.presetGrid}>
                {AVATAR_PRESETS.map((presetUrl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetItem}
                    onPress={() => {
                      setAvatarModalVisible(false);
                      handleSaveAvatar(presetUrl);
                    }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: presetUrl }} style={styles.presetImg} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF2F6",
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
  },
  userCard: {
    alignItems: "center",
    padding: 24,
    marginBottom: 20,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.indigo600,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.indigo600,
  },
  avatarLoadingBox: {
    backgroundColor: colors.slate400,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.slate200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraBadgeText: {
    fontSize: 14,
  },
  changeAvatarBtn: {
    marginBottom: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.indigo50,
  },
  changeAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.indigo600,
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
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyQrCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  emptyQrTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate800,
  },
  emptyQrSub: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },
  saveBtn: {
    marginTop: 8,
  },
  logoutBtn: {
    marginTop: 16,
    marginBottom: 32,
  },

  /* Avatar Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.slate900,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate600,
  },
  galleryPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.indigo50,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  galleryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryPickTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.indigo700,
  },
  galleryPickSub: {
    fontSize: 11,
    color: colors.indigo500,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate200,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    paddingVertical: 4,
  },
  presetItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.slate200,
  },
  presetImg: {
    width: "100%",
    height: "100%",
  },

  /* Bank Selector & Modal Styles */
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
    padding: 12,
    marginBottom: 14,
  },
  bankSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  bankSelectLogo: {
    width: 44,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  bankSelectTextGroup: {
    flex: 1,
  },
  bankSelectShortName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  bankSelectFullName: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  bankSelectArrowBox: {
    paddingLeft: 8,
  },
  bankSelectArrow: {
    fontSize: 12,
    color: colors.slate400,
  },
  bankItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: "transparent",
  },
  bankItemRowSelected: {
    backgroundColor: colors.indigo50,
    borderColor: colors.indigo500,
  },
  bankItemLogo: {
    width: 44,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  bankItemShortName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  bankItemFullName: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  bankCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.indigo600,
    alignItems: "center",
    justifyContent: "center",
  },
  bankCheckText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },

  /* Edit / Lock Section Styles */
  bankSelectBtnDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
  editOutlineBtn: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  editOutlineBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.indigo600,
  },

  /* Bank Lookup Status Styles */
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
});
