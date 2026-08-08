import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { colors } from "../../constants/colors";

interface QuickActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: "expense" | "group" | "income") => void;
}

export const QuickActionBottomSheet: React.FC<QuickActionBottomSheetProps> = ({
  visible,
  onClose,
  onSelectAction,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
              <Text style={styles.modalTitle}>Tạo tác vụ nhanh</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subHint}>
            Chọn hành động bạn muốn thực hiện ngay bây giờ:
          </Text>

          {/* 3 Quick Action Cards */}
          <View style={styles.actionList}>
            {/* 1. Tạo Chi Tiêu */}
            <TouchableOpacity
              style={[styles.actionCard, styles.expenseCard]}
              onPress={() => {
                onClose();
                onSelectAction("expense");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: "#ffe4e6" }]}>
                <Text style={{ fontSize: 26 }}>💸</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: "#e11d48" }]}>Tạo chi tiêu</Text>
                  <View style={[styles.badge, { backgroundColor: "#fecdd3" }]}>
                    <Text style={[styles.badgeText, { color: "#be123c" }]}>Chi tiêu</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Thêm 1 bản ghi vào lịch sử chi tiêu & trừ số dư ví</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            {/* 2. Tạo Nhóm */}
            <TouchableOpacity
              style={[styles.actionCard, styles.groupCard]}
              onPress={() => {
                onClose();
                onSelectAction("group");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: "#d1fae5" }]}>
                <Text style={{ fontSize: 26 }}>👥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: "#059669" }]}>Tạo nhóm mới</Text>
                  <View style={[styles.badge, { backgroundColor: "#a7f3d0" }]}>
                    <Text style={[styles.badgeText, { color: "#047857" }]}>Nhóm chung</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Bắt đầu chia sẻ chi tiêu chung với bạn bè</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            {/* 3. Nạp Tiền */}
            <TouchableOpacity
              style={[styles.actionCard, styles.incomeCard]}
              onPress={() => {
                onClose();
                onSelectAction("income");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: "#e0e7ff" }]}>
                <Text style={{ fontSize: 26 }}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: "#4f46e5" }]}>Nạp tiền vào ví</Text>
                  <View style={[styles.badge, { backgroundColor: "#c7d2fe" }]}>
                    <Text style={[styles.badgeText, { color: "#3730a3" }]}>Thu nhập</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Thêm tiền trực tiếp vào số dư khả dụng (Lương, nạp ví)</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#0f172a",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: -1,
  },
  subHint: {
    fontSize: 13,
    color: colors.slate500,
    fontWeight: "500",
    marginBottom: 16,
  },
  actionList: {
    gap: 12,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 14,
  },
  expenseCard: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  groupCard: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  incomeCard: {
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardSub: {
    fontSize: 12,
    color: colors.slate600,
    lineHeight: 16,
    fontWeight: "500",
  },
  arrowIcon: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.slate400,
  },
});
