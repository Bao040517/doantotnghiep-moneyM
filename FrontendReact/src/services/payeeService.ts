import { api } from "./api";
import { Payee, SavePayeePayload } from "../types/payee";

export const payeeService = {
  /** Danh bạ người nhận đã lưu (sắp xếp mới nhất trước) */
  getPayees: (): Promise<Payee[]> =>
    api.get<Payee[]>("/payees").then((res) => res.data),

  /**
   * Danh sách gợi ý thông minh (Saved + Bạn bè trong nhóm có STK).
   * Đã dedup theo số tài khoản ngân hàng.
   */
  getSuggestions: (): Promise<Payee[]> =>
    api.get<Payee[]>("/payees/suggestions").then((res) => res.data),

  /**
   * Lưu người nhận mới hoặc cập nhật nếu STK đã tồn tại (upsert).
   * Tự động tránh tạo duplicate.
   */
  savePayee: (payload: SavePayeePayload): Promise<Payee> =>
    api.post<Payee>("/payees", payload).then((res) => res.data),

  /** Xóa người nhận khỏi danh bạ */
  deletePayee: (id: string): Promise<void> =>
    api.delete(`/payees/${id}`).then((res) => res.data),
};
