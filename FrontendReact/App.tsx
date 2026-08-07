import React from "react";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AlertProvider } from "./src/context/AlertContext";

LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "Running \"main\" with",
]);

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
