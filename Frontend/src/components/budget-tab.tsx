"use client";

import { useState, useEffect } from "react";
import { SetBudgetDrawer } from "@/components/set-budget-drawer";
import { toast } from "sonner";
import api from "@/lib/axios";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className = "w-7 h-7 text-emerald-600" }: { name?: string, className?: string }) {
  if (!name) return <span className="text-3xl">💰</span>;
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Receipt;
  return <IconComponent className={className} />;
}

interface BudgetSummary {
  budgetId: string;
  name?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  limitAmount: number;
  spentAmount: number;
  percentage: number;
  status: "OK" | "WARNING" | "OVER";
  type: "FLEXIBLE" | "BILL";
  isRecurring: boolean;
  dueDayOfMonth?: number | null;
  isMandatory?: boolean;
}

interface BudgetTabProps {
  year: number;
  month: number;
  walletBalance: number;
}

const STATUS_CONFIG = {
  OK:      { bar: "bg-emerald-400", text: "text-emerald-600", badge: "", label: "" },
  WARNING: { bar: "bg-amber-400",   text: "text-amber-600",   badge: "bg-amber-100 text-amber-700", label: "⚠️ Sắp vượt" },
  OVER:    { bar: "bg-rose-500",    text: "text-rose-600",    badge: "bg-rose-100 text-rose-700",   label: "🔴 Vượt ngân sách" },
};

