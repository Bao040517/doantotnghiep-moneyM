export type TransactionType = "INCOME" | "EXPENSE";

export interface Transaction {
  id: string;
  walletId: string;
  walletName?: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  amount: number;
  type: TransactionType;
  note?: string;
  transactionDate: string;
  createdAt?: string;
}

export interface TransactionPayload {
  walletId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  note?: string;
  transactionDate: string;
}

export interface MonthlySummary {
  totalIncome?: number;
  totalExpense?: number;
  netCashFlow?: number;
  month?: number;
  year?: number;
  months?: any[];
  comparison?: any;
  currentMonth?: {
    totalIncome: number;
    totalExpense: number;
    topCategory?: string;
  };
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  totalAmount: number;
  percentage: number;
  groupType?: "NEEDS" | "WANTS" | "SAVINGS";
}
