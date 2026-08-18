export interface Budget {
  id: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  limitAmount: number;
  spentAmount: number;
  month: number;
  year: number;
  type?: "NEEDS" | "WANTS" | "SAVINGS";
}

export interface BudgetSummary {
  budgetId?: string;
  name?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount?: number;
  percentageSpent?: number;
  availableAmount?: number;
  percentage?: number;
  status?: "OK" | "WARNING" | "OVER";
  groupType?: "NEEDS" | "WANTS" | "SAVINGS";
  type?: string;
  isRecurring?: boolean;
  dueDayOfMonth?: number;
  isMandatory?: boolean;
  /** @deprecated Use isMandatory instead */
  mandatory?: boolean;
  payeeBankBin?: string;
  payeeBankAccount?: string;
  payeeAccountName?: string;
  payeeId?: string;
  /** Thời điểm tạo budget — dùng để lọc giao dịch không hồi tố */
  createdAt?: string;
  /** Fallback ID field for backward compatibility */
  id?: string;
}

export interface BudgetPayload {
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
  name?: string;
  type?: string;
  isMandatory?: boolean;
  isRecurring?: boolean;
  dueDayOfMonth?: number;
  payeeBankBin?: string;
  payeeBankAccount?: string;
  payeeAccountName?: string;
  payeeId?: string;
  id?: string;
}
