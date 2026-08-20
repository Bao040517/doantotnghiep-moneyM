import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { colors } from "../constants/colors";

import { LoginPayload, RegisterPayload } from "../types";
import { useAuth } from "../hooks/useAuth";

interface AuthScreenProps {
  onLogin?: (payload: LoginPayload) => Promise<any>;
  onRegister?: (payload: RegisterPayload) => Promise<any>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin: propLogin, onRegister: propRegister }) => {
  const { login: contextLogin, register: contextRegister } = useAuth();
  const onLogin = propLogin || contextLogin;
  const onRegister = propRegister || contextRegister;
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggleMode = () => {
    setIsRegister((prev) => !prev);
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await onRegister({ name: name.trim(), email: email.trim(), password });
      } else {
        await onLogin({ email: email.trim(), password });
      }
    } catch (e: any) {
      console.error("Login error detail:", e);
      Alert.alert("Lỗi", e.response?.data?.message || e.message || "Đã có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>💎</Text>
          </View>
          <Text style={styles.appName}>ShareMoney</Text>
          <Text style={styles.tagline}>Quản lý tài chính cá nhân & Nhóm thông minh</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{isRegister ? "Tạo tài khoản mới" : "Đăng nhập tài khoản"}</Text>

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
            placeholder="Nhập địa chỉ email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title={isRegister ? "Đăng ký ngay" : "Đăng nhập"}
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <Button
            title={isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký ngay"}
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
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 20,
    textAlign: "center",
  },
  submitBtn: {
    marginTop: 8,
  },
  switchBtn: {
    marginTop: 12,
  },
});
