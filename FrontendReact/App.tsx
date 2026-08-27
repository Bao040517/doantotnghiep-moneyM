import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AlertProvider } from "./src/context/AlertContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

// Ẩn toàn bộ popup cảnh báo hệ thống (LogBox / YellowBox) trên giao diện người dùng
LogBox.ignoreAllLogs(true);

/** StatusBar tự động chuyển đổi theo theme */
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

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
      <ThemeProvider>
        <AlertProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <AppNavigator />
          </AuthProvider>
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
