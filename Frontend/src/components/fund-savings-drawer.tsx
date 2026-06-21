"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { toast } from "sonner";
import api from "@/lib/axios";
import { SavingsGoal } from "./savings-tab";

interface FundSavingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal;
  walletBalance: number;
  onSaved: () => void;
}

type ActionType = "FUND" | "WITHDRAW";

export function FundSavingsDrawer({ open, onOpenChange, goal, walletBalance, onSaved }: FundSavingsDrawerProps) {
  const [action, setAction] = useState<ActionType>("FUND");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setAction("FUND");
    }
  }, [open]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(rawValue, 10));
    setAmount(formatted);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN").format(val) + "đ";
  };

  const handleSubmit = async () => {
    const rawAmount = amount.replace(/\D/g, "");
    const numAmount = Number(rawAmount);

    if (!numAmount || numAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (action === "FUND" && numAmount > walletBalance) {
      toast.error("Số dư ví không đủ để nạp tiền");
      return;
    }

    if (action === "WITHDRAW" && numAmount > goal.currentAmount) {
      toast.error("Số dư tiết kiệm không đủ để rút");
      return;
    }

    setLoading(true);
    try {
      if (action === "FUND") {
        await api.post(`/savings-goals/${goal.id}/fund`, { amount: numAmount });
        toast.success("Đã nạp tiền thành công! 🎉");
      } else {
        await api.post(`/savings-goals/${goal.id}/withdraw`, { amount: numAmount });
        toast.success("Đã rút tiền thành công!");
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const isFund = action === "FUND";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#E4F9F2] h-[90%] rounded-t-[40px] px-0 border-none">
        <div className="w-full h-full flex flex-col relative pt-2 pb-6">
          
          {/* Header Section */}
          <div className="w-full flex justify-between items-center px-6 mb-4">
            <div className="flex-1"></div>
            {/* Close Button */}
            <button 
              onClick={() => onOpenChange(false)}
              className="px-5 py-1.5 border border-gray-300 rounded-full text-gray-500 font-medium text-sm hover:bg-white/50 active:scale-95 transition-all"
            >
              Đóng
            </button>
          </div>

          {/* Segmented Control */}
          <div className="px-6 mb-6">
            <div className="w-full bg-black/5 p-1 rounded-full flex">
              <button 
                onClick={() => setAction("FUND")}
                className={`flex-1 py-2.5 font-medium rounded-full text-lg transition-all ${isFund ? 'bg-[#74D7AC] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Nạp thêm
              </button>
              <button 
                onClick={() => setAction("WITHDRAW")}
                className={`flex-1 py-2.5 font-medium rounded-full text-lg transition-all ${!isFund ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Rút bớt
              </button>
            </div>
          </div>

          <div className="text-center px-6 mb-4">
            <p className="font-semibold text-gray-700">{goal.name}</p>
          </div>

          {/* Amount Section */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 mt-10 mb-20 relative">
            
            {/* Invisible input overlaying for focus and typing */}
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
              autoFocus
            />
            
            {/* Display Amount */}
            <div className="text-[52px] font-bold text-black mb-2 tracking-tight flex items-baseline justify-center">
              {amount || "0"}
              <span className="text-3xl ml-1 text-gray-500">₫</span>
            </div>

            {/* Subtext info */}
            <p className="text-sm font-medium text-gray-600 mt-4 px-4 py-2 bg-black/5 rounded-full">
              {isFund 
                ? `Số dư ví hiện tại: ${formatCurrency(walletBalance)}` 
                : `Tiết kiệm hiện tại: ${formatCurrency(goal.currentAmount)}`
              }
            </p>
          </div>

          {/* Footer Action */}
          <div className="w-full px-6 mt-auto">
            <button 
              disabled={loading}
              onClick={handleSubmit}
              className={`w-full text-white font-medium py-4 rounded-[32px] text-xl transition-all active:scale-[0.98] shadow-sm ${
                isFund 
                  ? 'bg-[#74D7AC] hover:bg-[#5BB68E]' 
                  : 'bg-orange-400 hover:bg-orange-500'
              } disabled:opacity-50`}
            >
              {loading 
                ? "Đang xử lý..." 
                : (isFund ? "Xác nhận nạp" : "Xác nhận rút")
              }
            </button>
          </div>

        </div>
      </DrawerContent>
    </Drawer>
  );
}
