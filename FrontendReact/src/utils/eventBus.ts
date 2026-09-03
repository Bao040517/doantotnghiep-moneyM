import { DeviceEventEmitter } from "react-native";

export const APP_DATA_REFRESH_EVENT = "APP_DATA_REFRESH_EVENT";

/**
 * Phát tín hiệu cập nhật dữ liệu toàn cục (Global Refresh).
 * Tất cả các màn hình (Dashboard, Ví, Lịch sử, Báo cáo, Tiết kiệm, Ngân sách...)
 * sẽ tự động fetch lại số dư và giao dịch mới ngay lập tức mà không cần reload.
 */
export const refreshGlobalAppData = () => {
  DeviceEventEmitter.emit(APP_DATA_REFRESH_EVENT);
};
