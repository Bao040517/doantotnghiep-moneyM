"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import api from "@/lib/axios";
import { AddExpenseDrawer } from "@/components/add-expense-drawer";
import { EditExpenseDrawer } from "@/components/edit-expense-drawer";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { SettleDebtDialog } from "@/components/settle-debt-dialog";
import { RemindDebtDialog } from "@/components/remind-debt-dialog";
import { ExpenseChart } from "@/components/expense-chart";
import { ConfirmCashDialog } from "@/components/confirm-cash-dialog";

interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Member {
  id: string;
  user: UserSummary;
  role: string;
  joinedAt: string;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string;
  creator: UserSummary;
  members: Member[];
  createdAt: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  payer: UserSummary;
  splitCount: number;
  createdAt: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Ăn uống": "🍜", "Di chuyển": "🚗", "Lưu trú": "🏨",
  "Giải trí": "🎮", "Mua sắm": "🛍️", "Sức khỏe": "💊", "Hóa đơn": "🧾", "Khác": "📦", "SETTLEMENT": "✅"
};

const CATEGORY_BG: Record<string, string> = {
  "Ăn uống": "#fce7f3", "Di chuyển": "#dbeafe", "Lưu trú": "#ede9fe",
  "Giải trí": "#fef3c7", "Mua sắm": "#fce7f3", "Sức khỏe": "#cffafe", "Hóa đơn": "#d6eaf8", "Khác": "#f3f4f6", "SETTLEMENT": "#d1fae5"
};

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<any>(null);
  const [pendingDebtors, setPendingDebtors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "members" | "history">("expenses");
  const [historyFilter, setHistoryFilter] = useState<"group" | "personal">("group");
  const [isReminding, setIsReminding] = useState<string | null>(null);
  const [confirmCash, setConfirmCash] = useState<{ debtorId: string; debtorName: string; amount: number } | null>(null);

  const fetchGroupData = async () => {
    try {
      const [groupRes, expensesRes, debtsRes, pendingRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/debts`),
        api.get(`/groups/${id}/debts/pending`)
      ]);
      setGroup(groupRes.data);
      const sortedExpenses = (expensesRes.data || []).sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setExpenses(sortedExpenses);
      setDebts(debtsRes.data);
      setPendingDebtors(pendingRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
    fetchGroupData();
  }, [id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const formatDate = (dateString: string) =>
    format(new Date(dateString), "dd MMM, HH:mm", { locale: vi });

  const myDebts = debts?.transactions?.filter((t: any) => t.from.id === currentUser?.id) ?? [];
  const owedToMe = debts?.transactions?.filter((t: any) => t.to.id === currentUser?.id) ?? [];
  const otherDebts = debts?.transactions?.filter((t: any) => t.from.id !== currentUser?.id && t.to.id !== currentUser?.id) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: "#FDF9F0" }}>
        <div className="w-10 h-10 rounded-full border-4 border-[#B3E5D1] border-t-[#45b39d] animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#FDF9F0" }}>
        <p className="text-xl font-bold text-gray-700 mb-2">Không tìm thấy nhóm</p>
        <button onClick={() => router.push("/")} className="text-[#45b39d] font-semibold mt-4">← Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: "#FDF9F0" }}>

      {/* ─── HERO HEADER ─── */}
      <header className="relative pt-3 pb-6 px-4"
        style={{ background: "linear-gradient(180deg, #B3E5D1 0%, #B3E5D1 70%, #FDF9F0 100%)" }}>
        {/* Back + Invite */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center shadow-sm"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-800">{group.name}</h1>
          {/* Invite button */}
          <AddMemberDialog groupId={group.id} onMemberAdded={fetchGroupData} />
        </div>

        {/* Hero image */}
        <div className="rounded-[2rem] overflow-hidden w-full aspect-[16/8] shadow-md">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0nnDNmlieSPZJaQwZCZFL-W0xfJbRj-1-WcjAWVz3lrhaoxRKQTWlObpb0SAG5aIWvtfTGBgrFkCwP9reYlwGNPQgv0X0gsuLaclIxa5-SToXlkHex3b8xzMHxCO3KdvDU2w4l_6LUZzk-7mDTHbaFZBBY4MD_4vwIq71UbIyY4LU3ox8ZgtcfMDpSqK4MB-oJUCX2z2gv3pU8GJBUoTtkwHqDmsxzWOJEJ09VVa16igPyUSwaAQ5CKl0a0fSSpr70Xz1y6KOUbA"
            alt={group.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Floating member avatars */}
        <div className="flex -space-x-2 mt-3 ml-1">
          {group.members.slice(0, 5).map(m => (
            <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-[#B3E5D1]">
              {m.user.avatarUrl ? (
                <img src={m.user.avatarUrl} alt={m.user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#437d6e]">
                  {m.user.name.charAt(0)}
                </div>
              )}
            </div>
          ))}
          {group.members.length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
              +{group.members.length - 5}
            </div>
          )}
          <span className="ml-3 text-sm text-gray-600 self-center">{group.members.length} thành viên</span>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <nav className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-10 bg-[#FDF9F0]">
        {(["expenses", "balances", "history", "members"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={activeTab === tab
              ? { backgroundColor: "#B3E5D1", color: "#1a1a1a" }
              : { backgroundColor: "white", color: "#666", border: "1px solid #e5e7eb" }
            }
          >
            {tab === "expenses" ? "Lịch sử ăn chơi" : tab === "balances" ? "Ai nợ ai" : tab === "history" ? "Lịch sử" : "Thành viên"}
          </button>
        ))}
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 px-4 pb-28 space-y-4">

        {/* EXPENSES TAB */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            {/* Chart */}
            {expenses.filter(e => e.category !== "SETTLEMENT").length > 0 && (
              <ExpenseChart expenses={expenses} />
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-gray-700">Danh sách hóa đơn</p>
              <div className="flex items-center gap-2">
                <AddExpenseDrawer groupId={group.id} members={group.members} onExpenseCreated={fetchGroupData} />
              </div>
            </div>

            {expenses.filter(e => e.category !== "SETTLEMENT").length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#B3E5D1] flex items-center justify-center text-3xl mb-3">🧾</div>
                <p className="font-bold text-gray-700">Chưa có hóa đơn nào</p>
                <p className="text-sm text-gray-400 mt-1">Thêm hóa đơn đầu tiên ngay!</p>
              </div>
            ) : (
              expenses.filter(e => e.category !== "SETTLEMENT").map(expense => (
                <EditExpenseDrawer
                  key={expense.id}
                  groupId={group.id}
                  expenseId={expense.id}
                  members={group.members}
                  onExpenseUpdated={fetchGroupData}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                    <div className="p-4 flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_BG[expense.category] ?? "#f3f4f6" }}
                      >
                        {CATEGORY_EMOJI[expense.category] ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{expense.title}</h3>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50 flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">{expense.payer.name}</span> đã trả · chia {expense.splitCount} người
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(expense.createdAt)}</p>
                    </div>
                  </div>
                </EditExpenseDrawer>
              ))
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="w-full flex bg-white rounded-full p-1 border border-gray-200">
              <button
                onClick={() => setHistoryFilter("group")}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${historyFilter === "group" ? "bg-[#B3E5D1] text-[#1a1a1a] shadow-sm" : "text-gray-500"}`}
              >
                Của cả nhóm
              </button>
              <button
                onClick={() => setHistoryFilter("personal")}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${historyFilter === "personal" ? "bg-[#B3E5D1] text-[#1a1a1a] shadow-sm" : "text-gray-500"}`}
              >
                Của tôi
              </button>
            </div>

            <div className="space-y-3">
              {expenses
                .filter(e => {
                  if (historyFilter === "group") return true;
                  if (e.category === "SETTLEMENT") {
                    return e.payer.id === currentUser?.id || e.title.includes(currentUser?.name ?? "");
                  }
                  return e.payer.id === currentUser?.id;
                })
                .map(expense => (
                  <div key={expense.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_BG[expense.category] ?? "#f3f4f6" }}
                    >
                      {CATEGORY_EMOJI[expense.category] ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-gray-900 truncate">
                        {expense.category === "SETTLEMENT" ? "Thanh toán nợ" : expense.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {expense.category === "SETTLEMENT" 
                          ? `${expense.payer.name} ${expense.title.toLowerCase()}`
                          : <><span className="font-semibold text-gray-700">{expense.payer.name}</span> đã chi {formatCurrency(expense.amount)}</>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {expense.category === "SETTLEMENT" && (
                        <p className="text-base font-black text-emerald-600">+{formatCurrency(expense.amount)}</p>
                      )}
                      {expense.category !== "SETTLEMENT" && (
                        <p className="text-base font-black text-gray-900">{formatCurrency(expense.amount)}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(expense.createdAt)}</p>
                    </div>
                  </div>
                ))}
                
              {expenses.filter(e => {
                  if (historyFilter === "group") return true;
                  if (e.category === "SETTLEMENT") return e.payer.id === currentUser?.id || e.title.includes(currentUser?.name ?? "");
                  return e.payer.id === currentUser?.id;
                }).length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-gray-400 text-sm">Chưa có lịch sử nào.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BALANCES TAB */}
        {activeTab === "balances" && (
          <div className="space-y-4 mt-2">
            {/* Two-column balance layout like "Group Balances Screen" */}
            <div className="flex gap-3">
              {/* Ai nợ bạn */}
              <div className="flex-1 rounded-[1.5rem] overflow-hidden" style={{ backgroundColor: "#E2F6F1" }}>
                <div className="text-center py-2.5 font-bold text-sm text-white" style={{ backgroundColor: "#7ED3B2" }}>
                  Ai nợ bạn
                </div>
                <div className="p-3 space-y-3">
                  {owedToMe.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">Không ai nợ bạn 🎉</p>
                  ) : owedToMe.map((t: any, i: number) => {
                    const isPending = pendingDebtors.includes(t.from.id);
                    return (
                    <div 
                      key={i} 
                      onClick={() => {
                        if (isPending) {
                          setConfirmCash({ debtorId: t.from.id, debtorName: t.from.name, amount: t.amount });
                        }
                      }}
                      className={`rounded-2xl p-3 flex flex-col items-center text-center shadow-sm transition-all ${
                        isPending
                          ? 'bg-amber-100 border-2 border-amber-300 cursor-pointer active:scale-[0.97]'
                          : 'bg-white'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-[#B3E5D1] flex items-center justify-center mb-2 font-bold text-[#437d6e]">
                        {t.from.name.charAt(0)}
                      </div>
                      <p className="text-xs font-semibold text-gray-700">{t.from.name}</p>
                      <p className="text-lg font-black my-1" style={{ color: "#7ED3B2" }}>
                        {new Intl.NumberFormat("vi-VN").format(t.amount)}đ
                      </p>
                      {!isPending ? (
                        <div className="w-full mt-2" onClick={e => e.stopPropagation()}>
                          <RemindDebtDialog groupId={id} debtorId={t.from.id} debtorName={t.from.name} amount={t.amount}>
                            <button className="w-full text-xs font-bold text-white py-1.5 px-4 rounded-xl transition-all active:scale-95 shadow-sm"
                              style={{ backgroundColor: "#7ED3B2" }}>
                              Nhắc nợ
                            </button>
                          </RemindDebtDialog>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmCash({ debtorId: t.from.id, debtorName: t.from.name, amount: t.amount });
                          }}
                          className="w-full mt-2 text-xs font-bold text-white py-1.5 px-4 rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1"
                          style={{ backgroundColor: "#0a996f" }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          Duyệt nhận tiền
                        </button>
                      )}
                    </div>
                  )})}
                </div>
              </div>

              {/* Bạn nợ ai */}
              <div className="flex-1 rounded-[1.5rem] overflow-hidden" style={{ backgroundColor: "#FFEDE1" }}>
                <div className="text-center py-2.5 font-bold text-sm text-white" style={{ backgroundColor: "#FF9E7D" }}>
                  Bạn nợ ai
                </div>
                <div className="p-3 space-y-3">
                  {myDebts.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">Bạn không nợ ai 😎</p>
                  ) : myDebts.map((t: any, i: number) => (
                    <div key={i} className="bg-white rounded-2xl p-3 flex flex-col items-center text-center shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-[#FFEDE1] flex items-center justify-center mb-2 font-bold text-[#FF9E7D]">
                        {t.to.name.charAt(0)}
                      </div>
                      <p className="text-xs font-semibold text-gray-700">{t.to.name}</p>
                      <p className="text-lg font-black my-1" style={{ color: "#FF9E7D" }}>
                        {new Intl.NumberFormat("vi-VN").format(t.amount)}đ
                      </p>
                      <SettleDebtDialog groupId={id} toUser={t.to} amount={t.amount} onSettle={fetchGroupData} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Các khoản nợ của người khác */}
            {otherDebts.length > 0 && (
              <div className="rounded-[1.5rem] overflow-hidden" style={{ backgroundColor: "#F8FAFC" }}>
                <div className="text-center py-2.5 font-bold text-sm text-slate-500" style={{ backgroundColor: "#E2E8F0" }}>
                  Thành viên khác nợ nhau
                </div>
                <div className="p-3 space-y-3">
                  {otherDebts.map((t: any, i: number) => (
                    <div key={i} className="bg-white rounded-2xl p-3 flex flex-row items-center justify-between shadow-sm border border-slate-100">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {t.from.name.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{t.from.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <svg className="w-4 h-4 text-slate-400 ml-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
                          </svg>
                          <span className="text-xs text-gray-500">Trả cho</span>
                          <span className="text-sm font-semibold text-gray-700">{t.to.name}</span>
                        </div>
                      </div>
                      <span className="font-black text-slate-600">
                        {new Intl.NumberFormat("vi-VN").format(t.amount)}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && (
          <div className="space-y-3 mt-2">
            {group.members.map(member => (
              <div key={member.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#B3E5D1] flex items-center justify-center font-bold text-[#437d6e] flex-shrink-0">
                  {member.user.avatarUrl ? (
                    <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
                  ) : (
                    member.user.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{member.user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                </div>
                {member.role === "ADMIN" && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#B3E5D1", color: "#437d6e" }}>
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── FLOATING ADD BUTTON (visible on expenses tab) ─── */}
      {activeTab === "expenses" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <AddExpenseDrawer groupId={group.id} members={group.members} onExpenseCreated={fetchGroupData} floating />
        </div>
      )}

      {/* ─── CONFIRM CASH DIALOG ─── */}
      <ConfirmCashDialog
        open={!!confirmCash}
        debtorName={confirmCash?.debtorName ?? ""}
        amount={confirmCash?.amount ?? 0}
        onCancel={() => setConfirmCash(null)}
        onConfirm={async () => {
          if (!confirmCash) return;
          try {
            await api.post(`/groups/${id}/debts/approve-settle`, {
              debtorId: confirmCash.debtorId,
              amount: confirmCash.amount,
            });
            toast.success(`Đã xác nhận nhận tiền từ ${confirmCash.debtorName}! 🎉`);
            setConfirmCash(null);
            fetchGroupData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Lỗi khi xác nhận");
          }
        }}
      />
    </div>
  );
}
