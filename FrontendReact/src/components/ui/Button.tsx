import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { colors } from "../../constants/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "amber" | "outline" | "cancel";
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
        disabled && (variant === "primary" ? styles.primaryDisabled : styles.disabled),
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "secondary" ? "#4F46E5" : colors.white} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              variant === "secondary" && styles.secondaryText,
              variant === "outline" && styles.outlineText,
              variant === "cancel" && styles.cancelText,
              textStyle,
            ]}
            numberOfLines={1}
          >
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
  primary: {
    backgroundColor: "#4F46E5",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  cancel: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  danger: {
    backgroundColor: colors.rose600,
    shadowColor: colors.rose600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  amber: {
    backgroundColor: colors.amber500,
    shadowColor: colors.amber500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: "#4F46E5",
  },
  primaryDisabled: {
    backgroundColor: "#818CF8",
    opacity: 0.75,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  text: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryText: {
    color: "#334155",
    fontWeight: "800",
  },
  cancelText: {
    color: "#DC2626",
    fontWeight: "800",
  },
  outlineText: {
    color: "#4F46E5",
    fontWeight: "800",
  },
});
