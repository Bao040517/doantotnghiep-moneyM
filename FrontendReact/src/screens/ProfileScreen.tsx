import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
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
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { VietQRCard } from "../components/features/VietQRCard";
import { QrCode, User, Moon, Sun, Camera, Building2, PiggyBank, Phone, LogOut } from "lucide-react-native";
import { colors } from "../constants/colors";
import { UserSummary } from "../types";
import { authService } from "../services/authService";
import { VIETQR_BANKS } from "../constants/banks";
import { useAuth } from "../hooks/useAuth";
import { useTopSafeInset } from "../utils/responsive";
import { verifyBankAccount } from "../utils/bankAccountVerification";

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
  const { isDark, toggleTheme, colors: themeColors } = useTheme();
  const safeTopPadding = useTopSafeInset(10);
  const user = propUser !== undefined ? propUser : contextUser;
  const onLogout = propLogout || contextLogout;
  const onRefreshUser = propRefreshUser || contextRefreshProfile;

  // ─── 1. THÔNG TIN CÁ NHÂN ───
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // ─── 2. NGÂN HÀNG GIAO DỊCH (TRANSACTION BANK) ───
  const [bankBin, setBankBin] = useState(user?.bankBin || "970422");
  const [accountNo, setAccountNo] = useState(user?.bankAccountNo || "");
  const [accountName, setAccountName] = useState(user?.bankAccountName || user?.name || "");
  const [mainBankLoading, setMainBankLoading] = useState(false);

  // ─── 3. NGÂN HÀNG TIẾT KIỆM (SAVINGS BANK) ───
  const [savingsBankBin, setSavingsBankBin] = useState(user?.savingsBankBin || "970407");
  const [savingsAccountNo, setSavingsAccountNo] = useState(user?.savingsBankAccountNo || "");
  const [savingsAccountName, setSavingsAccountName] = useState(user?.savingsBankAccountName || user?.name || "");
  const [savingsLoading, setSavingsLoading] = useState(false);

  // ─── MODAL CẤU HÌNH NGÂN HÀNG ───
  const [configModalType, setConfigModalType] = useState<"main" | "savings" | null>(null);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [searchBank, setSearchBank] = useState("");
  const [myQrVisible, setMyQrVisible] = useState(false);

  const cleanAccountName = (name: string): string => {
    if (!name) return "";
    return name.replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setBankBin(user.bankBin || "970422");
      setAccountNo(user.bankAccountNo || "");
      setAccountName(cleanAccountName(user.bankAccountName || user.name || ""));

      setSavingsBankBin(user.savingsBankBin || "970407");
      setSavingsAccountNo(user.savingsBankAccountNo || "");
      setSavingsAccountName(cleanAccountName(user.savingsBankAccountName || user.name || ""));
    }
  }, [user]);

  const selectedBank = VIETQR_BANKS.find((b) => b.bin === bankBin) || VIETQR_BANKS[0];
  const selectedSavingsBank = VIETQR_BANKS.find((b) => b.bin === savingsBankBin) || VIETQR_BANKS[0];

  const filteredBanks = VIETQR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      b.shortName.toLowerCase().includes(searchBank.toLowerCase())
  );

  // Cập nhật Avatar
  const handlePickAvatarFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập bị từ chối", "Ứng dụng cần quyền truy cập thư viện ảnh để đổi Avatar");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleUpdateAvatar(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không thể chọn ảnh từ thư viện");
    }
  };

  const handleUpdateAvatar = async (avatarUrl: string) => {
    setAvatarLoading(true);
    try {
      await authService.updateAvatar(avatarUrl);
      Alert.alert("Thành công 🎉", "Đã cập nhật ảnh đại diện mới!");
      setAvatarModalVisible(false);
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật ảnh đại diện");
    } finally {
      setAvatarLoading(false);
    }
  };

  // Cập nhật Thông tin cá nhân (Họ tên & Số điện thoại)
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên");
      return;
    }
    setProfileLoading(true);
    try {
      await authService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });
      Alert.alert("Thành công 🎉", "Đã cập nhật thông tin cá nhân!");
      setIsEditingProfile(false);
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Cập nhật thông tin thất bại");
    } finally {
      setProfileLoading(false);
    }
  };

  // Cập nhật Ngân hàng giao dịch
  const handleSaveMainBank = async () => {
    const cleanAcc = accountNo.replace(/\s/g, "");
    if (!bankBin.trim()) {
      Alert.alert("Lỗi", "Vui lòng chọn ngân hàng giao dịch");
      return;
    }
    if (!cleanAcc || cleanAcc.length < 6) {
      Alert.alert("Lỗi", "Số tài khoản không hợp lệ (cần từ 6 đến 19 chữ số)");
      return;
    }
    if (!accountName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên chủ tài khoản");
      return;
    }

    let verifiedAccount;
    try {
      verifiedAccount = await verifyBankAccount(bankBin, cleanAcc, accountName);
    } catch (e: any) {
      Alert.alert("Không thể lưu", e?.message || "Định dạng số tài khoản không hợp lệ.");
      return;
    }

    setMainBankLoading(true);
    try {
      await authService.updateVietQRLink({
        bankBin: verifiedAccount.bin,
        bankAccountNo: verifiedAccount.accountNumber,
        bankAccountName: (verifiedAccount.accountName || accountName).toUpperCase(),
      });
      Alert.alert("Thành công", `Đã lưu thông tin Ngân hàng giao dịch (${selectedBank.shortName})!`);
      setConfigModalType(null);
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể lưu thông tin");
    } finally {
      setMainBankLoading(false);
    }
  };

  // Cập nhật Ngân hàng tiết kiệm
  const handleSaveSavingsBank = async () => {
    const cleanAcc = savingsAccountNo.replace(/\s/g, "");
    if (!savingsBankBin.trim()) {
      Alert.alert("Lỗi", "Vui lòng chọn ngân hàng tiết kiệm");
      return;
    }
    if (!cleanAcc || cleanAcc.length < 6) {
      Alert.alert("Lỗi", "Số tài khoản không hợp lệ (cần từ 6 đến 19 chữ số)");
      return;
    }
    if (!savingsAccountName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên chủ tài khoản");
      return;
    }

    let verifiedAccount;
    try {
      verifiedAccount = await verifyBankAccount(savingsBankBin, cleanAcc, savingsAccountName);
    } catch (e: any) {
      Alert.alert("Không thể lưu", e?.message || "Định dạng số tài khoản không hợp lệ.");
      return;
    }

    setSavingsLoading(true);
    try {
      await authService.updateVietQRLink({
        savingsBankBin: verifiedAccount.bin,
        savingsBankAccountNo: verifiedAccount.accountNumber,
        savingsBankAccountName: (verifiedAccount.accountName || savingsAccountName).toUpperCase(),
      });
      Alert.alert("Thành công", `Đã lưu thông tin Ngân hàng tiết kiệm (${selectedSavingsBank.shortName})!`);
      setConfigModalType(null);
      onRefreshUser();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể lưu thông tin");
    } finally {
      setSavingsLoading(false);
    }
  };

  const isMainBankConfigured = Boolean(
    user?.bankBin && user?.bankAccountNo && user?.bankAccountNo.trim().length >= 4
  );

  const isSavingsBankConfigured = Boolean(
    user?.savingsBankBin && user?.savingsBankAccountNo && user?.savingsBankAccountNo.trim().length >= 4
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: safeTopPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* ══════════════════════════════════════════════════════════════
            KHỐI CHA 1: THÔNG TIN CÁ NHÂN
           ══════════════════════════════════════════════════════════════ */}
        <View style={styles.blockSection}>
          <Text style={[styles.mainHeaderTitle, { color: themeColors.textPrimary }]}>
            Thông tin cá nhân
          </Text>

          <Card style={[styles.cardSurface, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            {/* Avatar & Tên User */}
            <View style={styles.userProfileTopRow}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={() => setAvatarModalVisible(true)}
                activeOpacity={0.8}
              >
                {avatarLoading ? (
                  <View style={[styles.avatarBox, { backgroundColor: colors.slate400 }]}>
                    <ActivityIndicator size="small" color={colors.white} />
                  </View>
                ) : user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarBox, { backgroundColor: "#0F172A" }]}>
                    <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
                  </View>
                )}
                <View style={[styles.cameraIconBadge, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <Camera size={11} color={themeColors.textPrimary} strokeWidth={2} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.userNameText, { color: themeColors.textPrimary }]}>
                  {user?.name || "Người dùng"}
                </Text>
                <Text style={[styles.userEmailText, { color: themeColors.textSecondary }]}>
                  {user?.email || "Chưa có email"}
                </Text>
                <TouchableOpacity
                  onPress={() => setAvatarModalVisible(true)}
                  style={[styles.changeAvatarSmallBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                >
                  <Text style={[styles.changeAvatarSmallText, { color: themeColors.textPrimary }]}>Đổi ảnh đại diện</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Thông tin Họ tên & Số điện thoại */}
            <View style={{ marginTop: 4 }}>
              {isEditingProfile ? (
                <View>
                  <Input
                    label="Họ và tên"
                    placeholder="VD: Nguyễn Văn A"
                    value={name}
                    onChangeText={setName}
                    containerStyle={{ marginBottom: 12 }}
                  />
                  <Input
                    label="Số điện thoại cá nhân"
                    placeholder="VD: 0912345678"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    containerStyle={{ marginBottom: 14 }}
                  />
                  <View style={styles.actionRow}>
                    <Button
                      title="Hủy"
                      variant="secondary"
                      onPress={() => {
                        setName(user?.name || "");
                        setPhone(user?.phone || "");
                        setIsEditingProfile(false);
                      }}
                      disabled={profileLoading}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Lưu thay đổi"
                      variant="primary"
                      onPress={handleSaveProfile}
                      loading={profileLoading}
                      style={{ flex: 1.6 }}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: themeColors.textSecondary }]}>Số điện thoại:</Text>
                    <Text style={[styles.profileInfoValue, { color: themeColors.textPrimary }]}>
                      {user?.phone || "Chưa cập nhật"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.editBtnOutline, { borderColor: themeColors.border, marginTop: 10 }]}
                    onPress={() => setIsEditingProfile(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editBtnOutlineText, { color: themeColors.textPrimary }]}>
                      Chỉnh sửa thông tin cá nhân
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Nút xem Mã QR Cá Nhân */}
              <TouchableOpacity
                style={[styles.myQrBtn, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: isDark ? "#334155" : "#E2E8F0" }]}
                onPress={() => setMyQrVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.myQrIconBg, { backgroundColor: isDark ? "#334155" : "#EEF2FF" }]}>
                  <QrCode size={18} color={themeColors.textPrimary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.myQrBtnTitle, { color: themeColors.textPrimary }]}>Mã QR Cá Nhân Của Bạn</Text>
                  <Text style={[styles.myQrBtnSub, { color: themeColors.textSecondary }]}>Đưa mã cho bạn bè quét để thêm vào nhóm siêu tốc</Text>
                </View>
                <Text style={[styles.myQrBtnArrow, { color: themeColors.textSecondary }]}>→</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* ══════════════════════════════════════════════════════════════
            KHỐI CHA 2: THÔNG TIN NGÂN HÀNG
           ══════════════════════════════════════════════════════════════ */}
        <View style={styles.blockSection}>
          <View style={styles.blockHeaderRow}>
            <View style={[styles.blockIconBoxMono, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
              <Building2 size={16} color={themeColors.textPrimary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[styles.blockTitle, { color: themeColors.textPrimary }]}>Thông tin ngân hàng</Text>
              <Text style={[styles.blockSub, { color: themeColors.textSecondary }]}>Tài khoản nhận tiền chia sẻ & quỹ tiết kiệm</Text>
            </View>
          </View>

          {/* KHỐI NHỎ 1: NGÂN HÀNG GIAO DỊCH */}
          <TouchableOpacity
            style={[styles.bankCardItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => setConfigModalType("main")}
            activeOpacity={0.85}
          >
            <View style={styles.bankCardHeader}>
              <View style={[styles.bankTagMono, { borderColor: themeColors.border, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
                <Text style={[styles.bankTagMonoText, { color: themeColors.textPrimary }]}>Ngân hàng giao dịch</Text>
              </View>
              <View style={styles.configPill}>
                <Text style={styles.configPillText}>Cấu hình ›</Text>
              </View>
            </View>

            <View style={styles.bankCardContentRow}>
              <View style={styles.bankLogoCircle}>
                <Image source={{ uri: selectedBank.logo }} style={styles.bankLogo} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.bankNameTitle, { color: themeColors.textPrimary }]}>{selectedBank.shortName}</Text>
                <Text style={[styles.bankAccNoText, { color: themeColors.textPrimary }]}>
                  {user?.bankAccountNo ? user.bankAccountNo : "Chưa cấu hình tài khoản"}
                </Text>
                <Text style={[styles.bankAccOwnerText, { color: themeColors.textSecondary }]}>
                  Chủ TK: <Text style={{ fontWeight: "700", color: themeColors.textPrimary }}>{accountName || user?.name || "---"}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.bankCardFooterStrip}>
              <Text style={styles.bankCardFooterDesc}>Dùng nhận tiền chia sẻ chi phí nhóm & thanh toán nợ</Text>
              {isMainBankConfigured && <Text style={[styles.statusVerifiedBadge, { color: themeColors.textPrimary }]}>✓ Đã kích hoạt</Text>}
            </View>
          </TouchableOpacity>

          {/* KHỐI NHỎ 2: NGÂN HÀNG TIẾT KIỆM */}
          <TouchableOpacity
            style={[styles.bankCardItem, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginTop: 12 }]}
            onPress={() => setConfigModalType("savings")}
            activeOpacity={0.85}
          >
            <View style={styles.bankCardHeader}>
              <View style={[styles.bankTagMono, { borderColor: themeColors.border, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
                <Text style={[styles.bankTagMonoText, { color: themeColors.textPrimary }]}>Ngân hàng tiết kiệm</Text>
              </View>
              <View style={styles.configPill}>
                <Text style={styles.configPillText}>Cấu hình ›</Text>
              </View>
            </View>

            <View style={styles.bankCardContentRow}>
              <View style={styles.bankLogoCircle}>
                <Image source={{ uri: selectedSavingsBank.logo }} style={styles.bankLogo} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.bankNameTitle, { color: themeColors.textPrimary }]}>{selectedSavingsBank.shortName}</Text>
                <Text style={[styles.bankAccNoText, { color: themeColors.textPrimary }]}>
                  {user?.savingsBankAccountNo ? user.savingsBankAccountNo : "Chưa cấu hình tài khoản"}
                </Text>
                <Text style={[styles.bankAccOwnerText, { color: themeColors.textSecondary }]}>
                  Chủ TK: <Text style={{ fontWeight: "700", color: themeColors.textPrimary }}>{savingsAccountName || user?.name || "---"}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.bankCardFooterStrip}>
              <Text style={styles.bankCardFooterDesc}>Dùng nhận tiền phân bổ tiết kiệm tự động an toàn</Text>
              {isSavingsBankConfigured && <Text style={[styles.statusVerifiedBadge, { color: themeColors.textPrimary }]}>✓ Đã kích hoạt</Text>}
            </View>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════
            KHỐI CHA 3: CHẾ ĐỘ TỐI SÁNG
           ══════════════════════════════════════════════════════════════ */}
        <View style={styles.blockSection}>
          <View style={styles.blockHeaderRow}>
            <View style={[styles.blockIconBoxMono, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
              {isDark ? (
                <Moon size={16} color={themeColors.textPrimary} strokeWidth={2} />
              ) : (
                <Sun size={16} color={themeColors.textPrimary} strokeWidth={2} />
              )}
            </View>
            <View>
              <Text style={[styles.blockTitle, { color: themeColors.textPrimary }]}>Chế độ tối sáng</Text>
              <Text style={[styles.blockSub, { color: themeColors.textSecondary }]}>Tùy chỉnh giao diện hiển thị ứng dụng</Text>
            </View>
          </View>

          <Card style={[styles.darkModeCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.darkModeLeft}>
              <View style={[styles.darkModeIconCircle, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
                {isDark ? (
                  <Moon size={20} color={themeColors.textPrimary} strokeWidth={2} />
                ) : (
                  <Sun size={20} color={themeColors.textPrimary} strokeWidth={2} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.darkModeTitle, { color: themeColors.textPrimary }]}>
                  {isDark ? "Chế độ tối (Dark mode)" : "Chế độ sáng (Light mode)"}
                </Text>
                <Text style={[styles.darkModeSub, { color: themeColors.textSecondary }]}>
                  {isDark ? "Đang bật — Giảm mỏi mắt ban đêm" : "Đang bật — Giao diện sáng thanh lịch"}
                </Text>
              </View>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#CBD5E1", true: "#0F172A" }}
              thumbColor={isDark ? "#FFFFFF" : "#FFFFFF"}
              ios_backgroundColor="#CBD5E1"
            />
          </Card>
        </View>

        {/* ─── NÚT ĐĂNG XUẤT ─── */}
        <Button
          title="Đăng xuất tài khoản"
          variant="danger"
          onPress={onLogout}
          style={styles.logoutBtn}
        />

        <Text style={styles.versionText}>ShareMoney v1.2.0 • An toàn & Bảo mật</Text>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════
          MODAL CẤU HÌNH NGÂN HÀNG (DÙNG RIÊNG CHO TỪNG LOẠI)
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={configModalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (bankPickerVisible) {
            setBankPickerVisible(false);
            setSearchBank("");
          } else {
            setConfigModalType(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.configModalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            
            {bankPickerVisible ? (
              /* ─── GIAO DIỆN CHỌN NGÂN HÀNG TRỰC TIẾP TRONG MODAL (HOẠT ĐỘNG 100% TRÊN IOS & ANDROID) ─── */
              <View>
                <View style={styles.configModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.configModalTitle, { color: themeColors.textPrimary }]}>Chọn ngân hàng</Text>
                    <Text style={[styles.configModalSub, { color: themeColors.textSecondary }]}>
                      Hỗ trợ chuyển nhanh Napas 247 & VietQR
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => {
                      setBankPickerVisible(false);
                      setSearchBank("");
                    }}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder="🔍 Tìm ngân hàng (MB, VCB, TCB, ACB, TPB...)"
                  value={searchBank}
                  onChangeText={setSearchBank}
                  containerStyle={{ marginBottom: 10 }}
                />

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {filteredBanks.map((bank) => {
                    const isSelected =
                      configModalType === "main" ? bank.bin === bankBin : bank.bin === savingsBankBin;

                    return (
                      <TouchableOpacity
                        key={bank.bin}
                        style={[
                          styles.bankPickRow,
                          { borderBottomColor: themeColors.borderLight || "#F1F5F9" },
                          isSelected && styles.bankPickRowActive,
                        ]}
                        onPress={() => {
                          if (configModalType === "main") {
                            setBankBin(bank.bin);
                          } else {
                            setSavingsBankBin(bank.bin);
                          }
                          setBankPickerVisible(false);
                          setSearchBank("");
                        }}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: bank.logo }} style={styles.bankPickLogo} resizeMode="contain" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.bankPickShortName, { color: isSelected ? colors.indigo600 : themeColors.textPrimary }]}>
                            {bank.shortName}
                          </Text>
                          <Text style={[styles.bankPickFullName, { color: themeColors.textSecondary }]} numberOfLines={1}>
                            {bank.name}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.checkCircle}>
                            <Text style={styles.checkCircleText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              /* ─── GIAO DIỆN NHẬP FORM CẤU HÌNH TÀI KHOẢN ─── */
              <View>
                {/* Modal Header */}
                <View style={styles.configModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.configModalTitle, { color: themeColors.textPrimary }]}>
                      {configModalType === "main" ? "Cấu hình Ngân hàng giao dịch" : "Cấu hình Ngân hàng tiết kiệm"}
                    </Text>
                    <Text style={[styles.configModalSub, { color: themeColors.textSecondary }]}>
                      {configModalType === "main"
                        ? "Nhận tiền thanh toán chia sẻ chi phí & VietQR"
                        : "Nhận tiền phân bổ vào quỹ tích lũy an toàn"}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setConfigModalType(null)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                  {/* Chọn ngân hàng */}
                  <Text style={[styles.fieldLabel, { color: themeColors.textPrimary }]}>Ngân hàng (*)</Text>
                  <TouchableOpacity
                    style={[styles.bankSelectBtn, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                    onPress={() => setBankPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bankSelectLeft}>
                      <Image
                        source={{ uri: configModalType === "main" ? selectedBank.logo : selectedSavingsBank.logo }}
                        style={styles.bankSelectLogo}
                        resizeMode="contain"
                      />
                      <View style={styles.bankSelectTextGroup}>
                        <Text style={[styles.bankSelectShortName, { color: themeColors.textPrimary }]}>
                          {configModalType === "main" ? selectedBank.shortName : selectedSavingsBank.shortName}
                        </Text>
                        <Text style={[styles.bankSelectFullName, { color: themeColors.textSecondary }]} numberOfLines={1}>
                          {configModalType === "main" ? selectedBank.name : selectedSavingsBank.name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bankSelectArrowBox}>
                      <Text style={styles.bankSelectArrow}>▼</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Nhập số tài khoản */}
                  <Input
                    label="Số tài khoản ngân hàng (*)"
                    placeholder="Nhập số tài khoản chính xác..."
                    keyboardType="number-pad"
                    value={configModalType === "main" ? accountNo : savingsAccountNo}
                    onChangeText={(text) => {
                      if (configModalType === "main") {
                        setAccountNo(text);
                      } else {
                        setSavingsAccountNo(text);
                      }
                    }}
                  />

                  {/* Nhập tên chủ tài khoản */}
                  <Input
                    label="Tên chủ tài khoản (*)"
                    placeholder="VD: NGUYEN VAN A"
                    value={configModalType === "main" ? accountName : savingsAccountName}
                    onChangeText={(text) => {
                      if (configModalType === "main") {
                        setAccountName(text.toUpperCase());
                      } else {
                        setSavingsAccountName(text.toUpperCase());
                      }
                    }}
                    editable={true}
                  />

                  {/* Chỉ báo ngân hàng nhận tiền */}
                  {(configModalType === "main" ? accountNo.trim().length >= 6 : savingsAccountNo.trim().length >= 6) && (
                    <View style={styles.qrBankHintBadge}>
                      <Text style={styles.qrBankHintText}>
                        Mã VietQR sẽ nhận tiền về:{" "}
                        <Text style={{ fontWeight: "900", color: "#4338CA" }}>
                          {configModalType === "main" ? selectedBank.shortName : selectedSavingsBank.shortName}
                        </Text>
                        {" • STK: "}
                        <Text style={{ fontWeight: "900", color: "#0F172A" }}>
                          {configModalType === "main" ? accountNo.trim() : savingsAccountNo.trim()}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {/* Xem trước VietQR */}
                  <Text style={[styles.previewQrLabel, { color: themeColors.textPrimary }]}>Xem trước mã VietQR:</Text>
                  <View style={{ marginBottom: 16 }}>
                    {(configModalType === "main" ? accountNo.trim().length >= 6 : savingsAccountNo.trim().length >= 6) ? (
                      <VietQRCard
                        bankBin={configModalType === "main" ? bankBin.trim() : savingsBankBin.trim()}
                        accountNo={configModalType === "main" ? accountNo.trim() : savingsAccountNo.trim()}
                        accountName={(configModalType === "main" ? accountName : savingsAccountName).trim().toUpperCase()}
                        verified={true}
                        description={configModalType === "main" ? `Chuyen tien cho ${accountName || user?.name || "ShareMoney"}` : "Nap quy Vi Tiet Kiem"}
                      />
                    ) : (
                      <View style={styles.emptyQrBox}>
                        <Building2 size={36} color="#94A3B8" strokeWidth={1.5} style={{ marginBottom: 6 }} />
                        <Text style={styles.emptyQrText}>Chưa có số tài khoản</Text>
                        <Text style={styles.emptyQrSubText}>Vui lòng nhập số tài khoản hợp lệ (từ 6 đến 19 chữ số) để tạo mã VietQR</Text>
                      </View>
                    )}
                  </View>

                  {/* Nút thao tác */}
                  <View style={styles.actionRow}>
                    <Button
                      title="Hủy"
                      variant="secondary"
                      onPress={() => setConfigModalType(null)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={configModalType === "main" ? "Lưu ngân hàng giao dịch" : "Lưu ngân hàng tiết kiệm"}
                      variant={configModalType === "main" ? "primary" : "amber"}
                      onPress={configModalType === "main" ? handleSaveMainBank : handleSaveSavingsBank}
                      loading={configModalType === "main" ? mainBankLoading : savingsLoading}
                      style={{ flex: 1.8 }}
                    />
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL CHỌN ẢNH ĐẠI DIỆN
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAvatarModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.avatarModalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            activeOpacity={1}
          >
            <View style={styles.configModalHeader}>
              <Text style={[styles.configModalTitle, { color: themeColors.textPrimary }]}>Chọn ảnh đại diện</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAvatarModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tải ảnh từ thư viện máy */}
            <TouchableOpacity
              style={styles.galleryPickBtn}
              onPress={handlePickAvatarFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.galleryIconCircle}>
                <Camera size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.galleryPickTitle}>Tải ảnh từ điện thoại</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC CHỌN AVATAR MẪU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Lưới Avatar mẫu */}
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              <View style={styles.presetGrid}>
                {AVATAR_PRESETS.map((presetUrl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetItem}
                    onPress={() => {
                      setAvatarModalVisible(false);
                      handleUpdateAvatar(presetUrl);
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

      {/* ══════════════════════════════════════════════════════════════
          MODAL MÃ QR CÁ NHÂN
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        transparent
        visible={myQrVisible}
        animationType="fade"
        onRequestClose={() => setMyQrVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMyQrVisible(false)}
          style={styles.qrModalOverlay}
        >
          <View style={[styles.qrModalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => setMyQrVisible(false)}
              style={styles.qrModalCloseBtn}
            >
              <Text style={styles.qrModalCloseText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.qrModalAvatarBox}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.qrModalAvatar} />
              ) : (
                <Text style={styles.qrModalAvatarLetter}>{user?.name?.charAt(0) || "U"}</Text>
              )}
            </View>

            <Text style={[styles.qrModalTitle, { color: themeColors.textPrimary }]}>{user?.name || "Người dùng"}</Text>
            {user?.phone ? (
              <Text style={[styles.qrModalPhone, { color: themeColors.textSecondary }]}>📞 {user.phone}</Text>
            ) : null}

            <View style={styles.qrModalFrame}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `https://sharemoney.app/user/${user?.id || ""}`
                  )}`,
                }}
                style={styles.qrModalImage}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.qrModalHint, { color: themeColors.textSecondary }]}>
              Đưa mã này cho bạn bè hoặc trưởng nhóm quét để thêm bạn vào nhóm siêu tốc! ✨
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 40,
  },

  /* Khối cha chung */
  blockSection: {
    marginBottom: 24,
  },
  mainHeaderTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  blockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  blockIconBoxMono: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bankTagMono: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bankTagMonoText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  blockSub: {
    fontSize: 11,
    marginTop: 1,
  },

  cardSurface: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  userProfileTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.indigo600,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.white,
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "900",
  },
  userEmailText: {
    fontSize: 12,
    marginTop: 2,
  },
  changeAvatarSmallBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  changeAvatarSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.indigo600,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  profileInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  profileInfoLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  profileInfoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  editBtnOutline: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  editBtnOutlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.indigo600,
  },

  /* Khối nhỏ ngân hàng */
  bankCardItem: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  bankCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bankTagIndigo: {
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  bankTagIndigoText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4338CA",
    letterSpacing: 0.2,
  },
  bankTagAmber: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  bankTagAmberText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#B45309",
    letterSpacing: 0.2,
  },
  configPill: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  configPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate600,
  },
  bankCardContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  bankLogo: {
    width: "80%",
    height: "80%",
  },
  bankNameTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  bankAccNoText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.indigo600,
    marginVertical: 2,
    letterSpacing: 0.5,
  },
  bankAccOwnerText: {
    fontSize: 11,
  },
  bankCardFooterStrip: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankCardFooterDesc: {
    fontSize: 10,
    color: colors.slate500,
    flex: 1,
    marginRight: 6,
  },
  statusVerifiedBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.emerald600,
  },
  statusVerifiedBadgeAmber: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.amber700,
  },

  /* Dark mode card */
  darkModeCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  darkModeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  darkModeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  darkModeTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  darkModeSub: {
    fontSize: 11,
    marginTop: 2,
  },

  logoutBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: colors.slate400,
    fontWeight: "600",
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  configModalCard: {
    width: "100%",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    maxHeight: "92%",
  },
  configModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  configModalTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  configModalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate700,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  bankSelectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  bankSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bankSelectLogo: {
    width: 36,
    height: 24,
  },
  bankSelectTextGroup: {
    marginLeft: 10,
    flex: 1,
  },
  bankSelectShortName: {
    fontSize: 13,
    fontWeight: "800",
  },
  bankSelectFullName: {
    fontSize: 10,
  },
  bankSelectArrowBox: {
    paddingHorizontal: 4,
  },
  bankSelectArrow: {
    fontSize: 10,
    color: colors.slate500,
  },
  lookupStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: -6,
  },
  lookupLoadingText: {
    fontSize: 11,
    color: colors.indigo600,
    fontWeight: "700",
  },
  lookupVerifiedRow: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 10,
    marginTop: -4,
  },
  lookupVerifiedText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "800",
  },
  lookupErrorRow: {
    backgroundColor: "#FEF2F2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 10,
    marginTop: -4,
  },
  lookupErrorText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "700",
    lineHeight: 16,
  },
  validatingQrBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C7D2FE",
    padding: 16,
    gap: 8,
  },
  validatingQrText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4338CA",
    textAlign: "center",
  },
  validatingQrSubText: {
    fontSize: 11,
    color: "#6366F1",
    textAlign: "center",
  },
  errorQrBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#FCA5A5",
    padding: 16,
  },
  errorQrTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 4,
  },
  errorQrDesc: {
    fontSize: 11,
    color: "#B91C1C",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  emptyQrBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    padding: 16,
  },
  emptyQrText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 4,
  },
  emptyQrSubText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
  qrBankHintBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  qrBankHintText: {
    fontSize: 12,
    color: "#3730A3",
    lineHeight: 18,
  },
  previewQrLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 4,
  },

  /* Bank Picker Modal */
  bankPickerCard: {
    width: "100%",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  bankPickRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  bankPickRowActive: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
  },
  bankPickLogo: {
    width: 44,
    height: 28,
  },
  bankPickShortName: {
    fontSize: 13,
    fontWeight: "800",
  },
  bankPickFullName: {
    fontSize: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.indigo600,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: "900",
  },

  /* Avatar Modal */
  avatarModalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  galleryPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    gap: 12,
  },
  galleryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryPickTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.indigo600,
  },
  galleryPickSub: {
    fontSize: 10,
    color: colors.slate600,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.slate400,
    marginHorizontal: 8,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  presetItem: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  presetImg: {
    width: "100%",
    height: "100%",
  },

  /* My Profile QR Button & Modal Styles */
  myQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    gap: 12,
  },
  myQrIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  myQrBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  myQrBtnSub: {
    fontSize: 10,
    marginTop: 2,
  },
  myQrBtnArrow: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4F46E5",
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  qrModalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  qrModalCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate600,
  },
  qrModalAvatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.indigo50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#C7D2FE",
  },
  qrModalAvatar: {
    width: "100%",
    height: "100%",
  },
  qrModalAvatarLetter: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.indigo600,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 2,
    textAlign: "center",
  },
  qrModalPhone: {
    fontSize: 12,
    marginBottom: 14,
  },
  qrModalFrame: {
    width: 230,
    height: 230,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  qrModalImage: {
    width: "100%",
    height: "100%",
  },
  qrModalHint: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
