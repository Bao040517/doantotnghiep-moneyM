import React from "react";
import { Modal, View, StyleSheet, TouchableWithoutFeedback, Text, Pressable, Keyboard } from "react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, title, headerRight, children }) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? themeColors.card : colors.white,
              borderColor: isDark ? themeColors.border : "#0f172a",
            },
          ]}
        >
          {title && (
            <Pressable
              onPress={Keyboard.dismiss}
              style={[styles.header, { borderBottomColor: isDark ? themeColors.divider : colors.slate100 }]}
            >
              <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
              <View style={styles.headerRightContainer}>
                {headerRight}
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  hitSlop={10}
                  style={[
                    styles.closeBtnWrapper,
                    { backgroundColor: isDark ? themeColors.surface : colors.slate100 },
                  ]}
                >
                  <Text style={[styles.closeBtn, { color: themeColors.textSecondary }]}>✕</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
          <View style={{ flexShrink: 1 }}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalCard: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#0f172a",
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    fontFamily: "Roboto",
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeBtnWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    fontSize: 16,
    color: colors.slate600,
    fontWeight: "800",
  },
});
