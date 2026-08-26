import { api } from "./api";

export interface AppNotification {
  id: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt?: string;
}

export const notificationService = {
  getUserNotifications: () =>
    api.get<AppNotification[]>("/notifications").then((res) => res.data),
  getUnreadCount: () =>
    api.get<{ unreadCount: number }>("/notifications/unread-count").then((res) => res.data.unreadCount),
  markAsRead: (id: string) =>
    api.post<void>(`/notifications/${id}/read`).then((res) => res.data),
  markAllAsRead: () =>
    api.post<void>("/notifications/read-all").then((res) => res.data),
};
