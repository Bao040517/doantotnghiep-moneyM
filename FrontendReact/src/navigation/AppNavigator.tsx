import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { AuthScreen } from "../screens/AuthScreen";
import { BottomTabNavigator } from "./BottomTabNavigator";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../constants/colors";
import { socketService } from "../services/socketService";
import { Alert } from "react-native";

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, register, logout, refreshProfile } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      socketService.connect(() => {
        socketService.subscribe(`/user/queue/notifications`, (message) => {
          console.log("[SOCKET NOTIFICATION]", message);
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
          <Stack.Screen name="MainTabs">
            {() => <BottomTabNavigator user={user} onLogout={logout} onRefreshUser={refreshProfile} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth">
            {() => <AuthScreen onLogin={login} onRegister={register} />}
          </Stack.Screen>
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
