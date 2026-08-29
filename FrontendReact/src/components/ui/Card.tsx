import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? themeColors.card : colors.white,
          borderColor: isDark ? themeColors.border : colors.slate100,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
});
