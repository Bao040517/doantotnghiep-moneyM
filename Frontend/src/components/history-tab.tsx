"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className = "w-5 h-5 text-slate-500" }: { name?: string, className?: string }) {
  if (!name) return null;
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Receipt;
  return <IconComponent className={className} />;
}

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: { id: string; name: string; type: string; iconName: string };
  transactionDate: string;
  note: string;
  linkedExpenseId: string | null;
  isSplit?: boolean;
}

export function HistoryTab() {
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [debtSummary, setDebtSummary] = useState({ totalOwed: 0, totalOwing: 0 });

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const [txRes, summaryRes, debtRes] = await Promise.all([
        api.get(`/transactions/monthly?year=${selectedYear}&month=${selectedMonth}`),
        api.get(`/transactions/summary/monthly?year=${selectedYear}&month=${selectedMonth}`),
        api.get("/groups/debts/summary").catch(() => ({ data: { totalOwed: 0, totalOwing: 0 } }))
      ]);
      setTransactions(txRes.data);
      setSummaryData(summaryRes.data);
      setDebtSummary(debtRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedYear, selectedMonth]);



  const personalTransactions = transactions.filter(t => 
    t.category?.name !== "Cho nhóm mượn"
  );

  const totalPersonalIncome = personalTransactions
    .filter(t => t.type === "INCOME" || t.category?.name === "Nhận tiền nhóm")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPersonalExpense = personalTransactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions = personalTransactions.filter(t => 
    (t.note?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.category?.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="px-5 mt-4 w-full pb-28">
      {/* ─── SEARCH BAR ─── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-white rounded-full flex items-center px-4 py-3 shadow-sm border border-gray-100">
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch"
            className="bg-transparent w-full outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-gray-500 hover:text-gray-700 active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-gray-500 hover:text-gray-700 active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </div>

      {/* ─── SUMMARY CARD ─── */}
      <section className="bg-white rounded-[1.5rem] p-4 mb-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[15px] font-extrabold text-gray-800">Tổng quan tháng {selectedMonth}</h2>
          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Đã thu */}
          <div className="border border-gray-100 rounded-2xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Đã thu (Thực tế)</p>
            <div className="flex items-center text-sm font-bold text-emerald-500">
              +{new Intl.NumberFormat("vi-VN").format(totalPersonalIncome)}đ
            </div>
          </div>
          {/* Đã chi */}
          <div className="border border-gray-100 rounded-2xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Đã chi (Thực tế)</p>
            <div className="flex items-center text-sm font-bold text-rose-500">
              -{new Intl.NumberFormat("vi-VN").format(totalPersonalExpense)}đ
            </div>
          </div>
          {/* Tổng thu */}
          <div className="border border-gray-100 rounded-2xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Tổng thu (Cần thu)</p>
            <div className="flex items-center text-sm font-bold text-blue-500">
              +{new Intl.NumberFormat("vi-VN").format(totalPersonalIncome + debtSummary.totalOwed)}đ
            </div>
          </div>
          {/* Tổng chi */}
          <div className="border border-gray-100 rounded-2xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Tổng chi (Cần trả)</p>
            <div className="flex items-center text-sm font-bold text-amber-500">
              -{new Intl.NumberFormat("vi-VN").format(totalPersonalExpense + debtSummary.totalOwing)}đ
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">Bạn muốn tiết kiệm tiền hơn?</p>
          <button className="text-xs font-bold text-pink-500 hover:text-pink-600 transition-colors">Đặt ngân sách</button>
        </div>
      </section>

      {/* ─── MONTH PICKER COMPACT ─── */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[17px] font-extrabold text-gray-800">Giao dịch gần đây</h3>
        <div className="flex items-center bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
          <button onClick={() => { if(selectedMonth===1){setSelectedMonth(12);setSelectedYear(y=>y-1);}else setSelectedMonth(m=>m-1); }} className="p-1 text-gray-400 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-xs font-bold text-gray-700 px-2">T{selectedMonth}/{selectedYear}</span>
          <button onClick={() => { if(selectedMonth===12){setSelectedMonth(1);setSelectedYear(y=>y+1);}else setSelectedMonth(m=>m+1); }} className="p-1 text-gray-400 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* ─── TRANSACTIONS LIST ─── */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#f8fafc] px-4 py-2.5 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-600">Tháng {selectedMonth}/{selectedYear}</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-pink-500 animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm font-medium">Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredTransactions.map((tx, idx) => {
              const isLast = idx === filteredTransactions.length - 1;
              return (
                <div key={tx.id} className={`p-4 flex items-start gap-4 ${!isLast ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    tx.type === "INCOME" ? "bg-[#e0f2fe] text-blue-500" : "bg-[#fff7ed] text-orange-400"
                  }`}>
                    {tx.category?.iconName ? <DynamicIcon name={tx.category.iconName} className="w-5 h-5" /> : (tx.type === "INCOME" ? "💵" : "💸")}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-800 leading-tight truncate mb-1">
                      {tx.note || tx.category?.name || "Giao dịch"}
                    </p>
                    <p className="text-[11px] text-gray-400 mb-2">
                      {format(new Date(tx.transactionDate), "HH:mm - dd/MM/yyyy", { locale: vi })}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded-full border border-gray-100">
                        <DynamicIcon name={tx.category?.iconName} className="w-3 h-3" /> {tx.category?.name}
                      </span>
                      {tx.linkedExpenseId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full border border-blue-100">
                          🔗 Nhóm
                        </span>
                      )}
                      {tx.linkedExpenseId && tx.type === "EXPENSE" && tx.note !== "Thanh toán nợ nhóm" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-semibold rounded-full border border-amber-100">
                          💸 Chi hộ nhóm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right pl-2">
                    <p className={`text-[15px] font-bold ${tx.type === "INCOME" ? "text-emerald-500" : "text-gray-800"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}{new Intl.NumberFormat("vi-VN").format(tx.amount)}đ
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
