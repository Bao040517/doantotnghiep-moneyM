"use client";

import { useState, useEffect } from "react";
import { SetBudgetDrawer } from "@/components/ngan-keo-thiet-lap-ngan-sach";
import { TransferModal } from "@/components/hop-thoai-chuyen-khoan";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/axios";

const BIN_TO_BANK_ID: Record<string, string> = {
  "970436": "vcb",
  "970415": "ctg",
  "970418": "bidv",
  "970405": "agr",
  "970422": "mb",
  "970407": "tcb",
  "970432": "vpb",
  "970416": "acb",
  "970423": "tpb",
};
import * as LucideIcons from "lucide-react";

function DynamicIcon({
  name,
  className = "w-7 h-7 text-emerald-600",
}: {
  name?: string;
  className?: string;
}) {
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
  payeeBankBin?: string;
  payeeBankAccount?: string;
  payeeAccountName?: string;
}

interface BudgetTabProps {
  year: number;
  month: number;
  walletBalance: number;
  targetBudgetId?: string | null;
}

const STATUS_CONFIG = {
  OK: { bar: "bg-emerald-400", text: "text-emerald-600", badge: "", label: "" },
  WARNING: {
    bar: "bg-amber-400",
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    label: "⚠️ Sắp vượt",
  },
  OVER: {
    bar: "bg-rose-500",
    text: "text-rose-600",
    badge: "bg-rose-100 text-rose-700",
    label: "🔴 Vượt ngân sách",
  },
};

