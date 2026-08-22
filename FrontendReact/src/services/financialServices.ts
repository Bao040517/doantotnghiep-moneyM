import { api } from "./api";
import {
  Wallet,
  WalletPayload,
  Budget,
  BudgetSummary,
  BudgetPayload,
  SavingsGoal,
  SavingsGoalPayload,
  AutoAllocateResponse,
  Transaction,
  TransactionPayload,
  MonthlySummary,
  CategoryBreakdown,
  CashflowSummaryResponse,
} from "../types";

export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  iconName?: string;
}

export const financialServices = {
  // Wallets API
  getWallets: () => api.get<Wallet[]>("/wallets").then((res) => res.data),
  getTotalBalance: () => api.get<{ totalBalance: number }>("/wallets/total-balance").then((res) => res.data),
  createWallet: (payload: WalletPayload) => api.post<Wallet>("/wallets", payload).then((res) => res.data),
  updateWallet: (id: string, payload: WalletPayload) => api.put<Wallet>(`/wallets/${id}`, payload).then((res) => res.data),
  deleteWallet: (id: string) => api.delete<void>(`/wallets/${id}`).then((res) => res.data),

  // Categories API
  getCategories: () => api.get<Category[]>("/categories").then((res) => res.data),

  // Budgets API
  getBudgetSummary: (year: number, month: number) =>
    api.get<BudgetSummary[]>(`/budgets/summary?year=${year}&month=${month}`).then((res) => res.data),
  getSafeToSpend: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append("year", String(year));
    if (month) params.append("month", String(month));
    const query = params.toString();
    return api.get<{ safeBalanceTotal: number }>(`/budgets/safe-to-spend${query ? `?${query}` : ""}`).then((res) => res.data);
  },
  createBudget: (payload: BudgetPayload) => api.post<BudgetSummary>("/budgets", payload).then((res) => res.data),
  updateBudget: (id: string, payload: BudgetPayload & { id?: string }) =>
    api.post<BudgetSummary>("/budgets", { ...payload, id }).then((res) => res.data),
  toggleMandatoryBudget: (id: string) => api.patch(`/budgets/${id}/mandatory`).then((res) => res.data),
  deleteBudget: (id: string) => api.delete(`/budgets/${id}`).then((res) => res.data),


  // Savings Goals API
  getSavingsGoals: () => api.get<SavingsGoal[]>("/savings-goals").then((res) => res.data),
  createSavingsGoal: (payload: SavingsGoalPayload) => api.post<SavingsGoal>("/savings-goals", payload).then((res) => res.data),
  updateSavingsGoal: (id: string, payload: SavingsGoalPayload) => api.put<SavingsGoal>(`/savings-goals/${id}`, payload).then((res) => res.data),
  autoAllocateSavings: () => api.post<AutoAllocateResponse>("/savings-goals/auto-allocate").then((res) => res.data),
  fundSavingsGoal: (id: string, amount: number) =>
    api.post<SavingsGoal>(`/savings-goals/${id}/fund`, { amount }).then((res) => res.data),
  withdrawSavingsGoal: (id: string, amount: number) =>
    api.post<SavingsGoal>(`/savings-goals/${id}/withdraw`, { amount }).then((res) => res.data),
  deleteSavingsGoal: (id: string) => api.delete<void>(`/savings-goals/${id}`).then((res) => res.data),

  // Transactions & Analytics API
  getMonthlySummary: (year: number, month: number) =>
    api.get<MonthlySummary>(`/transactions/summary/monthly?year=${year}&month=${month}`).then((res) => res.data),
  getCategoryBreakdown: (year: number, month: number) =>
    api.get<CategoryBreakdown[]>(`/transactions/summary/category?year=${year}&month=${month}`).then((res) => res.data),
  getIncomeCategoryBreakdown: (year: number, month: number) =>
    api.get<CategoryBreakdown[]>(`/transactions/summary/income-category?year=${year}&month=${month}`).then((res) => res.data),
  getMonthlyTransactions: (year: number, month: number) =>
    api.get<Transaction[]>(`/transactions/monthly?year=${year}&month=${month}`).then((res) => res.data),
  createTransaction: (walletId: string, payload: Omit<TransactionPayload, "walletId">) =>
    api.post<Transaction>(`/transactions/${walletId}`, payload).then((res) => res.data),
  updateTransaction: (id: string, payload: { amount: number; categoryId: string; note?: string; transactionDate?: string }) =>
    api.put<Transaction>(`/transactions/${id}`, payload).then((res) => res.data),
  deleteTransaction: (id: string) => api.delete<void>(`/transactions/${id}`).then((res) => res.data),
  getUncategorizedTransactions: () => api.get<Transaction[]>("/transactions/uncategorized").then((res) => res.data),
  getUncategorizedCount: () => api.get<number>("/transactions/uncategorized/count").then((res) => res.data),
  applyBudgetRebalance: (year?: number, month?: number, cuts?: Array<{ categoryId: string; cutAmount?: number; newLimit?: number }>) => {
    const params = new URLSearchParams();
    if (year) params.append("year", String(year));
    if (month) params.append("month", String(month));
    const query = params.toString();
    return api.post<{ success: boolean; message: string; totalCompensated: number; updatedCategoriesCount: number }>(
      `/advisor/rebalance/apply${query ? `?${query}` : ""}`,
      cuts ? { cuts } : undefined
    ).then((res) => res.data);
  },
  getCashflowSummary: (year: number, month: number) =>
    api.get<CashflowSummaryResponse>(`/transactions/summary/cashflow?year=${year}&month=${month}`).then((res) => res.data),
};