export function BudgetTab({ year, month, walletBalance }: BudgetTabProps) {
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(walletBalance);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('budgetPriority');
      if (saved) {
        setPriorityOrder(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (budgets.length > 0) {
      setPriorityOrder(prev => {
        const newOrder = [...prev];
        budgets.forEach(b => {
          if (!newOrder.includes(b.budgetId)) {
            newOrder.push(b.budgetId);
          }
        });
        const finalOrder = newOrder.filter(id => budgets.some(b => b.budgetId === id));
        if (JSON.stringify(prev) !== JSON.stringify(finalOrder)) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('budgetPriority', JSON.stringify(finalOrder));
          }
          return finalOrder;
        }
        return prev;
      });
    } else {
       setPriorityOrder([]);
    }
  }, [budgets]);

  const fetchBudgets = async () => {
    try {
      const [budgetsRes, balanceRes] = await Promise.all([
        api.get(`/budgets/summary?year=${year}&month=${month}`),
        api.get('/wallets/total-balance').catch(() => ({ data: { totalBalance: 0 } }))
      ]);
      setBudgets(budgetsRes.data);
      setCurrentBalance(balanceRes.data.totalBalance);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBudgets();
  }, [year, month]);

  const [isQuickPaying, setIsQuickPaying] = useState<string | null>(null);

  const handleQuickPay = async (b: any) => {
    try {
      setIsQuickPaying(b.budgetId);
      const remaining = Math.max(0, b.limitAmount - b.spentAmount);
      if (remaining <= 0) return;
      
      const res = await api.get('/wallets/me');
      if (!res.data) {
        toast.error("Không tìm thấy ví");
        return;
      }
      const walletId = res.data.id;
      
      await api.post(`/transactions/${walletId}`, {
        amount: remaining,
        categoryId: b.categoryId,
        note: b.name || b.categoryName,
        linkedBudgetId: b.budgetId,
      });
      
      toast.success("Đã thanh toán xong!");
      fetchBudgets();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi thanh toán");
    } finally {
      setIsQuickPaying(null);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    const targetId = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await api.delete(`/budgets/${targetId}`);
      toast.success("Đã xóa khoản chi cố định");
      fetchBudgets();
    } catch {
      toast.error("Không thể xóa");
    } finally {
      setDeletingId(null);
    }
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    // Rebuild a flat order based on current sortedBudgets
    const newOrder = sortedBudgets.map(b => b.budgetId);
    
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setPriorityOrder(newOrder);
    if (typeof window !== 'undefined') {
      localStorage.setItem('budgetPriority', JSON.stringify(newOrder));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" /></div>;
  }

  let sortedBudgets = [...budgets];
  sortedBudgets.sort((a, b) => {
    const aMandatory = a.isMandatory || (a as any).mandatory;
    const bMandatory = b.isMandatory || (b as any).mandatory;
    if (aMandatory && !bMandatory) return -1;
    if (!aMandatory && bMandatory) return 1;

    let orderA = priorityOrder.indexOf(a.budgetId);
    let orderB = priorityOrder.indexOf(b.budgetId);
    if (orderA === -1) orderA = 999;
    if (orderB === -1) orderB = 999;
    return orderA - orderB;
  });

  let tempWallet = currentBalance;
  
  // Pass 1: Allocate to mandatory budgets first
  sortedBudgets.forEach(b => {
    const isMandatory = b.isMandatory || (b as any).mandatory;
    const isPaid = b.spentAmount >= b.limitAmount;
    const remainingToPay = Math.max(0, b.limitAmount - b.spentAmount);
    
    let allocated = 0;
    if (isMandatory && !isPaid) {
      allocated = Math.min(tempWallet, remainingToPay);
      tempWallet -= allocated;
    }
    (b as any)._allocated = allocated;
  });

  // Pass 2: Allocate remaining to non-mandatory budgets
  sortedBudgets.forEach(b => {
    const isMandatory = b.isMandatory || (b as any).mandatory;
    const isPaid = b.spentAmount >= b.limitAmount;
    const remainingToPay = Math.max(0, b.limitAmount - b.spentAmount);
    
    if (!isMandatory && !isPaid) {
      const allocated = Math.min(tempWallet, remainingToPay);
      tempWallet -= allocated;
      (b as any)._allocated = allocated;
    }
  });

  let runningWallet = currentBalance;

  return (
    <section className="space-y-4">
      {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-[19px] font-extrabold text-slate-800">Ngân sách chi tiêu</h2>
            <p className="text-[11px] text-slate-400 font-medium">Đặt hạn mức để không tiêu lố tay</p>
          </div>
          <button
          onClick={() => { setEditingBudget(null); setShowDrawer(true); }}
          className="bg-white border border-[#2BA76F]/20 px-4 py-2 rounded-2xl text-[#2BA76F] font-bold shadow-sm text-[13px] active:scale-95 transition-transform"
        >
          Tạo thêm
        </button>
      </div>

      {/* Summary Card */}
      {sortedBudgets.length > 0 && (
        <div className="bg-gradient-to-r from-[#e0f4f0] to-[#c6efe6] rounded-[24px] p-5 shadow-sm border border-[#66c2b1]/20 mb-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-[#66c2b1] opacity-10">
            <DynamicIcon name="wallet" className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#1f4d44] opacity-80 mb-1">Tổng ngân sách tháng</p>
              <p className="text-[28px] font-black text-[#1f4d44] leading-none">
                {(() => {
                  const categoryMap = new Map<string, { flexLimit: number, billLimit: number }>();
                  sortedBudgets.forEach(b => {
                    const cat = b.categoryId;
                    if (!categoryMap.has(cat)) categoryMap.set(cat, { flexLimit: 0, billLimit: 0 });
                    const entry = categoryMap.get(cat)!;
                    if (b.type === "FLEXIBLE") {
                      entry.flexLimit += b.limitAmount;
                    } else {
                      entry.billLimit += b.limitAmount;
                    }
                  });
                  const totalLimit = Array.from(categoryMap.values()).reduce((sum, entry) => sum + Math.max(entry.flexLimit, entry.billLimit), 0);
                  return totalLimit.toLocaleString('vi-VN');
                })()} <span className="text-[16px] font-semibold opacity-70">đ</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-[#1f4d44]">
              <DynamicIcon name="pie-chart" className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sortedBudgets.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#C3F2DD]">
          <div className="w-16 h-16 bg-[#EAF9F1] rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🎯</span>
          </div>
          <p className="text-[#1A342B] font-bold">Chưa có khoản chi nào</p>
          <p className="text-xs text-gray-400 mt-1">Đặt giới hạn chi tiêu để kiểm soát tài chính!</p>
        </div>
      )}

      {/* Budget cards */}
      {sortedBudgets.map((b, index) => {
        const isMandatory = b.isMandatory || (b as any).mandatory;
        const isPaid = b.spentAmount >= b.limitAmount;
        const remainingToPay = Math.max(0, b.limitAmount - b.spentAmount);

        let allocated = (b as any)._allocated || 0;

        let barWidth = 0;
        let badgeText = "";
        let badgeClass = "";
        let barClass = "";

        if (b.type === "FLEXIBLE") {
          const pct = b.limitAmount > 0 ? Math.round((b.spentAmount / b.limitAmount) * 100) : 0;
          barWidth = Math.min(100, pct);
          
          if (b.spentAmount > b.limitAmount) {
            badgeText = `Vượt ${new Intl.NumberFormat("vi-VN").format(b.spentAmount - b.limitAmount)}đ`;
            badgeClass = "bg-rose-100 text-rose-700";
            barClass = "bg-rose-500";
          } else if (pct >= 100) {
            badgeText = "Hết ngân sách";
            badgeClass = "bg-rose-100 text-rose-700";
            barClass = "bg-rose-500";
          } else if (pct >= 80) {
            badgeText = `Còn: ${new Intl.NumberFormat("vi-VN").format(remainingToPay)}đ`;
            if (allocated < remainingToPay) {
              badgeText += " (Ví thiếu)";
              badgeClass = "bg-rose-100 text-rose-700";
            } else {
              badgeClass = "bg-amber-100 text-amber-700";
            }
            barClass = "bg-amber-400";
          } else {
            badgeText = `Còn: ${new Intl.NumberFormat("vi-VN").format(remainingToPay)}đ`;
            if (allocated < remainingToPay) {
              badgeText += " (Ví thiếu)";
              badgeClass = "bg-rose-100 text-rose-700";
            } else {
              badgeClass = "bg-[#dcfce7] text-[#166534]";
            }
            barClass = "bg-[#10b981]";
          }
        } else {
          if (isPaid) {
            barWidth = 100;
            if (b.spentAmount > b.limitAmount) {
              badgeText = `Vượt ${new Intl.NumberFormat("vi-VN").format(b.spentAmount - b.limitAmount)}đ`;
              badgeClass = "bg-rose-100 text-rose-700";
              barClass = "bg-rose-500";
            } else {
              badgeText = "Đã thanh toán";
              badgeClass = "bg-[#EAF9F1] text-[#2BA76F]";
              barClass = "bg-[#C3F2DD]";
            }
          } else {
            if (allocated >= remainingToPay) {
              barWidth = 100;
              badgeText = "Đã đủ tiền trả";
              badgeClass = "bg-[#dcfce7] text-[#166534]";
              barClass = "bg-[#10b981]";
            } else if (allocated > 0) {
              const pct = Math.round((allocated / remainingToPay) * 100);
              barWidth = pct;
              badgeText = `Thiếu ${new Intl.NumberFormat("vi-VN").format(remainingToPay - allocated)}đ`;
              badgeClass = "bg-amber-100 text-amber-700";
              barClass = "bg-amber-400";
            } else {
              barWidth = 0;
              badgeText = `Thiếu ${new Intl.NumberFormat("vi-VN").format(remainingToPay)}đ`;
              badgeClass = "bg-rose-100 text-rose-700";
              barClass = "bg-rose-500";
            }
          }
        }

        return (
          <div key={b.budgetId} 
               onClick={() => { setEditingBudget(b); setShowDrawer(true); }}
               className={`bg-white rounded-[2rem] p-4 mb-4 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] flex flex-col relative group transition-all cursor-pointer hover:shadow-[0_10px_30px_-5px_rgba(31,77,68,0.1)] ${isMandatory ? 'ring-2 ring-amber-400' : ''}`}
          >
            
            {/* Top Row */}
            <div className="flex items-center gap-4 w-full">


              {/* Icon */}
              <div className="w-16 h-16 bg-[#e3f1ed] rounded-[1.25rem] flex items-center justify-center shrink-0">
                <DynamicIcon name={b.categoryIcon} />
              </div>

              {/* Title & Actions */}
              <div className="flex-1 min-w-0 flex justify-between items-start min-h-[4rem] pt-1 gap-2">
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h3 className="text-[17px] font-bold text-slate-800 leading-tight break-words">{b.name || b.categoryName}</h3>
                    {isMandatory && (
                      <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Ưu tiên
                      </span>
                    )}
                  </div>
                  {b.type === "BILL" && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {b.isRecurring && (
                        <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                          Định kỳ
                        </span>
                      )}
                      {b.dueDayOfMonth && (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 flex items-center gap-1">
                          Hạn: {String(b.dueDayOfMonth).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-0 shrink-0 -mr-1">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await api.patch(`/budgets/${b.budgetId}/mandatory`);
                        fetchBudgets();
                      } catch (err) {
                        toast.error("Không thể cập nhật");
                      }
                    }}
                    title={isMandatory ? "Khoản chi bắt buộc" : "Đánh dấu là bắt buộc"}
                    className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95 ${
                      isMandatory 
                        ? "text-amber-500 bg-amber-50 hover:bg-amber-100" 
                        : "text-slate-300 hover:bg-slate-100 hover:text-amber-400"
                    }`}
                  >
                    <svg className="w-5 h-5" fill={isMandatory ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isMandatory ? 1.5 : 2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(b.budgetId); }}
                    disabled={deletingId === b.budgetId}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Amounts & Badges */}
            <div className="flex flex-col gap-2.5 w-full mt-3">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  {b.type === "FLEXIBLE" ? (
                    <>
                      <span className="text-[20px] text-slate-800 font-black tracking-tight leading-none mb-0.5">
                        {new Intl.NumberFormat("vi-VN").format(b.limitAmount)}<span className="text-[13px] font-bold text-slate-400 ml-0.5">đ</span>
                      </span>
                      <span className="text-[13px] font-medium text-slate-500">
                        Đã chi: <span className="font-bold text-slate-700">{new Intl.NumberFormat("vi-VN").format(Math.min(b.spentAmount, b.limitAmount))}đ</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-[20px] text-slate-800 font-black tracking-tight leading-none">
                      {new Intl.NumberFormat("vi-VN").format(b.limitAmount)}<span className="text-[13px] font-bold text-slate-400 ml-0.5">đ</span>
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap ${badgeClass}`}>
                    {badgeText}
                  </span>
                  {b.type !== "FLEXIBLE" && !isPaid && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickPay(b); }}
                      disabled={isQuickPaying === b.budgetId}
                      className="bg-[#2BA76F] hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                    >
                      {isQuickPaying === b.budgetId ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"/>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      )}
                      Trả ngay
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <SetBudgetDrawer
        open={showDrawer}
        onOpenChange={(val) => {
          setShowDrawer(val);
          if (!val) setEditingBudget(null);
        }}
        onSaved={fetchBudgets}
        year={year}
        month={month}
        editBudget={editingBudget}
      />

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[19px] font-extrabold text-slate-800 mb-2 text-center">Xóa khoản chi này?</h3>
            <p className="text-[13px] text-slate-500 text-center mb-6">Bạn có chắc chắn muốn xóa hạn mức ngân sách này không?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[15px] transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[15px] transition-colors shadow-[0_4px_12px_rgba(244,63,94,0.3)]"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
