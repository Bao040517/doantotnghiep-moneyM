import axios from "axios";
import { api } from "./api";

const VIETQR_URL = "https://api.vietqr.io/v2/banks";

export interface CreatePaymentLinkPayload {
  description: string;
  productName: string;
  price: number;
  returnUrl?: string;
  cancelUrl?: string;
  groupId?: string;
  toUserId?: string;
  walletId?: string;
  categoryId?: string;
  budgetId?: string;
}

export interface PaymentLinkResponse {
  orderCode: number | string;
  orderId?: string;
  txnRef?: string;
  amount: number;
  description: string;
  checkoutUrl: string;
  qrCode: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  status: "PENDING" | "SUCCESS" | "CANCELLED";
}

/**
 * Khởi tạo Link thanh toán PayOS / VietQR (Chuẩn Bên Thứ 3)
 * Sử dụng api client có JWT interceptor thay vì raw axios
 */
export async function createPaymentLink(formValue: CreatePaymentLinkPayload): Promise<PaymentLinkResponse> {
  try {
    const res = await api.post("/payos/create-payment-link", null, {
      params: {
        amount: formValue.price,
        description: formValue.description,
        groupId: formValue.groupId,
        creditorId: formValue.toUserId,
        walletId: formValue.walletId,
        categoryId: formValue.categoryId,
        budgetId: formValue.budgetId,
      },
    });
    return res.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
}

/**
 * Lấy trạng thái đơn hàng thời gian thực
 * Sử dụng api client có JWT interceptor
 */
export async function getOrder(orderId: string) {
  try {
    const res = await api.get(`/payos/order/${orderId}`);
    return res.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
}

/**
 * Lấy danh sách 52 ngân hàng Napas247 từ VietQR Server
 * Giữ raw axios vì đây là external API không cần JWT
 */
export async function getBanksList() {
  try {
    const res = await axios({
      method: "GET",
      url: VIETQR_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
}

export const payosService = {
  createPaymentLink,
  getOrder,
  getBanksList,
};
