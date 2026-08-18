import React from "react";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AlertProvider } from "./src/context/AlertContext";

// Ẩn toàn bộ popup cảnh báo hệ thống (LogBox / YellowBox) trên giao diện người dùng
LogBox.ignoreAllLogs(true);

export default function App() {
  return (
    <SafeAreaProvider>
      <AlertProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AlertProvider>
    </SafeAreaProvider>
  );
}
