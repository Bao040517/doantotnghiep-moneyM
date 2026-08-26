import { useState, useEffect, useCallback } from "react";
import { DeviceEventEmitter } from "react-native";
import { notificationService, AppNotification } from "../services/notificationService";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count || 0);
    } catch (e) {
      console.log("[NOTIF] Failed to fetch unread count:", e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications();
      setNotifications(data || []);
      const count = (data || []).filter((n) => !n.isRead).length;
      setUnreadCount(count);
    } catch (e) {
      console.log("[NOTIF] Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      DeviceEventEmitter.emit("notif_count_updated");
    } catch (e) {
      console.log("[NOTIF] Failed to mark as read:", e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      DeviceEventEmitter.emit("notif_count_updated");
    } catch (e) {
      console.log("[NOTIF] Failed to mark all as read:", e);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Listen for new real-time notifications via WebSocket STOMP
    const subNew = DeviceEventEmitter.addListener("new_notification", (newNotif?: any) => {
      console.log("[REALTIME NOTIF RECEIVED]", newNotif);
      setUnreadCount((prev) => prev + 1);
      if (newNotif && newNotif.id) {
        setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
      } else {
        fetchNotifications();
      }
    });

    // Listen for unread count sync across components
    const subSync = DeviceEventEmitter.addListener("notif_count_updated", () => {
      fetchUnreadCount();
    });

    return () => {
      subNew.remove();
      subSync.remove();
    };
  }, [fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
};
