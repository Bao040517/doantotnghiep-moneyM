"use client";

import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AddLoanDrawer } from "@/components/add-loan-drawer";
import { EditLoanDrawer } from "@/components/edit-loan-drawer";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Landmark, ArrowUpRight, ArrowDownLeft, PlusCircle } from "lucide-react";

interface ExternalLoanDTO {
  id: string;
  type: "LENT" | "BORROWED";
  counterpartyName: string;
  principalAmount: number;
  interestRate: number;
  startDate: string | null;
  dueDate: string | null;
  description: string;
  isSettled: boolean;
}

interface ExternalLoansDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ExternalLoansDrawer({ open, onOpenChange, onSaved }: ExternalLoansDrawerProps) {
  const [loans, setLoans] = useState<ExternalLoanDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ExternalLoanDTO | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "LENT" | "BORROWED">("ALL");

  const fetchLoans = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/external-loans");
      setLoans(res.data || []);
    } catch (err) {
      console.error("Failed to load external loans", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLoans();
    }
  }, [open]);

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

  // Calculate stats
  const totalLent = loans
    .filter(l => l.type === "LENT" && !l.isSettled)
    .reduce((sum, l) => sum + l.principalAmount, 0);

  const totalBorrowed = loans
    .filter(l => l.type === "BORROWED" && !l.isSettled)
    .reduce((sum, l) => sum + l.principalAmount, 0);

  const filteredLoans = loans.filter(l => {
    if (filter === "ALL") return true;
    return l.type === filter;
  });

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[#f4f6f9] h-[90vh]">
          <div className="mx-auto w-full max-w-md h-full flex flex-col">
            
            {/* Header */}
            <DrawerHeader className="bg-white border-b border-gray-100 shrink-0 text-center pb-5 pt-4 rounded-t-2xl shadow-sm z-10 relative">
              <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                <Landmark className="w-6 h-6" />
              </div>
              <DrawerTitle className="text-xl font-extrabold text-gray-800">Sổ Vay Nợ & Tiết Kiệm</DrawerTitle>
              <DrawerDescription className="text-gray-500 text-xs mt-1">
                Ghi chép các khoản tự cho vay, đi vay hoặc tích lũy ngoài
              </DrawerDescription>
            </DrawerHeader>

            {/* Stats Summary Card */}
            <div className="px-5 pt-4 shrink-0">
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-100 flex justify-between items-center gap-3">
                <div className="flex-1 text-center border-r border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cho Vay (Tích lũy)</p>
                  <p className="text-base font-black text-emerald-600">{fmt(totalLent)}</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Đi Vay (Nợ ngoài)</p>
                  <p className="text-base font-black text-rose-500">{fmt(totalBorrowed)}</p>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Add Button */}
            <div className="px-5 pt-4 pb-2 shrink-0 flex items-center justify-between gap-3">
              <div className="flex bg-gray-200/50 p-0.5 rounded-xl flex-1 max-w-[260px]">
                {[
                  { id: "ALL", label: "Tất cả" },
                  { id: "LENT", label: "Cho vay" },
                  { id: "BORROWED", label: "Đi vay" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      filter === tab.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1 bg-[#2BA76F] hover:bg-emerald-600 active:scale-95 transition-all text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/10 shrink-0"
              >
                <PlusCircle className="w-4 h-4" /> Thêm khoản
              </button>
            </div>

            {/* Loans List */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
              {isLoading && loans.length === 0 ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
                  <span className="text-3xl block mb-2">📒</span>
                  <p className="font-bold text-gray-500 text-xs">Chưa có khoản vay nợ nào</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Nhấp nút bên trên để tạo khoản ghi chép mới</p>
                </div>
              ) : (
                filteredLoans.map(loan => (
                  <div
                    key={loan.id}
                    onClick={() => {
                      setSelectedLoan(loan);
                      setIsEditOpen(true);
                    }}
                    className={`bg-white rounded-[20px] p-3.5 border border-slate-100 shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 relative ${
                      loan.isSettled ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        loan.type === "LENT" 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-rose-50 text-rose-500"
                      }`}>
                        {loan.type === "LENT" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-800 truncate pr-8">{loan.counterpartyName}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 font-medium">
                          <span>{loan.type === "LENT" ? "Cho vay" : "Đi vay"}</span>
                          {loan.interestRate > 0 && (
                            <span className="bg-amber-50 text-amber-600 px-1 py-0.25 rounded text-[9px] font-bold">Lãi: {loan.interestRate}%/năm</span>
                          )}
                          {loan.isSettled && (
                            <span className="bg-slate-100 text-slate-600 px-1 py-0.25 rounded text-[9px] font-bold">Đã trả xong</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${
                        loan.type === "LENT" ? "text-emerald-600" : "text-rose-500"
                      }`}>
                        {loan.type === "LENT" ? "+" : "-"}{fmt(loan.principalAmount)}
                      </p>
                      {loan.dueDate && (
                        <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                          Hạn: {new Date(loan.dueDate).toLocaleDateString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </DrawerContent>
      </Drawer>

      {/* Add Loan Drawer */}
      <AddLoanDrawer
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSaved={() => {
          fetchLoans();
          onSaved?.();
        }}
      />

      {/* Edit Loan Drawer */}
      {selectedLoan && (
        <EditLoanDrawer
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          loan={selectedLoan}
          onSaved={() => {
            fetchLoans();
            onSaved?.();
          }}
        />
      )}
    </>
  );
}
