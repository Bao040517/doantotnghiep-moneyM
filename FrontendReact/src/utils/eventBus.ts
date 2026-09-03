import { DeviceEventEmitter } from "react-native";

export const APP_DATA_REFRESH_EVENT = "APP_DATA_REFRESH_EVENT";

let refreshQueued = false;

/**
 * Phát tín hiệu cập nhật dữ liệu toàn cục (Global Refresh).
 * Tất cả các màn hình (Dashboard, Ví, Lịch sử, Báo cáo, Tiết kiệm, Ngân sách...)
 * sẽ tự động fetch lại số dư và giao dịch mới ngay lập tức mà không cần reload.
 */
export const refreshGlobalAppData = () => {
  // Một thao tác có thể đi qua cả API interceptor và service.
  // Phát ngay lập tức, nhưng chỉ một lần trong cùng lượt xử lý.
  if (refreshQueued) return;
  refreshQueued = true;
  DeviceEventEmitter.emit(APP_DATA_REFRESH_EVENT);
  setTimeout(() => {
    refreshQueued = false;
  }, 0);
};
