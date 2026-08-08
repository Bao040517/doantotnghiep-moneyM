import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  DeviceEventEmitter,
} from "react-native";
import { colors } from "../../constants/colors";
import { notificationService, Notification } from "../../services/notificationService";
import { BottomSheet } from "../ui/BottomSheet";

interface NotificationsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onReadAction: () => void;
}

export const NotificationsBottomSheet: React.FC<NotificationsBottomSheetProps> = ({
  visible,
  onClose,
  onReadAction
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifs();
    }
  }, [visible]);

  // Listen to global app event for new notifications
  useEffect(() => {
    if (visible) {
      const sub = DeviceEventEmitter.addListener('new_notification', () => {
        fetchNotifs();
      });
      return () => {
        sub.remove();
      };
    }
  }, [visible]);

  const handleRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      onReadAction();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    
    try {
      await Promise.all(unread.map(n => notificationService.markAsRead(n.id)));
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      onReadAction();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "DEBT_REMINDER": return "🔔";
      case "PAYMENT_NOTIFY": return "💸";
      case "PAYMENT_APPROVED": return "✅";
      case "SYSTEM": return "📢";
      default: return "📩";
    }
  };

  if (!visible) return null;

  const hasUnread = notifications.some(n => !n.isRead);

  const headerRight = hasUnread ? (
    <TouchableOpacity onPress={handleMarkAllRead}>
      <Text style={styles.markAllText}>Đánh dấu đã đọc hết</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <BottomSheet 
      visible={visible} 
      onClose={onClose} 
      title="Thông báo" 
      headerRight={headerRight}
    >
      {loading && notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Đang tải...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🔕</Text>
          <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
          <Text style={styles.emptySub}>Các cập nhật mới nhất về chi tiêu và nhóm sẽ xuất hiện tại đây.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.item, !item.isRead && styles.itemUnread]} 
              onPress={() => !item.isRead && handleRead(item.id)}
              disabled={item.isRead}
            >
              <View style={styles.iconBg}>
                <Text style={{ fontSize: 20 }}>{getIcon(item.type)}</Text>
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>{item.title}</Text>
                <Text style={styles.itemMessage}>{item.message}</Text>
                <Text style={styles.itemTime}>{new Date(item.createdDate).toLocaleString("vi-VN")}</Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  markAllText: {
    fontSize: 12,
    color: colors.indigo600,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    minHeight: 180,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate800,
  },
  emptySub: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: "center",
    color: colors.slate400,
    fontSize: 14,
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  itemUnread: {
    backgroundColor: "#F8FAFC",
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 4,
  },
  itemTitleUnread: {
    fontWeight: "800",
    color: colors.slate900,
  },
  itemMessage: {
    fontSize: 13,
    color: colors.slate500,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemTime: {
    fontSize: 11,
    color: colors.slate400,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.rose500,
    marginLeft: 10,
  },
});
