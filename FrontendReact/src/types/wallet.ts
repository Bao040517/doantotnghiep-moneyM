export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  isLiability?: boolean;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

export interface WalletPayload {
  name: string;
  balance: number;
  isLiability?: boolean;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

