import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  DeviceEventEmitter,
} from "react-native";
import {
  Bell,
  BellOff,
  ArrowUpRight,
  CheckCircle2,
  Megaphone,
  AlertTriangle,
  Mail,
} from "lucide-react-native";
import { colors } from "../../constants/colors";
import { notificationService, AppNotification } from "../../services/notificationService";
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications();
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
      DeviceEventEmitter.emit("notif_count_updated");
      onReadAction();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      DeviceEventEmitter.emit("notif_count_updated");
      onReadAction();
    } catch (e) {
      console.error(e);
    }
  };

  const renderIcon = (type?: string) => {
    switch (type) {
      case "DEBT_REMINDER":
      case "REMIND_DEBT":
        return <Bell size={18} color="#0F172A" strokeWidth={2} />;
      case "PAYMENT_NOTIFY":
      case "PAYMENT_RECEIVED":
        return <ArrowUpRight size={18} color="#0F172A" strokeWidth={2} />;
      case "PAYMENT_APPROVED":
        return <CheckCircle2 size={18} color="#0F172A" strokeWidth={2} />;
      case "EXPENSE_REVISION_REQUESTED":
      case "EXPENSE_REVISION_REJECTED":
      case "WARNING":
      case "BUDGET_WARNING":
      case "Z_SCORE_ANOMALY":
        return <AlertTriangle size={18} color="#0F172A" strokeWidth={2} />;
      case "SYSTEM":
        return <Megaphone size={18} color="#0F172A" strokeWidth={2} />;
      default:
        return <Mail size={18} color="#0F172A" strokeWidth={2} />;
    }
  };

  const getTitle = (type?: string) => {
    switch (type) {
      case "DEBT_REMINDER":
      case "REMIND_DEBT":
        return "Nhắc nợ";
      case "PAYMENT_NOTIFY":
      case "PAYMENT_RECEIVED":
        return "Thông báo nhận tiền";
      case "PAYMENT_APPROVED":
        return "Thanh toán thành công";
      case "EXPENSE_REVISION_REQUESTED":
        return "Yêu cầu chỉnh sửa chi tiêu";
      case "EXPENSE_REVISION_REJECTED":
        return "Yêu cầu chỉnh sửa bị từ chối";
      case "BUDGET_WARNING":
      case "WARNING":
      case "Z_SCORE_ANOMALY":
        return "Cảnh báo chi tiêu";
      case "SYSTEM":
        return "Hệ thống";
      default:
        return "Thông báo mới";
    }
  };

  if (!visible) return null;

  return (
    <BottomSheet 
      visible={visible} 
      onClose={onClose} 
      title="Thông Báo"
    >
      {loading && notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Đang tải...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <BellOff size={36} color="#94A3B8" strokeWidth={1.5} style={{ marginBottom: 12 }} />
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
                {renderIcon(item.type)}
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>{getTitle(item.type)}</Text>
                <Text style={styles.itemMessage}>{item.message}</Text>
                <Text style={styles.itemTime}>{item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : ""}</Text>
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
