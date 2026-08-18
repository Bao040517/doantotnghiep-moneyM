// @ts-ignore
import { VietQR } from "vietqr";
import { api } from "./api";

export interface VietQrRequestPayload {
  receiverId?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  amount: number;
  description?: string;
  template?: "compact" | "compact2" | "qr_only" | "print";
}

export interface VietQrResponseData {
  qrDataURL?: string;
  qrCode?: string;
  amount?: number;
  accountName?: string;
  accountNo?: string;
  bankBin?: string;
}

// Khởi tạo VietQR Client SDK chính thức
export const vietQRClient = new VietQR({
  clientID: "de8a0804-a76d-41e5-8ad6-31503ce7d5f4",
  apiKey: "17c29f09-4ea2-4417-b9c2-7f020d35de42",
});

export const vietQrService = {
  /**
   * Tạo QuickLink URL hình ảnh VietQR chuẩn Napas 247
   */
  genQuickLink: (options: {
    bank: string;
    accountName: string;
    accountNumber: string;
    amount: number;
    memo: string;
    template?: "compact" | "compact2" | "qr_only" | "print";
    media?: ".jpg" | ".png";
  }) => {
    const template = options.template || "compact2";
    const media = options.media || ".png";
    const cleanMemo = encodeURIComponent(options.memo || "Thanh toan ShareMoney");
    const cleanName = encodeURIComponent(options.accountName || "NGUOI NHAN");
    return `https://img.vietqr.io/image/${options.bank}-${options.accountNumber}-${template}${media}?amount=${options.amount}&addInfo=${cleanMemo}&accountName=${cleanName}`;
  },

  /**
   * Lấy danh sách 52 ngân hàng hỗ trợ VietQR
   */
  getBanks: () => vietQRClient.getBanks(),

  /**
   * Lấy danh sách template VietQR
   */
  getTemplate: () => vietQRClient.getTemplate(),

  /**
   * Sinh mã QR dạng Base64 từ VietQR API
   */
  genQRCodeBase64: (payload: {
    bank: string;
    accountName: string;
    accountNumber: string;
    amount: number;
    memo: string;
    template?: string;
  }) => {
    return vietQRClient.genQRCodeBase64({
      bank: payload.bank,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber,
      amount: payload.amount.toString(),
      memo: payload.memo,
      template: payload.template || "compact2",
    });
  },

  /**
   * Gọi Backend nội bộ tạo mã QR
   */
  generateQrCode: (payload: VietQrRequestPayload) =>
    api.post<VietQrResponseData>("/payments/qr-code", payload).then((res) => res.data),
};
