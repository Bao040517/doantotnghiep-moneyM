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
  remainingAmount: number;
  percentageSpent: number;
  groupType?: "NEEDS" | "WANTS" | "SAVINGS";
}

export interface BudgetPayload {
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
  type?: "NEEDS" | "WANTS" | "SAVINGS";
}
