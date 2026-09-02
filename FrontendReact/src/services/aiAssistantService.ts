import { api } from "./api";

// ── Types ──
export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiAssistantRequest {
  message: string;
  conversationHistory?: AiChatMessage[];
}

export interface CutDownSuggestion {
  emoji: string;
  categoryName: string;
  currentSpending: number;
  suggestedSpending: number;
  monthlySavings: number;
  description: string;
}

export interface GoalPlanData {
  goalName: string;
  targetAmount: number;
  targetMonths: number;
  monthlySavingsNeeded: number;
  dailySavingsNeeded: number;
  feasibilityScore: number;
  cutDownSuggestions: CutDownSuggestion[];
  deadlineDate: string;
}

export interface TransactionData {
  amount: number;
  categoryName: string;
  categoryId?: string;
  note?: string;
  paymentMethod?: string;
  transactionType: "EXPENSE" | "INCOME";
}

export interface IncomeItem {
  name: string;
  amount: number;
  categoryName?: string;
}

export interface BudgetItem {
  name: string;
  limitAmount: number;
  categoryName?: string;
  isFixed?: boolean;
}

export interface FinancialPlanData {
  planTitle?: string;
  targetMonth?: number;
  targetYear?: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate?: number;
  incomes: IncomeItem[];
  budgets: BudgetItem[];
}

export interface AiAssistantResponse {
  reply: string;
  intent: "SETUP_FINANCIAL_PLAN" | "PLAN_SAVINGS_GOAL" | "CREATE_TRANSACTION" | "QUERY_INSIGHT" | "GENERAL_CHAT";
  financialPlanData?: FinancialPlanData;
  goalPlanData?: GoalPlanData;
  transactionData?: TransactionData;
  quickReplies?: string[];
}

export interface SavingsGoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadlineDate: string;
  status: string;
}

export interface FinancialPlanAppliedResponse {
  status: string;
  targetMonth: number;
  targetYear: number;
  recordedIncomes: number;
  totalIncomeRecorded: number;
  appliedBudgets: number;
  recordedExpenses: number;
  totalExpenseRecorded: number;
  mode: "BUDGETS" | "EXPENSES";
  message: string;
}

// ── API ──
export const aiAssistantService = {
  chat: async (request: AiAssistantRequest): Promise<AiAssistantResponse> => {
    const response = await api.post<AiAssistantResponse>("/ai/assistant/chat", request);
    return response.data;
  },

  confirmGoal: async (goalPlanData: GoalPlanData): Promise<SavingsGoalResponse> => {
    const response = await api.post<SavingsGoalResponse>("/ai/assistant/confirm-goal", goalPlanData);
    return response.data;
  },

  confirmFinancialPlan: async (
    planData: FinancialPlanData,
    asExpenses = false
  ): Promise<FinancialPlanAppliedResponse> => {
    const response = await api.post<FinancialPlanAppliedResponse>(
      `/ai/assistant/confirm-financial-plan?asExpenses=${asExpenses}`,
      planData
    );
    return response.data;
  },
};
