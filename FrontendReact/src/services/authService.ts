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

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/refresh", { refreshToken });
    return response.data;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    try {
      await api.post("/auth/logout", { refreshToken: refreshToken || "" });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
  },

  getProfile: async (): Promise<UserSummary> => {
    const response = await api.get<UserSummary>("/users/me");
    return response.data;
  },

  updatePhone: async (phone: string): Promise<UserSummary> => {
    const response = await api.put<UserSummary>("/users/me/phone", { phone });
    return response.data;
  },

  updateAvatar: async (avatarUrl: string): Promise<UserSummary> => {
    const response = await api.put<UserSummary>("/users/me/avatar", { avatarUrl });
    return response.data;
  },

  updateVietQRLink: async (data: {
    bankQrUrl?: string;
    bankBin?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
    savingsBankBin?: string;
    savingsBankAccountNo?: string;
    savingsBankAccountName?: string;
  }): Promise<UserSummary> => {
    const response = await api.put<UserSummary>("/users/me/qr", data);
    return response.data;
  },

  lookupBankAccount: async (bin: string, accountNumber: string): Promise<{
    accountName?: string;
    bin: string;
    accountNumber: string;
    verified: boolean;
    message?: string;
  }> => {
    const response = await api.post<{
      accountName?: string;
      bin: string;
      accountNumber: string;
      verified: boolean;
      message?: string;
    }>("/bank/lookup", { bin, accountNumber });
    return response.data;
  },
};
