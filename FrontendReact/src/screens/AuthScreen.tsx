import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { colors } from "../constants/colors";

import { LoginPayload, RegisterPayload } from "../types";

interface AuthScreenProps {
  onLogin: (payload: LoginPayload) => Promise<any>;
  onRegister: (payload: RegisterPayload) => Promise<any>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("nguyenvana@gmail.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await onRegister({ name, email, password });
      } else {
        await onLogin({ email, password });
      }
    } catch (e: any) {
      console.error("Login error detail:", e);
      Alert.alert("Lỗi đăng nhập", e.response?.data?.message || e.message || "Đã có lỗi xảy ra, vui lòng thử lại");
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
              placeholder="Nguyễn Văn A"
              value={name}
              onChangeText={setName}
            />
          )}

          <Input
            label="Email"
            placeholder="example@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Mật khẩu"
            placeholder="••••••••"
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
            onPress={() => setIsRegister(!isRegister)}
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
