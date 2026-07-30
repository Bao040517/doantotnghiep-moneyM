"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

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

const getCategoryEmoji = (catName: string) => {
  const name = (catName || "").toLowerCase();
  if (name.includes("y tế") || name.includes("thuốc") || name.includes("bệnh")) return "🏥";
  if (name.includes("ăn") || name.includes("phở") || name.includes("cơm") || name.includes("thực phẩm")) return "🍔";
  if (name.includes("cà phê") || name.includes("trà") || name.includes("nước")) return "☕";
  if (name.includes("mua sắm") || name.includes("quần áo") || name.includes("đồ")) return "🛍️";
  if (name.includes("giải trí") || name.includes("phim") || name.includes("chơi")) return "🎬";
  if (name.includes("di chuyển") || name.includes("xe") || name.includes("xăng")) return "🚗";
  if (name.includes("giao lưu") || name.includes("bạn bè") || name.includes("tiệc")) return "🤝";
  if (name.includes("học") || name.includes("sách")) return "📚";
  return "💸";
};

export function AdvisorTab() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [data, setData] = useState<AdviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyingCategory, setApplyingCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"habits" | "alerts" | "plan">("habits");

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0)) + "đ";

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleApplyBudget = async (bp: BudgetSuggestion) => {
    if (!bp.categoryId) {
      toast.error("Không tìm thấy mã danh mục để áp dụng.");
      return;
    }
    setApplyingCategory(bp.categoryName);
    try {
      await api.post("/budgets", {
        categoryId: bp.categoryId,
        limitAmount: bp.suggestedAmount,
        month: selectedMonth,
        year: selectedYear,
        type: "FLEXIBLE",
        isRecurring: false,
        isMandatory: false,
      });
      toast.success(
        `Đã đặt hạn mức ${bp.categoryName} (${fmt(bp.suggestedAmount)}) cho Tháng ${selectedMonth}/${selectedYear}! 🎯`
      );
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await api.get(
          `/advisor/insights/${user.id}?year=${selectedYear}&month=${selectedMonth}`
        );
        setData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể đặt hạn mức");
    } finally {
      setApplyingCategory(null);
    }
  };

  const isFutureMonth =
    selectedYear > now.getFullYear() ||
    (selectedYear === now.getFullYear() && selectedMonth > now.getMonth() + 1);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const res = await api.get(
          `/advisor/insights/${user.id}?year=${selectedYear}&month=${selectedMonth}`
        );
        setData(res.data);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          (err.response?.status
            ? `Lỗi hệ thống (${err.response.status}). Vui lòng thử lại.`
            : "Không thể tải dữ liệu gợi ý chi tiêu.");
        setError(msg);
        console.error("Advisor insight error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedMonth]);

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
          Đang phân tích dữ liệu gợi ý cho Tháng {selectedMonth}/{selectedYear}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 px-5">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-2xl">
          😢
        </div>
        <p className="text-red-500 font-medium text-center">
          {error || "Chưa có dữ liệu."}
        </p>
        <p className="text-gray-400 text-sm text-center">
          Hãy ghi chép thu chi ít nhất 1 tháng hoặc thử chọn tháng khác.
        </p>
      </div>
    );
  }

  const netBalance = data.habitAnalysis.totalIncome - data.habitAnalysis.totalExpense;

  const tabs = [
    {
      id: "habits" as const,
      icon: "📊",
      label: "Thói quen",
      color: "from-indigo-500 to-purple-600",
    },
    {
      id: "alerts" as const,
      icon: "⚠️",
      label: "Cảnh báo",
      color: "from-amber-500 to-orange-500",
      badge: data.warnings.length,
    },
    {
      id: "plan" as const,
      icon: "💡",
      label: "Gợi ý hạn mức",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <div className="px-5 pb-32 space-y-4 animate-in fade-in duration-300">
      {/* ─── MONTH SELECTOR ─── */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
        <button
          onClick={handlePrevMonth}
          className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 font-bold transition-all active:scale-95 text-lg"
          title="Tháng trước"
        >
          ‹
        </button>
        <div className="text-center">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Gợi ý & Tư vấn Chi tiêu
          </span>
          <span className="text-base font-extrabold text-gray-800">
            Tháng {selectedMonth} / {selectedYear}
          </span>
        </div>
        <button
          onClick={handleNextMonth}
          className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 font-bold transition-all active:scale-95 text-lg"
          title="Tháng sau"
        >
          ›
        </button>
      </div>

      {/* ─── FUTURE MONTH BANNER ─── */}
      {isFutureMonth && (
        <div className="bg-blue-50/90 border border-blue-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <span className="text-xl shrink-0">🗓️</span>
          <div>
            <p className="text-[13px] font-bold text-blue-900">
              Đang xem Tháng {selectedMonth}/{selectedYear} (Tháng tương lai)
            </p>
            <p className="text-[11px] text-blue-700 font-medium leading-tight mt-0.5">
              Chưa phát sinh chi tiêu thực tế. Hệ thống hiển thị ngân sách kế hoạch gợi ý dựa trên thói quen của bạn!
            </p>
          </div>
        </div>
      )}

      {/* ─── SEGMENTED SUB-TABS ─── */}
      <div className="grid grid-cols-3 gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 relative ${
                isActive
                  ? "bg-white text-gray-900 shadow-md font-extrabold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-[14px]">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                    isActive ? "bg-red-500 text-white" : "bg-red-100 text-red-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 1: 📊 THÓI QUEN (50/30/20 & HERO CARD)                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "habits" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Hero Card Summary */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-[24px] p-5 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/10 blur-2xl -mr-10 -mt-10" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <h3 className="text-base font-black tracking-tight">
                  Đánh giá Tháng {selectedMonth}/{selectedYear}
                </h3>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <p className="text-[13px] font-bold leading-relaxed">
                  {data.habitAnalysis.verdict}
                </p>
              </div>

              {/* 3 Mini Stats */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/10">
                  <span className="text-[9px] font-bold text-white/70 block uppercase">
                    Thu nhập
                  </span>
                  <span className="text-[12px] font-extrabold text-emerald-300 block truncate">
                    {fmt(data.habitAnalysis.totalIncome)}
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/10">
                  <span className="text-[9px] font-bold text-white/70 block uppercase">
                    Đã chi
                  </span>
                  <span className="text-[12px] font-extrabold text-rose-300 block truncate">
                    {fmt(data.habitAnalysis.totalExpense)}
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/10">
                  <span className="text-[9px] font-bold text-white/70 block uppercase">
                    Dòng tiền ròng
                  </span>
                  <span
                    className={`text-[12px] font-extrabold block truncate ${
                      netBalance >= 0 ? "text-cyan-300" : "text-amber-300"
                    }`}
                  >
                    {netBalance >= 0 ? `+${fmt(netBalance)}` : fmt(netBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 50/30/20 Breakdown */}
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-4">
            <div>
              <h4 className="text-[14px] font-extrabold text-gray-800">
                Cơ cấu Chi tiêu (Chuẩn 50/30/20)
              </h4>
              <p className="text-[11px] text-gray-400">
                Phân bổ tài chính giúp kiểm soát dòng tiền bền vững
              </p>
            </div>

            {/* Needs */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">🏠</span>
                  <span className="text-[12px] font-bold text-gray-700">
                    Thiết yếu (Khuyến nghị ≤ 50%)
                  </span>
                </div>
                <span
                  className={`text-[12px] font-black ${
                    data.habitAnalysis.needsPercent > 50 ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {data.habitAnalysis.needsPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    data.habitAnalysis.needsPercent > 50 ? "bg-red-400" : "bg-emerald-400"
                  }`}
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
                {fmt(data.habitAnalysis.needsAmount)} — Tiền nhà, ăn uống, điện nước...
              </p>
            </div>

            {/* Wants */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">🎉</span>
                  <span className="text-[12px] font-bold text-gray-700">
                    Linh hoạt (Khuyến nghị ≤ 30%)
                  </span>
                </div>
                <span
                  className={`text-[12px] font-black ${
                    data.habitAnalysis.wantsPercent > 30 ? "text-amber-500" : "text-emerald-500"
                  }`}
                >
                  {data.habitAnalysis.wantsPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    data.habitAnalysis.wantsPercent > 30 ? "bg-amber-400" : "bg-emerald-400"
                  }`}
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
                {fmt(data.habitAnalysis.wantsAmount)} — Mua sắm, giải trí, mỹ phẩm...
              </p>
            </div>

            {/* Savings */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">🌱</span>
                  <span className="text-[12px] font-bold text-gray-700">
                    Tiết kiệm (Khuyến nghị ≥ 20%)
                  </span>
                </div>
                <span
                  className={`text-[12px] font-black ${
                    data.habitAnalysis.savingsPercent < 20 ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {data.habitAnalysis.savingsPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    data.habitAnalysis.savingsPercent < 20 ? "bg-red-400" : "bg-emerald-400"
                  }`}
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
                {fmt(data.habitAnalysis.savingsAmount)} — Thu nhập dôi dư
              </p>
            </div>

            {/* Recommendations */}
            {data.habitAnalysis.recommendations.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <h5 className="text-[12px] font-bold text-gray-700">
                  💬 Lời khuyên chi tiết:
                </h5>
                {data.habitAnalysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="text-[12px] text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ⚠️ CẢNH BÁO CHI TIÊU BẤT THƯỜNG                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "alerts" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
            <h3 className="text-base font-black relative z-10">
              ⚡ Cảnh báo Chi tiêu Linh hoạt Bất thường
            </h3>
            <p className="text-white/90 text-xs relative z-10 mt-0.5">
              Tự động cảnh báo khi tốc độ chi tiêu sinh hoạt (ăn uống, giải trí, mua sắm...) tăng tốc đột biến.
            </p>
          </div>

          {(() => {
            const FIXED_KEYWORDS = [
              "điện", "tiền điện", "nước", "tiền nước", "nhà", "tiền nhà", "thuê nhà",
              "mạng", "internet", "wifi", "truyền hình", "rác", "tiền rác", "trả góp",
              "lãi vay", "vay", "bảo hiểm", "học phí", "viễn thông", "cố định", "định kỳ",
              "bill", "hóa đơn", "phí liên lạc", "phí quản lý", "phí giữ xe", "gửi xe", "chung cư"
            ];
            const filteredWarnings = data.warnings.filter(
              (w) => !FIXED_KEYWORDS.some((k) => (w.categoryName || "").toLowerCase().includes(k))
            );

            if (filteredWarnings.length === 0) {
              return (
                <div className="bg-white rounded-[24px] p-8 text-center shadow-sm border border-gray-100">
                  <span className="text-4xl">🎉</span>
                  <p className="text-emerald-600 font-bold text-base mt-3">
                    Mọi thứ đều trong tầm kiểm soát!
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Không phát hiện khoản chi linh hoạt nào tăng bất thường trong tháng này.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredWarnings.map((w, idx) => {
                  const now = new Date();
                  const day = now.getDate();
                  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  const projected = day > 0 ? Math.round((w.currentMonthSpent / day) * totalDays) : w.currentMonthSpent;

                  const isHigh = w.severity === "HIGH";

                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-2xl p-4 border border-slate-200/80 border-l-4 ${
                        isHigh ? "border-l-rose-500 shadow-rose-500/5" : "border-l-amber-500 shadow-amber-500/5"
                      } shadow-md hover:shadow-lg transition-all space-y-3`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0 border border-slate-200/80 shadow-sm"
                          >
                            {getCategoryEmoji(w.categoryName)}
                          </div>
                          <div>
                            <h4 className="text-[16px] font-black text-slate-900 leading-tight">
                              {w.categoryName}
                            </h4>
                            <p
                              className={`text-[13px] font-extrabold mt-0.5 ${
                                isHigh ? "text-rose-600" : "text-amber-600"
                              }`}
                            >
                              {isHigh
                                ? `Chi tiêu Bùng nổ (+${w.increasePercent}% so với TB)`
                                : `Chi tiêu Tăng cao (+${w.increasePercent}% so với TB)`}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[13px] font-black px-3 py-1 rounded-xl text-white shadow-sm whitespace-nowrap ${
                            isHigh ? "bg-rose-600 shadow-rose-500/30" : "bg-amber-500 shadow-amber-500/30"
                          }`}
                        >
                          +{w.increasePercent}%
                        </span>
                      </div>

                      {/* Stat Grid with color-coded purpose cards */}
                      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-center">
                        {/* Đã chi - Amber / Orange Theme */}
                        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70 shadow-xs shadow-amber-500/5 hover:shadow-md transition-all">
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-0.5">
                            Đã chi
                          </span>
                          <span className="text-[15px] font-black text-amber-900 block truncate">
                            {fmt(w.currentMonthSpent)}
                          </span>
                        </div>

                        {/* TB 3 Tháng - Blue / Neutral Baseline Theme */}
                        <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200/70 shadow-xs shadow-blue-500/5 hover:shadow-md transition-all">
                          <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block mb-0.5">
                            TB 3 tháng
                          </span>
                          <span className="text-[15px] font-black text-blue-950 block truncate">
                            {fmt(w.avg3MonthSpent)}
                          </span>
                        </div>

                        {/* Dự kiến - Rose / Alert Forecast Theme */}
                        <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/70 shadow-xs shadow-rose-500/5 hover:shadow-md transition-all">
                          <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-0.5">
                            Dự kiến
                          </span>
                          <span className="text-[15px] font-black text-rose-600 block truncate">
                            {fmt(projected)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 3: 💡 GỢI Ý HẠN MỨC CHI TIÊU THÁNG                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "plan" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
            <h3 className="text-base font-black relative z-10">
              💡 Gợi ý Hạn mức Chi tiêu Tháng
            </h3>
            <p className="text-white/90 text-xs relative z-10 mt-0.5">
              Đề xuất mức hạn mức hợp lý cho từng danh mục dựa trên mức chi trung bình 3 tháng gần nhất.
            </p>
          </div>

          {data.budgetPlan.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center shadow-sm border border-gray-100">
              <span className="text-3xl">📭</span>
              <p className="text-gray-500 mt-2 font-medium text-sm">
                Chưa đủ dữ liệu lịch sử để đưa ra gợi ý.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Hãy ghi chép chi tiêu ít nhất 1 tháng.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.budgetPlan.map((bp, idx) => {
                const hasCurrentBudget =
                  bp.currentBudget !== null && bp.currentBudget !== undefined;
                const isCurrentLower =
                  hasCurrentBudget && bp.currentBudget! < bp.suggestedAmount;
                const isCurrentHigher =
                  hasCurrentBudget && bp.currentBudget! > bp.suggestedAmount;

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-sm space-y-3 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50/60 flex items-center justify-center text-xl shadow-sm border border-blue-100/50">
                          {bp.categoryIcon || "📋"}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-gray-800">
                            {bp.categoryName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Thường chi:{" "}
                            <span className="font-semibold text-gray-600">
                              {fmt(bp.avgSpent3Months)}/tháng
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
                          Gợi ý hạn mức
                        </span>
                        <span className="text-[16px] font-black text-blue-600">
                          {fmt(bp.suggestedAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      {hasCurrentBudget ? (
                        <span
                          className={`font-bold px-2.5 py-1 rounded-lg ${
                            isCurrentLower
                              ? "bg-amber-100 text-amber-700"
                              : isCurrentHigher
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isCurrentLower
                            ? `📌 Hạn mức hiện tại (${fmt(bp.currentBudget!)}) thấp hơn thực tế`
                            : isCurrentHigher
                            ? `💡 Hạn mức hiện tại (${fmt(bp.currentBudget!)}) đang cao hơn gợi ý`
                            : `✅ Hạn mức hiện tại (${fmt(bp.currentBudget!)}) phù hợp`}
                        </span>
                      ) : (
                        <span className="font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                          ⚪ Chưa thiết lập hạn mức
                        </span>
                      )}
                    </div>

                    {/* Reasoning & Button */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <p className="text-[11px] text-gray-500 leading-relaxed flex-1">
                        💡 {bp.reasoning}
                      </p>
                      <button
                        disabled={applyingCategory === bp.categoryName}
                        onClick={() => handleApplyBudget(bp)}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[12px] font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1"
                        title={`Đặt hạn mức ${fmt(bp.suggestedAmount)} cho Tháng ${selectedMonth}/${selectedYear}`}
                      >
                        {applyingCategory === bp.categoryName ? "..." : "Đặt hạn mức 🎯"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
