import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Bell, ChevronLeft } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotif?: boolean;
  onNotifPress?: () => void;
  unreadCount?: number;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  userName?: string;
  onAvatarPress?: () => void;
  rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  showNotif = true,
  onNotifPress,
  unreadCount = 0,
  showAvatar = true,
  avatarUrl,
  userName = "User",
  onAvatarPress,
  rightAction,
}) => {
  const navigation = useNavigation<any>();
  const { isDark, colors: themeColors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Dashboard");
    }
  };

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      navigation.navigate("Profile" as never);
    }
  };

  return (
    <View
      style={[
        styles.headerBar,
        {
          backgroundColor: isDark
            ? themeColors.headerBg
            : "rgba(232, 245, 241, 0.95)",
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        {showBack ? (
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: isDark ? themeColors.surface : colors.white },
            ]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}

        <Text
          style={[styles.headerTitle, { color: themeColors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.headerRightActions}>
          {rightAction}

          {showNotif && (
            <TouchableOpacity
              style={[
                styles.iconCircle,
                { backgroundColor: isDark ? themeColors.surface : colors.white },
              ]}
              onPress={onNotifPress}
              activeOpacity={0.7}
            >
              <Bell size={18} color={themeColors.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {showAvatar && (
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.indigo600,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
