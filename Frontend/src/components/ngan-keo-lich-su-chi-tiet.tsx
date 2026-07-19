"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: { id: string; name: string; type: string; iconName: string };
  transactionDate: string;
  note: string;
  linkedExpenseId: string | null;
}

interface TransactionHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
}

export function TransactionHistoryDrawer({
  open,
  onOpenChange,
  transactions,
}: TransactionHistoryDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#f8fafc] max-h-[85vh]">
        <div className="mx-auto w-full max-w-md h-full flex flex-col">
          <DrawerHeader className="bg-white border-b border-gray-100 shrink-0">
            <DrawerTitle className="text-xl font-bold text-center">
              Lịch sử giao dịch
            </DrawerTitle>
            <DrawerDescription className="text-center">
              Các giao dịch trong tháng
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-emerald-200">
                  <div className="w-16 h-16 bg-[#B3E5D1] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <span className="text-2xl">🍃</span>
                  </div>
                  <p className="text-gray-500 font-bold">
                    Chưa có giao dịch nào
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tháng này chưa ghi chép giao dịch nào!
                  </p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white p-4 rounded-[1.5rem] flex items-center justify-between shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                          tx.type === "INCOME"
                            ? "bg-[#d1fae5] text-emerald-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {tx.category?.iconName ||
                          (tx.type === "INCOME" ? "💵" : "💸")}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-[15px] leading-tight">
                          {tx.category?.name || "Chi tiêu"}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {format(
                            new Date(tx.transactionDate),
                            "dd MMM, HH:mm",
                            { locale: vi },
                          )}
                        </p>
                        {tx.note && (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[160px]">
                            {tx.note}
                          </p>
                        )}
                        {tx.linkedExpenseId && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-[#e0f2fe] text-blue-600 text-[9px] font-black rounded-full uppercase tracking-wider">
                            🔗 Từ nhóm
                          </span>
                        )}
                        {tx.linkedExpenseId &&
                          tx.type === "EXPENSE" &&
                          tx.note !== "Thanh toán nợ nhóm" && (
                            <span className="inline-block mt-1 ml-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-wider border border-amber-100">
                              💸 Chi hộ nhóm
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-black text-base ${tx.type === "INCOME" ? "text-emerald-600" : "text-gray-900"}`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {new Intl.NumberFormat("vi-VN").format(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
