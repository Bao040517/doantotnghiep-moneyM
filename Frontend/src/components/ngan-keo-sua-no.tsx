"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { toast } from "sonner";

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

interface EditLoanDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: ExternalLoanDTO;
  onSaved: () => void;
}

export function EditLoanDrawer({
  open,
  onOpenChange,
  loan,
  onSaved,
}: EditLoanDrawerProps) {
  const [type, setType] = useState<"LENT" | "BORROWED">(loan.type);
  const [counterpartyName, setCounterpartyName] = useState(
    loan.counterpartyName,
  );
  const [principalAmount, setPrincipalAmount] = useState(
    new Intl.NumberFormat("vi-VN").format(loan.principalAmount),
  );
  const [interestRate, setInterestRate] = useState(
    String(loan.interestRate || 0),
  );
  const [startDate, setStartDate] = useState(loan.startDate || "");
  const [dueDate, setDueDate] = useState(loan.dueDate || "");
  const [description, setDescription] = useState(loan.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettled, setIsSettled] = useState(loan.isSettled);

  useEffect(() => {
    if (open && loan) {
      setType(loan.type);
      setCounterpartyName(loan.counterpartyName);
      setPrincipalAmount(
        new Intl.NumberFormat("vi-VN").format(loan.principalAmount),
      );
      setInterestRate(String(loan.interestRate || 0));
      setStartDate(loan.startDate || "");
      setDueDate(loan.dueDate || "");
      setDescription(loan.description || "");
      setIsSettled(loan.isSettled);
    }
  }, [open, loan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartyName.trim() || !principalAmount) {
      toast.error("Vui lòng điền đủ tên và số tiền gốc.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/external-loans/${loan.id}`, {
        type,
        counterpartyName: counterpartyName.trim(),
        principalAmount: parseFloat(principalAmount.replace(/\D/g, "")),
        interestRate: parseFloat(interestRate || "0"),
        startDate: startDate || null,
        dueDate: dueDate || null,
        description: description.trim(),
        isSettled: isSettled,
      });
      toast.success("Cập nhật sổ nợ thành công!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa sổ nợ này?")) return;
    try {
      setIsDeleting(true);
      await api.delete(`/external-loans/${loan.id}`);
      toast.success("Xóa sổ nợ thành công!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Có lỗi xảy ra khi xóa.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#f0f4f8] max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-xl font-extrabold text-gray-800 text-center">
            Chi tiết Sổ Nợ
          </DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit}
          className="px-5 pb-8 overflow-y-auto space-y-5 mt-2"
        >
          {/* LOAN TYPE TOGGLE */}
          <div className="flex bg-gray-200/50 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setType("LENT")}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                type === "LENT"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Cho Vay
            </button>
            <button
              type="button"
              onClick={() => setType("BORROWED")}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                type === "BORROWED"
                  ? "bg-white text-rose-500 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Đi Vay
            </button>
          </div>

          <div className="bg-white p-5 rounded-[24px] shadow-sm space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                {type === "LENT" ? "Tên người mượn (Con nợ)" : "Tên chủ nợ"}
              </label>
              <Input
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder={
                  type === "LENT" ? "VD: Thằng bạn thân..." : "VD: FE Credit..."
                }
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                Tiền gốc (VNĐ)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={principalAmount}
                onChange={(e) => {
                  let raw = e.target.value.replace(/\D/g, "");
                  if (!raw) {
                    setPrincipalAmount("");
                    return;
                  }
                  setPrincipalAmount(
                    new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)),
                  );
                }}
                placeholder="0"
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-lg font-black focus-visible:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                Lãi suất (% / năm)
              </label>
              <Input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                  Ngày bắt đầu
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-blue-500 block w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                  Ngày trả (Đáo hạn)
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-blue-500 block w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                Ghi chú thêm
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isSettled"
                checked={isSettled}
                onChange={(e) => setIsSettled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="isSettled"
                className="text-sm font-bold text-gray-700"
              >
                Đã thanh toán (Trả xong)
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="h-14 w-14 rounded-2xl shrink-0 bg-red-100 text-red-600 hover:bg-red-200 shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 h-14 rounded-2xl text-lg font-bold shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              }}
            >
              {isSubmitting ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
