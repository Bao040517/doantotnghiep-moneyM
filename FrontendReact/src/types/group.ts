export interface GroupMember {
  id: string;
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    bankBin?: string;
    bankAccountNo?: string;
    bankQrUrl?: string;
  };
  role: string;
  joinedAt?: string;
}

/** Response from GET /api/groups (list) */
export interface GroupListItem {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  owner?: { id: string; name: string; email?: string; avatarUrl?: string };
  memberCount?: number;
  pendingRevisionCount?: number;
  members?: GroupMember[];
  createdAt?: string;
}

/** Response from GET /api/groups/:id (detail) */
export interface GroupDetail {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  owner?: { id: string; name: string; email?: string; avatarUrl?: string };
  members: GroupMember[];
  memberCount?: number;
  pendingRevisionCount?: number;
  createdAt?: string;
}

/** Response from GET /api/groups/:id/preview */
export interface GroupPreview {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  owner?: { id: string; name: string; email?: string; avatarUrl?: string };
  memberCount: number;
  isJoined: boolean;
  createdAt?: string;
}

/** Union type for backward compatibility */
export type Group = GroupListItem & Partial<GroupDetail>;


export interface GroupExpenseSplit {
  memberId: string;
  memberName: string;
  splitAmount: number;
  isPaid: boolean;
}

export interface GroupExpense {
  id: string;
  groupId?: string;
  title: string;
  amount: number;
  category?: string;
  payer?: { id: string; name: string; email?: string; phone?: string };
  splitCount?: number;
  createdAt?: string;
  currentUserSplitAmount?: number;
  isPendingRevision?: boolean;
  /** @deprecated Use payer.id instead */
  payerId?: string;
  /** @deprecated Use payer.name instead */
  payerName?: string;
  /** @deprecated Use createdAt instead */
  createdDate?: string;
  /** @deprecated Use splitCount instead; splits only available from detail endpoint */
  splits?: GroupExpenseSplit[];
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
  hasPendingRevision?: boolean;
  pendingRevisionMessage?: string;
}

export interface GroupDebtSummary {
  totalOwing: number; // I owe others
  totalOwed: number;  // Others owe me
  details: GroupDebtDetail[];
}
