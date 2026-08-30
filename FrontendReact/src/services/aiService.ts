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

export const aiService = {
  generateMessage: async (request: AiMessageRequest): Promise<AiMessageResponse> => {
    const response = await api.post<AiMessageResponse>("/ai/generate-message", request);
    return response.data;
  },
};

