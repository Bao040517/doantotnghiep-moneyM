export interface UserSummary {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  bankQrUrl?: string;
  savingsBankBin?: string;
  savingsBankAccountNo?: string;
  savingsBankAccountName?: string;
}

export interface AuthResponse {
  token: string; // Keep for backward compatibility
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  user: UserSummary;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
