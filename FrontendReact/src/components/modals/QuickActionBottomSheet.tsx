import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { Sparkles } from "lucide-react-native";
import { colors } from "../../constants/colors";

export type QuickActionType = "expense" | "group" | "income" | "ai_chat";

interface QuickActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickActionType) => void;
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

          {/* Quick Action Cards */}
          <View style={styles.actionList}>
            {/* 0. Trợ lý AI Cố vấn & Lập Kế Hoạch */}
            <TouchableOpacity
              style={[styles.actionCard, styles.aiCard]}
              onPress={() => {
                onClose();
                onSelectAction("ai_chat");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}>
                <Sparkles size={26} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: "#b45309" }]}>Trợ lý AI & Lập Kế Hoạch</Text>
                  <View style={[styles.badge, { backgroundColor: "#fef3c7" }]}>
                    <Text style={[styles.badgeText, { color: "#b45309" }]}>AI 🤖</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Lập kế hoạch mua sắm mục tiêu 3 tháng, hỏi đáp dòng tiền</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            {/* 2. Tạo Chi Tiêu Thủ Công */}
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
                </View>
                <Text style={styles.cardSub}>Thêm 1 bản ghi vào lịch sử chi tiêu & trừ số dư ví</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            {/* 3. Tạo Nhóm */}
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
                </View>
                <Text style={styles.cardSub}>Bắt đầu chia sẻ chi tiêu chung với bạn bè</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            {/* 4. Nạp Tiền */}
            <TouchableOpacity
              style={[styles.actionCard, styles.incomeCard]}
              onPress={() => {
                onClose();
                onSelectAction("income");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}>
                <Text style={{ fontSize: 26 }}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: "#d97706" }]}>Nạp tiền vào ví</Text>
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
    gap: 10,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
  },
  aiCard: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  scanCard: {
    backgroundColor: "#f5f3ff",
    borderColor: "#c4b5fd",
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
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
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
    fontSize: 11.5,
    color: colors.slate600,
    lineHeight: 15,
    fontWeight: "500",
  },
  arrowIcon: {
    fontSize: 22,
    fontWeight: "300",
    color: colors.slate400,
  },
});
