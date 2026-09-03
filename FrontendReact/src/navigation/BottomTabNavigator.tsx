import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, TouchableOpacity, Platform, DeviceEventEmitter } from "react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AdvisorScreen } from "../screens/AdvisorScreen";
import { BudgetScreen } from "../screens/BudgetScreen";
import { SavingsScreen } from "../screens/SavingsScreen";
import { AddTransactionModal } from "../components/modals/AddTransactionModal";
import { QuickActionBottomSheet, QuickActionType } from "../components/modals/QuickActionBottomSheet";
import { CreateGroupBottomSheet } from "../components/modals/CreateGroupBottomSheet";
import { AiChatbotModal } from "../components/modals/AiChatbotModal";
import { HistoryScreen } from "../screens/HistoryScreen";
import { colors } from "../constants/colors";
import { UserSummary } from "../types";
import { useAppData } from "../hooks/useAppData";
import { financialServices } from "../services/financialServices";

import { Home, BarChart3, Sparkles, User, Plus } from "lucide-react-native";

import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";

const DashboardScreenWrapper = () => {
  const navigation = useNavigation<any>();
  return (
    <DashboardScreen
      onNavigate={(tab, targetId) => {
        if (tab === "savings") navigation.navigate("Savings");
        else if (tab === "budget") navigation.navigate("Budget", { targetBudgetId: targetId } as any);
        else if (tab === "groups") navigation.navigate("Groups");
        else if (tab === "history") navigation.navigate("History");
      }}
    />
  );
};

const HistoryScreenWrapper = () => {
  const navigation = useNavigation<any>();
  return (
    <HistoryScreen
      onNavigate={(tab) => {
        if (tab === "budget") navigation.navigate("Budget");
        else if (tab === "savings") navigation.navigate("Savings");
      }}
    />
  );
};

export type BottomTabParamList = {
  Dashboard: undefined;
  Report: undefined;
  AddAction: undefined;
  Advisor: undefined;
  Groups: undefined;
  Profile: undefined;
  History: undefined;
  Budget: { targetBudgetId?: string } | undefined;
  Savings: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface BottomTabNavigatorProps {
  user?: UserSummary | null;
  onLogout?: () => void;
  onRefreshUser?: () => void;
}

const NullComponent = () => null;

export const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = () => {
  const { colors: themeColors, isDark } = useTheme();
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);

  const { wallets, refresh } = useAppData();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("OPEN_AI_CHATBOT", () => {
      setAiChatVisible(true);
    });
    return () => sub.remove();
  }, []);

  const handleSelectAction = (action: QuickActionType) => {
    setQuickActionVisible(false);
    setTimeout(() => {
      if (action === "ai_chat") {
        setAiChatVisible(true);
      } else if (action === "expense") {
        setTransactionType("EXPENSE");
        setAddModalVisible(true);
      } else if (action === "income") {
        setTransactionType("INCOME");
        setAddModalVisible(true);
      } else if (action === "group") {
        setCreateGroupVisible(true);
      }
    }, 150);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          headerStyle: {
            backgroundColor: themeColors.card,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          },
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 18,
            color: themeColors.textPrimary,
          },
          tabBarStyle: {
            backgroundColor: themeColors.tabBarBg,
            borderTopWidth: 1,
            borderTopColor: themeColors.tabBarBorder,
            height: Platform.OS === "android" ? 82 : 86,
            paddingBottom: Platform.OS === "android" ? 20 : 28,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#10B981",
          tabBarInactiveTintColor: "#94A3B8",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginTop: 2,
          },
          tabBarIcon: ({ focused }) => {
            const iconColor = focused ? "#10B981" : "#94A3B8";
            const strokeWidth = focused ? 2.5 : 2;

            if (route.name === "Dashboard") {
              return (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <Home size={22} color={iconColor} strokeWidth={strokeWidth} />
                </View>
              );
            }
            if (route.name === "Report") {
              return (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <BarChart3 size={22} color={iconColor} strokeWidth={strokeWidth} />
                </View>
              );
            }
            if (route.name === "Advisor") {
              return (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <Sparkles size={22} color={iconColor} strokeWidth={strokeWidth} />
                </View>
              );
            }
            if (route.name === "Profile") {
              return (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <User size={22} color={iconColor} strokeWidth={strokeWidth} />
                </View>
              );
            }
            return null;
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreenWrapper}
          options={{ title: "Tổng quan" }}
        />

        <Tab.Screen name="Report" component={ReportScreen} options={{ title: "Thống kê" }} />

        {/* Hidden History Screen Route */}
        <Tab.Screen
          name="History"
          component={HistoryScreenWrapper}
          options={{
            title: "Lịch sử giao dịch",
            tabBarItemStyle: { display: "none" },
          }}
        />

        {/* Hidden Budget Screen Route */}
        <Tab.Screen
          name="Budget"
          component={BudgetScreen}
          options={{
            title: "Ngân sách",
            tabBarItemStyle: { display: "none" },
          }}
        />

        {/* Hidden Savings Screen Route */}
        <Tab.Screen
          name="Savings"
          component={SavingsScreen}
          options={{
            title: "Tiết kiệm",
            tabBarItemStyle: { display: "none" },
          }}
        />

        {/* Hidden Groups Screen Route */}
        <Tab.Screen
          name="Groups"
          component={GroupsScreen}
          options={{
            title: "Nhóm",
            tabBarItemStyle: { display: "none" },
          }}
        />

        {/* Center Floating Action Button */}
        <Tab.Screen
          name="AddAction"
          component={NullComponent}
          options={{
            title: "",
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.floatingCenterBtn}
                onPress={() => setQuickActionVisible(true)}
                activeOpacity={0.85}
              >
                <View style={styles.floatingCenterCircle}>
                  <Plus size={30} color={colors.white} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            ),
          }}
        />

        <Tab.Screen name="Advisor" component={AdvisorScreen} options={{ title: "Tư vấn" }} />

        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Cá nhân" }} />
      </Tab.Navigator>

      {/* Quick Action Selector Sheet (Tạo chi tiêu, Tạo nhóm, Nạp tiền) */}
      <QuickActionBottomSheet
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onSelectAction={handleSelectAction}
      />

      {/* Floating Add Transaction Modal */}
      <AddTransactionModal
        visible={addModalVisible}
        defaultType={transactionType}
        onClose={() => setAddModalVisible(false)}
        wallets={wallets}
        onAddTransaction={async (walletId, payload) => {
          await financialServices.createTransaction(walletId, payload);
          refresh();
        }}
      />

      {/* Floating Create Group Modal */}
      <CreateGroupBottomSheet
        visible={createGroupVisible}
        onClose={() => setCreateGroupVisible(false)}
        onGroupCreated={() => refresh()}
      />

      {/* Floating AI Chatbot Modal */}
      <AiChatbotModal
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    transform: [{ scale: 1.15 }],
  },
  floatingCenterBtn: {
    top: -24,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingCenterCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3.5,
    borderColor: colors.white,
  },
  plusIconText: {
    fontSize: 32,
    fontWeight: "300",
    color: colors.white,
    marginTop: -2,
  },
});
