"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/axios";
import { SavingsGoal } from "./tab-tiet-kiem";

interface EditSavingsGoalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal | null;
  onSaved: () => void;
}

export function EditSavingsGoalDrawer({
  open,
  onOpenChange,
  goal,
  onSaved,
}: EditSavingsGoalDrawerProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (open && goal) {
      setName(goal.name);
      setTargetAmount(new Intl.NumberFormat("vi-VN").format(goal.targetAmount));
      setDeadlineDate(goal.deadlineDate ? goal.deadlineDate.split("T")[0] : "");
    }
  }, [open, goal]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setTargetAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(
      parseInt(rawValue, 10),
    );
    setTargetAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal) return;

    const rawAmount = targetAmount.replace(/\D/g, "");

    if (!name.trim() || !rawAmount) {
      toast.error("Vui lòng nhập tên và số tiền mục tiêu");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/savings-goals/${goal.id}`, {
        name,
        targetAmount: Number(rawAmount),
        deadlineDate: deadlineDate || null,
      });
      toast.success("Đã cập nhật mục tiêu tiết kiệm! 🎯");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!goal) return;
    setShowConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    if (!goal) return;
    setShowConfirmDelete(false);
    setIsDeleting(true);
    try {
      await api.delete(`/savings-goals/${goal.id}`);
      toast.success("Đã xóa mục tiêu và hoàn tiền vào ví! 💰");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!goal) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gradient-to-b from-[#dff5ef] to-[#f4fdfb] rounded-t-[40px] px-2 pb-6 border-none">
        <div className="mx-auto w-full max-w-sm pt-2">
          <DrawerHeader className="text-center pb-6">
            <DrawerTitle className="text-2xl font-bold text-slate-800">
              Sửa mục tiêu
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4">
            <form
              id="edit-savings-goal-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="edit-goal-name"
                  className="text-[13px] font-medium text-slate-700 px-1"
                >
                  Tên mục tiêu
                </Label>
                <Input
                  id="edit-goal-name"
                  placeholder="Nhập tên mục tiêu (VD: Mua iPhone)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 px-5 rounded-2xl border-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] bg-white focus-visible:ring-2 focus-visible:ring-teal-500 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-goal-amount"
                  className="text-[13px] font-medium text-slate-700 px-1"
                >
                  Số tiền mục tiêu (VNĐ)
                </Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-base">
                    ₫
                  </span>
                  <Input
                    id="edit-goal-amount"
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
                <Label
                  htmlFor="edit-due-date"
                  className="text-[13px] font-medium text-slate-700 px-1"
                >
                  Ngày đến hạn (Không bắt buộc)
                </Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="h-14 px-5 rounded-2xl border-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] bg-white focus-visible:ring-2 focus-visible:ring-teal-500 text-base"
                />
              </div>

              <div className="pt-2 pb-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={loading || isDeleting}
                  className="w-full h-[56px] bg-[#68b19c] hover:bg-[#59a08c] text-white text-[17px] font-semibold rounded-full shadow-sm active:scale-[0.98] transition-all"
                >
                  {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || isDeleting}
                  variant="outline"
                  className="w-full h-[56px] text-red-500 border-red-200 hover:bg-red-50 text-[17px] font-semibold rounded-full shadow-sm active:scale-[0.98] transition-all"
                >
                  {isDeleting ? "Đang xóa..." : "Xóa mục tiêu (Hoàn tiền)"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Confirm Delete Modal */}
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-[19px] font-extrabold text-slate-800 mb-2 text-center">
                Xóa mục tiêu này?
              </h3>
              <p className="text-[13px] text-slate-500 text-center mb-6">
                Toàn bộ số tiền sẽ được hoàn lại vào ví của bạn. Bạn có chắc
                chắn muốn xóa không?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[15px] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeleteAction}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[15px] transition-colors shadow-[0_4px_12px_rgba(244,63,94,0.3)]"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
