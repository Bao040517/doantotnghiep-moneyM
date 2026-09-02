import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { colors } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";

import { LoginPayload, RegisterPayload } from "../types";
import { useAuth } from "../hooks/useAuth";

interface AuthScreenProps {
  onLogin?: (payload: LoginPayload) => Promise<any>;
  onRegister?: (payload: RegisterPayload) => Promise<any>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin: propLogin,
  onRegister: propRegister,
}) => {
  const { login: contextLogin, register: contextRegister } = useAuth();
  const { isDark } = useTheme();
  const onLogin = propLogin || contextLogin;
  const onRegister = propRegister || contextRegister;
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmedEmail = email.trim();
  const trimmedName = name.trim();

  // Helper validation booleans
  const isGmailValid = /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(trimmedEmail);
  const isPasswordLengthValid = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordComplexValid = hasLetter && hasNumber;
  const isPasswordValid = isPasswordLengthValid && isPasswordComplexValid;

  const handleToggleMode = () => {
    setIsRegister((prev) => !prev);
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async () => {
    if (!trimmedEmail || !password || (isRegister && !trimmedName)) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (isRegister) {
      if (!isGmailValid) {
        Alert.alert(
          "Lỗi",
          "Email đăng ký phải đúng định dạng Gmail (ví dụ: yourname@gmail.com)"
        );
        return;
      }

      if (!isPasswordLengthValid) {
        Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }

      if (!isPasswordComplexValid) {
        Alert.alert(
          "Lỗi",
          "Mật khẩu phải bao gồm cả chữ cái và chữ số (ví dụ: Pass123)"
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        if (!onRegister) return;
        await onRegister({
          name: trimmedName,
          email: trimmedEmail,
          password,
        });
      } else {
        if (!onLogin) return;
        await onLogin({
          email: trimmedEmail,
          password,
        });
      }
    } catch (e: any) {
      console.error("Auth error:", e);
      // Hiển thị thông báo thân thiện chuẩn xác cho người dùng
      if (e.response?.data?.errorCode === "INVALID_CREDENTIALS" || e.response?.status === 401) {
        Alert.alert("Thông báo", "Tên đăng nhập hoặc mật khẩu không đúng.");
      } else {
        Alert.alert(
          "Lỗi",
          e.response?.data?.message || e.message || "Thao tác thất bại, vui lòng thử lại"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, isDark ? styles.containerDark : undefined]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>💎</Text>
          </View>
          <Text style={[styles.appName, isDark ? styles.textDark : undefined]}>ShareMoney</Text>
          <Text style={[styles.tagline, isDark ? styles.textMutedDark : undefined]}>
            Quản lý tài chính cá nhân & Nhóm thông minh
          </Text>
        </View>

        <Card style={[styles.card, isDark ? styles.cardDark : undefined]}>
          <Text style={[styles.cardTitle, isDark ? styles.textDark : undefined]}>
            {isRegister ? "Tạo tài khoản mới" : "Đăng nhập tài khoản"}
          </Text>

          {isRegister && (
            <Input
              label="Họ và tên"
              placeholder="Nhập họ và tên của bạn"
              value={name}
              onChangeText={setName}
            />
          )}

          <Input
            label="Email"
            placeholder={isRegister ? "ví dụ: yourname@gmail.com" : "Nhập địa chỉ email"}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Mật khẩu"
            placeholder={isRegister ? "Mật khẩu (gồm cả chữ và số)" : "Nhập mật khẩu"}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {isRegister && (
            <View
              style={[
                styles.requirementBox,
                isDark ? styles.requirementBoxDark : undefined,
              ]}
            >
              <Text
                style={[
                  styles.requirementTitle,
                  isDark ? styles.textMutedDark : undefined,
                ]}
              >
                Yêu cầu tài khoản:
              </Text>
              <View style={styles.requirementRow}>
                <Text
                  style={[
                    styles.requirementIcon,
                    isGmailValid ? styles.requirementPassed : styles.requirementPending,
                  ]}
                >
                  {isGmailValid ? "✓" : "•"}
                </Text>
                <Text
                  style={[
                    styles.requirementText,
                    isDark ? styles.requirementTextDark : undefined,
                    isGmailValid ? styles.requirementTextPassed : undefined,
                  ]}
                >
                  Email định dạng Gmail (@gmail.com)
                </Text>
              </View>
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
                  Mật khẩu tối thiểu 6 ký tự gồm cả chữ và số
                </Text>
              </View>
            </View>
          )}

          <Button
            title={isRegister ? "Đăng ký ngay" : "Đăng nhập"}
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <Button
            title={
              isRegister
                ? "Đã có tài khoản? Đăng nhập"
                : "Chưa có tài khoản? Đăng ký ngay"
            }
            variant="outline"
            onPress={handleToggleMode}
            style={styles.switchBtn}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  containerDark: {
    backgroundColor: "#0B1120",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.indigo600,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.slate900,
  },
  tagline: {
    fontSize: 14,
    color: colors.slate500,
    marginTop: 4,
  },
  card: {
    padding: 24,
  },
  cardDark: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 20,
    textAlign: "center",
  },
  textDark: {
    color: "#F8FAFC",
  },
  textMutedDark: {
    color: "#94A3B8",
  },
  requirementBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 16,
  },
  requirementBoxDark: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
  },
  requirementTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate600,
    marginBottom: 6,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  requirementIcon: {
    fontSize: 14,
    fontWeight: "700",
    width: 18,
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
  submitBtn: {
    marginTop: 4,
  },
  switchBtn: {
    marginTop: 12,
  },
});
