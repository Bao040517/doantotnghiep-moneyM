export type LoanType = "LEND" | "BORROW"; // LEND = Cho vay (cần thu), BORROW = Đi vay (cần trả)

export interface ExternalLoan {
  id: string;
  borrowerOrLenderName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  type: LoanType;
  dueDate?: string;
  note?: string;
  status: "ACTIVE" | "PAID" | "OVERDUE";
  createdDate?: string;
}

export interface CreateExternalLoanPayload {
  borrowerOrLenderName: string;
  amount: number;
  type: LoanType;
  dueDate?: string;
  note?: string;
}
