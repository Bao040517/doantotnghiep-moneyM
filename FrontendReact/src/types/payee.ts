export interface Payee {
  id?: string;

  /** Tên gợi nhớ do người dùng đặt, VD: "Cô Lan chủ nhà" */
  name: string;

  /** Mã BIN Napas247, VD: "970422" = MBBank */
  bankBin?: string;

  /** Tên ngân hàng, VD: "MBBank" */
  bankName?: string;

  /** Số tài khoản ngân hàng */
  bankAccount: string;

  /** Tên chủ tài khoản (ALL CAPS từ ngân hàng) */
  accountName?: string;

  /** Số điện thoại (tùy chọn) */
  phone?: string;

  createdAt?: string;

  /**
   * Nguồn dữ liệu:
   * - "saved": đã lưu trong danh bạ của user
   * - "group_member": bạn bè trong nhóm chi tiêu (chưa lưu vào danh bạ)
   */
  source?: "saved" | "group_member";
}

export interface SavePayeePayload {
  name: string;
  bankBin?: string;
  bankName?: string;
  bankAccount: string;
  accountName?: string;
  phone?: string;
}
