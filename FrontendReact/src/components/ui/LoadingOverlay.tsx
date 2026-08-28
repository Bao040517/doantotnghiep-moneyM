import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
  Easing,
  Platform,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  variant?: "spinner" | "pulse";
}

/**
 * 🔮 Glassmorphism Loading Overlay
 * Hiển thị lớp phủ làm mờ nền khi ứng dụng đang xử lý các tác vụ blocking (Quét AI, Phân bổ quỹ, Đồng bộ ngân hàng,...)
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = "Đang xử lý dữ liệu...",
  subMessage = "Vui lòng đợi trong giây lát",
  variant = "spinner",
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, opacityAnim, scaleAnim, pulseAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "rgba(30, 41, 59, 0.92)" : "rgba(255, 255, 255, 0.95)",
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated Spinner or Glowing Icon */}
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <ActivityIndicator size="large" color="#6366F1" />
          </Animated.View>

          {/* Main Message */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{message}</Text>

          {/* Sub Message */}
          {subMessage ? (
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>{subMessage}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "84%",
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
