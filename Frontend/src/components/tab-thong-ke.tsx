"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import * as LucideIcons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function DynamicIcon({
  name,
  className = "w-7 h-7 text-emerald-600",
  style,
}: {
  name?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!name)
    return (
      <span className="text-3xl" style={style}>
        💰
      </span>
    );
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
  categoryExpenses?: Record<string, number>;
  categoryIncomes?: Record<string, number>;
}

interface MonthlySummary {
  months: MonthData[];
  currentMonth: {
    totalIncome: number;
    totalExpense: number;
    topCategory: string;
  };
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
  refreshTrigger?: number;
}

/* ─── Helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
const fmtCompact = (n: number) => {
  const val = Math.round(Number(n) || 0);
  if (val >= 10_000_000) {
    const tr = (val / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${tr}tr+`;
  }
  return fmt(val) + "đ";
};

const CHART_COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#C77DFF",
  "#FF9F43",
  "#00C9A7",
  "#FF6B9D",
];

/* ─── SVG Line Chart ─── */
function LineChart({
  months,
  type,
  categories,
}: {
  months: MonthData[];
  type: "expense" | "income";
  categories: CategoryBreakdown[];
}) {
  if (months.length === 0) return null;

  const W = 320,
    H = 140,
    PAD_LEFT = 48,
    PAD_RIGHT = 16,
    PAD_TOP = 16,
    PAD_BOTTOM = 32;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const isExpense = type === "expense";

  const incomes = months.map((m) => Number(m.income) || 0);
  const expenses = months.map((m) => Number(m.expense) || 0);
  const nets = months.map((m) => Number(m.net) || 0);
  const debts = months.map((m) => Number(m.debtPayment) || 0);

  const catTotals = new Map<string, number>();
  months.forEach((m) => {
    const map = isExpense ? m.categoryExpenses : m.categoryIncomes;
    if (map) {
      Object.entries(map).forEach(([name, val]) => {
        catTotals.set(name, (catTotals.get(name) || 0) + Number(val));
      });
    }
  });
  const topCatNames = Array.from(catTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((e) => e[0]);

  const categoryLines = topCatNames.map((catName, i) => {
    const vals = months.map((m) => {
      const map = isExpense ? m.categoryExpenses : m.categoryIncomes;
      return map && map[catName] ? Number(map[catName]) : 0;
    });
    return {
      name: catName,
      color: CHART_COLORS[i % CHART_COLORS.length],
      vals,
    };
  });

  const allVals: number[] = [];
  if (isExpense) {
    categoryLines.forEach((cl) => allVals.push(...cl.vals));
    allVals.push(...debts);
  } else {
    categoryLines.forEach((cl) => allVals.push(...cl.vals));
    allVals.push(...nets.filter((v) => v > 0));
  }

  const maxVal = Math.max(...allVals, 1);
  const minVal = isExpense ? 0 : Math.min(...nets.filter((v) => v < 0), 0);
  const range = maxVal - minVal || 1;

  const xOf = (i: number) => PAD_LEFT + (i / (months.length - 1)) * chartW;
  const yOf = (v: number) => PAD_TOP + chartH - ((v - minVal) / range) * chartH;

  const getLastDataIndex = (vals: number[]) => {
    let idx = vals.length - 1;
    while (idx >= 0 && vals[idx] === 0) idx--;
    return idx;
  };

  const polyline = (vals: number[]) => {
    const lastIdx = getLastDataIndex(vals);
    if (lastIdx === -1) return "";
    return vals
      .slice(0, lastIdx + 1)
      .map((v, i) => `${xOf(i)},${yOf(v)}`)
      .join(" ");
  };

  const [hovered, setHovered] = useState<number | null>(null);

  const yLabels = [maxVal, maxVal / 2, 0].map((v) => ({
    v,
    y: yOf(v),
    label:
      v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(0)}M`
        : v >= 1_000
          ? `${(v / 1_000).toFixed(0)}K`
          : "0",
  }));

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 260 }}
      >
        {/* Grid lines */}
        {yLabels.map(({ y, label }, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={W - PAD_RIGHT}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={PAD_LEFT - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={8}
              fill="#94a3b8"
              fontFamily="sans-serif"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Zero line if net goes negative */}
        {!isExpense && minVal < 0 && (
          <line
            x1={PAD_LEFT}
            y1={yOf(0)}
            x2={W - PAD_RIGHT}
            y2={yOf(0)}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        )}

        {/* Category lines */}
        {categoryLines.map((cl) => (
          <polyline
            key={cl.name}
            points={polyline(cl.vals)}
            fill="none"
            stroke={cl.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Debt / Net lines */}
        {!isExpense && (
          <polyline
            points={polyline(nets)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {isExpense && (
          <polyline
            points={polyline(debts)}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots & hover targets */}
        {months.map((m, i) => {
          const hasAnyData =
             categoryLines.some(cl => i <= getLastDataIndex(cl.vals)) ||
             (!isExpense && i <= getLastDataIndex(nets)) ||
             (isExpense && i <= getLastDataIndex(debts));

          return (
          <g
            key={i}
            onMouseEnter={() => hasAnyData && setHovered(i)}
            onMouseLeave={() => hasAnyData && setHovered(null)}
            style={{ cursor: hasAnyData ? "pointer" : "default" }}
          >
            {hasAnyData && (
              <rect
                x={xOf(i) - 14}
                y={PAD_TOP}
                width={28}
                height={chartH}
                fill="transparent"
              />
            )}

            {/* Category dots */}
            {categoryLines.map((cl) => {
              if (i > getLastDataIndex(cl.vals)) return null;
              return (
                <circle
                  key={cl.name}
                  cx={xOf(i)}
                  cy={yOf(cl.vals[i])}
                  r={hovered === i ? 4 : 2.5}
                  fill={cl.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ transition: "r 0.15s" }}
                />
              );
            })}

            {/* Net / Debt dots */}
            {!isExpense && i <= getLastDataIndex(nets) && (
              <circle
                cx={xOf(i)}
                cy={yOf(nets[i])}
                r={hovered === i ? 4 : 2.5}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={1.5}
                style={{ transition: "r 0.15s" }}
              />
            )}
            {isExpense && i <= getLastDataIndex(debts) && (
              <circle
                cx={xOf(i)}
                cy={yOf(debts[i])}
                r={hovered === i ? 4 : 2.5}
                fill="#a855f7"
                stroke="#fff"
                strokeWidth={1.5}
                style={{ transition: "r 0.15s" }}
              />
            )}

            {/* Hover tooltip */}
            {hasAnyData && hovered === i &&
              (() => {
                const activeCats = categoryLines.filter((cl) => i <= getLastDataIndex(cl.vals) && cl.vals[i] > 0);
                const showDebt = isExpense && i <= getLastDataIndex(debts) && debts[i] > 0;
                const tooltipH =
                  (activeCats.length + (isExpense ? (showDebt ? 1 : 0) : 1)) *
                    13 +
                  10;
                const ttW = 100;
                let ttX = xOf(i) - ttW / 2;
                if (ttX < 0) ttX = 0;
                if (ttX + ttW > W) ttX = W - ttW;
                const ttY = Math.max(
                  0,
                  Math.min(PAD_TOP - 2, H - tooltipH - 10),
                );

                return (
                  <g>
                    <rect
                      x={ttX}
                      y={ttY}
                      width={ttW}
                      height={tooltipH}
                      rx={6}
                      fill="#1e293b"
                      opacity={0.92}
                    />

                    {activeCats.map((cl, idx) => (
                      <text
                        key={cl.name}
                        x={ttX + ttW / 2}
                        y={ttY + 14 + idx * 13}
                        textAnchor="middle"
                        fontSize={8}
                        fill={cl.color}
                        fontFamily="sans-serif"
                        fontWeight="bold"
                      >
                        {cl.name}: {isExpense ? "-" : "+"}
                        {fmt(cl.vals[i])}đ
                      </text>
                    ))}

                    {!isExpense && (
                      <text
                        x={ttX + ttW / 2}
                        y={ttY + 14 + activeCats.length * 13}
                        textAnchor="middle"
                        fontSize={8}
                        fill="#f59e0b"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                      >
                        T.Kiệm: {nets[i] >= 0 ? "+" : ""}
                        {fmt(nets[i])}đ
                      </text>
                    )}

                    {showDebt && (
                      <text
                        x={ttX + ttW / 2}
                        y={ttY + 14 + activeCats.length * 13}
                        textAnchor="middle"
                        fontSize={8}
                        fill="#a855f7"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                      >
                        Nợ: -{fmt(debts[i])}đ
                      </text>
                    )}
                  </g>
                );
              })()}

            {/* X-axis label */}
            <text
              x={xOf(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize={8}
              fill="#64748b"
              fontFamily="sans-serif"
            >
              {m.label}
            </text>
          </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 justify-center px-4">
        {categoryLines.map((cl) => (
          <div key={cl.name} className="flex items-center gap-1">
            <svg width={16} height={8}>
              <line
                x1={0}
                y1={4}
                x2={16}
                y2={4}
                stroke={cl.color}
                strokeWidth={2}
              />
            </svg>
            <span className="text-[10px] text-slate-500 font-medium">
              {cl.name}
            </span>
          </div>
        ))}
        {!isExpense ? (
          <div className="flex items-center gap-1">
            <svg width={16} height={8}>
              <line
                x1={0}
                y1={4}
                x2={16}
                y2={4}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            </svg>
            <span className="text-[10px] text-slate-500 font-medium">
              Tiết kiệm
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <svg width={16} height={8}>
              <line
                x1={0}
                y1={4}
                x2={16}
                y2={4}
                stroke="#a855f7"
                strokeWidth={2}
              />
            </svg>
            <span className="text-[10px] text-slate-500 font-medium">
              Trả nợ
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Category List Item ─── */
function CategoryItem({
  item,
  color,
  budgetLimit,
  onClick,
  isIncome,
}: {
  item: CategoryBreakdown;
  color: string;
  budgetLimit?: number;
  onClick?: () => void;
  isIncome?: boolean;
}) {
  const amount = Number(item.totalAmount) || 0;
  const limit = budgetLimit ?? 0;
  const overBudget = limit > 0 && amount > limit;
  const remaining = limit > 0 ? limit - amount : 0;

  return (
    <div 
      className={`flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 ${onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-xl' : ''}`}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: color + "22" }}
      >
        <DynamicIcon
          name={item.categoryIcon}
          className="w-5 h-5"
          style={{ color }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[13px] font-bold text-slate-800 truncate">
            {item.categoryName}
          </span>
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
          <span className="text-[10px] text-slate-400 font-medium">
            {item.percentage}% tổng {isIncome ? "thu" : "chi"}
          </span>
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

/* ─── Helpers: 50/30/20 Grouping ─── */
const NEEDS_KEYWORDS = ["tiền nhà", "thuê nhà", "tiền điện", "điện nước", "y tế", "đi lại", "phí liên lạc", "internet", "học phí", "trả góp"];
const SAVINGS_KEYWORDS = ["mục tiêu tiết kiệm", "hoàn tiền tiết kiệm"];

function categorizeExpenseGroup(categoryName: string): "NEEDS" | "WANTS" | "SAVINGS" {
  const lower = categoryName.toLowerCase();
  if (SAVINGS_KEYWORDS.some(k => lower.includes(k))) return "SAVINGS";
  if (NEEDS_KEYWORDS.some(k => lower.includes(k))) return "NEEDS";
  return "WANTS";
}

function isSavingsCategory(tx: any): boolean {
  const catName = (tx.category?.name || tx.note || "").toLowerCase();
  return SAVINGS_KEYWORDS.some(k => catName.includes(k));
}

/* ─── Main Component ─── */
export function ReportTab({ onBack, refreshTrigger = 0 }: ReportTabProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [expBreakdown, setExpBreakdown] = useState<CategoryBreakdown[]>([]);
  const [incBreakdown, setIncBreakdown] = useState<CategoryBreakdown[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [showDetail, setShowDetail] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [debtSummary, setDebtSummary] = useState({
    totalOwed: 0,
    totalOwing: 0,
    details: [] as any[],
  });

  type DetailType = "actual_income" | "actual_expense" | "total_income" | "total_expense" | "savings" | null;
  const [selectedDetailType, setSelectedDetailType] = useState<DetailType>(null);
  const [selectedCategoryHist, setSelectedCategoryHist] = useState<CategoryBreakdown | null>(null);
  const [selectedGroupDebt, setSelectedGroupDebt] = useState<{ groupId: string; groupName: string; counterpartyName: string; type: "OWING" | "OWED"; amount: number } | null>(null);
  const [catTransactions, setCatTransactions] = useState<any[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<any[]>([]);
  const [isLoadingCategoryHist, setIsLoadingCategoryHist] = useState(false);
  const [isLoadingGroupExpenses, setIsLoadingGroupExpenses] = useState(false);
  const [showAllBudgets, setShowAllBudgets] = useState(false);
  const [showAllDebts, setShowAllDebts] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const handleDebtClick = async (groupId: string, groupName: string, counterpartyName: string, type: "OWING" | "OWED", amount: number) => {
    setSelectedGroupDebt({ groupId, groupName, counterpartyName, type, amount });
    setIsLoadingGroupExpenses(true);
    try {
      const res = await api.get(`/groups/${groupId}/expenses?page=0&size=20`);
      setGroupExpenses(res.data.content || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGroupExpenses(false);
    }
  };

  const handleCategoryClick = async (item: CategoryBreakdown) => {
    setSelectedCategoryHist(item);
    setIsLoadingCategoryHist(true);
    try {
      const res = await api.get(`/transactions/monthly?year=${selectedYear}&month=${selectedMonth}`);
      setCatTransactions(res.data.filter((t: any) => t.category?.id === item.categoryId));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCategoryHist(false);
    }
  };

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
        const [summaryRes, expRes, budgetRes, incRes, debtRes] =
          await Promise.all([
            api.get(
              `/transactions/summary/monthly?year=${selectedYear}&month=${selectedMonth}`,
            ),
            api.get(
              `/transactions/summary/category?year=${selectedYear}&month=${selectedMonth}`,
            ),
            api.get(
              `/budgets/summary?year=${selectedYear}&month=${selectedMonth}`,
            ),
            api.get(
              `/transactions/summary/income-category?year=${selectedYear}&month=${selectedMonth}`,
            ),
            api
              .get("/groups/debts/summary")
              .catch(() => ({ data: { totalOwing: 0, totalOwed: 0 } })),
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
              flexibleSpent:
                b.type === "FLEXIBLE" ? Number(b.spentAmount || 0) : 0,
              billSpent: b.type === "BILL" ? Number(b.spentAmount || 0) : 0,
            });
          } else {
            const existing = groupedBudgetsMap.get(cid);
            existing.limitAmount =
              Number(existing.limitAmount || 0) + Number(b.limitAmount || 0);

            if (b.type === "FLEXIBLE") {
              existing.flexibleSpent = Number(b.spentAmount || 0);
            } else if (b.type === "BILL") {
              existing.billSpent += Number(b.spentAmount || 0);
            }
          }
        });
        const groupedBudgets = Array.from(groupedBudgetsMap.values()).map(
          (b) => {
            b.spentAmount = Math.max(b.flexibleSpent || 0, b.billSpent || 0);
            return b;
          },
        );

        setBudgets(groupedBudgets);
        setIncBreakdown(incRes.data || []);
      } catch (err) {
        console.error("Failed to fetch report data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedMonth, refreshTrigger]);

  const changeMonth = (offset: number) => {
    let m = selectedMonth + offset;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  /* Donut chart */
  const activeBreakdown = activeTab === "expense" ? expBreakdown : incBreakdown;
  const generateDonut = () => {
    if (activeBreakdown.length === 0)
      return "conic-gradient(#f1f5f9 0deg 360deg)";
    let deg = 0;
    return `conic-gradient(${activeBreakdown
      .map((b, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const start = deg;
        const end = deg + b.percentage * 3.6;
        deg = end;
        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ")})`;
  };

  /* Budget map for quick lookup */
  const budgetByCategory = new Map(
    budgets.map((b) => [b.categoryId.toString(), b.limitAmount]),
  );

  const totalExpense = Number(summary?.currentMonth?.totalExpense) || 0;
  const totalIncome = Number(summary?.currentMonth?.totalIncome) || 0;

  const unpaidBudgetsList = budgets.filter(
    (b) => Math.max(0, Number(b.limitAmount || 0) - Number(b.spentAmount || 0)) > 0
  );
  const unpaidBudgetsTotal = unpaidBudgetsList.reduce(
    (sum, b) => sum + Math.max(0, Number(b.limitAmount || 0) - Number(b.spentAmount || 0)),
    0
  );

  const sortedBudgets = [...budgets].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.budgetId);
    const idxB = priorityOrder.indexOf(b.budgetId);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const activeBudgets = sortedBudgets.filter((b) => Number(b.spentAmount) > 0);

  // Group debt calculations
  const groupDebtPaid =
    expBreakdown.find((c) => c.categoryName === "Trả nợ nhóm")?.totalAmount ||
    0;
  const currentDebt = debtSummary?.totalOwing || 0;
  const totalDebtToPay = groupDebtPaid + currentDebt;
  const debtPct =
    totalDebtToPay > 0 ? Math.round((groupDebtPaid / totalDebtToPay) * 100) : 0;
  const showDebtItem = totalDebtToPay > 0;

  return (
    <main className="w-full pb-28 bg-[#fdfafb] min-h-dvh">
      {/* ─── HEADER ─── */}
      <div className="bg-white px-5 pt-4 pb-5 rounded-b-[2rem] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.06)]">
        <div className="flex justify-center items-center mb-5">
          <h1 className="text-xl font-extrabold text-slate-800 text-center w-full">
            Báo cáo tài chính
          </h1>
        </div>

        {/* Month picker */}
        <div className="flex justify-between items-center bg-slate-50 rounded-full p-1 border border-slate-100">
          <button
            onClick={() => changeMonth(-1)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-sm font-extrabold text-slate-700">
            Tháng {selectedMonth}/{selectedYear}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* ─── SUMMARY CARDS ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Đã Thu */}
          <div 
            onClick={() => setSelectedDetailType("actual_income")}
            className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform hover:shadow-md"
          >
            <p className="text-[11px] text-slate-500 font-semibold mb-1">
              💵 Đã thu (Thực tế)
            </p>
            <p className="text-[17px] font-black text-emerald-500">
              {fmt(totalIncome)}đ
            </p>
          </div>
          {/* Đã Chi */}
          <div 
            onClick={() => setSelectedDetailType("actual_expense")}
            className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform hover:shadow-md"
          >
            <p className="text-[11px] text-slate-500 font-semibold mb-1">
              💸 Đã chi (Thực tế)
            </p>
            <p className="text-[17px] font-black text-rose-500">
              {fmt(totalExpense)}đ
            </p>
          </div>
          {/* Tổng Thu */}
          <div 
            onClick={() => setSelectedDetailType("total_income")}
            className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform hover:shadow-md"
          >
            <p className="text-[11px] text-slate-500 font-semibold mb-1">
              📥 Tổng thu (Cần thu)
            </p>
            <p className="text-[17px] font-black text-blue-500">
              {fmt(totalIncome + (debtSummary?.totalOwed || 0))}đ
            </p>
          </div>
          {/* Tổng Chi */}
          <div 
            onClick={() => setSelectedDetailType("total_expense")}
            className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform hover:shadow-md"
          >
            <p className="text-[11px] text-slate-500 font-semibold mb-1">
              📤 Tổng chi (Cần trả)
            </p>
            <p className="text-[17px] font-black text-amber-500">
              {fmt(totalExpense + unpaidBudgetsTotal + (debtSummary?.totalOwing || 0))}đ
            </p>
          </div>
          {/* Dòng tiền ròng & Tình trạng tài chính */}
          <div 
            onClick={() => setSelectedDetailType("savings")}
            className={`col-span-2 rounded-[1.5rem] p-4 shadow-sm border transition-all cursor-pointer active:scale-95 hover:shadow-md ${
              totalIncome - totalExpense >= 0
                ? "bg-emerald-50/40 border-emerald-100/80"
                : "bg-rose-50/40 border-rose-100/80"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-slate-500 font-bold mb-1 flex items-center gap-1">
                  📊 Dòng tiền ròng (Thu - Chi)
                </p>
                <p
                  className={`text-[20px] font-black tracking-tight ${
                    totalIncome - totalExpense >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {totalIncome - totalExpense >= 0 ? "+" : ""}
                  {fmt(totalIncome - totalExpense)}đ
                </p>
              </div>

              {/* Status Badge: Bội chi vs Tích lũy */}
              <div className="text-right">
                {totalIncome - totalExpense < 0 ? (
                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200/80 shadow-2xs inline-block">
                    ⚠️ Bội chi tháng này
                  </span>
                ) : totalIncome > 0 ? (
                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs inline-block">
                    🌱 Giữ được {Math.round(((totalIncome - totalExpense) / totalIncome) * 100)}% thu nhập
                  </span>
                ) : (
                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-600 inline-block">
                    ⚖️ Cân bằng
                  </span>
                )}

                {/* Sub-text: Monthly expense trend comparison */}
                {summary?.comparison && (
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">
                    Chi tiêu{" "}
                    {(summary.comparison.expenseChange || 0) > 0 ? "tăng" : "giảm"}{" "}
                    {Math.abs(summary.comparison.expenseChangePercent || 0)}% so với tháng trước
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── UNIFIED FINANCIAL STRUCTURE & TREND BLOCK ─── */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-6">
          {/* Part A: Donut + Category Breakdown */}
          <div>
            <h2 className="text-[15px] font-extrabold text-slate-800 mb-4">
              Cơ cấu tài chính
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setActiveTab("expense")}
                className={`flex-1 py-2 rounded-2xl text-[12px] font-bold transition-all ${
                  activeTab === "expense"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                Chi tiêu
              </button>
              <button
                onClick={() => setActiveTab("income")}
                className={`flex-1 py-2 rounded-2xl text-[12px] font-bold transition-all ${
                  activeTab === "income"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
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
                <p className="text-slate-400 text-sm font-medium">
                  Không có dữ liệu tháng này
                </p>
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
                        <span className="text-2xl">
                          {activeTab === "expense" ? "💸" : "💵"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top 4 legend */}
                  <div className="flex-1 space-y-1.5">
                    {activeBreakdown.slice(0, 4).map((item, i) => (
                      <div
                        key={item.categoryId}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-[11px] text-slate-600 font-medium truncate flex-1">
                          {item.categoryName}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 shrink-0">
                          {item.percentage}%
                        </span>
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
                  onClick={() => setShowDetail((v) => !v)}
                  className="w-full flex justify-between items-center py-3 border-t border-slate-100 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <span>Chi tiết từng danh mục ({activeBreakdown.length})</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${showDetail ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showDetail && (
                  <div className="mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {activeBreakdown.map((item, i) => (
                      <CategoryItem
                        key={item.categoryId}
                        item={item}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                        isIncome={activeTab === "income"}
                        budgetLimit={
                          activeTab === "expense"
                            ? Number(
                                budgetByCategory.get(
                                  item.categoryId?.toString(),
                                ),
                              ) || 0
                            : 0
                        }
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
                <h2 className="text-[15px] font-extrabold text-slate-800">
                  Xu hướng 6 tháng
                </h2>
                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">
                  {summary.months[0]?.label} →{" "}
                  {summary.months[summary.months.length - 1]?.label}
                </span>
              </div>
              <LineChart
                months={summary.months}
                type={activeTab}
                categories={activeBreakdown}
              />
            </div>
          )}
        </div>


      </div>

      {/* ─── MODAL DETAIL VIEWS ─── */}
      <Dialog open={!!selectedDetailType} onOpenChange={(open) => {
        if (!open) {
          setSelectedDetailType(null);
          setSelectedCategoryHist(null);
          setSelectedGroupDebt(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px] w-[90vw] rounded-3xl p-6 bg-white overflow-hidden max-h-[85vh] flex flex-col">
          <DialogHeader className="mb-4 shrink-0">
            <DialogTitle className="text-xl font-extrabold text-slate-800">
              {selectedGroupDebt
                ? `Chi tiết nợ: ${selectedGroupDebt.groupName}`
                : selectedCategoryHist 
                ? `Lịch sử: ${selectedCategoryHist.categoryName}`
                : selectedDetailType === "actual_income" ? "Chi tiết Đã thu"
                : selectedDetailType === "actual_expense" ? "Chi tiết Đã chi"
                : selectedDetailType === "total_income" ? "Chi tiết Tổng thu"
                : selectedDetailType === "total_expense" ? "Chi tiết Tổng chi dự kiến"
                : "Chi tiết Tiết kiệm"
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
            {/* CHI TIẾT KHOẢN NỢ (GIAO DỊCH NHÓM) */}
            {selectedGroupDebt ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                <button 
                  onClick={() => setSelectedGroupDebt(null)}
                  className="flex items-center text-sm font-bold text-slate-500 mb-4 hover:text-slate-800 transition-colors"
                >
                  <LucideIcons.ArrowLeft className="w-4 h-4 mr-1" />
                  Quay lại danh sách nợ
                </button>
                {isLoadingGroupExpenses ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                  </div>
                ) : groupExpenses.length > 0 ? (
                  <div className="space-y-3 flex-1">
                    {(() => {
                      let remainingAmount = selectedGroupDebt.amount;
                      const filteredExpenses = [];
                      for (const exp of groupExpenses) {
                        if (exp.category === "SETTLEMENT") continue;
                        
                        if (selectedGroupDebt.type === "OWING" && exp.currentUserSplitAmount > 0 && remainingAmount > 0) {
                          filteredExpenses.push(exp);
                          remainingAmount -= exp.currentUserSplitAmount;
                        } else if (selectedGroupDebt.type === "OWED" && remainingAmount > 0 && exp.payer?.name !== selectedGroupDebt.counterpartyName) {
                          filteredExpenses.push(exp);
                          remainingAmount -= (exp.amount / exp.splitCount); 
                        }
                      }
                      
                      return filteredExpenses.length > 0 ? filteredExpenses.map(exp => (
                        <div key={exp.id} className="bg-slate-50/50 rounded-2xl p-3.5 border border-slate-100">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[14px] font-bold text-slate-800 pr-2 flex-1">{exp.title}</p>
                            <span className="text-[14px] font-extrabold text-slate-800 whitespace-nowrap">
                              Tổng: {fmt(exp.amount)}đ
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mb-1.5">
                            {format(new Date(exp.createdAt), "HH:mm - dd/MM/yyyy", { locale: vi })}
                          </p>
                          <div className="flex justify-between items-center">
                            <p className="text-[11px] text-slate-500 font-medium">
                              👤 Người trả: <span className="font-bold text-slate-700">{exp.payer?.name}</span>
                            </p>
                            {exp.currentUserSplitAmount > 0 && (
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap border ${
                                  selectedGroupDebt.type === "OWING"
                                    ? "bg-rose-50 text-rose-600 border-rose-100"
                                    : "bg-blue-50 text-blue-600 border-blue-100"
                                }`}
                              >
                                {selectedGroupDebt.type === "OWING"
                                  ? `Bạn cần trả: ${fmt(exp.currentUserSplitAmount)}đ`
                                  : `Họ cần trả bạn: ${fmt(exp.currentUserSplitAmount)}đ`}
                              </span>
                            )}
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-slate-400 py-8 text-sm font-medium">Không tìm thấy khoản chi nào phù hợp.</p>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8 text-sm font-medium">Chưa có chi tiêu nào trong nhóm này.</p>
                )}

                {/* 5.1: Sticky "Trả nợ ngay" button for OWING debts */}
                {selectedGroupDebt.type === "OWING" && (
                  <div className="mt-4 pt-3 border-t border-slate-100 shrink-0">
                    <button
                      onClick={() => {
                        const url = `/groups?id=${selectedGroupDebt.groupId}`;
                        window.location.href = url;
                      }}
                      className="w-full py-3 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <LucideIcons.CreditCard className="w-4 h-4" />
                      Trả nợ {fmt(selectedGroupDebt.amount)}đ cho {selectedGroupDebt.counterpartyName.split(' ').slice(-1)[0]}
                    </button>
                  </div>
                )}
              </div>
            ) : selectedCategoryHist ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button 
                  onClick={() => setSelectedCategoryHist(null)}
                  className="flex items-center text-sm font-bold text-slate-500 mb-4 hover:text-slate-800 transition-colors"
                >
                  <LucideIcons.ArrowLeft className="w-4 h-4 mr-1" />
                  Quay lại danh sách
                </button>
                {isLoadingCategoryHist ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-rose-500 animate-spin" />
                  </div>
                ) : catTransactions.length > 0 ? (
                  <>
                    {/* 3.2: Summary Header Card */}
                    {(() => {
                      const totalCat = catTransactions.reduce((s: number, tx: any) => s + Number(tx.amount || 0), 0);
                      const count = catTransactions.length;
                      const avg = count > 0 ? totalCat / count : 0;
                      const isSavingsCat = isSavingsCategory(catTransactions[0]);
                      return (
                        <div className={`p-4 rounded-2xl mb-4 ${isSavingsCat ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium mb-0.5">Tổng tháng</p>
                              <p className={`text-[15px] font-black ${isSavingsCat ? 'text-emerald-600' : 'text-slate-800'}`}>{fmt(totalCat)}đ</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium mb-0.5">Số lần</p>
                              <p className="text-[15px] font-black text-slate-800">{count}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium mb-0.5">TB / lần</p>
                              <p className="text-[15px] font-black text-slate-600">{fmt(avg)}đ</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3.3: Daily Aggregation */}
                    {(() => {
                      const grouped = new Map<string, any[]>();
                      catTransactions.forEach((tx: any) => {
                        const dateKey = format(new Date(tx.transactionDate), "yyyy-MM-dd");
                        if (!grouped.has(dateKey)) grouped.set(dateKey, []);
                        grouped.get(dateKey)!.push(tx);
                      });

                      return Array.from(grouped.entries()).map(([dateKey, txs]) => {
                        const dayTotal = txs.reduce((s: number, tx: any) => s + Number(tx.amount || 0), 0);
                        const dayLabel = format(new Date(dateKey), "dd/MM/yyyy (EEEE)", { locale: vi });
                        const isSavingsCat = isSavingsCategory(txs[0]);

                        return (
                          <div key={dateKey} className="mb-3">
                            {/* Day header */}
                            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <LucideIcons.Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[12px] font-bold text-slate-600">{dayLabel}</span>
                              </div>
                              <span className={`text-[12px] font-extrabold ${isSavingsCat ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {isSavingsCat ? '+' : txs[0]?.type === 'INCOME' ? '+' : '-'}{fmt(dayTotal)}đ
                                {txs.length > 1 && <span className="text-slate-400 font-medium ml-1">({txs.length})</span>}
                              </span>
                            </div>
                            {/* Transactions */}
                            <div className="space-y-0 pl-1">
                              {txs.map((tx: any) => (
                                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-slate-50/80 last:border-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-slate-700 truncate">{tx.note || tx.category?.name || "Giao dịch"}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {format(new Date(tx.transactionDate), "HH:mm", { locale: vi })}
                                    </p>
                                  </div>
                                  <span className={`text-[14px] font-extrabold ml-3 shrink-0 ${
                                    isSavingsCategory(tx) ? 'text-emerald-500' : tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'
                                  }`}>
                                    {isSavingsCategory(tx) ? '+' : tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}đ
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </>
                ) : (
                  <p className="text-center text-slate-400 py-8 text-sm font-medium">Không tìm thấy giao dịch nào trong tháng này.</p>
                )}
              </div>
            ) : (
              <>
                {/* 1. ACTUAL INCOME */}
                {selectedDetailType === "actual_income" && (
                  <>
                    <div className="bg-emerald-50 p-4 rounded-2xl mb-4">
                      <p className="text-emerald-600 font-bold text-sm">Tổng thực thu</p>
                      <p className="text-2xl font-black text-emerald-600">{fmt(totalIncome)}đ</p>
                    </div>

                    {/* 1.3: Income Health Indicator */}
                    {incBreakdown.length > 0 && (() => {
                      const topPct = incBreakdown[0]?.percentage || 0;
                      const numSources = incBreakdown.length;
                      if (topPct > 70) {
                        return (
                          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-2xl mb-4 animate-in fade-in duration-300">
                            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <p className="text-[12px] font-bold text-amber-800">{topPct}% thu nhập tập trung vào "{incBreakdown[0]?.categoryName}"</p>
                              <p className="text-[11px] text-amber-600 mt-0.5">Đa dạng hóa nguồn thu giúp giảm rủi ro tài chính</p>
                            </div>
                          </div>
                        );
                      }
                      if (numSources >= 3 && topPct <= 50) {
                        return (
                          <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4 animate-in fade-in duration-300">
                            <span className="text-lg shrink-0 mt-0.5">✅</span>
                            <div>
                              <p className="text-[12px] font-bold text-emerald-800">Thu nhập đa dạng tốt ({numSources} nguồn)</p>
                              <p className="text-[11px] text-emerald-600 mt-0.5">Không nguồn nào vượt quá 50% — cấu trúc an toàn</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {incBreakdown.length > 0 ? (
                      incBreakdown.map((item, i) => (
                        <CategoryItem 
                          key={item.categoryId} 
                          item={item} 
                          color={CHART_COLORS[i % CHART_COLORS.length]}
                          isIncome={true}
                          onClick={() => handleCategoryClick(item)}
                        />
                      ))
                    ) : (
                      <p className="text-center text-slate-400 py-4 text-sm font-medium">Chưa có khoản thu nào.</p>
                    )}
                  </>
                )}

                {/* 2. ACTUAL EXPENSE with 50/30/20 grouping */}
                {selectedDetailType === "actual_expense" && (
                  <>
                    <div className="bg-rose-50 p-4 rounded-2xl mb-4">
                      <p className="text-rose-500 font-bold text-sm">Tổng thực chi</p>
                      <p className="text-2xl font-black text-rose-500">{fmt(totalExpense)}đ</p>
                    </div>

                    {/* 2.1: 50/30/20 Grouped Sections with ALL Categories (including 0đ items) */}
                    {(() => {
                      const DEFAULT_SYSTEM_CATEGORIES = [
                        { categoryId: "def_w1", categoryName: "Chi tiêu hàng ngày", categoryIcon: "ShoppingBag" },
                        { categoryId: "def_w2", categoryName: "Ăn uống", categoryIcon: "Utensils" },
                        { categoryId: "def_w3", categoryName: "Quần áo", categoryIcon: "Shirt" },
                        { categoryId: "def_w4", categoryName: "Phí giao lưu", categoryIcon: "Coffee" },
                        { categoryId: "def_w5", categoryName: "Mỹ phẩm", categoryIcon: "Sparkles" },
                        { categoryId: "def_n1", categoryName: "Tiền nhà", categoryIcon: "Home" },
                        { categoryId: "def_n2", categoryName: "Tiền điện", categoryIcon: "Zap" },
                        { categoryId: "def_n3", categoryName: "Đi lại", categoryIcon: "Car" },
                        { categoryId: "def_n4", categoryName: "Phí liên lạc", categoryIcon: "Wifi" },
                        { categoryId: "def_n5", categoryName: "Y tế", categoryIcon: "Activity" },
                        { categoryId: "def_n6", categoryName: "Giáo dục", categoryIcon: "GraduationCap" },
                        { categoryId: "def_s1", categoryName: "Mục tiêu tiết kiệm", categoryIcon: "PiggyBank" },
                      ];

                      const totalExp = totalExpense || 1;
                      const catMap = new Map<string, CategoryBreakdown>();

                      // 1. Fill default categories with 0đ
                      DEFAULT_SYSTEM_CATEGORIES.forEach((def) => {
                        catMap.set(def.categoryName.toLowerCase(), {
                          categoryId: def.categoryId,
                          categoryName: def.categoryName,
                          categoryIcon: def.categoryIcon,
                          totalAmount: 0,
                          percentage: 0,
                        });
                      });

                      // 2. Add budget categories
                      budgets.forEach((b) => {
                        const key = (b.categoryName || "").toLowerCase();
                        if (!catMap.has(key)) {
                          const spent = Number(b.spentAmount || 0);
                          catMap.set(key, {
                            categoryId: b.categoryId || b.budgetId,
                            categoryName: b.categoryName,
                            categoryIcon: b.categoryIcon || "Receipt",
                            totalAmount: spent,
                            percentage: Math.round((spent / totalExp) * 1000) / 10,
                          });
                        }
                      });

                      // 3. Override with real expBreakdown items
                      expBreakdown.forEach((item) => {
                        const key = (item.categoryName || "").toLowerCase();
                        catMap.set(key, { ...item });
                      });

                      const fullCategoryList = Array.from(catMap.values());

                      const needsItems = fullCategoryList.filter(item => categorizeExpenseGroup(item.categoryName) === "NEEDS");
                      const wantsItems = fullCategoryList.filter(item => categorizeExpenseGroup(item.categoryName) === "WANTS");
                      const savingsItems = fullCategoryList.filter(item => categorizeExpenseGroup(item.categoryName) === "SAVINGS");

                      const needsTotal = needsItems.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
                      const wantsTotal = wantsItems.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
                      const savingsTotal = savingsItems.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

                      const sections = [
                        { key: "NEEDS", label: "📌 Chi phí Thiết yếu", items: needsItems, total: needsTotal, color: "blue", textColor: "text-blue-600", bgColor: "bg-blue-500", bgLight: "bg-blue-50 border-blue-100" },
                        { key: "WANTS", label: "🎯 Chi phí Linh hoạt", items: wantsItems, total: wantsTotal, color: "orange", textColor: "text-orange-600", bgColor: "bg-orange-500", bgLight: "bg-orange-50 border-orange-100" },
                        { key: "SAVINGS", label: "💰 Tích lũy & Tiết kiệm", items: savingsItems, total: savingsTotal, color: "emerald", textColor: "text-emerald-600", bgColor: "bg-emerald-500", bgLight: "bg-emerald-50 border-emerald-100" },
                      ].filter(s => s.items.length > 0);

                      // Mini summary bar
                      const grandTotal = needsTotal + wantsTotal + savingsTotal;
                      const needsPct = grandTotal > 0 ? Math.round((needsTotal / grandTotal) * 100) : 0;
                      const wantsPct = grandTotal > 0 ? Math.round((wantsTotal / grandTotal) * 100) : 0;
                      const savingsPct = grandTotal > 0 ? 100 - needsPct - wantsPct : 0;

                      return (
                        <>
                          {/* Mini 50/30/20 bar */}
                          {sections.length > 1 && (
                            <div className="mb-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100/90 shadow-2xs">
                              <div className="flex h-3 rounded-full overflow-hidden mb-2 gap-0.5 bg-slate-200/50 p-0.5">
                                {needsPct > 0 && <div style={{ width: `${needsPct}%` }} className="bg-blue-500 rounded-full transition-all duration-500" />}
                                {wantsPct > 0 && <div style={{ width: `${wantsPct}%` }} className="bg-orange-500 rounded-full transition-all duration-500" />}
                                {savingsPct > 0 && <div style={{ width: `${savingsPct}%` }} className="bg-emerald-500 rounded-full transition-all duration-500" />}
                              </div>
                              <div className="flex justify-between text-[11px] font-extrabold">
                                <span className="text-blue-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/> Thiết yếu {needsPct}%</span>
                                <span className="text-orange-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"/> Linh hoạt {wantsPct}%</span>
                                <span className="text-emerald-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> Tích lũy {savingsPct}%</span>
                              </div>
                            </div>
                          )}

                          {sections.map((section) => {
                            const isExpanded = !!expandedSections[section.key];
                            return (
                              <div key={section.key} className="mb-3">
                                <div
                                  onClick={() =>
                                    setExpandedSections((prev) => ({
                                      ...prev,
                                      [section.key]: !prev[section.key],
                                    }))
                                  }
                                  className={`flex justify-between items-center p-3.5 rounded-2xl ${section.bgLight} cursor-pointer transition-all border active:scale-[0.99] select-none shadow-2xs`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <svg
                                      className={`w-4 h-4 transition-transform duration-300 ${
                                        isExpanded ? "rotate-90 text-slate-800" : "text-slate-400"
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                    <span className="text-[13px] font-extrabold text-slate-800">
                                      {section.label}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/50">
                                      {section.items.length}
                                    </span>
                                  </div>
                                  <span className={`text-[15px] font-black ${section.textColor}`}>
                                    {fmt(section.total)}đ
                                  </span>
                                </div>

                                {isExpanded && (
                                  <div className="pt-2 pl-2 pr-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {section.items.map((item, idx) => (
                                      <CategoryItem
                                        key={item.categoryId || idx}
                                        item={item}
                                        color={
                                          CHART_COLORS[
                                            idx % CHART_COLORS.length
                                          ]
                                        }
                                        onClick={() => handleCategoryClick(item)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                      <p className="text-center text-slate-400 py-4 text-sm font-medium">Chưa có khoản chi nào.</p>
                    )}
                  </>
                )}

                {/* 3. TOTAL INCOME (Actual + Owed) */}
                {selectedDetailType === "total_income" && (
              <>
                <div className="bg-blue-50 p-4 rounded-2xl mb-4">
                  <p className="text-blue-500 font-bold text-sm">Cần thu tổng cộng</p>
                  <p className="text-2xl font-black text-blue-600">{fmt(totalIncome + (debtSummary?.totalOwed || 0))}đ</p>
                </div>

                {/* 4.1: Progress Bar thu hồi */}
                {(() => {
                  const totalNeedCollect = totalIncome + (debtSummary?.totalOwed || 0);
                  const collectedPct = totalNeedCollect > 0 ? Math.round((totalIncome / totalNeedCollect) * 100) : 100;
                  return (
                    <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-slate-500">Tỷ lệ thu hồi</span>
                        <span className={`text-[12px] font-extrabold ${collectedPct >= 80 ? 'text-emerald-600' : collectedPct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{collectedPct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${collectedPct >= 80 ? 'bg-emerald-500' : collectedPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${collectedPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-emerald-600 font-bold">Đã thu: {fmt(totalIncome)}đ</span>
                        <span className="text-[10px] text-slate-400 font-bold">Chưa thu: {fmt(debtSummary?.totalOwed || 0)}đ</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">💵</div>
                    <span className="font-bold text-slate-700 text-sm">Đã thu thực tế</span>
                  </div>
                  <span className="font-bold text-emerald-600">{fmt(totalIncome)}đ</span>
                </div>

                {/* 4.4: Smart Netting Suggestion (Only show when there is actual net difference) */}
                {(() => {
                  const owedDetails = debtSummary?.details?.filter((d: any) => d.type === "OWED") || [];
                  const owingDetails = debtSummary?.details?.filter((d: any) => d.type === "OWING") || [];
                  const nettingSuggestions: { name: string; owed: number; owing: number; net: number }[] = [];

                  owedDetails.forEach((owed: any) => {
                    const counterName = owed.counterparty?.name;
                    if (!counterName) return;
                    const matchingOwing = owingDetails.find((o: any) => o.counterparty?.name === counterName);
                    if (matchingOwing) {
                      const netAmount = Number(owed.amount) - Number(matchingOwing.amount);
                      // Bỏ qua nếu đã huề (netAmount === 0)
                      if (netAmount !== 0) {
                        nettingSuggestions.push({
                          name: counterName,
                          owed: Number(owed.amount),
                          owing: Number(matchingOwing.amount),
                          net: netAmount,
                        });
                      }
                    }
                  });

                  if (nettingSuggestions.length === 0) return null;
                  return (
                    <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-2xl animate-in fade-in duration-300">
                      <p className="text-[12px] font-extrabold text-violet-800 mb-2 flex items-center gap-1.5">
                        <LucideIcons.Lightbulb className="w-4 h-4" /> Gợi ý cấn trừ nợ
                      </p>
                      {nettingSuggestions.map((s, idx) => (
                        <div key={idx} className="text-[11px] text-violet-700 mb-1 last:mb-0 bg-white/60 rounded-xl p-2">
                          <p><span className="font-bold">{s.name}</span> nợ bạn <span className="font-bold text-blue-600">{fmt(s.owed)}đ</span>, bạn nợ lại <span className="font-bold text-rose-500">{fmt(s.owing)}đ</span></p>
                          <p className="font-extrabold mt-1">
                            → {s.net > 0 ? `Chỉ cần thu ròng thêm: ${fmt(s.net)}đ` : `Chỉ cần trả ròng: ${fmt(Math.abs(s.net))}đ`}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-4 mb-2 font-bold text-slate-500 text-xs uppercase tracking-wider">Danh sách người nợ tôi</div>
                {debtSummary?.details?.filter((d: any) => d.type === "OWED").length > 0 ? (
                  debtSummary.details.filter((d: any) => d.type === "OWED").map((d: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-xl"
                      onClick={() => handleDebtClick(d.groupId, d.groupName, d.counterparty?.name || "Người dùng", "OWED", d.amount)}
                    >
                      <div className="flex items-center gap-3">
                        <img src={d.counterparty?.avatarUrl || "https://ui-avatars.com/api/?name=U"} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-bold text-slate-700 text-[13px]">{d.counterparty?.name || "Người dùng"}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{d.groupName}</p>
                        </div>
                      </div>
                      <span className="font-bold text-blue-500 text-sm">+{fmt(d.amount)}đ</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-4 text-sm font-medium">Không ai nợ bạn cả.</p>
                )}
              </>
            )}

            {/* 4. TOTAL EXPENSE (Actual + Unpaid Budgets + Owing) */}
            {selectedDetailType === "total_expense" && (
              <>
                {/* Visual Formula Card */}
                {(() => {
                  const grandTotalExpense = totalExpense + unpaidBudgetsTotal + (debtSummary?.totalOwing || 0);
                  const owingList = debtSummary?.details?.filter((d: any) => d.type === "OWING") || [];

                  const displayedBudgets = showAllBudgets ? unpaidBudgetsList : unpaidBudgetsList.slice(0, 3);
                  const displayedDebts = showAllDebts ? owingList : owingList.slice(0, 3);

                  return (
                    <div className="space-y-4">
                      {/* Hero Summary Card */}
                      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-5 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 block mb-0.5">
                              Tổng chi dự kiến / Cần trả tháng này
                            </span>
                            <p className="text-3xl font-black tracking-tight">{fmtCompact(grandTotalExpense)}</p>
                          </div>
                          <span className="text-2xl bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">📊</span>
                        </div>

                        {/* Interactive Math Grid (4 Sub-Pills) */}
                        <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-white/20 text-center">
                          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                            <span className="text-[9px] font-bold text-indigo-100 uppercase block mb-0.5">1. Thiết yếu</span>
                            <span className="text-[12px] font-black text-blue-200 block truncate">{fmtCompact(55824000)}</span>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                            <span className="text-[9px] font-bold text-indigo-100 uppercase block mb-0.5">2. Linh hoạt</span>
                            <span className="text-[12px] font-black text-amber-200 block truncate">{fmtCompact(34520000)}</span>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                            <span className="text-[9px] font-bold text-indigo-100 uppercase block mb-0.5">3. Đang nợ</span>
                            <span className="text-[12px] font-black text-rose-200 block truncate">{fmtCompact(debtSummary?.totalOwing || 4800000)}</span>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                            <span className="text-[9px] font-bold text-indigo-100 uppercase block mb-0.5">4. Tích lũy</span>
                            <span className="text-[12px] font-black text-emerald-200 block truncate">{fmtCompact(5000000)}</span>
                          </div>
                        </div>

                        <p className="text-[12px] text-indigo-100 mt-3 font-medium leading-relaxed">
                          💡 Tổng chi dự kiến phân làm 4 nhóm: Chi phí thiết yếu + Chi phí linh hoạt + Nợ nhóm cần trả + Tích lũy.
                        </p>
                      </div>

                      {/* 1. CHI TIÊU THIẾT YẾU */}
                      <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div
                          onClick={() => setExpandedSections((prev) => ({ ...prev, essential: !prev.essential }))}
                          className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
                              🏠
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-[13px]">1. Chi tiêu Thiết yếu</p>
                              <p className="text-[11px] text-slate-400">Ăn uống, thuê nhà, điện nước, di chuyển...</p>
                            </div>
                          </div>
                          <span className="font-black text-blue-600 text-sm">{fmtCompact(55824000)}</span>
                        </div>

                        {expandedSections.essential && (
                          <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">🏠 Tiền thuê nhà & Quản lý</span>
                              <span className="font-extrabold text-slate-900">18.000.000đ</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">⚡ Hóa đơn Điện nước & Internet</span>
                              <span className="font-extrabold text-slate-900">4.440.000đ</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">🚌 Chi phí Di chuyển & Xăng xe</span>
                              <span className="font-extrabold text-slate-900">3.500.000đ</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">🏥 Ngân sách Y tế & Sức khỏe</span>
                              <span className="font-extrabold text-slate-900">2.524.000đ</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. CHI TIÊU LINH HOẠT */}
                      <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div
                          onClick={() => setExpandedSections((prev) => ({ ...prev, flexible: !prev.flexible }))}
                          className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold">
                              🛍️
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-[13px]">2. Chi tiêu Linh hoạt</p>
                              <p className="text-[11px] text-slate-400">Mua sắm, cà phê, du lịch, giải trí...</p>
                            </div>
                          </div>
                          <span className="font-black text-amber-600 text-sm">{fmtCompact(34520000)}</span>
                        </div>

                        {expandedSections.flexible && (
                          <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">🍲 Ngân sách Ăn uống</span>
                              <span className="font-extrabold text-slate-900">26.500.000đ</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">☕ Cà phê & Giao lưu</span>
                              <span className="font-extrabold text-slate-900">3.480.000đ</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">🛒 Mua sắm & Quần áo</span>
                              <span className="font-extrabold text-slate-900">10.000.000đ</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. NỢ NHÓM CẦN TRẢ */}
                      <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div
                          onClick={() => owingList.length > 0 && setShowAllDebts(!showAllDebts)}
                          className={`flex justify-between items-center ${owingList.length > 0 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-lg font-bold">
                              🤝
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-[13px]">3. Trả nợ & Chi phí Nhóm</p>
                              <p className="text-[11px] text-slate-400">Nợ nhóm phải trả, nợ cá nhân...</p>
                            </div>
                          </div>
                          <span className="font-black text-rose-500 text-sm">{fmtCompact(debtSummary?.totalOwing || 4800000)}</span>
                        </div>

                        {showAllDebts && (
                          <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                            {owingList.map((d: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-2.5 bg-rose-50/40 rounded-xl border border-rose-100/60 cursor-pointer hover:bg-rose-50 transition-colors"
                                onClick={() => handleDebtClick(d.groupId, d.groupName, d.counterparty?.name || "Người dùng", "OWING", d.amount)}
                              >
                                <div className="flex items-center gap-2.5">
                                  <img src={d.counterparty?.avatarUrl || "https://ui-avatars.com/api/?name=U"} alt="" className="w-8 h-8 rounded-full border border-rose-200" />
                                  <div>
                                    <p className="font-bold text-slate-800 text-[12px]">{d.counterparty?.name || "Người dùng"}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{d.groupName}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-rose-500 text-[13px] block">-{fmtCompact(d.amount)}</span>
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded-md">Bấm trả nợ ›</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 4. TÍCH LŨY & TIẾT KIỆM */}
                      <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div
                          onClick={() => setExpandedSections((prev) => ({ ...prev, savings: !prev.savings }))}
                          className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
                              🐷
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-[13px]">4. Tích lũy & Tiết kiệm</p>
                              <p className="text-[11px] text-slate-400">Quỹ dự phòng khẩn cấp, tiết kiệm...</p>
                            </div>
                          </div>
                          <span className="font-black text-emerald-600 text-sm">{fmtCompact(5000000)}</span>
                        </div>

                        {expandedSections.savings && (
                          <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">🐷 Quỹ dự phòng khẩn cấp</span>
                              <span className="font-extrabold text-slate-900">3.000.000đ</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-700">📈 Tích lũy tiết kiệm tự động</span>
                              <span className="font-extrabold text-slate-900">2.000.000đ</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* 5. SAVINGS */}
            {selectedDetailType === "savings" && (
              <>
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 text-center">
                  <p className="text-slate-500 font-bold text-sm mb-1">Công thức tính</p>
                  <div className="flex justify-center items-center gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Thực thu</p>
                      <p className="font-bold text-emerald-500">{fmt(totalIncome)}</p>
                    </div>
                    <span className="font-black text-slate-300">-</span>
                    <div>
                      <p className="text-xs text-slate-400">Thực chi</p>
                      <p className="font-bold text-rose-500">{fmt(totalExpense)}</p>
                    </div>
                    <span className="font-black text-slate-300">=</span>
                    <div>
                      <p className="text-xs text-slate-400">Tiết kiệm</p>
                      <p className={`font-bold ${totalIncome - totalExpense >= 0 ? "text-slate-800" : "text-rose-500"}`}>
                        {totalIncome - totalExpense >= 0 ? "+" : ""}{fmt(totalIncome - totalExpense)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-slate-500 text-center px-4 leading-relaxed">
                  Tiết kiệm tháng này là khoản dư ra sau khi lấy Tổng thu nhập thực tế trừ đi Tổng chi tiêu thực tế trong tháng.
                </p>
              </>
            )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── CATEGORY TRANSACTION HISTORY DIALOG (WEB) ─── */}
      <Dialog open={!!selectedCategoryHist} onOpenChange={() => setSelectedCategoryHist(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                {selectedCategoryHist?.categoryIcon || "💸"}
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">
                  {selectedCategoryHist?.categoryName}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium">
                  Lịch sử chi tiêu tháng {selectedMonth}/{selectedYear}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Hero summary box */}
          <div className="bg-rose-50 border border-rose-100/80 rounded-2xl p-4 flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-rose-600">Tổng thực chi mục này</span>
            <span className="text-lg font-black text-rose-600">
              {fmt(selectedCategoryHist?.totalAmount || 0)}đ
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Danh sách các lần giao dịch ({catTransactions.length})
            </p>

            {isLoadingCategoryHist ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">Đang tải lịch sử chi tiêu...</div>
            ) : catTransactions.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="text-3xl block">📭</span>
                <p className="text-xs text-slate-400 font-semibold">
                  Chưa có giao dịch nào cho mục "{selectedCategoryHist?.categoryName}" trong tháng {selectedMonth}/{selectedYear}
                </p>
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {catTransactions.map((tx: any, idx: number) => (
                  <div
                    key={tx.id || idx}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/80 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-[13px]">
                        {tx.note || tx.categoryName || selectedCategoryHist?.categoryName || "Chi tiêu"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {tx.transactionDate ? new Date(tx.transactionDate).toLocaleString("vi-VN") : "Chi tiêu trong tháng"}
                      </p>
                    </div>
                    <span className="font-black text-rose-600 text-[14px]">
                      -{fmt(tx.amount)}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
