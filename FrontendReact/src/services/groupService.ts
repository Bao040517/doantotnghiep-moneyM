import { api } from "./api";
import { GroupListItem, GroupDetail, GroupExpense, GroupDebtSummary, Group } from "../types";

export const groupService = {
  getGroups: () => api.get<GroupListItem[]>("/groups").then((res) => res.data),
  getGroupDetail: (groupId: string) => api.get<GroupDetail>(`/groups/${groupId}`).then((res) => res.data),
  createGroup: (payload: { name: string; description?: string; avatarUrl?: string; memberIds?: string[] }) =>
    api.post<Group>("/groups", payload).then((res) => res.data),
  updateGroupAvatar: (groupId: string, avatarUrl: string) =>
    api.put<GroupDetail>(`/groups/${groupId}/avatar`, { avatarUrl }).then((res) => res.data),
  getGroupExpenses: (groupId: string, page = 0, size = 50) =>
    api.get<{ content: GroupExpense[] }>(`/groups/${groupId}/expenses?page=${page}&size=${size}`).then((res) => res.data),
  exportExpenses: (groupId: string) =>
    api.get<any>(`/groups/${groupId}/expenses/export`, { responseType: "blob" }).then((res) => res.data),
  createGroupExpense: (groupId: string, payload: { title: string; amount: number; category?: string; paidBy?: string; splitUserIds?: string[] }) =>
    api.post<GroupExpense>(`/groups/${groupId}/expenses`, payload).then((res) => res.data),
  getExpenseDetail: (groupId: string, expenseId: string) =>
    api.get<any>(`/groups/${groupId}/expenses/${expenseId}`).then((res) => res.data),
  updateExpense: (groupId: string, expenseId: string, payload: { paidBy: string; title: string; amount: number; category?: string; splitUserIds?: string[] }) =>
    api.put<any>(`/groups/${groupId}/expenses/${expenseId}`, payload).then((res) => res.data),
  deleteExpense: (groupId: string, expenseId: string) =>
    api.delete<void>(`/groups/${groupId}/expenses/${expenseId}`).then((res) => res.data),
  getPastMembers: () =>
    api.get<Array<{ id: string; name: string; email?: string; phone?: string }>>("/groups/past-members").then((res) => res.data),
  getGroupDebts: (groupId: string) => api.get<{ transactions: any[] }>(`/groups/${groupId}/debts`).then((res) => res.data),
  getGroupDebtSummary: () => api.get<GroupDebtSummary>("/groups/debts/summary").then((res) => res.data),
  remindDebt: (groupId: string, payload: { debtorId: string; amount: number; message?: string }) =>
    api.post(`/groups/${groupId}/debts/remind`, payload).then((res) => res.data),
  notifyPayment: (groupId: string, payload: { toUserId: string; amount: number }) =>
    api.post(`/groups/${groupId}/debts/notify-payment`, payload).then((res) => res.data),
  approveSettle: (groupId: string, payload: { debtorId: string; amount: number }) =>
    api.post(`/groups/${groupId}/debts/approve-settle`, payload).then((res) => res.data),
  getPendingDebtors: (groupId: string) =>
    api.get<string[]>(`/groups/${groupId}/debts/pending`).then((res) => res.data),
  getPendingSent: (groupId: string) =>
    api.get<string[]>(`/groups/${groupId}/debts/pending-sent`).then((res) => res.data),
  searchUserByPhone: (phone: string) => api.get<{ id: string; name: string; phone: string }>(`/users/search?phone=${encodeURIComponent(phone)}`).then((res) => res.data),
  getUserById: (userId: string) => api.get<any>(`/users/${userId}`).then((res) => res.data),
  addMemberToGroup: (groupId: string, userId: string) => api.post(`/groups/${groupId}/members`, { userId }).then((res) => res.data),
  getGroupPreview: (groupId: string) => api.get<any>(`/groups/${groupId}/preview`).then((res) => res.data),
  joinGroup: (groupId: string) => api.post<Group>(`/groups/${groupId}/join`).then((res) => res.data),
};

