import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../constants/colors";

export type BadgeVariant = "urgent" | "high" | "medium" | "low" | "success" | "warning" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = "neutral", style }) => {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles]]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  urgent: { backgroundColor: colors.rose100 },
  urgentText: { color: colors.rose600, fontWeight: "700" },
  high: { backgroundColor: colors.amber100 },
  highText: { color: colors.amber600, fontWeight: "700" },
  medium: { backgroundColor: colors.indigo100 },
  mediumText: { color: colors.indigo700, fontWeight: "600" },
  low: { backgroundColor: colors.slate100 },
  lowText: { color: colors.slate600, fontWeight: "500" },
  success: { backgroundColor: colors.emerald100 },
  successText: { color: colors.emerald700, fontWeight: "700" },
  warning: { backgroundColor: colors.amber100 },
  warningText: { color: colors.amber700, fontWeight: "700" },
  neutral: { backgroundColor: colors.slate100 },
  neutralText: { color: colors.slate700, fontWeight: "500" },
  text: { fontSize: 12 },
});
