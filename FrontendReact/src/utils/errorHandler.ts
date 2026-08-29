let RNAlert: any = null;
try {
  RNAlert = require("react-native")?.Alert;
} catch {
  RNAlert = null;
}

export interface ApiErrorResponse {
  status?: number;
  errorCode?: string;
  message?: string;
  errors?: Record<string, string>;
  timestamp?: string;
}

/**
 * Trích xuất thông điệp lỗi tiếng Việt thân thiện từ mọi loại ngoại lệ (Axios, Network, Runtime Error, etc.)
 */
export function extractErrorMessage(
  error: unknown,
  defaultMessage = "Đã xảy ra sự cố, vui lòng thử lại sau."
): string {
  if (!error) return defaultMessage;

  // Xử lý Axios Error hoặc API Response Error
  if (typeof error === "object" && error !== null) {
    const err = error as any;

    // 1. Lỗi mất kết nối mạng
    if (
      err.code === "ERR_NETWORK" ||
      err.message === "Network Error" ||
      err.message?.toLowerCase().includes("network request failed")
    ) {
      return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền Internet hoặc thử lại sau.";
    }

    // 2. Lỗi quá thời gian chờ (Timeout)
    if (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout")) {
      return "Yêu cầu xử lý quá thời gian chờ (Timeout). Vui lòng thử lại sau.";
    }

    // 3. Phản hồi từ Server Backend (Spring Boot ErrorResponse)
    const responseData = err.response?.data;
    if (responseData) {
      // Trường hợp có validation field-level errors
      if (responseData.errors && typeof responseData.errors === "object") {
        const fieldErrorMessages = Object.values(responseData.errors).filter(
          (msg) => typeof msg === "string" && msg.trim().length > 0
        );
        if (fieldErrorMessages.length > 0) {
          return fieldErrorMessages.join("\n");
        }
      }

      // Thông báo message từ Backend
      if (typeof responseData.message === "string" && responseData.message.trim().length > 0) {
        return responseData.message;
      }

      // Lỗi dạng string trong data
      if (typeof responseData === "string" && responseData.trim().length > 0) {
        return responseData;
      }
    }

    // 4. Xử lý theo HTTP Status Code khi Backend không trả message cụ thể
    const status = err.response?.status;
    if (status) {
      switch (status) {
        case 400:
          return "Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại.";
        case 401:
          return "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.";
        case 403:
          return "Bạn không có quyền thực hiện thao tác này.";
        case 404:
          return "Không tìm thấy dữ liệu yêu cầu trên máy chủ.";
        case 409:
          return "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc dữ liệu.";
        case 413:
          return "Tập tin tải lên vượt quá dung lượng tối đa cho phép.";
        case 500:
        case 502:
        case 503:
        case 504:
          return "Máy chủ đang gặp sự cố gián đoạn. Vui lòng thử lại sau ít phút.";
        default:
          break;
      }
    }

    // 5. JavaScript Error message chuẩn
    if (typeof err.message === "string" && err.message.trim().length > 0) {
      // Bỏ qua message thô kiểu "Request failed with status code 400"
      if (!err.message.includes("Request failed with status code")) {
        return err.message;
      }
    }
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return defaultMessage;
}

/**
 * Trích xuất mã lỗi hệ thống (ErrorCode) từ Backend nếu có
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    return err.response?.data?.errorCode;
  }
  return undefined;
}

/**
 * Tiện ích hiển thị popup Alert báo lỗi chuẩn hóa cho người dùng
 */
export function showErrorAlert(
  error: unknown,
  title = "Thông báo lỗi",
  onDismiss?: () => void
): void {
  const message = extractErrorMessage(error);
  if (RNAlert && typeof RNAlert.alert === "function") {
    RNAlert.alert(title, message, [
      {
        text: "Đồng ý",
        onPress: onDismiss,
        style: "default",
      },
    ]);
  } else {
    console.warn(`[${title}] ${message}`);
    if (onDismiss) onDismiss();
  }
}
