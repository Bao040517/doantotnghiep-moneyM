export type LoanType = "LEND" | "BORROW"; // LEND = Cho vay (cần thu), BORROW = Đi vay (cần trả)

export interface ExternalLoan {
  id: string;
  type: LoanType;
  counterpartyName: string;
  principalAmount: number;
  interestRate: number;
  startDate?: string;
  dueDate?: string;
  description?: string;
  settled: boolean;
}

export interface CreateExternalLoanPayload {
  type: LoanType;
  counterpartyName: string;
  principalAmount: number;
  interestRate: number;
  startDate?: string;
  dueDate?: string;
  description?: string;
}

