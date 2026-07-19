"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import api from "@/lib/axios";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsDrawer() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      setNotifications(res.data);
      return res.data;
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (unreadNotifs: Notification[]) => {
    if (unreadNotifs.length === 0) return;
    try {
      await Promise.all(
        unreadNotifs.map((n) => api.post(`/notifications/${n.id}/read`)),
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications().then((data) => {
        const unread = data.filter((n: Notification) => !n.isRead);
        markAsRead(unread);
      });
    }
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-emerald-100 active:scale-95 transition-transform text-emerald-600">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#FDF9F0] rounded-t-[32px] px-2 border-none max-h-[85vh]">
        <div className="mx-auto w-full max-w-md pt-2 flex flex-col h-full">
          <DrawerHeader className="text-center pb-4 border-b border-gray-200">
            <DrawerTitle className="text-xl font-bold text-gray-800">
              Thông báo
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 py-4 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-[#B3E5D1] border-t-[#45b39d] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-50">🔕</div>
                <p className="text-gray-500 font-medium">
                  Chưa có thông báo nào
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isAnomaly = notif.type === "SPENDING_ANOMALY";
                const bgClass = notif.isRead
                  ? "bg-white shadow-sm"
                  : isAnomaly
                    ? "bg-red-50 border border-red-200 shadow-sm"
                    : "bg-[#e2f5ee] border border-[#B3E5D1] shadow-sm";

                const titleText =
                  notif.title ||
                  (isAnomaly ? "Bất thường chi tiêu" : "Thông báo mới");

                return (
                  <div key={notif.id} className={`p-4 rounded-2xl ${bgClass}`}>
                    <div className="flex items-start gap-2">
                      {isAnomaly && <span className="text-lg">🚨</span>}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`font-bold text-sm ${isAnomaly ? "text-red-700" : "text-gray-800"}`}
                        >
                          {titleText}
                        </h4>
                        <p className="text-gray-600 text-[13px] mt-1 leading-snug">
                          {notif.message}
                        </p>
                        <p className="text-gray-400 text-[10px] mt-2 font-medium">
                          {format(
                            new Date(notif.createdAt),
                            "dd MMM yyyy, HH:mm",
                            { locale: vi },
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
