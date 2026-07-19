"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { AddSavingsGoalDrawer } from "./ngan-keo-them-muc-tieu";
import { EditSavingsGoalDrawer } from "./ngan-keo-sua-muc-tieu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadlineDate?: string;
  status: "IN_PROGRESS" | "COMPLETED";
}

interface CutSuggestion {
  categoryName: string;
  currentSpent: number;
  suggestedLimit: number;
  savingsIfCut: number;
  tip: string;
}

interface SavingsSuggestion {
  idleAmount: number;
  suggestedSaveAmount: number;
  potentialMonthlySave: number;
  message: string;
  cutSuggestions: CutSuggestion[];
}

const EMOJIS = ["🛩️", "💻", "🛡️", "🏠", "📱", "🚗", "🎓", "🎮"];

const PRIORITY_LEVELS: Record<
  number,
  { label: string; icon: string; pct: number; color: string }
> = {
  5: {
    label: "Tối quan trọng",
    icon: "🔥",
    pct: 50,
    color:
      "bg-rose-100 text-rose-700 shadow-[0_2px_10px_-3px_rgba(225,29,72,0.3)]",
  },
  4: {
    label: "Ưu tiên cao",
    icon: "⭐",
    pct: 30,
    color: "bg-orange-100 text-orange-700",
  },
  3: {
    label: "Bình thường",
    icon: "🌱",
    pct: 15,
    color: "bg-[#EAF9F1] text-[#1A342B]",
  },
  2: {
    label: "Thong thả",
    icon: "🐢",
    pct: 5,
    color: "bg-blue-100 text-blue-700",
  },
  1: {
    label: "Tạm ngưng",
    icon: "⏸️",
    pct: 0,
    color: "bg-gray-100 text-gray-500",
  },
};

