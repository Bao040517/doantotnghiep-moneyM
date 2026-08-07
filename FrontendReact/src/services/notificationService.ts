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
  markAsRead: (id: string) =>
    api.post<void>(`/notifications/${id}/read`).then((res) => res.data),
};
