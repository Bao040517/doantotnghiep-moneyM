"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { FinancialHealthCard } from "@/components/the-suc-khoe-tai-chinh";
import { toast } from "sonner";
import { TransferModal } from "@/components/hop-thoai-chuyen-khoan";
import { AddTransactionDrawer } from "@/components/ngan-keo-them-giao-dich";
import { GlobalDebtsDrawer } from "@/components/ngan-keo-tong-hop-no";
import { WalletManagerDrawer } from "@/components/ngan-keo-quan-ly-vi";
import { EditTransactionDrawer } from "@/components/ngan-keo-sua-giao-dich";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface DashboardTabProps {
  onNavigate?: (tab: string, extraData?: any) => void;
  refreshTrigger?: number;
}

const getCategoryTheme = (catName: string, isOver: boolean) => {
  const name = (catName || "").toLowerCase();
  let emoji = "💸";
  let iconBg = isOver
    ? "bg-rose-100 text-rose-600 border-rose-200"
    : "bg-amber-100 text-amber-600 border-amber-200";

  if (name.includes("y tế") || name.includes("thuốc") || name.includes("bệnh")) emoji = "🏥";
  else if (name.includes("ăn") || name.includes("phở") || name.includes("cơm") || name.includes("thực phẩm") || name.includes("nhà hàng")) emoji = "🍔";
  else if (name.includes("cà phê") || name.includes("trà") || name.includes("nước")) emoji = "☕";
  else if (name.includes("quần áo") || name.includes("trang phục") || name.includes("thời trang") || name.includes("mặc")) emoji = "👗";
  else if (name.includes("mua sắm") || name.includes("shopping") || name.includes("đồ")) emoji = "🛍️";
  else if (name.includes("giải trí") || name.includes("phim") || name.includes("game")) emoji = "🎬";
  else if (name.includes("di chuyển") || name.includes("xe") || name.includes("xăng")) emoji = "🚗";
  else if (name.includes("giao lưu") || name.includes("bạn bè") || name.includes("tiệc")) emoji = "🤝";
  else if (name.includes("mỹ phẩm") || name.includes("làm đẹp")) emoji = "💄";
  else if (name.includes("học") || name.includes("sách")) emoji = "📚";

  return { emoji, iconBg };
};

