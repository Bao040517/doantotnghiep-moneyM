"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface BienDongThuChiModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthExpense?: number;
  currentMonthIncome?: number;
}

export function BienDongThuChiModal({
  isOpen,
  onClose,
  currentMonthExpense = 22438044,
  currentMonthIncome = 44800000,
}: BienDongThuChiModalProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("year");
  const [activeType, setActiveType] = useState<"income" | "expense" | "diff">("diff");
  const [showBalance, setShowBalance] = useState(true);

  const fmt = (n: number) => {
    if (!showBalance) return "******";
    const safe = Math.round(Math.abs(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + "đ";
  };

  const netDiff = currentMonthIncome - currentMonthExpense;

  const compData =
    timeRange === "year"
      ? [
          { period: "2026", label: "Năm nay", income: currentMonthIncome * 12, expense: currentMonthExpense * 12 },
          { period: "2025", label: "Năm 2025", income: 380000000, expense: 410000000 },
        ]
      : timeRange === "month"
      ? [
          { period: "T8/2026", label: "Tháng này", income: currentMonthIncome, expense: currentMonthExpense },
          { period: "T7/2026", label: "Tháng trước", income: 40000000, expense: 35000000 },
        ]
      : [
          { period: "Tuần này", label: "Tuần này", income: Math.round(currentMonthIncome / 4), expense: Math.round(currentMonthExpense / 4) },
          { period: "Tuần trước", label: "Tuần trước", income: 9000000, expense: 8500000 },
        ];

  const valOf = (d: (typeof compData)[0]) => {
    if (activeType === "income") return d.income;
    if (activeType === "expense") return d.expense;
    return d.income - d.expense;
  };

  const vals = compData.map(valOf);
  const maxVal = Math.max(...vals.map(Math.abs), 10000000);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-lg font-bold">
              ←
            </button>
            <h2 className="text-lg font-black text-slate-900">Biến động thu chi</h2>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showBalance ? "👁️" : "🙈"}
          </button>
        </div>

        {/* ─── TIME RANGE TAB SELECTOR (Row 1) ─── */}
        <div className="flex bg-slate-100 p-1 rounded-full mb-4">
          <button
            onClick={() => setTimeRange("week")}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              timeRange === "week" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"
            }`}
          >
            Theo tuần
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              timeRange === "month" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"
            }`}
          >
            Theo tháng
          </button>
          <button
            onClick={() => setTimeRange("year")}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              timeRange === "year" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"
            }`}
          >
            Theo năm
          </button>
        </div>

        {/* ─── SUB-TYPE TAB SELECTOR (Row 2) ─── */}
        <div className="flex border-b border-slate-100 mb-6">
          <button
            onClick={() => setActiveType("income")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeType === "income" ? "border-emerald-500 text-slate-900" : "border-transparent text-slate-400"
            }`}
          >
            Thu nhập
          </button>
          <button
            onClick={() => setActiveType("expense")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeType === "expense" ? "border-rose-500 text-slate-900" : "border-transparent text-slate-400"
            }`}
          >
            Chi tiêu
          </button>
          <button
            onClick={() => setActiveType("diff")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeType === "diff" ? "border-pink-500 text-pink-600 font-extrabold" : "border-transparent text-slate-400"
            }`}
          >
            Chênh lệch
          </button>
        </div>

        {/* ─── HERO AMOUNT BOX ─── */}
        <div className="text-center my-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">
            {activeType === "income"
              ? `Tổng thu nhập ${timeRange === "year" ? "năm nay" : timeRange === "month" ? "tháng này" : "tuần này"}`
              : activeType === "expense"
              ? `Tổng chi tiêu ${timeRange === "year" ? "năm nay" : timeRange === "month" ? "tháng này" : "tuần này"}`
              : `Tổng chênh lệch ${timeRange === "year" ? "năm nay" : timeRange === "month" ? "tháng này" : "tuần này"}`}
          </p>
          <p className="text-3xl font-black text-slate-900">
            {activeType === "income"
              ? fmt(currentMonthIncome)
              : activeType === "expense"
              ? fmt(currentMonthExpense)
              : fmt(netDiff)}
          </p>
        </div>

        {/* ─── BAR CHART SECTION ─── */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-extrabold text-slate-800">Biến động</h3>
            <span className="text-[10px] font-semibold text-slate-400">(Triệu)</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="h-40 flex items-end justify-around border-b border-slate-200 pb-2 relative">
              {compData.map((d, i) => {
                const val = valOf(d);
                const heightPct = Math.max(8, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)));
                const isCurrent = i === 0;

                return (
                  <div key={d.period} className="flex flex-col items-center gap-2 group">
                    <div
                      className={`w-12 rounded-t-lg transition-all duration-500 ${
                        activeType === "income"
                          ? "bg-emerald-400"
                          : activeType === "expense"
                          ? "bg-pink-200 border border-rose-300"
                          : val >= 0
                          ? "bg-emerald-200 border border-emerald-400"
                          : "bg-pink-200 border border-rose-300"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className={`text-[11px] font-bold ${isCurrent ? "text-pink-600" : "text-slate-500"}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── COMPARISON BREAKDOWN LIST ─── */}
        <div className="mt-6 space-y-3">
          {compData.map((d) => {
            const diff = d.income - d.expense;
            return (
              <div key={d.period} className="bg-slate-50 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-800">{d.period}</span>
                </div>

                <div className="space-y-0.5 text-left flex-1 px-4">
                  <p className="text-[11px] text-slate-500">
                    Thu: <span className="font-bold text-slate-800">{fmt(d.income)}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Chi: <span className="font-bold text-slate-800">{fmt(d.expense)}</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Còn lại</p>
                  <p className={`text-xs font-black ${diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {fmt(diff)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
