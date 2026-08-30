/**
 * Universal QR Code Parser Utility for ShareMoney
 * Tự động nhận diện và trích xuất dữ liệu từ các định dạng mã QR khác nhau:
 * 1. GROUP_INVITE: Mã QR mời tham gia nhóm
 * 2. USER_PROFILE: Mã QR hồ sơ cá nhân để thêm thành viên vào nhóm
 * 3. RECEIPT_URL: Mã QR hoá đơn mua sắm / E-Invoice điện tử
 * 4. VIETQR: Mã QR chuyển khoản Napas247
 * 5. OTHER: Dữ liệu văn bản khác
 */

export type QrCodeType =
  | "GROUP_INVITE"
  | "USER_PROFILE"
  | "VIETQR"
  | "OTHER";

export interface ParsedQrResult {
  type: QrCodeType;
  raw: string;
  groupId?: string;
  userId?: string;
  payload?: any;
}

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export function parseScannedQr(data: string): ParsedQrResult {
  if (!data || typeof data !== "string") {
    return { type: "OTHER", raw: "" };
  }

  const raw = data.trim();

  // 1. Kiểm tra định dạng JSON
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed.type === "GROUP_INVITE" ||
        parsed.type === "JOIN_GROUP" ||
        parsed.groupId
      ) {
        return {
          type: "GROUP_INVITE",
          raw,
          groupId: parsed.groupId || parsed.id,
          payload: parsed,
        };
      }
      if (
        parsed.type === "USER_PROFILE" ||
        parsed.type === "USER_MEMBER" ||
        (parsed.userId && !parsed.groupId)
      ) {
        return {
          type: "USER_PROFILE",
          raw,
          userId: parsed.userId || parsed.id,
          payload: parsed,
        };
      }
    } catch {
      // Bỏ qua nếu không parse được JSON hợp lệ
    }
  }

  // 2. Nhận diện Group Invite (URL / Custom Deep Link / Prefix)
  // VD: https://sharemoney.app/groups/UUID, sharemoney://groups/UUID/join, GROUP_INVITE:UUID
  if (
    raw.startsWith("GROUP_INVITE:") ||
    raw.startsWith("SHAREMONEY_GROUP:") ||
    raw.includes("/groups/") ||
    raw.includes("/join-group") ||
    raw.includes("sharemoney://group")
  ) {
    const uuidMatch = raw.match(UUID_REGEX);
    if (uuidMatch) {
      return {
        type: "GROUP_INVITE",
        raw,
        groupId: uuidMatch[0],
      };
    }
  }

  // 3. Nhận diện User Profile (URL / Custom Deep Link / Prefix)
  // VD: https://sharemoney.app/user/UUID, sharemoney://user/UUID, SHAREMONEY_USER:UUID
  if (
    raw.startsWith("SHAREMONEY_USER:") ||
    raw.startsWith("USER:") ||
    raw.includes("/user/") ||
    raw.includes("/users/") ||
    raw.includes("sharemoney://user")
  ) {
    const uuidMatch = raw.match(UUID_REGEX);
    if (uuidMatch) {
      return {
        type: "USER_PROFILE",
        raw,
        userId: uuidMatch[0],
      };
    }
  }

  // 4. Nhận diện VietQR chuyển khoản ngân hàng
  if (
    raw.startsWith("00020101") ||
    raw.includes("vietqr.io") ||
    raw.includes("napas247")
  ) {
    return {
      type: "VIETQR",
      raw,
    };
  }

  // 5. Trường hợp chuỗi UUID độc lập
  const directUuidMatch = raw.match(new RegExp(`^${UUID_REGEX.source}$`));
  if (directUuidMatch) {
    return {
      type: "GROUP_INVITE",
      raw,
      groupId: directUuidMatch[0],
    };
  }

  return {
    type: "OTHER",
    raw,
  };
}