export function SavingsTab() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [safeToSpend, setSafeToSpend] = useState<number | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingsSuggestion, setSavingsSuggestion] =
    useState<SavingsSuggestion | null>(null);

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAllocs = localStorage.getItem("savingsAllocations");
      if (savedAllocs) setAllocations(JSON.parse(savedAllocs));
    }
  }, []);

  const updateAllocation = (goalId: string, newLevel: number) => {
    const newAllocs = { ...allocations };
    if (newLevel === 5) {
      // Only 1 top priority allowed
      Object.keys(newAllocs).forEach((id) => {
        if (newAllocs[id] === 5) newAllocs[id] = 4;
      });
    }
    newAllocs[goalId] = newLevel;
    setAllocations(newAllocs);
    if (typeof window !== "undefined")
      localStorage.setItem("savingsAllocations", JSON.stringify(newAllocs));
  };

  const fetchData = async () => {
    try {
      const now = new Date();

      let insightsPromise = Promise.resolve({ data: null });
      if (typeof window !== "undefined") {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          insightsPromise = api
            .get(`/advisor/insights/${user.id}`)
            .catch(() => ({ data: null }));
        }
      }

      const [goalsRes, totalBalanceRes, budgetRes, debtRes, insightsRes] =
        await Promise.all([
          api.get("/savings-goals"),
          api.get("/wallets/total-balance"),
          api.get(
            `/budgets/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
          ),
          api.get("/groups/debts/summary"),
          insightsPromise,
        ]);
      const goalsList = Array.isArray(goalsRes.data)
        ? goalsRes.data
        : goalsRes.data.data || [];
      setGoals(goalsList);

      const walletBal = Number(totalBalanceRes.data?.totalBalance) || 0;
      setWalletBalance(walletBal);

      const unpaidBudgets = (budgetRes.data || []).reduce(
        (sum: number, b: any) =>
          sum + Math.max(0, b.limitAmount - b.spentAmount),
        0,
      );
      const totalOwing = debtRes.data?.totalOwing || 0;
      const totalSavings = goalsList.reduce(
        (sum: number, g: any) => sum + (g.currentAmount || 0),
        0,
      );
      setSafeToSpend(Math.max(0, walletBal - unpaidBudgets - totalOwing));

      if ((insightsRes.data as any)?.savingsSuggestion) {
        setSavingsSuggestion((insightsRes.data as any).savingsSuggestion);
      }
    } catch (error) {
      console.error("Failed to fetch savings data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + "đ";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-[#B3E5D1] border-t-[#45b39d] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full pb-28 relative">
      <main className="px-5 mt-4 w-full">
        {/* ═══ SECTION: Advisor Savings ═══ */}
        {savingsSuggestion && (
          <div className="space-y-4 mb-6 animate-in fade-in duration-300">
            {/* Hero card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
              <h3 className="text-lg font-black mb-1 relative z-10">
                💰 Gợi ý Tiết kiệm
              </h3>
              <p className="text-white/90 text-sm relative z-10 leading-relaxed mb-4">
                {savingsSuggestion.message}
              </p>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-white/70 text-[11px] font-bold uppercase">
                    Tiền nhàn rỗi
                  </p>
                  <p className="text-[20px] font-black">
                    {formatCurrency(savingsSuggestion.idleAmount)}
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-white/70 text-[11px] font-bold uppercase">
                    Đề xuất tiết kiệm
                  </p>
                  <p className="text-[20px] font-black">
                    {formatCurrency(savingsSuggestion.suggestedSaveAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cut suggestions */}
            {savingsSuggestion.cutSuggestions.length > 0 && (
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[15px] font-extrabold text-gray-800">
                    ✂️ Gợi ý Cắt giảm
                  </h4>
                  <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Tiết kiệm thêm{" "}
                    {formatCurrency(savingsSuggestion.potentialMonthlySave)}
                    /tháng
                  </span>
                </div>
                <div className="space-y-3">
                  {savingsSuggestion.cutSuggestions.map((cs, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[14px] font-bold text-gray-800">
                          {cs.categoryName}
                        </p>
                        <span className="text-[13px] font-black text-emerald-600">
                          +{formatCurrency(cs.savingsIfCut)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[12px] text-gray-500 mb-2">
                        <span>
                          Đang chi:{" "}
                          <span className="font-bold text-gray-700">
                            {formatCurrency(cs.currentSpent)}
                          </span>
                        </span>
                        <span>
                          → Nên:{" "}
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(cs.suggestedLimit)}
                          </span>
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 bg-white rounded-xl p-2.5 border border-gray-100">
                        💡 {cs.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── SUMMARY CARD ─── */}
        <section className="bg-white rounded-[24px] p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-extrabold text-gray-800">
              Tổng tiền đã tiết kiệm
            </h2>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path>
              </svg>
            </div>
          </div>

          {(() => {
            const totalActualSavings = goals.reduce(
              (sum, goal) => sum + Number(goal.currentAmount || 0),
              0,
            );
            const totalTarget = goals.reduce(
              (sum, goal) => sum + Number(goal.targetAmount || 0),
              0,
            );
            const overallPercent =
              totalTarget > 0
                ? Math.round((totalActualSavings / totalTarget) * 100)
                : 0;

            return (
              <div className="mb-4">
                <p className="text-3xl font-black text-[#45b39d] tracking-tight flex items-baseline gap-2">
                  {formatCurrency(totalActualSavings)}
                  {totalTarget > 0 && (
                    <span className="text-sm font-bold text-gray-400">
                      / {formatCurrency(totalTarget)}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#45b39d] rounded-full transition-all duration-500"
                      style={{ width: `${overallPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">
                    {overallPercent}% mục tiêu chung
                  </span>
                </div>

                <div className="mt-3 bg-[#e8f5f1] border border-[#45b39d]/20 rounded-xl p-2.5 flex items-start gap-2">
                  <span className="text-sm">✨</span>
                  <p className="text-[11px] text-[#2ba76f] leading-relaxed">
                    Đây là tổng số tiền{" "}
                    <span className="font-bold">thực tế</span> bạn đã tích lũy
                    trong các quỹ tiết kiệm của mình. Mức ưu tiên bên dưới giúp
                    hệ thống gợi ý cách phân bổ tiền nhàn rỗi.
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="pt-3 pb-2 border-t border-gray-50 flex justify-between items-center">
            <p className="text-xs text-gray-500">Thêm mục tiêu để bắt đầu</p>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="text-xs font-bold text-[#45b39d] hover:text-[#3a9885] transition-colors flex items-center active:scale-95"
            >
              <span className="text-lg leading-none mr-1">+</span> Tạo mới
            </button>
          </div>
        </section>

        {/* ─── GOALS LIST ─── */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[17px] font-extrabold text-gray-800">
            Mục tiêu của bạn
          </h3>
        </div>

        <div className="space-y-4">
          {(() => {
            const sortedGoals = [...goals].sort((a, b) => {
              const rawA = allocations[a.id] || 3;
              const levelA = PRIORITY_LEVELS[rawA] ? rawA : 3;
              const rawB = allocations[b.id] || 3;
              const levelB = PRIORITY_LEVELS[rawB] ? rawB : 3;
              return levelB - levelA;
            });

            const recommendedSavings = (safeToSpend || 0) * 0.4;
            const totalSafe = recommendedSavings;
            let remainingSafe = totalSafe;

            // Iterate to fairly distribute safe money and handle overflows
            const allocationsMap: Record<string, number> = {};
            sortedGoals.forEach((g) => (allocationsMap[g.id] = 0));

            remainingSafe = totalSafe;
            let activeGoals = sortedGoals
              .map((goal) => {
                const rawLevel = allocations[goal.id] || 3;
                const level = PRIORITY_LEVELS[rawLevel] ? rawLevel : 3;
                return {
                  id: goal.id,
                  target: Number(goal.targetAmount),
                  weight: PRIORITY_LEVELS[level].pct,
                };
              })
              .filter((g) => g.weight > 0);

            let keepRunning = true;
            while (keepRunning && remainingSafe > 0 && activeGoals.length > 0) {
              const totalWeight = activeGoals.reduce(
                (sum, g) => sum + g.weight,
                0,
              );
              if (totalWeight === 0) break;

              const amountToDistribute = remainingSafe;
              remainingSafe = 0;
              keepRunning = false; // Assume no overflow happens in this round

              const nextActive = [];

              for (const goal of activeGoals) {
                const slice = (goal.weight / totalWeight) * amountToDistribute;
                const potential = allocationsMap[goal.id] + slice;

                if (potential >= goal.target) {
                  // Goal is fulfilled, overflow the excess money back into the pool
                  remainingSafe += potential - goal.target;
                  allocationsMap[goal.id] = goal.target;
                  keepRunning = true; // We have overflow to redistribute next round
                } else {
                  allocationsMap[goal.id] = potential;
                  nextActive.push(goal); // Still needs money
                }
              }

              activeGoals = nextActive;
            }

            const totalSuggested = Object.values(allocationsMap).reduce(
              (a, b) => a + b,
              0,
            );

            const displayGoals = [...sortedGoals].sort((a, b) => {
              const rawA = allocations[a.id] || 3;
              const levelA = PRIORITY_LEVELS[rawA] ? rawA : 3;
              const rawB = allocations[b.id] || 3;
              const levelB = PRIORITY_LEVELS[rawB] ? rawB : 3;
              if (levelB !== levelA) return levelB - levelA;

              const allocA = allocationsMap[a.id] || 0;
              const allocB = allocationsMap[b.id] || 0;
              if (allocB !== allocA) return allocB - allocA;

              const pctA =
                a.targetAmount > 0
                  ? Math.min(100, Math.round((allocA / a.targetAmount) * 100))
                  : 0;
              const pctB =
                b.targetAmount > 0
                  ? Math.min(100, Math.round((allocB / b.targetAmount) * 100))
                  : 0;
              return pctB - pctA;
            });

            return (
              <>
                {displayGoals.map((goal, idx) => {
                  const rawLevel = allocations[goal.id] || 3;
                  const level = PRIORITY_LEVELS[rawLevel] ? rawLevel : 3;
                  const finalAllocated = Number(goal.currentAmount || 0);
                  const suggestedAlloc = allocationsMap[goal.id] || 0;
                  const percent = Math.min(
                    100,
                    Math.round((finalAllocated / goal.targetAmount) * 100),
                  );
                  const icon = EMOJIS[idx % EMOJIS.length];

                  return (
                    <div
                      key={goal.id}
                      className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm flex flex-col relative hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 w-full pr-2">
                          <div className="w-12 h-12 bg-emerald-50/50 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0 border border-emerald-100/50">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-[15px] font-extrabold text-gray-800 leading-tight line-clamp-1">
                              {goal.name}
                            </h2>
                            <p className="text-xs text-[#45b39d] mt-1 font-bold">
                              Tích lũy: {formatCurrency(finalAllocated)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Mục tiêu: {formatCurrency(goal.targetAmount)}
                            </p>
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <div className="relative shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={`px-2.5 py-1.5 text-[10px] font-bold border-none rounded-lg outline-none cursor-pointer ${PRIORITY_LEVELS[level].color} transition-colors flex items-center shadow-sm active:scale-95`}
                            >
                              <span className="mr-1">
                                {PRIORITY_LEVELS[level].icon}
                              </span>
                              {PRIORITY_LEVELS[level].label}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-[20px] p-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]"
                            >
                              {[5, 4, 3, 2, 1].map((lvl) => (
                                <DropdownMenuItem
                                  key={lvl}
                                  onClick={() => updateAllocation(goal.id, lvl)}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-bold transition-all outline-none ${level === lvl ? PRIORITY_LEVELS[lvl].color : "text-gray-600 focus:bg-gray-50 hover:bg-gray-50"}`}
                                >
                                  <span className="text-lg">
                                    {PRIORITY_LEVELS[lvl].icon}
                                  </span>
                                  <span>{PRIORITY_LEVELS[lvl].label}</span>
                                  {level === lvl && (
                                    <svg
                                      className="w-4 h-4 ml-auto"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-100 rounded-full relative mb-3 overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-[#45b39d] rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#45b39d]">
                            {percent}% hoàn thành
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowEditDrawer(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors active:scale-95"
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
                              strokeWidth="2.5"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          {goals.length === 0 && (
            <div className="text-center py-10 opacity-60">
              <div className="text-5xl mb-4">🎯</div>
              <p className="font-semibold text-gray-700">
                Chưa có mục tiêu tiết kiệm nào
              </p>
              <p className="text-sm mt-1">Hãy tạo một mục tiêu để bắt đầu!</p>
            </div>
          )}
        </div>
      </main>

      {/* Drawers */}
      <AddSavingsGoalDrawer
        open={showAddDrawer}
        onOpenChange={setShowAddDrawer}
        onSaved={fetchData}
      />

      {selectedGoal && (
        <EditSavingsGoalDrawer
          open={showEditDrawer}
          onOpenChange={setShowEditDrawer}
          goal={selectedGoal}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
