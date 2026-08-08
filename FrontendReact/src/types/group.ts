export interface GroupMember {
  userId: string;
  userName: string;
  userEmail: string;
  role: "ADMIN" | "MEMBER";
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  totalExpenses?: number;
}

export interface GroupExpenseSplit {
  memberId: string;
  memberName: string;
  splitAmount: number;
  isPaid: boolean;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  payerId: string;
  payerName: string;
  createdDate: string;
  splits: GroupExpenseSplit[];
}

export interface GroupDebtDetail {
  groupId?: string;
  groupName?: string;
  counterparty?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    bankBin?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
  };
  otherMemberId?: string;
  otherMemberName?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  amount: number; // positive = other owes me, negative = I owe other
  type?: "OWED" | "OWING";
}

export interface GroupDebtSummary {
  totalOwing: number; // I owe others
  totalOwed: number;  // Others owe me
  details: GroupDebtDetail[];
}