export function DashboardTab({ onNavigate, refreshTrigger }: DashboardTabProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  const [showWalletManager, setShowWalletManager] = useState(false);

  // Data states
  const [totalWalletBalance, setTotalWalletBalance] = useState<number>(0);
  const [wallet, setWallet] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [debtSummary, setDebtSummary] = useState({
    totalOwed: 0,
    totalOwing: 0,
  });
  const [debtDetails, setDebtDetails] = useState<any[]>([]);
  const [safeToSpend, setSafeToSpend] = useState<number | null>(null);
  const [autoSavings, setAutoSavings] = useState<number>(0);
  const [rawSafeToSpend, setRawSafeToSpend] = useState<number>(0);
  const [totalSavings, setTotalSavings] = useState<number>(0);
  const [unpaidBudgetsAmount, setUnpaidBudgetsAmount] = useState<number>(0);
  const [txSummary, setTxSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
  });
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topExpenseCategories, setTopExpenseCategories] = useState<any[]>([]);
  const [showGlobalDebts, setShowGlobalDebts] = useState(false);
  const [debtsInitialTab, setDebtsInitialTab] = useState<"borrowed" | "lent">(
    "lent",
  );

  // Uncategorized reminder state
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [uncategorizedTxs, setUncategorizedTxs] = useState<any[]>([]);
  const [showUncategorizedModal, setShowUncategorizedModal] = useState(false);
  const [selectedTxToEdit, setSelectedTxToEdit] = useState<any>(null);


  const fetchData = async () => {
    try {
      const now = new Date();
      const [
        totalBalanceRes,
        walletRes,
        budgetRes,
        debtRes,
        txRes,
        catBreakdownRes,
        savingsRes,
        uncatCountRes,
        uncatTxsRes,
      ] = await Promise.allSettled([
        api.get("/wallets/total-balance"),
        api.get("/wallets/me"),
        api.get(
          `/budgets/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
        ),
        api.get("/groups/debts/summary"),
        api.get(
          `/transactions/summary/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
        ),
        api.get(
          `/transactions/summary/category?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
        ),
        api.get("/savings-goals"),
        api.get("/transactions/uncategorized/count"),
        api.get("/transactions/uncategorized"),
      ]);

      let wBalance = 0;
      let unpaidBudgets = 0;
      let tOwing = 0;

      let tb = 0;
      if (totalBalanceRes.status === "fulfilled") {
        tb = totalBalanceRes.value.data?.totalBalance || 0;
      }

      let txInc = 0;
      let txExp = 0;
      if (txRes.status === "fulfilled") {
        txInc = txRes.value.data?.currentMonth?.totalIncome || 0;
        txExp = txRes.value.data?.currentMonth?.totalExpense || 0;
        setTxSummary({ totalIncome: txInc, totalExpense: txExp });
      }

      if (catBreakdownRes.status === "fulfilled") {
        setTopExpenseCategories(catBreakdownRes.value.data || []);
      }

      // Handle testing scenarios where balance is 0 but there are transactions
      if (tb === 0 && (txInc > 0 || txExp > 0)) {
        tb = txInc - txExp;
      }

      setTotalWalletBalance(tb);
      wBalance = tb;

      if (walletRes.status === "fulfilled") {
        const wData = walletRes.value.data?.data || walletRes.value.data;
        setWallet(Array.isArray(wData) && wData.length > 0 ? wData[0] : wData);
      }

      if (budgetRes.status === "fulfilled") {
        const data = budgetRes.value.data || [];
        setBudgets(data);
        unpaidBudgets = data.reduce(
          (sum: number, b: any) =>
            sum + Math.max(0, b.limitAmount - b.spentAmount),
          0,
        );
        setUnpaidBudgetsAmount(unpaidBudgets);
      }

      if (debtRes.status === "fulfilled") {
        const data = debtRes.value.data;
        tOwing = data?.totalOwing || 0;
        setDebtSummary({ totalOwing: tOwing, totalOwed: data?.totalOwed || 0 });
        setDebtDetails(data?.details || []);
      }

      let tSavings = 0;
      if (savingsRes.status === "fulfilled") {
        const goals = savingsRes.value.data || [];
        const total = goals.reduce(
          (sum: number, g: any) => sum + (g.currentAmount || 0),
          0,
        );
        setTotalSavings(total);
        tSavings = total;
      }

      const rawSafe = wBalance - unpaidBudgets - tOwing;
      setRawSafeToSpend(rawSafe);
      const calcAutoSavings = Math.max(0, rawSafe * 0.4);
      setAutoSavings(calcAutoSavings);
      setSafeToSpend(Math.max(0, rawSafe));

      if (uncatCountRes && uncatCountRes.status === "fulfilled") {
        setUncategorizedCount(uncatCountRes.value.data || 0);
      }
      if (uncatTxsRes && uncatTxsRes.status === "fulfilled") {
        setUncategorizedTxs(uncatTxsRes.value.data || []);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0)) + "đ";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-[#B3E5D1] border-t-[#6366f1] animate-spin" />
      </div>
    );
  }

  const isPositive = true; // Safe to spend is always >= 0

  const totalBudgetLimit = budgets.reduce(
    (sum: number, b: any) => sum + (b.limitAmount || 0),
    0,
  );
  const totalBudgetSpent = Number(txSummary?.totalExpense) || 0;
  const budgetPct =
    totalBudgetLimit > 0
      ? Math.min(100, (totalBudgetSpent / totalBudgetLimit) * 100)
      : 0;

  // Separate at-risk budgets into Over Limit (> 100%) and Approaching Limit (80% - 99%)
  const { overLimitBudgets, approachingBudgets } = (() => {
    const mapOver = new Map<string, any>();
    const mapApproaching = new Map<string, any>();

    budgets
      .filter(
        (b: any) =>
          b.type === "FLEXIBLE" &&
          b.limitAmount > 0 &&
          b.spentAmount / b.limitAmount >= 0.8
      )
      .forEach((b: any) => {
        const catKey = (b.categoryName || b.categoryId || b.name || "UNNAMED")
          .toLowerCase()
          .trim();
        const pct = b.spentAmount / b.limitAmount;
        if (pct >= 1.0) {
          if (
            !mapOver.has(catKey) ||
            b.spentAmount / b.limitAmount >
              mapOver.get(catKey).spentAmount / mapOver.get(catKey).limitAmount
          ) {
            mapOver.set(catKey, b);
          }
        } else {
          if (
            !mapApproaching.has(catKey) ||
            b.spentAmount / b.limitAmount >
              mapApproaching.get(catKey).spentAmount /
                mapApproaching.get(catKey).limitAmount
          ) {
            mapApproaching.set(catKey, b);
          }
        }
      });

    return {
      overLimitBudgets: Array.from(mapOver.values()).sort(
        (a: any, b: any) =>
          b.spentAmount / b.limitAmount - a.spentAmount / a.limitAmount
      ),
      approachingBudgets: Array.from(mapApproaching.values()).sort(
        (a: any, b: any) =>
          b.spentAmount / b.limitAmount - a.spentAmount / a.limitAmount
      ),
    };
  })();

  const currentUser =
    typeof window !== "undefined"
      ? (() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            return JSON.parse(userStr);
          } catch (e) { }
        }
        return { id: "", name: "", avatarUrl: null };
      })()
      : { id: "", name: "", avatarUrl: null };

  const myDebts = debtDetails
    .filter((d: any) => d.type === "OWING")
    .map((d: any) => ({
      groupId: d.groupId,
      groupName: d.groupName,
      from: currentUser,
      to: d.counterparty,
      amount: d.amount,
    }));

  const owedToMe = debtDetails
    .filter((d: any) => d.type === "OWED")
    .map((d: any) => ({
      groupId: d.groupId,
      groupName: d.groupName,
      from: d.counterparty,
      to: currentUser,
      amount: d.amount,
    }));

  return (
    <div className="w-full pb-28 relative min-h-screen bg-[#f5f6f8]">
      {/* Overscroll cover hack: Lấp đầy khoảng trắng khi vuốt quá đà */}
      <div className="absolute top-[-100vh] left-0 right-0 h-[100vh] bg-[#1a1a2e]" />

      {/* ─── ENTIRE HEADER BLOCK (ORIGINAL NAVY GRADIENT) ─── */}
      <div
        className="relative rounded-b-[2.5rem] pt-5 px-5 pb-7 overflow-hidden z-0 shadow-md"
        style={{
          background:
            "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: "#6366f1" }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: "#6366f1" }}
        />

        {/* ─── TOP BAR ─── */}
        <div className="relative z-10 flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
              <span className="text-xl">👋</span>
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium tracking-wide">
                Tổng quan Tài chính
              </p>
              <h1 className="text-white font-extrabold text-lg">Chào bạn,</h1>
            </div>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:scale-95 transition-transform border border-white/10"
          >
            {showBalance ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>

        {/* ─── SAFE TO SPEND HERO ─── */}
        <div className="relative z-10 mb-6">
          <div className="flex justify-between items-center mb-1">
            <p className="text-white/70 text-[13px] font-bold tracking-wide uppercase">
              Số dư khả dụng
            </p>
            {safeToSpend !== null && (
              <span className="text-white/70 text-[11px] bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full font-medium">
                Còn {(() => {
                  const today = new Date();
                  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  return end.getDate() - today.getDate() + 1;
                })()} ngày
              </span>
            )}
          </div>
          <div className="flex flex-col mb-4">
            <h2 className="text-[40px] leading-none font-black text-[#4ade80] tracking-tight mb-2">
              {showBalance
                ? safeToSpend !== null
                  ? fmt(safeToSpend)
                  : "..."
                : "••••••••"}
            </h2>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white/10 rounded-xl inline-flex items-center backdrop-blur-sm border border-white/10 shadow-sm">
                <span className="text-white/80 text-[13px] font-medium mr-2">
                  Hạn mức hôm nay:
                </span>
                <span className="text-[#4ade80] text-[16px] font-bold">
                  {showBalance
                    ? safeToSpend !== null
                      ? fmt(
                        safeToSpend /
                        (() => {
                          const today = new Date();
                          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                          return end.getDate() - today.getDate() + 1;
                        })()
                      )
                      : "..."
                    : "••••••••"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── ORIGINAL WHITE BREAKDOWN CARD (PROPERLY ALIGNED & SPACED) ─── */}
        <div className="relative z-10 bg-white rounded-[24px] p-5 shadow-xl shadow-black/5 border border-gray-100">
          {/* Row 1: Tổng tất cả các ví */}
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#e8f5f1] text-[#6366f1] rounded-full flex items-center justify-center text-xs font-bold">
                💳
              </div>
              <span className="text-gray-700 font-bold text-[13px]">
                Tổng tất cả các ví
              </span>
            </div>
            <p className="text-[17px] font-black text-gray-800 tracking-tight">
              {showBalance ? fmt(totalWalletBalance) : "••••••••"}
            </p>
          </div>


          {/* Row 3: Nợ người khác */}
          <GlobalDebtsDrawer myDebts={myDebts} owedToMe={owedToMe} defaultTab="myDebts">
            <div className="flex justify-between items-center py-2 border-b border-gray-50 cursor-pointer hover:bg-slate-50/80 active:opacity-75 transition-all px-1 -mx-1 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xs">
                  💸
                </div>
                <span className="text-gray-600 font-medium text-[13px]">
                  Nợ người khác
                </span>
              </div>
              <p className="text-[15px] font-bold text-rose-500">
                {showBalance
                  ? (debtSummary.totalOwing > 0 ? "-" : "") + fmt(debtSummary.totalOwing)
                  : "••••••••"}
              </p>
            </div>
          </GlobalDebtsDrawer>

          {/* Row 4: Người khác nợ tôi */}
          <GlobalDebtsDrawer myDebts={myDebts} owedToMe={owedToMe} defaultTab="owedToMe">
            <div className="flex justify-between items-center py-2 border-b border-gray-50 cursor-pointer hover:bg-slate-50/80 active:opacity-75 transition-all px-1 -mx-1 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-xs">
                  🤝
                </div>
                <span className="text-gray-600 font-medium text-[13px]">
                  Người khác nợ tôi
                </span>
              </div>
              <p className="text-[15px] font-bold text-blue-500">
                {showBalance
                  ? (debtSummary.totalOwed > 0 ? "+" : "") + fmt(debtSummary.totalOwed)
                  : "••••••••"}
              </p>
            </div>
          </GlobalDebtsDrawer>

          {/* Row 5: Đã tiết kiệm */}
          <div
            className="flex justify-between items-center pt-2 cursor-pointer hover:bg-slate-50/80 active:opacity-75 transition-all px-1 -mx-1 rounded-xl"
            onClick={() => onNavigate?.("savings")}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-xs">
                💰
              </div>
              <span className="text-gray-600 font-medium text-[13px]">
                Đã tiết kiệm
              </span>
            </div>
            <p className="text-[15px] font-bold text-emerald-500">
              {showBalance
                ? (totalSavings > 0 ? "+" : "") + fmt(totalSavings)
                : "••••••••"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT (CLEAN SPACING & ALIGNMENT) ─── */}
      <div className="relative z-10 px-5 mt-6 space-y-6">

        {/* ─── AT-RISK BUDGETS (SINGLE COMPACT ELEGANT CARD) ─── */}
        {(overLimitBudgets.length > 0 || approachingBudgets.length > 0) && (
          <div className="bg-white rounded-[24px] p-4 border border-rose-100/80 shadow-md shadow-rose-500/5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <h4 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wide">
                  Cảnh báo Hạn mức Tháng này ({overLimitBudgets.length + approachingBudgets.length})
                </h4>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                {overLimitBudgets.length > 0
                  ? `${overLimitBudgets.length} khoản vượt!`
                  : `${approachingBudgets.length} khoản sắp chạm mốc`}
              </span>
            </div>

            <div className="flex overflow-x-auto gap-2.5 pb-1 no-scrollbar -mx-1 px-1">
              {/* Over Limit Budgets (Red Pills First) */}
              {overLimitBudgets.map((b: any, idx: number) => {
                const catName = b.name || b.categoryName || "Khoản chi";
                const pct = Math.round((b.spentAmount / b.limitAmount) * 100);
                const { emoji } = getCategoryTheme(catName, true);

                return (
                  <div
                    key={b.id || idx}
                    onClick={() => onNavigate?.("budget", b.budgetId || b.id || b.categoryId)}
                    className="shrink-0 w-44 rounded-2xl p-3 bg-rose-50/90 border border-rose-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{emoji}</span>
                        <span className="text-[13px] font-extrabold text-rose-950 truncate">
                          {catName}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-rose-600 shrink-0">
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full bg-rose-200/50 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: "100%" }}
                      />
                    </div>

                    <p className="text-[11px] font-black text-rose-700 text-right">
                      Vượt {fmt(b.spentAmount - b.limitAmount)}
                    </p>
                  </div>
                );
              })}

              {/* Approaching Limit Budgets (Amber Pills Next) */}
              {approachingBudgets.map((b: any, idx: number) => {
                const catName = b.name || b.categoryName || "Khoản chi";
                const pct = Math.round((b.spentAmount / b.limitAmount) * 100);
                const { emoji } = getCategoryTheme(catName, false);

                return (
                  <div
                    key={b.id || idx}
                    onClick={() => onNavigate?.("budget", b.budgetId || b.id || b.categoryId)}
                    className="shrink-0 w-44 rounded-2xl p-3 bg-amber-50/90 border border-amber-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{emoji}</span>
                        <span className="text-[13px] font-extrabold text-amber-950 truncate">
                          {catName}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 shrink-0">
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full bg-amber-200/50 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <p className="text-[11px] font-black text-amber-800 text-right">
                      Còn {fmt(b.limitAmount - b.spentAmount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── UNCATEGORIZED REMINDER BANNER ─── */}
        {uncategorizedCount > 0 && (
          <div
            onClick={() => setShowUncategorizedModal(true)}
            className="bg-amber-100/80 border border-amber-300 p-4 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:bg-amber-100 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center text-xl shadow-inner shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-amber-800 text-[15px]">Bạn có {uncategorizedCount} khoản thu/chi</h3>
                <p className="text-amber-700/80 text-[13px] font-medium leading-tight mt-0.5">
                  Chưa được phân loại chi tiết. Nhấp vào đây để cập nhật ngay!
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}

        {/* ─── QUICK ACTIONS GRID (3 COLUMNS X 2 ROWS) ─── */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Thao tác nhanh
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setIsTopUpOpen(true)}
              className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m0 0l-4-4m4 4l4-4M4 12h16" opacity="0.3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                Nạp vào ví
              </span>
            </button>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                Chuyển khoản
              </span>
            </button>

            <button
              onClick={() => onNavigate?.("budget")}
              className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                Ngân sách
              </span>
            </button>

            <button
              onClick={() => onNavigate?.("groups")}
              className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                Nhóm
              </span>
            </button>

            <button
              onClick={() => onNavigate?.("savings")}
              className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-xl">
                🌱
              </div>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                Tiết kiệm
              </span>
            </button>

            <button
              onClick={() => onNavigate?.("history")}
              className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                Lịch sử
              </span>
            </button>
          </div>
        </div>

        {/* ─── BUDGET PROGRESS & SPENDING RANKING ─── */}
        <div>
          <h3 className="text-lg font-extrabold text-gray-800 mb-3 ml-1 tracking-tight">
            Ngân sách Tháng này
          </h3>
          <div
            className="bg-white rounded-[28px] p-6 shadow-xl shadow-black/5 mb-6 border border-gray-100 cursor-pointer active:scale-[0.98] transition-all hover:shadow-xl relative overflow-hidden"
            onClick={() => onNavigate?.("budget")}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-transparent rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex justify-between items-end mb-3 relative z-10">
              <div>
                <p className="text-emerald-600 text-xs font-black uppercase tracking-wider mb-1">
                  ĐÃ CHI TIÊU 🎯
                </p>
                <p className="text-2xl font-black text-gray-800 tracking-tight">
                  {showBalance ? fmt(totalBudgetSpent) : "••••••"}{" "}
                  <span className="text-sm text-gray-400 font-medium">
                    / {showBalance ? fmt(totalBudgetLimit) : "••••••"}
                  </span>
                </p>
              </div>
            </div>

            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden mt-4 relative z-10 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${budgetPct >= 100 ? "bg-red-500" : budgetPct >= 80 ? "bg-orange-500" : "bg-[#6366f1]"
                  }`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center font-medium relative z-10">
              Nhấn để xem chi tiết Ngân sách & Giao dịch
            </p>

            {/* Top 5 Spending Categories */}
            {topExpenseCategories.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100 relative z-10">
                <h4 className="text-[14px] font-extrabold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                  🏆 BẢNG XẾP HẠNG CHI TIÊU
                </h4>
                <div className="space-y-3">
                  {topExpenseCategories.slice(0, 5).map((cat, idx) => {
                    const maxAmount = topExpenseCategories[0].totalAmount;
                    const barWidth = maxAmount > 0 ? (cat.totalAmount / maxAmount) * 100 : 0;
                    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                    const colors = [
                      "bg-yellow-50 text-yellow-600 border-yellow-200",
                      "bg-slate-50 text-slate-500 border-slate-200",
                      "bg-orange-50 text-orange-500 border-orange-200",
                      "bg-gray-50 text-gray-400 border-gray-100",
                      "bg-gray-50 text-gray-400 border-gray-100",
                    ];
                    return (
                      <div
                        key={idx}
                        className="relative bg-white rounded-2xl p-3 border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-center"
                      >
                        <div
                          className="absolute top-0 left-0 bottom-0 bg-rose-50/60 -z-10 transition-all duration-1000"
                          style={{ width: `${barWidth}%` }}
                        />

                        <div className="flex items-center justify-between z-10">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-[18px] shrink-0 border shadow-sm ${colors[idx]}`}
                            >
                              {medals[idx]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-gray-800 leading-tight flex items-center gap-1.5">
                                {cat.categoryName}
                                {idx === 0 && (
                                  <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md uppercase font-black">
                                    VÔ ĐỊCH 💸
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] font-medium text-gray-500 mt-0.5">
                                Chiếm {cat.percentage.toFixed(1)}% tháng này
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[15px] font-black tracking-tight ${idx === 0 ? "text-rose-600" : "text-gray-700"
                              }`}
                          >
                            -{fmt(cat.totalAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>


          {/* ─── FINANCIAL HEALTH ─── */}
          <div className="mb-6">
            <FinancialHealthCard />
          </div>
        </div>

        <TransferModal
          open={isTransferModalOpen}
          onOpenChange={setIsTransferModalOpen}
          onSuccess={fetchData}
        />
        <AddTransactionDrawer
          walletId={wallet?.id}
          type="INCOME"
          open={isTopUpOpen}
          onOpenChange={setIsTopUpOpen}
          onCreated={fetchData}
        />
        <GlobalDebtsDrawer
          open={showGlobalDebts}
          onOpenChange={setShowGlobalDebts}
          myDebts={myDebts}
          owedToMe={owedToMe}
          defaultTab={
            debtsInitialTab === "borrowed"
              ? "myDebts"
              : debtsInitialTab === "lent"
                ? "owedToMe"
                : undefined
          }
        />

        <WalletManagerDrawer
          open={showWalletManager}
          onOpenChange={setShowWalletManager}
          onSaved={() => {
            api
              .get("/wallets/total-balance")
              .then((res) => setTotalWalletBalance(res.data.totalBalance))
              .catch(console.error);
          }}
        />

        {/* ─── UNCATEGORIZED MODAL ─── */}
        <Dialog open={showUncategorizedModal} onOpenChange={setShowUncategorizedModal}>
          <DialogContent className="sm:max-w-md bg-white rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-800">
                Giao dịch chưa phân loại
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-gray-500">
                Vui lòng cập nhật danh mục cho các giao dịch này để quản lý tài chính hiệu quả hơn.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto mt-4 space-y-3 pr-1 pb-4">
              {uncategorizedTxs.map((tx: any) => (
                <div
                  key={tx.id}
                  onClick={() => {
                    setSelectedTxToEdit(tx);
                    setShowUncategorizedModal(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-lg shadow-inner">
                      ❓
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-800 line-clamp-1">
                        {tx.note || "Nhập nhanh"}
                      </p>
                      <p className="text-[12px] font-medium text-gray-500">
                        {new Date(tx.transactionDate).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-[15px] font-black tracking-tight ${tx.type === "INCOME" ? "text-emerald-500" : "text-rose-500"
                      }`}
                  >
                    {tx.type === "INCOME" ? "+" : "-"}
                    {new Intl.NumberFormat("vi-VN").format(tx.amount)}đ
                  </p>
                </div>
              ))}
              {uncategorizedTxs.length === 0 && (
                <div className="text-center py-6 text-gray-400 font-medium">
                  Không còn giao dịch nào cần phân loại!
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── EDIT TRANSACTION DRAWER ─── */}
        <EditTransactionDrawer
          transaction={selectedTxToEdit}
          open={!!selectedTxToEdit}
          onOpenChange={(open) => {
            if (!open) setSelectedTxToEdit(null);
          }}
          onUpdated={() => {
            fetchData();
          }}
        />
      </div>
    </div>
  );
}
