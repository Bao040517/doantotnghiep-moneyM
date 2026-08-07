export type SavingsPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  deadlineDate?: string;
  status?: string;
  priority?: SavingsPriority;
  monthlyContribution?: number;
  icon?: string;
  isCompleted?: boolean;
}

export interface SavingsGoalPayload {
  name: string;
  targetAmount: number;
  targetDate: string;
  priority: SavingsPriority;
  monthlyContribution: number;
}

export interface AutoAllocateResponse {
  allocatedTotal: number;
  remainingSafeBalance: number;
  allocatedGoals: Array<{ goalName: string; amount: number }>;
}
