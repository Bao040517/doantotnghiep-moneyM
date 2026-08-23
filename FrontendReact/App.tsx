import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AlertProvider } from "./src/context/AlertContext";
import { AuthProvider } from "./src/context/AuthContext";

// Ẩn toàn bộ popup cảnh báo hệ thống (LogBox / YellowBox) trên giao diện người dùng
LogBox.ignoreAllLogs(true);

export default function App() {
  useEffect(() => {
    // Helps browser IMEs, including UniKey, identify the app as Vietnamese.
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = "vi";
    return () => {
      document.documentElement.lang = previousLanguage;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AuthProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
