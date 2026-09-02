import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, Mail, KeyRound, Lock, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react-native";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/authService";

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialEmail = "",
}) => {
  const { isDark } = useTheme();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep(1);
      setCountdown(0);
    }
  }, [visible, initialEmail]);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const trimmedEmail = email.trim();
  const trimmedOtp = otp.trim();

  // Password validation booleans
  const isPasswordLengthValid = newPassword.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordComplexValid = hasLetter && hasNumber;
  const isPasswordValid = isPasswordLengthValid && isPasswordComplexValid;
  const isPasswordMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSendOtp = async () => {
    if (!trimmedEmail) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ email");
      return;
    }

    const isGmail = /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(trimmedEmail);
    if (!isGmail) {
      Alert.alert("Lỗi", "Email phải có định dạng Gmail (@gmail.com)");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(trimmedEmail);
      Alert.alert("Thành công", res.message || "Mã OTP đã được gửi đến email của bạn.");
      setStep(2);
      setCountdown(60);
    } catch (e: any) {
      console.error("Forgot password error:", e);
      Alert.alert(
        "Lỗi",
        e.response?.data?.message || e.message || "Không thể gửi mã OTP, vui lòng thử lại sau"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const res = await authService.forgotPassword(trimmedEmail);
      Alert.alert("Đã gửi lại", res.message || "Mã OTP mới đã được gửi đến email của bạn.");
      setCountdown(60);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e.response?.data?.message || e.message || "Không thể gửi lại mã OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      Alert.alert("Lỗi", "Mã xác thực OTP phải gồm đúng 6 chữ số");
      return;
    }

    if (!isPasswordValid) {
      Alert.alert(
        "Lỗi",
        "Mật khẩu mới phải có ít nhất 6 ký tự và bao gồm cả chữ cái lẫn chữ số"
      );
      return;
    }

    if (!isPasswordMatch) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không trùng khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword({
        email: trimmedEmail,
        otp: trimmedOtp,
        newPassword,
      });

      Alert.alert(
        "Thành công! 🎉",
        res.message || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.",
        [
          {
            text: "Đăng nhập ngay",
            onPress: () => {
              onClose();
              onSuccess(trimmedEmail);
            },
          },
        ]
      );
    } catch (e: any) {
      console.error("Reset password error:", e);
      Alert.alert(
        "Lỗi",
        e.response?.data?.message || e.message || "Đặt lại mật khẩu thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.card, isDark ? styles.cardDark : undefined]}>
          {/* Header */}
          <View style={styles.header}>
            {step === 2 ? (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={20} color={isDark ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerIconWrapper}>
                <KeyRound size={20} color="#6366F1" />
              </View>
            )}

            <View style={styles.headerTitleWrapper}>
              <Text style={[styles.headerTitle, isDark ? styles.textDark : undefined]}>
                {step === 1 ? "Quên Mật Khẩu" : "Nhập Mã OTP & Đổi MK"}
              </Text>
              <Text style={[styles.headerSubtitle, isDark ? styles.textMutedDark : undefined]}>
                {step === 1
                  ? "Nhận mã xác thực 6 số qua Gmail"
                  : `Mã đã gửi tới ${trimmedEmail}`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={isDark ? "#94A3B8" : "#64748B"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              // ──── STEP 1: NHẬP EMAIL ────
              <View>
                <Text style={[styles.instructions, isDark ? styles.textMutedDark : undefined]}>
                  Nhập địa chỉ Gmail tài khoản của bạn. Chúng tôi sẽ gửi mã xác thực OTP 6 số để bạn đặt lại mật khẩu mới.
                </Text>

                <Input
                  label="Địa chỉ Gmail"
                  placeholder="ví dụ: yourname@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />

                <Button
                  title={loading ? "Đang gửi mã..." : "Gửi mã xác thực"}
                  variant="primary"
                  onPress={handleSendOtp}
                  loading={loading}
                  style={styles.actionBtn}
                />
              </View>
            ) : (
              // ──── STEP 2: NHẬP OTP & MẬT KHẨU MỚI ────
              <View>
                {/* OTP Input */}
                <View style={styles.otpBoxWrapper}>
                  <Text style={[styles.inputLabel, isDark ? styles.textMutedDark : undefined]}>
                    Mã xác thực OTP (6 chữ số)
                  </Text>
                  <Input
                    placeholder="Nhập 6 số (VD: 849201)"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    style={styles.otpInput}
                  />

                  {/* Resend OTP button / timer */}
                  <View style={styles.resendRow}>
                    <Text style={[styles.resendText, isDark ? styles.textMutedDark : undefined]}>
                      Không nhận được mã?
                    </Text>
                    {countdown > 0 ? (
                      <Text style={styles.countdownText}>Gửi lại sau ({countdown}s)</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={handleResendOtp}
                        disabled={loading}
                        style={styles.resendBtn}
                      >
                        <RefreshCw size={14} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={styles.resendBtnText}>Gửi lại mã ngay</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* New Password */}
                <Input
                  label="Mật khẩu mới"
                  placeholder="Tối thiểu 6 ký tự gồm chữ & số"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                {/* Confirm Password */}
                <Input
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                {/* Password requirement indicator */}
                <View
                  style={[
                    styles.requirementBox,
                    isDark ? styles.requirementBoxDark : undefined,
                  ]}
                >
                  <View style={styles.requirementRow}>
                    <Text
                      style={[
                        styles.requirementIcon,
                        isPasswordValid ? styles.requirementPassed : styles.requirementPending,
                      ]}
                    >
                      {isPasswordValid ? "✓" : "•"}
                    </Text>
                    <Text
                      style={[
                        styles.requirementText,
                        isDark ? styles.requirementTextDark : undefined,
                        isPasswordValid ? styles.requirementTextPassed : undefined,
                      ]}
                    >
                      Tối thiểu 6 ký tự gồm cả chữ cái và số
                    </Text>
                  </View>

                  <View style={styles.requirementRow}>
                    <Text
                      style={[
                        styles.requirementIcon,
                        isPasswordMatch ? styles.requirementPassed : styles.requirementPending,
                      ]}
                    >
                      {isPasswordMatch ? "✓" : "•"}
                    </Text>
                    <Text
                      style={[
                        styles.requirementText,
                        isDark ? styles.requirementTextDark : undefined,
                        isPasswordMatch ? styles.requirementTextPassed : undefined,
                      ]}
                    >
                      Mật khẩu xác nhận trùng khớp
                    </Text>
                  </View>
                </View>

                <Button
                  title={loading ? "Đang xử lý..." : "Xác nhận & Đổi mật khẩu"}
                  variant="primary"
                  onPress={handleResetPassword}
                  loading={loading}
                  style={styles.actionBtn}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#0F172A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cardDark: {
    backgroundColor: "#1E293B",
    borderColor: "#475569",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.slate900,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    maxHeight: 460,
  },
  instructions: {
    fontSize: 13,
    color: colors.slate600,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6,
  },
  otpBoxWrapper: {
    marginBottom: 12,
  },
  otpInput: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  resendText: {
    fontSize: 12,
    color: colors.slate500,
  },
  countdownText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendBtnText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  requirementBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginVertical: 10,
  },
  requirementBoxDark: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  requirementIcon: {
    fontSize: 13,
    fontWeight: "700",
    width: 16,
  },
  requirementPending: {
    color: colors.slate400,
  },
  requirementPassed: {
    color: "#16A34A",
  },
  requirementText: {
    fontSize: 12,
    color: colors.slate600,
  },
  requirementTextDark: {
    color: "#94A3B8",
  },
  requirementTextPassed: {
    color: "#16A34A",
    fontWeight: "600",
  },
  actionBtn: {
    marginTop: 12,
    marginBottom: 8,
  },
  textDark: {
    color: "#F8FAFC",
  },
  textMutedDark: {
    color: "#94A3B8",
  },
});
