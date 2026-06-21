"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { toast } from "sonner";

interface AddLoanDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddLoanDrawer({ open, onOpenChange, onSaved }: AddLoanDrawerProps) {
  const [type, setType] = useState<"LENT" | "BORROWED">("LENT");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartyName.trim() || !principalAmount) {
      toast.error("Vui lòng điền đủ tên và số tiền gốc.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/external-loans", {
        type,
        counterpartyName: counterpartyName.trim(),
        principalAmount: parseFloat(principalAmount.replace(/\D/g, "")),
        interestRate: parseFloat(interestRate || "0"),
        startDate: startDate || null,
        dueDate: dueDate || null,
        description: description.trim()
      });
      toast.success("Thêm sổ nợ thành công!");
      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setType("LENT");
    setCounterpartyName("");
    setPrincipalAmount("");
    setInterestRate("");
    setStartDate("");
    setDueDate("");
    setDescription("");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#f0f4f8] max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-xl font-extrabold text-gray-800 text-center">
            Thêm Khoản Vay / Nợ ngoài
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-5 pb-8 overflow-y-auto space-y-5 mt-2">
          {/* LOAN TYPE TOGGLE */}
          <div className="flex bg-gray-200/50 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setType("LENT")}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                type === "LENT" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
              }`}
            >
              Cho Vay
            </button>
            <button
              type="button"
              onClick={() => setType("BORROWED")}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                type === "BORROWED" ? "bg-white text-rose-500 shadow-sm" : "text-gray-500"
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
                placeholder={type === "LENT" ? "VD: Thằng bạn thân..." : "VD: FE Credit, Thẻ tín dụng..."}
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Tiền gốc (VNĐ)</label>
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
                  setPrincipalAmount(new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)));
                }}
                placeholder="0"
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-lg font-black focus-visible:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Lãi suất (% / năm)</label>
              <Input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="VD: 10.5 (Nếu không có lãi thì để 0)"
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-emerald-500 block w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Ngày trả (Đáo hạn)</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-emerald-500 block w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Ghi chú thêm</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Mượn mua xe..."
                className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-full text-lg font-bold shadow-lg"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
          >
            {isSubmitting ? "Đang lưu..." : "Tạo Sổ Nợ"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
