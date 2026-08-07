import { api } from "./api";

export interface VietQrRequestPayload {
  receiverId?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  amount: number;
  description?: string;
}

export interface VietQrResponseData {
  qrDataURL?: string;
  qrCode?: string;
  amount?: number;
  accountName?: string;
  accountNo?: string;
  bankBin?: string;
}

export const vietQrService = {
  generateQrCode: (payload: VietQrRequestPayload) =>
    api.post<VietQrResponseData>("/payments/qr-code", payload).then((res) => res.data),
};
