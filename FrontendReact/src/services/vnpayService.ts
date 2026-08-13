import { api } from "./api";

export interface VNPayCreateResponse {
  paymentUrl: string;
}

export const vnpayService = {
  /**
   * Gọi Backend để tạo URL thanh toán VNPay Sandbox.
   * Backend sẽ băm HMAC SHA512 và trả về URL đầy đủ để mở trình duyệt.
   */
  createPayment: (amount: number, groupId?: string, creditorId?: string, type: "DEBT" | "BUDGET" = "DEBT", walletId?: string, categoryId?: string, budgetId?: string) => {
    let url = `/vnpay/create-payment?amount=${amount}&type=${type}`;
    if (groupId) url += `&groupId=${groupId}`;
    if (creditorId) url += `&creditorId=${creditorId}`;
    if (walletId) url += `&walletId=${walletId}`;
    if (categoryId) url += `&categoryId=${categoryId}`;
    if (budgetId) url += `&budgetId=${budgetId}`;
    return api.post<VNPayCreateResponse>(url).then((res) => res.data);
  },
};
