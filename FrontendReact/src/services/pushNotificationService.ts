import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";
import Constants from "expo-constants";

// ─── CẤU HÌNH NOTIFICATION HANDLER NATIVE ───
// Khi nhận thông báo: Tự động bật Banner nổi, phát Âm thanh chuông "ting ting" và rung
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const pushNotificationService = {
  /**
   * Xin quyền thông báo, cấu hình Channel và lấy Expo Push Token gửi lên Backend
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Thông báo ShareMoney",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4F46E5",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        });
      }

      // Kiểm tra và xin cấp quyền
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[PUSH] Người dùng chưa cấp quyền thông báo");
        return null;
      }

      // Lấy Expo Push Token
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const pushToken = tokenData.data;
      console.log("[PUSH] Lấy thành công Expo Push Token:", pushToken);

      // Gửi token lên Backend lưu vào tài khoản
      if (pushToken) {
        await api.post("/users/me/push-token", { pushToken });
        console.log("[PUSH] Đã đăng ký Push Token với Backend thành công");
      }

      return pushToken;
    } catch (error) {
      console.log("[PUSH ERROR] Không thể đăng ký Push Notifications:", error);
      return null;
    }
  },

  /**
   * Phát chuông "ting ting" và hiển thị Banner nổi ngay lập tức trên điện thoại
   */
  async triggerLocalNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || "💰 ShareMoney",
          body: body || "Bạn có thông báo mới",
          sound: "default",
          data: data,
        },
        trigger: null, // Bắn ngay lập tức (0 giây)
      });
    } catch (e) {
      console.log("[PUSH ERROR] Lỗi trigger thông báo cục bộ:", e);
    }
  },
};
