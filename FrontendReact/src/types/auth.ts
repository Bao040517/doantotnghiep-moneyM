export interface UserSummary {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankQrUrl?: string;
}


export interface AuthResponse {
  token: string;
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
