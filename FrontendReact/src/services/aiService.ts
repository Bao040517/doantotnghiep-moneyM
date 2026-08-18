import { api } from "./api";

export interface AiMessageRequest {
  debtorName: string;
  creditorName: string;
  amount: number;
  mood?: string;
}

export interface AiMessageResponse {
  message: string;
}

export interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ScanReceiptResponse {
  amount: number;
  note: string;
  items?: ReceiptItem[];
}

export const aiService = {
  generateMessage: async (request: AiMessageRequest): Promise<AiMessageResponse> => {
    const response = await api.post<AiMessageResponse>("/ai/generate-message", request);
    return response.data;
  },

  scanReceipt: async (imageUri: string, mimeType: string, fileName: string): Promise<ScanReceiptResponse> => {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    const response = await api.post<ScanReceiptResponse>("/ai/scan-receipt", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  scanQrReceipt: async (url: string): Promise<ScanReceiptResponse> => {
    const response = await api.post<ScanReceiptResponse>("/ai/scan-qr-receipt", { url });
    return response.data;
  },
};
