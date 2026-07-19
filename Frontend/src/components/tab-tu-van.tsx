"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

interface BudgetSuggestion {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string | null;
  suggestedAmount: number;
  currentBudget: number | null;
  avgSpent3Months: number;
  reasoning: string;
}

interface SpendingWarning {
  categoryName: string;
  categoryIcon: string | null;
  currentMonthSpent: number;
  avg3MonthSpent: number;
  increasePercent: number;
  severity: "HIGH" | "MEDIUM";
  message: string;
}

interface HabitAnalysis {
  totalIncome: number;
  totalExpense: number;
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  verdict: string;
  recommendations: string[];
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

interface AdviceData {
  budgetPlan: BudgetSuggestion[];
  warnings: SpendingWarning[];
  habitAnalysis: HabitAnalysis;
  savingsSuggestion: SavingsSuggestion;
}

export function AdvisorTab() {
  const [data, setData] = useState<AdviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<
    "plan" | "alerts" | "habits"
  >("habits");

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0)) + "đ";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const res = await api.get(`/advisor/insights/${user.id}`);
        setData(res.data);
      } catch (err: any) {
        setError("Không thể tải dữ liệu phân tích.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl">🧠</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium animate-pulse">
          Đang phân tích dữ liệu tài chính...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-2xl">
          😢
        </div>
        <p className="text-red-500 font-medium">
          {error || "Chưa có dữ liệu."}
        </p>
        <p className="text-gray-400 text-sm">
          Hãy ghi chép thu chi ít nhất 1 tháng để xem phân tích.
        </p>
      </div>
    );
  }

  const sections = [
    {
      key: "habits" as const,
      icon: "📊",
      label: "Thói quen",
      color: "from-violet-500 to-purple-600",
    },
    {
      key: "plan" as const,
      icon: "📅",
      label: "Kế hoạch",
      color: "from-blue-500 to-cyan-500",
    },
    {
      key: "alerts" as const,
      icon: "⚠️",
      label: "Cảnh báo",
      color: "from-amber-500 to-orange-500",
      badge: data.warnings.length,
    },
  ];

  return (
    <div className="px-5 pb-32 space-y-6">
      {/* ─── SECTION PILLS ─── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all active:scale-95 relative ${
              activeSection === s.key
                ? `bg-gradient-to-r ${s.color} text-white shadow-lg`
                : "bg-white text-gray-600 border border-gray-100 shadow-sm"
            }`}
          >
            <span className="text-[15px]">{s.icon}</span>
            {s.label}
            {s.badge && s.badge > 0 ? (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeSection === s.key
                    ? "bg-white/30 text-white"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {s.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ═══ SECTION: Habits (50/30/20) ═══ */}
      {activeSection === "habits" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Verdict Card */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
            <h3 className="text-lg font-black mb-1 relative z-10">
              Phân tích theo chuẩn 50/30/20
            </h3>
            <p className="text-white/80 text-sm mb-5 relative z-10">
              Chuẩn quốc tế quản lý tài chính cá nhân
            </p>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 relative z-10 border border-white/10">
              <p className="text-[15px] font-bold leading-relaxed">
                {data.habitAnalysis.verdict}
              </p>
            </div>
          </div>

          {/* 50/30/20 Bars */}
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-5">
            <h4 className="text-[15px] font-extrabold text-gray-800">
              Cơ cấu Chi tiêu / Thu nhập
            </h4>

            {/* Needs */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">🏠</span>
                  <span className="text-[13px] font-bold text-gray-700">
                    Thiết yếu (Chuẩn ≤ 50%)
                  </span>
                </div>
                <span
                  className={`text-[13px] font-black ${data.habitAnalysis.needsPercent > 50 ? "text-red-500" : "text-emerald-500"}`}
                >
                  {data.habitAnalysis.needsPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${data.habitAnalysis.needsPercent > 50 ? "bg-red-400" : "bg-emerald-400"}`}
                  style={{
                    width: `${Math.min(100, data.habitAnalysis.needsPercent)}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-gray-300"
                  style={{ left: "50%" }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {fmt(data.habitAnalysis.needsAmount)} — Tiền nhà, ăn uống, điện
                nước, đi lại...
              </p>
            </div>

            {/* Wants */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">🎉</span>
                  <span className="text-[13px] font-bold text-gray-700">
                    Linh hoạt (Chuẩn ≤ 30%)
                  </span>
                </div>
                <span
                  className={`text-[13px] font-black ${data.habitAnalysis.wantsPercent > 30 ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {data.habitAnalysis.wantsPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${data.habitAnalysis.wantsPercent > 30 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{
                    width: `${Math.min(100, data.habitAnalysis.wantsPercent)}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-gray-300"
                  style={{ left: "30%" }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {fmt(data.habitAnalysis.wantsAmount)} — Mua sắm, vui chơi, mỹ
                phẩm...
              </p>
            </div>

            {/* Savings */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">🌱</span>
                  <span className="text-[13px] font-bold text-gray-700">
                    Tiết kiệm (Chuẩn ≥ 20%)
                  </span>
                </div>
                <span
                  className={`text-[13px] font-black ${data.habitAnalysis.savingsPercent < 20 ? "text-red-500" : "text-emerald-500"}`}
                >
                  {data.habitAnalysis.savingsPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${data.habitAnalysis.savingsPercent < 20 ? "bg-red-400" : "bg-emerald-400"}`}
                  style={{
                    width: `${Math.min(100, data.habitAnalysis.savingsPercent)}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-gray-300"
                  style={{ left: "20%" }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {fmt(data.habitAnalysis.savingsAmount)} — Thu nhập trừ chi tiêu
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {data.habitAnalysis.recommendations.length > 0 && (
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
              <h4 className="text-[15px] font-extrabold text-gray-800 mb-3">
                💬 Nhận xét chi tiết
              </h4>
              <div className="space-y-2.5">
                {data.habitAnalysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="text-[13px] text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-3.5"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION: Budget Plan ═══ */}
      {activeSection === "plan" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
            <h3 className="text-lg font-black mb-1 relative z-10">
              📅 Kế hoạch Ngân sách Thông minh
            </h3>
            <p className="text-white/80 text-sm relative z-10">
              Đề xuất dựa trên trung bình chi tiêu 3 tháng gần nhất, đã loại bỏ
              các khoản bất thường.
            </p>
          </div>

          {data.budgetPlan.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center shadow-sm border border-gray-100">
              <span className="text-3xl">📭</span>
              <p className="text-gray-500 mt-2 font-medium">
                Chưa đủ dữ liệu lịch sử để đề xuất.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Hãy sử dụng ứng dụng ít nhất 1 tháng.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.budgetPlan.map((bp, idx) => {
                const hasCurrentBudget =
                  bp.currentBudget !== null && bp.currentBudget !== undefined;
                const isHigher =
                  hasCurrentBudget && bp.suggestedAmount > bp.currentBudget!;
                const isLower =
                  hasCurrentBudget && bp.suggestedAmount < bp.currentBudget!;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {bp.categoryIcon || "📋"}
                        </span>
                        <div>
                          <p className="text-[14px] font-bold text-gray-800">
                            {bp.categoryName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            TB 3 tháng: {fmt(bp.avgSpent3Months)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-black text-blue-600">
                          {fmt(bp.suggestedAmount)}
                        </p>
                        {hasCurrentBudget && (
                          <p
                            className={`text-[11px] font-bold ${isHigher ? "text-amber-500" : isLower ? "text-emerald-500" : "text-gray-400"}`}
                          >
                            {isHigher
                              ? "↑ Nên tăng"
                              : isLower
                                ? "↓ Có thể giảm"
                                : "= Phù hợp"}
                          </p>
                        )}
                        {!hasCurrentBudget && (
                          <p className="text-[11px] font-bold text-blue-400">
                            🆕 Chưa đặt
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[12px] text-gray-500 bg-blue-50 rounded-xl p-2.5">
                      {bp.reasoning}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION: Smart Alerts ═══ */}
      {activeSection === "alerts" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
            <h3 className="text-lg font-black mb-1 relative z-10">
              ⚡ Cảnh báo Chi tiêu Bất thường
            </h3>
            <p className="text-white/80 text-sm relative z-10">
              So sánh tốc độ chi tiêu tháng này với trung bình 3 tháng trước.
            </p>
          </div>

          {data.warnings.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center shadow-sm border border-gray-100">
              <span className="text-4xl">🎉</span>
              <p className="text-emerald-600 mt-3 font-bold text-lg">
                Mọi thứ đều ổn!
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Không phát hiện khoản chi nào bất thường tháng này.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`rounded-[20px] p-4 shadow-sm border ${
                    w.severity === "HIGH"
                      ? "bg-red-50 border-red-100"
                      : "bg-amber-50 border-amber-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                        w.severity === "HIGH" ? "bg-red-100" : "bg-amber-100"
                      }`}
                    >
                      {w.severity === "HIGH" ? "🔴" : "🟡"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-gray-800">
                          {w.categoryName}
                        </p>
                        <span
                          className={`text-[12px] font-black px-2 py-0.5 rounded-full ${
                            w.severity === "HIGH"
                              ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          +{w.increasePercent}%
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-600 leading-relaxed">
                        {w.message}
                      </p>
                      <div className="flex gap-4 mt-2.5 text-[11px] font-medium text-gray-400">
                        <span>
                          Đã chi:{" "}
                          <span className="text-gray-700 font-bold">
                            {fmt(w.currentMonthSpent)}
                          </span>
                        </span>
                        <span>
                          TB:{" "}
                          <span className="text-gray-700 font-bold">
                            {fmt(w.avg3MonthSpent)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
