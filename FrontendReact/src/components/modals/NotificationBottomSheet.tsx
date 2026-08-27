import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, DeviceEventEmitter } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { notificationService, AppNotification } from "../../services/notificationService";
import { colors } from "../../constants/colors";

interface NotificationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationBottomSheet: React.FC<NotificationBottomSheetProps> = ({ visible, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      DeviceEventEmitter.emit("notif_count_updated");
    } catch (e) {
      console.log("Failed to mark notification as read:", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      DeviceEventEmitter.emit("notif_count_updated");
    } catch (e) {
      console.log("Failed to mark all as read:", e);
    }
  };

  const formatDateStr = (rawDateStr?: string) => {
    if (!rawDateStr) return "";
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return rawDateStr;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const DD = String(d.getDate()).padStart(2, "0");
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      return `${hh}:${mm} - ${DD}/${MM}`;
    } catch (e) {
      return rawDateStr;
    }
  };

  return (
    <BottomSheet 
      visible={visible} 
      onClose={onClose} 
      title="Thông Báo"
    >
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.indigo600} />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🔕</Text>
            <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
            <Text style={styles.emptySub}>Các nhắc nợ, giao dịch mới và lời khuyên sẽ xuất hiện tại đây.</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => !item.isRead && handleMarkAsRead(item.id)}
                style={[styles.itemCard, !item.isRead && styles.itemCardUnread]}
              >
                <View style={styles.iconCircle}>
                  <Text style={{ fontSize: 16 }}>{item.isRead ? "📩" : "🔔"}</Text>
                </View>
                <View style={styles.itemMain}>
                  <Text style={[styles.itemMsg, !item.isRead && styles.itemMsgUnread]}>{item.message}</Text>
                  <Text style={styles.itemTime}>{formatDateStr(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 250,
    maxHeight: 450,
  },
  loadingBox: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 10,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate800,
  },
  emptySub: {
    fontSize: 12,
    color: colors.slate400,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  scrollArea: {
    paddingVertical: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  itemCardUnread: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemMain: {
    flex: 1,
  },
  itemMsg: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
  },
  itemMsgUnread: {
    fontWeight: "700",
    color: colors.slate900,
  },
  itemTime: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.indigo600,
    marginLeft: 8,
  },
});
