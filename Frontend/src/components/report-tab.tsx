"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className = "w-7 h-7 text-emerald-600", style }: { name?: string, className?: string, style?: React.CSSProperties }) {
  if (!name) return <span className="text-3xl" style={style}>💰</span>;
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Receipt;
  return <IconComponent className={className} style={style} />;
}

/* ─── Types ─── */
interface MonthData {
  label: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
  debtPayment: number;
}

interface MonthlySummary {
  months: MonthData[];
  currentMonth: { totalIncome: number; totalExpense: number; topCategory: string };
  comparison: { expenseChange: number; expenseChangePercent: number };
}

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  totalAmount: number;
  percentage: number;
}

interface BudgetSummary {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  limitAmount: number;
  spentAmount: number;
  percentage: number;
  status: "OK" | "WARNING" | "OVER";
}

interface ReportTabProps {
  onBack?: () => void;
}

/* ─── Helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));

const CHART_COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#C77DFF", "#FF9F43", "#00C9A7", "#FF6B9D",
];

/* ─── SVG Line Chart ─── */
function LineChart({ months, type }: { months: MonthData[]; type: "expense" | "income" }) {
  if (months.length === 0) return null;

  const W = 320, H = 140, PAD_LEFT = 48, PAD_RIGHT = 16, PAD_TOP = 16, PAD_BOTTOM = 32;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const incomes  = months.map(m => Number(m.income)  || 0);
  const expenses = months.map(m => Number(m.expense) || 0);
  const nets     = months.map(m => Number(m.net)     || 0);
  const debts    = months.map(m => Number(m.debtPayment) || 0);

  const isExpense = type === "expense";

  const allVals = isExpense
    ? [...expenses, ...debts]
    : [...incomes, ...nets.filter(v => v > 0)];

  const maxVal  = Math.max(...allVals, 1);
  const minVal  = isExpense ? 0 : Math.min(...nets.filter(v => v < 0), 0);
  const range   = maxVal - minVal || 1;

  const xOf = (i: number) => PAD_LEFT + (i / (months.length - 1)) * chartW;
  const yOf = (v: number) => PAD_TOP + chartH - ((v - minVal) / range) * chartH;

  const polyline = (vals: number[]) =>
    vals.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");

  const [hovered, setHovered] = useState<number | null>(null);

  const yLabels = [maxVal, maxVal / 2, 0].map(v => ({
    v,
    y: yOf(v),
    label: v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : "0",
  }));

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 260 }}>
        {/* Grid lines */}
        {yLabels.map(({ y, label }, i) => (
          <g key={i}>
            <line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 3" />
            <text x={PAD_LEFT - 4} y={y + 4} textAnchor="end"
              fontSize={8} fill="#94a3b8" fontFamily="sans-serif">{label}</text>
          </g>
        ))}

        {/* Zero line if net goes negative */}
        {!isExpense && minVal < 0 && (
          <line x1={PAD_LEFT} y1={yOf(0)} x2={W - PAD_RIGHT} y2={yOf(0)}
            stroke="#cbd5e1" strokeWidth={1} />
        )}

        {/* Income lines */}
        {!isExpense && (
          <>
            {/* Income line */}
            <polyline points={polyline(incomes)} fill="none"
              stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* Net line */}
            <polyline points={polyline(nets)} fill="none"
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3"
              strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* Expense lines */}
        {isExpense && (
          <>
            {/* Expense line */}
            <polyline points={polyline(expenses)} fill="none"
              stroke="#f43f5e" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* Debt line */}
            <polyline points={polyline(debts)} fill="none"
              stroke="#a855f7" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* Dots & hover targets */}
        {months.map((m, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}>
            <rect x={xOf(i) - 14} y={PAD_TOP} width={28} height={chartH} fill="transparent" />
            
            {/* Dots for Income tab */}
            {!isExpense && (
              <>
                {/* Income dot */}
                <circle cx={xOf(i)} cy={yOf(incomes[i])} r={hovered === i ? 4 : 2.5}
                  fill="#10b981" stroke="#fff" strokeWidth={1.5} style={{ transition: "r 0.15s" }} />
                {/* Net dot */}
                <circle cx={xOf(i)} cy={yOf(nets[i])} r={hovered === i ? 4 : 2.5}
                  fill="#f59e0b" stroke="#fff" strokeWidth={1.5} style={{ transition: "r 0.15s" }} />
              </>
            )}

            {/* Dots for Expense tab */}
            {isExpense && (
              <>
                {/* Expense dot */}
                <circle cx={xOf(i)} cy={yOf(expenses[i])} r={hovered === i ? 4 : 2.5}
                  fill="#f43f5e" stroke="#fff" strokeWidth={1.5} style={{ transition: "r 0.15s" }} />
                {/* Debt dot */}
                <circle cx={xOf(i)} cy={yOf(debts[i])} r={hovered === i ? 4 : 2.5}
                  fill="#a855f7" stroke="#fff" strokeWidth={1.5} style={{ transition: "r 0.15s" }} />
              </>
            )}

            {/* Hover tooltip */}
            {hovered === i && (
              <g>
                <rect x={xOf(i) - 44} y={PAD_TOP - 2} width={88} height={isExpense && debts[i] > 0 ? 34 : 24}
                  rx={6} fill="#1e293b" opacity={0.92} />
                
                {!isExpense && (
                  <>
                    <text x={xOf(i)} y={PAD_TOP + 11} textAnchor="middle"
                      fontSize={7.5} fill="#10b981" fontFamily="sans-serif">
                      Thu: +{fmt(incomes[i])}đ
                    </text>
                    <text x={xOf(i)} y={PAD_TOP + 20} textAnchor="middle"
                      fontSize={7.5} fill="#f59e0b" fontFamily="sans-serif">
                      T.Kiệm: {nets[i] >= 0 ? "+" : ""}{fmt(nets[i])}đ
                    </text>
                  </>
                )}

                {isExpense && (
                  <>
                    <text x={xOf(i)} y={PAD_TOP + 11} textAnchor="middle"
                      fontSize={7.5} fill="#f43f5e" fontFamily="sans-serif">
                      Chi: -{fmt(expenses[i])}đ
                    </text>
                    {debts[i] > 0 ? (
                      <text x={xOf(i)} y={PAD_TOP + 22} textAnchor="middle"
                        fontSize={7.5} fill="#a855f7" fontFamily="sans-serif">
                        Nợ: -{fmt(debts[i])}đ
                      </text>
                    ) : (
                      <text x={xOf(i)} y={PAD_TOP + 20} textAnchor="middle"
                        fontSize={7.5} fill="#94a3b8" fontFamily="sans-serif">
                        Nợ: 0đ
                      </text>
                    )}
                  </>
                )}
              </g>
            )}

            {/* X-axis label */}
            <text x={xOf(i)} y={H - 4} textAnchor="middle"
              fontSize={8} fill="#64748b" fontFamily="sans-serif">{m.label}</text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 justify-center">
        {(!isExpense
          ? [
              { color: "#10b981", label: "Thu nhập" },
              { color: "#f59e0b", label: "Tiết kiệm", dashed: true },
            ]
          : [
              { color: "#f43f5e", label: "Chi tiêu" },
              { color: "#a855f7", label: "Trả nợ" },
            ]
        ).map(({ color, label, dashed }) => (
          <div key={label} className="flex items-center gap-1">
            <svg width={20} height={8}>
              <line x1={0} y1={4} x2={20} y2={4} stroke={color} strokeWidth={2}
                strokeDasharray={dashed ? "4 2" : undefined} />
            </svg>
            <span className="text-[10px] text-slate-500 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Category List Item ─── */
function CategoryItem({
  item,
  color,
  budgetLimit,
}: {
  item: CategoryBreakdown;
  color: string;
  budgetLimit?: number;
}) {
  const amount   = Number(item.totalAmount) || 0;
  const limit    = budgetLimit ?? 0;
  const overBudget = limit > 0 && amount > limit;
  const remaining  = limit > 0 ? limit - amount : 0;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      {/* Icon */}
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: color + "22" }}>
        <DynamicIcon name={item.categoryIcon} className="w-5 h-5" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[13px] font-bold text-slate-800 truncate">{item.categoryName}</span>
          <span className="text-[13px] font-extrabold text-slate-800 ml-2 shrink-0">
            {fmt(amount)}đ
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${item.percentage}%`, background: color }}
          />
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">{item.percentage}% tổng chi</span>
          {limit > 0 ? (
            overBudget ? (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                🔴 Vượt {fmt(Math.abs(remaining))}đ
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Còn {fmt(remaining)}đ
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function ReportTab({ onBack }: ReportTabProps) {
  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [summary,       setSummary]       = useState<MonthlySummary | null>(null);
  const [expBreakdown,  setExpBreakdown]  = useState<CategoryBreakdown[]>([]);
  const [incBreakdown,  setIncBreakdown]  = useState<CategoryBreakdown[]>([]);
  const [budgets,       setBudgets]       = useState<BudgetSummary[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [activeTab,     setActiveTab]     = useState<"expense" | "income">("expense");
  const [showDetail,    setShowDetail]    = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [debtSummary,   setDebtSummary]   = useState({ totalOwed: 0, totalOwing: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("budgetPriority");
      if (saved) {
        try {
          setPriorityOrder(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse budget priority", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setShowDetail(false);
      try {
        const [summaryRes, expRes, budgetRes, incRes, debtRes] = await Promise.all([
          api.get(`/transactions/summary/monthly?year=${selectedYear}&month=${selectedMonth}`),
          api.get(`/transactions/summary/category?year=${selectedYear}&month=${selectedMonth}`),
          api.get(`/budgets/summary?year=${selectedYear}&month=${selectedMonth}`),
          api.get(`/transactions/summary/income-category?year=${selectedYear}&month=${selectedMonth}`),
          api.get("/groups/debts/summary").catch(() => ({ data: { totalOwing: 0, totalOwed: 0 } }))
        ]);
        setSummary(summaryRes.data);
        setDebtSummary(debtRes.data);
        setExpBreakdown(expRes.data || []);
        const rawBudgets = budgetRes.data || [];
        const groupedBudgetsMap = new Map();
        rawBudgets.forEach((b: any) => {
          const cid = b.categoryId;
          if (!groupedBudgetsMap.has(cid)) {
            groupedBudgetsMap.set(cid, { 
              ...b, 
              flexibleSpent: b.type === 'FLEXIBLE' ? Number(b.spentAmount || 0) : 0, 
              billSpent: b.type === 'BILL' ? Number(b.spentAmount || 0) : 0 
            });
          } else {
            const existing = groupedBudgetsMap.get(cid);
            existing.limitAmount = Number(existing.limitAmount || 0) + Number(b.limitAmount || 0);
            existing.rolloverAmount = Number(existing.rolloverAmount || 0) + Number(b.rolloverAmount || 0);
            if (b.type === 'FLEXIBLE') {
               existing.flexibleSpent = Number(b.spentAmount || 0);
            } else if (b.type === 'BILL') {
               existing.billSpent += Number(b.spentAmount || 0);
            }
          }
        });
        const groupedBudgets = Array.from(groupedBudgetsMap.values()).map(b => {
           b.spentAmount = b.flexibleSpent + b.billSpent;
           return b;
        });
        
        setBudgets(groupedBudgets);
        setIncBreakdown(incRes.data || []);
      } catch (err) {
        console.error("Failed to fetch report data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedMonth]);

  const changeMonth = (offset: number) => {
    let m = selectedMonth + offset;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    else if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  /* Donut chart */
  const activeBreakdown = activeTab === "expense" ? expBreakdown : incBreakdown;
  const generateDonut = () => {
    if (activeBreakdown.length === 0) return "conic-gradient(#f1f5f9 0deg 360deg)";
    let deg = 0;
    return `conic-gradient(${activeBreakdown.map((b, i) => {
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const start = deg;
      const end   = deg + (b.percentage * 3.6);
      deg = end;
      return `${color} ${start}deg ${end}deg`;
    }).join(", ")})`;
  };

  /* Budget map for quick lookup */
  const budgetByCategory = new Map(budgets.map(b => [b.categoryId.toString(), b.limitAmount]));

  const totalExpense = Number(summary?.currentMonth?.totalExpense) || 0;
  const totalIncome  = Number(summary?.currentMonth?.totalIncome)  || 0;

  const sortedBudgets = [...budgets].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.budgetId);
    const idxB = priorityOrder.indexOf(b.budgetId);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const activeBudgets = sortedBudgets.filter(b => Number(b.spentAmount) > 0);

  // Group debt calculations
  const groupDebtPaid = expBreakdown.find(c => c.categoryName === "Trả nợ nhóm")?.totalAmount || 0;
  const currentDebt = debtSummary?.totalOwing || 0;
  const totalDebtToPay = groupDebtPaid + currentDebt;
  const debtPct = totalDebtToPay > 0 ? Math.round((groupDebtPaid / totalDebtToPay) * 100) : 0;
  const showDebtItem = totalDebtToPay > 0;

  return (
    <main className="w-full pb-28 bg-[#fdfafb] min-h-dvh">

      {/* ─── HEADER ─── */}
      <div className="bg-white px-5 pt-4 pb-5 rounded-b-[2rem] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.06)]">
        <div className="flex justify-center items-center mb-5">
          <h1 className="text-xl font-extrabold text-slate-800 text-center w-full">Báo cáo tài chính</h1>
        </div>

        {/* Month picker */}
        <div className="flex justify-between items-center bg-slate-50 rounded-full p-1 border border-slate-100">
          <button onClick={() => changeMonth(-1)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-extrabold text-slate-700">Tháng {selectedMonth}/{selectedYear}</span>
          <button onClick={() => changeMonth(1)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">

        {/* ─── SUMMARY CARDS ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Đã Thu */}
          <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">💵 Đã thu (Thực tế)</p>
            <p className="text-[17px] font-black text-emerald-500">{fmt(totalIncome)}đ</p>
          </div>
          {/* Đã Chi */}
          <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">💸 Đã chi (Thực tế)</p>
            <p className="text-[17px] font-black text-rose-500">{fmt(totalExpense)}đ</p>
          </div>
          {/* Tổng Thu */}
          <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">📥 Tổng thu (Cần thu)</p>
            <p className="text-[17px] font-black text-blue-500">{fmt(totalIncome + (debtSummary?.totalOwed || 0))}đ</p>
          </div>
          {/* Tổng Chi */}
          <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">📤 Tổng chi (Cần trả)</p>
            <p className="text-[17px] font-black text-amber-500">{fmt(totalExpense + (debtSummary?.totalOwing || 0))}đ</p>
          </div>
          <div className="col-span-2 bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 font-semibold mb-1">💰 Tiết kiệm tháng này</p>
                <p className={`text-[17px] font-black ${totalIncome - totalExpense >= 0 ? "text-slate-800" : "text-rose-500"}`}>
                  {totalIncome - totalExpense >= 0 ? "+" : ""}{fmt(totalIncome - totalExpense)}đ
                </p>
              </div>
              {summary?.comparison && (
                <div className={`text-right text-[11px] font-bold px-3 py-1.5 rounded-full ${
                  (summary.comparison.expenseChange || 0) > 0
                    ? "bg-rose-50 text-rose-500"
                    : "bg-emerald-50 text-emerald-600"
                }`}>
                  {(summary.comparison.expenseChange || 0) > 0 ? "📈" : "📉"} Chi{" "}
                  {(summary.comparison.expenseChange || 0) > 0 ? "tăng" : "giảm"}{" "}
                  {Math.abs(summary.comparison.expenseChangePercent || 0)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── UNIFIED FINANCIAL STRUCTURE & TREND BLOCK ─── */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-6">
          {/* Part A: Donut + Category Breakdown */}
          <div>
            <h2 className="text-[15px] font-extrabold text-slate-800 mb-4">Cơ cấu tài chính</h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setActiveTab("expense")}
                className={`flex-1 py-2 rounded-2xl text-[12px] font-bold transition-all ${
                  activeTab === "expense"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500"
                }`}>
                Chi tiêu
              </button>
              <button
                onClick={() => setActiveTab("income")}
                className={`flex-1 py-2 rounded-2xl text-[12px] font-bold transition-all ${
                  activeTab === "income"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500"
                }`}>
                Thu nhập
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin" />
              </div>
            ) : activeBreakdown.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-3xl mb-2 block">📭</span>
                <p className="text-slate-400 text-sm font-medium">Không có dữ liệu tháng này</p>
              </div>
            ) : (
              <>
                {/* Donut */}
                <div className="flex items-center gap-5 mb-5">
                  <div className="relative shrink-0">
                    <div
                      className="w-32 h-32 rounded-full"
                      style={{ background: generateDonut() }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <span className="text-2xl">{activeTab === "expense" ? "💸" : "💵"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Top 4 legend */}
                  <div className="flex-1 space-y-1.5">
                    {activeBreakdown.slice(0, 4).map((item, i) => (
                      <div key={item.categoryId} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[11px] text-slate-600 font-medium truncate flex-1">{item.categoryName}</span>
                        <span className="text-[11px] font-bold text-slate-700 shrink-0">{item.percentage}%</span>
                      </div>
                    ))}
                    {activeBreakdown.length > 4 && (
                      <p className="text-[10px] text-slate-400 font-medium">
                        +{activeBreakdown.length - 4} danh mục khác
                      </p>
                    )}
                  </div>
                </div>

                {/* Category detail accordion */}
                <button
                  onClick={() => setShowDetail(v => !v)}
                  className="w-full flex justify-between items-center py-3 border-t border-slate-100 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                  <span>Chi tiết từng danh mục ({activeBreakdown.length})</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${showDetail ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDetail && (
                  <div className="mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {activeBreakdown.map((item, i) => (
                      <CategoryItem
                        key={item.categoryId}
                        item={item}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                        budgetLimit={activeTab === "expense"
                          ? Number(budgetByCategory.get(item.categoryId?.toString())) || 0
                          : 0}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Part B: Line Chart (6-Month Trend) */}
          {summary && summary.months && summary.months.length > 1 && (
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-extrabold text-slate-800">Xu hướng 6 tháng</h2>
                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">
                  {summary.months[0]?.label} → {summary.months[summary.months.length - 1]?.label}
                </span>
              </div>
              <LineChart months={summary.months} type={activeTab} />
            </div>
          )}
        </div>

        {/* ─── BUDGET SUMMARY ─── */}
        {(activeBudgets.length > 0 || showDebtItem) && (
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-extrabold text-slate-800 mb-4">Tổng kết ngân sách</h2>
            <div className="space-y-3">
              {activeBudgets.map(b => {
                const pct = Math.min(100, Math.round((Number(b.spentAmount) / Number(b.limitAmount)) * 100));
                const isOver = Number(b.spentAmount) > Number(b.limitAmount);
                const barColor = isOver ? "#f43f5e" : pct >= 80 ? "#f59e0b" : "#10b981";
                return (
                  <div key={b.budgetId}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={b.categoryIcon} className="w-5 h-5 text-slate-500" />
                        <span className="text-[13px] font-bold text-slate-700">{b.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] font-bold text-slate-800">
                          {fmt(Number(b.spentAmount))}đ
                        </span>
                        <span className="text-[10px] text-slate-400"> / {fmt(Number(b.limitAmount))}đ</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">{pct}% đã dùng</span>
                      {isOver
                        ? <span className="text-[10px] font-bold text-rose-500">Vượt {fmt(Number(b.spentAmount) - Number(b.limitAmount))}đ</span>
                        : <span className="text-[10px] text-slate-400">Còn {fmt(Number(b.limitAmount) - Number(b.spentAmount))}đ</span>
                      }
                    </div>
                  </div>
                );
              })}

              {showDebtItem && (
                <div>
                  <div className="flex justify-between items-center mb-1.5 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <DynamicIcon name="Users" className="w-5 h-5 text-rose-500" />
                      <span className="text-[13px] font-bold text-slate-700">Thanh toán nợ nhóm</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-bold text-slate-800">
                        {fmt(groupDebtPaid)}đ
                      </span>
                      <span className="text-[10px] text-slate-400"> / {fmt(totalDebtToPay)}đ (Tổng nợ)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${currentDebt > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${debtPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">
                      {debtPct}% đã thanh toán
                    </span>
                    <span className={`text-[10px] font-bold ${currentDebt > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {currentDebt > 0 ? `Còn nợ ${fmt(currentDebt)}đ` : 'Đã thanh toán hết'}
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
