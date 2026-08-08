import { api } from "./api";
import { ScanReceiptResponse } from "../types"; // I might need to add this type

export const aiService = {
  scanReceipt: async (imageUri: string, mimeType: string, fileName: string) => {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    const response = await api.post<any>("/ai/scan-receipt", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
