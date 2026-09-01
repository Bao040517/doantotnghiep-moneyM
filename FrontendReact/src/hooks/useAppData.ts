import { useState, useEffect, useCallback } from "react";
import { financialServices } from "../services/financialServices";
import { groupService } from "../services/groupService";
import { Wallet, BudgetSummary, MonthlySummary, Transaction, CategoryBreakdown } from "../types";

export function useAppData() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [topExpenseCategories, setTopExpenseCategories] = useState<CategoryBreakdown[]>([]);
  const [totalSavings, setTotalSavings] = useState<number>(0);
  const [totalWalletBalance, setTotalWalletBalance] = useState<number>(0);
  const [safeToSpend, setSafeToSpend] = useState<number>(0);
  const [debtSummary, setDebtSummary] = useState<{ totalOwed: number; totalOwing: number }>({
    totalOwed: 0,
    totalOwing: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [walletData, budgetData, summaryData, txData, catData, savingsData, debtData, totalBalanceData, safeToSpendData] = await Promise.all([
        typeof financialServices.getWallets === "function" ? financialServices.getWallets().catch(() => []) : Promise.resolve([]),
        typeof financialServices.getBudgetSummary === "function" ? financialServices.getBudgetSummary(year, month).catch(() => []) : Promise.resolve([]),
        typeof financialServices.getMonthlySummary === "function" ? financialServices.getMonthlySummary(year, month).catch(() => null) : Promise.resolve(null),
        typeof financialServices.getMonthlyTransactions === "function" ? financialServices.getMonthlyTransactions(year, month).catch(() => []) : Promise.resolve([]),
        typeof financialServices.getCategoryBreakdown === "function" ? financialServices.getCategoryBreakdown(year, month).catch(() => []) : Promise.resolve([]),
        typeof financialServices.getSavingsGoals === "function" ? financialServices.getSavingsGoals().catch(() => []) : Promise.resolve([]),
        typeof groupService.getGroupDebtSummary === "function" ? groupService.getGroupDebtSummary().catch(() => ({ totalOwed: 0, totalOwing: 0 })) : Promise.resolve({ totalOwed: 0, totalOwing: 0 }),
        typeof financialServices.getTotalBalance === "function" ? financialServices.getTotalBalance().catch(() => ({ totalBalance: 0 })) : Promise.resolve({ totalBalance: 0 }),
        typeof financialServices.getSafeToSpend === "function" ? financialServices.getSafeToSpend().catch(() => ({ safeBalanceTotal: 0 })) : Promise.resolve({ safeBalanceTotal: 0 }),
      ]);

      setWallets(walletData);
      setBudgets(budgetData);
      setMonthlySummary(summaryData);
      setRecentTransactions(txData);
      setTopExpenseCategories(catData || []);
      setTotalWalletBalance(totalBalanceData?.totalBalance || 0);
      setSafeToSpend(safeToSpendData?.safeBalanceTotal || 0);

      const savTotal = (savingsData || []).reduce((sum: number, g: any) => sum + (g.currentAmount || 0), 0);
      setTotalSavings(savTotal);

      if (debtData) {
        setDebtSummary({
          totalOwed: debtData.totalOwed || 0,
          totalOwing: debtData.totalOwing || 0,
        });
      }
    } catch (e) {
      console.log("Failed to fetch app data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const totalLiabilities = 0;

  const unpaidBudgetsAmount = budgets.reduce(
    (sum, b) => sum + Math.max(0, (b.limitAmount || 0) - (b.spentAmount || 0)),
    0
  );

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (b.limitAmount || 0), 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const totalActualExpense = monthlySummary?.currentMonth?.totalExpense ?? 0;
  const totalActualIncome = monthlySummary?.currentMonth?.totalIncome ?? 0;

  return {
    wallets,
    budgets,
    monthlySummary,
    recentTransactions,
    topExpenseCategories,
    totalWalletBalance,
    totalLiabilities,
    totalSavings,
    debtSummary,
    unpaidBudgetsAmount,
    totalBudgetLimit,
    totalBudgetSpent,
    totalActualExpense,
    totalActualIncome,
    safeToSpend,
    isLoading,
    refresh,
  };
}
