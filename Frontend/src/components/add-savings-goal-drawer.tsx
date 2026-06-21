"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/axios";

interface AddSavingsGoalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddSavingsGoalDrawer({ open, onOpenChange, onSaved }: AddSavingsGoalDrawerProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setTargetAmount("");
      setDeadlineDate("");
    }
  }, [open]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setTargetAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(rawValue, 10));
    setTargetAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = targetAmount.replace(/\D/g, "");
    
    if (!name.trim() || !rawAmount) {
      toast.error("Vui lòng nhập tên và số tiền mục tiêu");
      return;
    }

    setLoading(true);
    try {
      await api.post("/savings-goals", {
        name,
        targetAmount: Number(rawAmount),
        deadlineDate: deadlineDate || null
      });
      toast.success("Đã tạo mục tiêu tiết kiệm! 🎯");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gradient-to-b from-[#dff5ef] to-[#f4fdfb] rounded-t-[40px] px-2 pb-6 border-none">
        <div className="mx-auto w-full max-w-sm pt-2">
          <DrawerHeader className="text-center pb-6">
            <DrawerTitle className="text-2xl font-bold text-slate-800">Tạo mục tiêu</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4">
            <form id="add-savings-goal-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="goal-name" className="text-[13px] font-medium text-slate-700 px-1">Tên mục tiêu</Label>
                <Input
                  id="goal-name"
                  placeholder="Nhập tên mục tiêu (VD: Mua iPhone)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 px-5 rounded-2xl border-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] bg-white focus-visible:ring-2 focus-visible:ring-teal-500 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-amount" className="text-[13px] font-medium text-slate-700 px-1">Số tiền mục tiêu (VNĐ)</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-base">₫</span>
                  <Input
                    id="goal-amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={targetAmount}
                    onChange={handleAmountChange}
                    className="h-14 pl-10 pr-5 rounded-2xl border-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] bg-white focus-visible:ring-2 focus-visible:ring-teal-500 text-base font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-[13px] font-medium text-slate-700 px-1">Ngày đến hạn (Không bắt buộc)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="h-14 px-5 rounded-2xl border-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] bg-white focus-visible:ring-2 focus-visible:ring-teal-500 text-base"
                />
              </div>

              <div className="pt-4 pb-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-[56px] bg-[#68b19c] hover:bg-[#59a08c] text-white text-[17px] font-semibold rounded-full shadow-sm active:scale-[0.98] transition-all"
                >
                  {loading ? "Đang tạo..." : "Tạo mục tiêu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
