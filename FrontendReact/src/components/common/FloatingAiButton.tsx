import React from "react";
import { TouchableOpacity, Text, View, StyleSheet, DeviceEventEmitter, StyleProp, ViewStyle } from "react-native";
import { Sparkles } from "lucide-react-native";

interface FloatingAiButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  bottomOffset?: number;
}

export const FloatingAiButton: React.FC<FloatingAiButtonProps> = ({
  onPress,
  style,
  bottomOffset = 24,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      DeviceEventEmitter.emit("OPEN_AI_CHATBOT");
    }
  };

  return (
    <TouchableOpacity
      style={[styles.floatingAiBtn, { bottom: bottomOffset }, style]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Sparkles size={22} color="#FFFFFF" />
      <View style={styles.floatingAiBadge}>
        <Text style={styles.floatingAiBadgeText}>AI</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingAiBtn: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    zIndex: 99,
  },
  floatingAiBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  floatingAiBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#ffffff",
  },
});