export function BudgetTab({ year, month, walletBalance, targetBudgetId }: BudgetTabProps) {
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(walletBalance);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [payingBudget, setPayingBudget] = useState<any | null>(null);
  const [focusedBudgetId, setFocusedBudgetId] = useState<string | null>(null);

  useEffect(() => {
    if (targetBudgetId && budgets.length > 0) {
      const match = budgets.find(
        (b) =>
          b.budgetId === targetBudgetId ||
          b.categoryId === targetBudgetId ||
          (b.categoryName &&
            b.categoryName.toLowerCase().includes(String(targetBudgetId).toLowerCase())) ||
          (b.name &&
            b.name.toLowerCase().includes(String(targetBudgetId).toLowerCase()))
      );
      if (match) {
        setFocusedBudgetId(match.budgetId);
        setTimeout(() => {
          const el = document.getElementById(`budget-card-${match.budgetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 250);
        const timer = setTimeout(() => setFocusedBudgetId(null), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [targetBudgetId, budgets]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("budgetPriority");
      if (saved) {
        setPriorityOrder(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (budgets.length > 0) {
      setPriorityOrder((prev) => {
        const newOrder = [...prev];
        budgets.forEach((b) => {
          if (!newOrder.includes(b.budgetId)) {
            newOrder.push(b.budgetId);
          }
        });
        const finalOrder = newOrder.filter((id) =>
          budgets.some((b) => b.budgetId === id),
        );
        if (JSON.stringify(prev) !== JSON.stringify(finalOrder)) {
          if (typeof window !== "undefined") {
            localStorage.setItem("budgetPriority", JSON.stringify(finalOrder));
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
        api
          .get("/wallets/total-balance")
          .catch(() => ({ data: { totalBalance: 0 } })),
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

  const handleQuickPay = async (b: any, customAmount?: number) => {
    try {
      setIsQuickPaying(b.budgetId);
      const remaining =
        customAmount !== undefined
          ? customAmount
          : Math.max(0, b.limitAmount - b.spentAmount);
      if (remaining <= 0) return;

      const res = await api.get("/wallets/me");
      const data = res.data?.data || res.data;
      const walletId =
        Array.isArray(data) && data.length > 0 ? data[0].id : data?.id;
      if (!walletId) {
        toast.error("Không tìm thấy ví");
        return;
      }

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

  const movePriority = (index: number, direction: "up" | "down") => {
    // Rebuild a flat order based on current sortedBudgets
    const newOrder = sortedBudgets.map((b) => b.budgetId);

    if (direction === "up" && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index - 1],
      ];
    } else if (direction === "down" && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index + 1],
      ];
    }
    setPriorityOrder(newOrder);
    if (typeof window !== "undefined") {
      localStorage.setItem("budgetPriority", JSON.stringify(newOrder));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
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
  sortedBudgets.forEach((b) => {
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
  sortedBudgets.forEach((b) => {
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
          <h2 className="text-[19px] font-extrabold text-slate-800">
            Ngân sách chi tiêu
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">
            Đặt hạn mức để không tiêu lố tay
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBudget(null);
            setShowDrawer(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl font-bold shadow-md shadow-indigo-500/20 text-[13px] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>+</span> Tạo thêm
        </button>
      </div>

      {/* Summary Card */}
      {sortedBudgets.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-[24px] p-5 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden mb-5">
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/10 blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-indigo-100 uppercase tracking-wider mb-1">
                Tổng ngân sách tháng
              </p>
              <p className="text-[30px] font-black text-white leading-none">
                {(() => {
                  const categoryMap = new Map<
                    string,
                    { flexLimit: number; billLimit: number }
                  >();
                  sortedBudgets.forEach((b) => {
                    const cat = b.categoryId;
                    if (!categoryMap.has(cat))
                      categoryMap.set(cat, { flexLimit: 0, billLimit: 0 });
                    const entry = categoryMap.get(cat)!;
                    if (b.type === "FLEXIBLE") {
                      entry.flexLimit += b.limitAmount;
                    } else {
                      entry.billLimit += b.limitAmount;
                    }
                  });
                  const totalLimit = Array.from(categoryMap.values()).reduce(
                    (sum, entry) =>
                      sum + Math.max(entry.flexLimit, entry.billLimit),
                    0,
                  );
                  return totalLimit.toLocaleString("vi-VN");
                })()}{" "}
                <span className="text-[16px] font-semibold opacity-80">đ</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm">
              <DynamicIcon name="pie-chart" className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sortedBudgets.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-indigo-200">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🎯</span>
          </div>
          <p className="text-slate-800 font-bold">Chưa có khoản chi nào</p>
          <p className="text-xs text-slate-400 mt-1">
            Đặt giới hạn chi tiêu để kiểm soát tài chính!
          </p>
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
          const pct =
            b.limitAmount > 0
              ? Math.round((b.spentAmount / b.limitAmount) * 100)
              : 0;
          barWidth = Math.min(100, pct);

          if (b.spentAmount > b.limitAmount) {
            badgeText = `Vượt ${new Intl.NumberFormat("vi-VN").format(b.spentAmount - b.limitAmount)}đ`;
            badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
            barClass = "bg-rose-500";
          } else if (pct >= 100) {
            badgeText = "Hết ngân sách";
            badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
            barClass = "bg-rose-500";
          } else if (pct >= 80) {
            badgeText = `Còn: ${new Intl.NumberFormat("vi-VN").format(remainingToPay)}đ`;
            if (allocated < remainingToPay) {
              badgeText += " (Ví thiếu)";
              badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
            } else {
              badgeClass = "bg-amber-50 text-amber-700 border border-amber-100";
            }
            barClass = "bg-amber-400";
          } else {
            badgeText = `Còn: ${new Intl.NumberFormat("vi-VN").format(remainingToPay)}đ`;
            if (allocated < remainingToPay) {
              badgeText += " (Ví thiếu)";
              badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
            } else {
              badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
            }
            barClass = "bg-emerald-500";
          }
        } else {
          if (isPaid) {
            barWidth = 100;
            if (b.spentAmount > b.limitAmount) {
              badgeText = `Vượt ${new Intl.NumberFormat("vi-VN").format(b.spentAmount - b.limitAmount)}đ`;
              badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
              barClass = "bg-rose-500";
            } else {
              badgeText = "Đã thanh toán";
              badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
              barClass = "bg-emerald-400";
            }
          } else {
            if (allocated >= remainingToPay) {
              barWidth = 100;
              badgeText = "Đã đủ tiền trả";
              badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
              barClass = "bg-emerald-500";
            } else if (allocated > 0) {
              const pct = Math.round((allocated / remainingToPay) * 100);
              barWidth = pct;
              badgeText = `Thiếu ${new Intl.NumberFormat("vi-VN").format(remainingToPay - allocated)}đ`;
              badgeClass = "bg-amber-50 text-amber-700 border border-amber-100";
              barClass = "bg-amber-400";
            } else {
              barWidth = 0;
              badgeText = `Thiếu ${new Intl.NumberFormat("vi-VN").format(remainingToPay)}đ`;
              badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
              barClass = "bg-rose-500";
            }
          }
        }

        const isFocused = focusedBudgetId === b.budgetId;

        return (
          <div
            key={b.budgetId}
            id={`budget-card-${b.budgetId}`}
            onClick={() => {
              setEditingBudget(b);
              setShowDrawer(true);
            }}
            className={`bg-white rounded-[24px] p-4.5 mb-3.5 shadow-sm border transition-all cursor-pointer relative group space-y-3 ${
              isFocused
                ? "ring-4 ring-rose-500 border-rose-300 bg-rose-50/40 scale-[1.02] shadow-lg animate-pulse"
                : isMandatory
                ? "border-amber-200/90 bg-amber-50/20"
                : "border-slate-100/90"
            } hover:border-indigo-200 hover:shadow-md`}
          >
            {/* Top Row */}
            <div className="flex items-center gap-3.5 w-full">
              {/* Icon */}
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100/60">
                <DynamicIcon name={b.categoryIcon} className="w-6 h-6 text-indigo-600" />
              </div>

              {/* Title & Actions */}
              <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-extrabold text-slate-800 leading-snug">
                      {b.name || b.categoryName}
                    </h3>
                    {isMandatory && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                        Ưu tiên
                      </span>
                    )}
                  </div>
                  {b.type === "BILL" && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {b.isRecurring && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                          Định kỳ
                        </span>
                      )}
                      {b.dueDayOfMonth && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          Hạn: {String(b.dueDayOfMonth).padStart(2, "0")}/{String(month).padStart(2, "0")}/{year}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
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
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                      isMandatory
                        ? "text-amber-500 bg-amber-100/80"
                        : "text-slate-300 hover:bg-slate-100 hover:text-amber-500"
                    }`}
                  >
                    <svg
                      className="w-4.5 h-4.5"
                      fill={isMandatory ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={isMandatory ? 1.5 : 2}
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(b.budgetId);
                    }}
                    disabled={deletingId === b.budgetId}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[20px] text-slate-900 font-black tracking-tight leading-none block">
                    {new Intl.NumberFormat("vi-VN").format(b.limitAmount)}
                    <span className="text-[13px] font-bold text-slate-400 ml-0.5">đ</span>
                  </span>
                  <span className="text-[12px] font-medium text-slate-500 mt-1 block">
                    Đã chi: <span className="font-bold text-slate-700">{new Intl.NumberFormat("vi-VN").format(b.spentAmount)}đ</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${badgeClass}`}>
                    {badgeText}
                  </span>
                  {b.type !== "FLEXIBLE" && !isPaid && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPayingBudget(b);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all flex items-center gap-1 active:scale-95 shadow-sm shadow-emerald-500/20"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Trả ngay
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${barWidth}%` }} />
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
            <h3 className="text-[19px] font-extrabold text-slate-800 mb-2 text-center">
              Xóa khoản chi này?
            </h3>
            <p className="text-[13px] text-slate-500 text-center mb-6">
              Bạn có chắc chắn muốn xóa hạn mức ngân sách này không?
            </p>
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

      {/* Unified Transfer Modal for Budget Payment */}
      <TransferModal
        open={!!payingBudget}
        onOpenChange={(open) => {
          if (!open) setPayingBudget(null);
        }}
        onSuccess={() => {
          setPayingBudget(null);
          fetchBudgets();
        }}
        initialAmount={
          payingBudget
            ? Math.max(0, payingBudget.limitAmount - payingBudget.spentAmount)
            : undefined
        }
        initialNote={payingBudget?.name || payingBudget?.categoryName || ""}
        initialCategoryId={payingBudget?.categoryId}
        initialBankId={
          payingBudget?.payeeBankBin
            ? BIN_TO_BANK_ID[payingBudget.payeeBankBin]
            : undefined
        }
        initialAccountNumber={payingBudget?.payeeBankAccount}
        linkedBudgetId={payingBudget?.budgetId}
      />
    </section>
  );
}
