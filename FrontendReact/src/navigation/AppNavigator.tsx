import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { AuthScreen } from "../screens/AuthScreen";
import { BottomTabNavigator } from "./BottomTabNavigator";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../constants/colors";
import { socketService } from "../services/socketService";
import { Alert, DeviceEventEmitter } from "react-native";

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, register, logout, refreshProfile } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      socketService.connect(() => {
        socketService.subscribe(`/topic/user/${user.id}`, (message) => {
          console.log("[SOCKET USER TOPIC]", message);
          DeviceEventEmitter.emit('new_notification', message);
          DeviceEventEmitter.emit('pfm_event_updated', message);
        });
        socketService.subscribe(`/user/queue/notifications`, (message) => {
          console.log("[SOCKET NOTIFICATION]", message);
          DeviceEventEmitter.emit('new_notification', message);
          Alert.alert("Thông báo mới 🔔", message.message || "Bạn có thông báo mới.");
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
