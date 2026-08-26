import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { AuthScreen } from "../screens/AuthScreen";
import { BottomTabNavigator } from "./BottomTabNavigator";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../constants/colors";
import { socketService } from "../services/socketService";
import { pushNotificationService } from "../services/pushNotificationService";
import { DeviceEventEmitter } from "react-native";

const Stack = createNativeStackNavigator();

const resolvePushTitle = (type?: string) => {
  switch (type) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_SENT":
    case "PAYMENT_APPROVED":
    case "PAYMENT_NOTIFY":
      return "💰 Tiền về! ShareMoney";
    case "REMIND_DEBT":
    case "DEBT_REMINDER":
      return "🔔 Lời nhắc nợ từ bạn bè";
    case "EXPENSE_CREATED":
    case "EXPENSE_UPDATED":
      return "🧾 Chi tiêu nhóm ShareMoney";
    case "WARNING":
    case "Z_SCORE_ANOMALY":
    case "BUDGET_OVER":
    case "BUDGET_WARNING":
      return "⚠️ Cảnh báo tài chính";
    default:
      return "🔔 Thông báo ShareMoney";
  }
};

export const AppNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, register, logout, refreshProfile } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      // 1. Đăng ký Push Notification Native & Xin quyền
      pushNotificationService.registerForPushNotifications();

      // 2. Kết nối WebSocket STOMP Realtime
      socketService.connect(() => {
        socketService.subscribe(`/topic/user/${user.id}`, (message) => {
          console.log("[SOCKET USER TOPIC]", message);
          DeviceEventEmitter.emit('new_notification', message);
          DeviceEventEmitter.emit('pfm_event_updated', message);
          
          // Phát chuông "ting ting" và hiện Banner nổi ngay trên điện thoại
          pushNotificationService.triggerLocalNotification(
            resolvePushTitle(message?.type),
            message?.message || "Bạn có thông báo mới.",
            message
          );
        });

        socketService.subscribe(`/user/queue/notifications`, (message) => {
          console.log("[SOCKET NOTIFICATION]", message);
          DeviceEventEmitter.emit('new_notification', message);

          pushNotificationService.triggerLocalNotification(
            resolvePushTitle(message?.type),
            message?.message || "Bạn có thông báo mới.",
            message
          );
        });
      });
    } else {
      socketService.disconnect();
    }
    
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo600} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
  },
});
