import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { colors } from "../../constants/colors";

export type AlertType = "warning" | "error" | "success" | "info" | "confirm";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive" | "primary";
}

export interface CustomAlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface CustomAlertModalProps {
  visible: boolean;
  options: CustomAlertOptions | null;
  onClose: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  options,
  onClose,
}) => {
  if (!options) return null;

  const { title = "Thông báo", message, type = "warning", buttons } = options;

  // Determine icon & color theme
  let icon = "⚠️";
  let iconBgColor = "#FEF3C7";
  let iconTextColor = "#D97706";

  if (type === "success") {
    icon = "🎉";
    iconBgColor = colors.emerald50;
    iconTextColor = colors.emerald600;
  } else if (type === "error") {
    icon = "❌";
    iconBgColor = "#FFE4E6";
    iconTextColor = colors.rose600;
  } else if (type === "info") {
    icon = "ℹ️";
    iconBgColor = colors.indigo50;
    iconTextColor = colors.indigo600;
  } else if (type === "confirm") {
    icon = "❓";
    iconBgColor = colors.indigo50;
    iconTextColor = colors.indigo600;
  }

  // Default button if none specified
  const actionButtons: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "Đã hiểu", style: "primary", onPress: onClose }];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cardContainer}>
              {/* Icon Bubble */}
              <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                <Text style={{ fontSize: 26 }}>{icon}</Text>
              </View>

              {/* Title & Message */}
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.messageText}>{message}</Text>

              {/* Buttons */}
              <View style={styles.btnRow}>
                {actionButtons.map((btn, index) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  let btnBg = colors.indigo600;
                  let btnText = colors.white;

                  if (isCancel) {
                    btnBg = colors.slate100;
                    btnText = colors.slate700;
                  } else if (isDestructive) {
                    btnBg = colors.rose500;
                    btnText = colors.white;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        onClose();
                        if (btn.onPress) btn.onPress();
                      }}
                      style={[
                        styles.btn,
                        { backgroundColor: btnBg },
                        actionButtons.length > 1 && { flex: 1 },
                      ]}
                    >
                      <Text style={[styles.btnText, { color: btnText }]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 8,
    textAlign: "center",
  },
  messageText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.slate600,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
