import React from "react";
import { Modal, View, StyleSheet, TouchableWithoutFeedback, Text, Pressable } from "react-native";
import { colors } from "../../constants/colors";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, title, headerRight, children }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalCard}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.headerRightContainer}>
                {headerRight}
                <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtnWrapper}>
                  <Text style={styles.closeBtn}>✕</Text>
                </Pressable>
              </View>
            </View>
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
