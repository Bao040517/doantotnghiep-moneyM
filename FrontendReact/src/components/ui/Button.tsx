import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { colors } from "../../constants/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "amber" | "outline";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  textStyle,
  icon,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.indigo600 : colors.white} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, variant === "outline" && styles.outlineText, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: { backgroundColor: colors.indigo600 },
  secondary: { backgroundColor: colors.slate100 },
  danger: { backgroundColor: colors.rose500 },
  amber: { backgroundColor: colors.amber500 },
  outline: { backgroundColor: colors.transparent, borderWidth: 1.5, borderColor: colors.indigo600 },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.98 }] },
  text: { color: colors.white, fontSize: 15, fontWeight: "700" },
  outlineText: { color: colors.indigo600 },
});
