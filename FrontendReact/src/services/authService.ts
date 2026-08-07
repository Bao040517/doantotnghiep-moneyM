import { api } from "./api";
import { AuthResponse, LoginPayload, RegisterPayload, UserSummary } from "../types";

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", payload);
    return response.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", payload);
    return response.data;
  },

  getProfile: async (): Promise<UserSummary> => {
    const response = await api.get<UserSummary>("/users/me");
    return response.data;
  },

  updatePhone: async (phone: string): Promise<UserSummary> => {
    const response = await api.put<UserSummary>("/users/me/phone", { phone });
    return response.data;
  },

  updateVietQRLink: async (data: { bankBin?: string; bankAccountNo?: string; bankAccountName?: string }): Promise<UserSummary> => {
    const response = await api.put<UserSummary>("/users/me/qr", data);
    return response.data;
  },
};
