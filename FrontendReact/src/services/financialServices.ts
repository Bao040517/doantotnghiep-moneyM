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
  getBudgets: () => api.get<Budget[]>("/budgets").then((res) => res.data),
  getBudgetSummary: (year: number, month: number) =>
    api.get<BudgetSummary[]>(`/budgets/summary?year=${year}&month=${month}`).then((res) => res.data),
  getSafeToSpend: () => api.get<{ safeBalanceTotal: number }>("/budgets/safe-to-spend").then((res) => res.data),
  createBudget: (payload: BudgetPayload) => api.post<Budget>("/budgets", payload).then((res) => res.data),
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
};
