"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/axios";
import { 
  Pencil, 
  Coins, 
  Calendar, 
  CheckCircle2, 
  Repeat, 
  HelpCircle, 
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  iconName: string;
}

interface SetBudgetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  year: number;
  month: number;
  editBudget?: any;
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SetBudgetDrawer({
  open,
  onOpenChange,
  onSaved,
  year,
  month,
  editBudget,
}: SetBudgetDrawerProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [type, setType] = useState<"FLEXIBLE" | "BILL">("FLEXIBLE");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [dueDateString, setDueDateString] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const toggleTooltip = (key: string) =>
    setActiveTooltip(activeTooltip === key ? null : key);

  useEffect(() => {
    if (open) {
      if (editBudget) {
        setName(editBudget.name || "");
        setAmount(
          new Intl.NumberFormat("vi-VN").format(editBudget.limitAmount)
        );
        setCategoryId(editBudget.categoryId || "");
        setType(editBudget.type || "FLEXIBLE");
        setIsRecurring(editBudget.isRecurring || false);
        setIsMandatory(editBudget.isMandatory || false);

        if (editBudget.dueDayOfMonth) {
          const y = year;
          const m = String(month).padStart(2, "0");
          const d = String(editBudget.dueDayOfMonth).padStart(2, "0");
          setDueDateString(`${y}-${m}-${d}`);
        } else {
          setDueDateString("");
        }
      } else {
        setName("");
        setAmount("");
        setCategoryId("");
        setType("FLEXIBLE");
        setIsRecurring(false);
        setIsMandatory(false);
        setDueDateString("");
      }

      api
        .get("/categories")
        .then((res) =>
          setCategories(
            res.data.filter(
              (c: Category) =>
                c.type === "EXPENSE" && c.name !== "Mục tiêu tiết kiệm"
            )
          )
        )
        .catch(() => {});
    }
  }, [open, editBudget, year, month]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAmount("");
      return;
    }
    setAmount(new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = amount.replace(/\D/g, "");
    if (!raw || !categoryId) {
      toast.error("Vui lòng điền số tiền và chọn danh mục!");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        name: name || undefined,
        categoryId,
        limitAmount: Number(raw),
        month,
        year,
        type,
        isRecurring,
        isMandatory,
        dueDayOfMonth: dueDateString
          ? parseInt(dueDateString.split("-")[2], 10)
          : null,
      };
      if (editBudget?.budgetId) {
        payload.id = editBudget.budgetId;
      }

      await api.post("/budgets", payload);
      toast.success(editBudget ? "Đã cập nhật ngân sách! ✨" : "Đã tạo ngân sách thành công! 🎯");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-slate-50/95 backdrop-blur-xl rounded-t-[36px] px-0 pb-0 border-t border-white/60 shadow-2xl max-h-[92vh] flex flex-col font-sans overflow-hidden">
        {/* Drag Handle indicator */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-300/60 mt-3 shrink-0" />

        <div className="mx-auto w-full max-w-md h-full overflow-y-auto hide-scrollbar z-10 relative">
          <div className="px-6 pb-24 pt-4 flex flex-col">
            
            {/* Form Header */}
            <DrawerHeader className="text-left pb-6 pt-2 shrink-0 px-0 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Quản lý hạn mức</span>
                </div>
                <DrawerTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
                  {editBudget ? "Chỉnh sửa ngân sách" : "Tạo ngân sách mới"}
                </DrawerTitle>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                <Layers className="w-6 h-6" />
              </div>
            </DrawerHeader>

            <form id="set-budget-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* Field 1: Amount (Hạn mức số tiền) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  Hạn mức số tiền <span className="text-rose-500">*</span>
                </label>
                <div className="bg-white rounded-2xl p-3.5 flex items-center shadow-sm border border-slate-200/80 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-3 shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="VD: 5.000.000"
                    className="w-full border-none focus:outline-none text-xl font-bold text-slate-800 placeholder-slate-300 bg-transparent p-0"
                    required
                  />
                  <span className="text-sm font-bold text-emerald-600 ml-2 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                    VNĐ
                  </span>
                </div>
              </div>

              {/* Field 2: Category Selector (Danh mục chi tiêu) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  Danh mục áp dụng <span className="text-rose-500">*</span>
                </label>
                <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <Select
                    value={categoryId === "" ? null : categoryId}
                    onValueChange={(val) => {
                      if (val) setCategoryId(val);
                    }}
                  >
                    <SelectTrigger className="w-full h-12 border-none shadow-none bg-transparent focus:ring-0 text-slate-800 font-semibold text-base outline-none px-3">
                      {categoryId ? (
                        (() => {
                          const c = categories.find((cat) => cat.id === categoryId);
                          return c ? (
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">
                                {c.iconName}
                              </span>
                              <span className="font-bold text-slate-800">{c.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">Chọn danh mục</span>
                          );
                        })()
                      ) : (
                        <span className="text-slate-400 font-normal">Chọn danh mục chi tiêu</span>
                      )}
                    </SelectTrigger>
                    <SelectContent
                      portal={false}
                      alignItemWithTrigger={false}
                      className="rounded-2xl border border-slate-100 shadow-xl z-[100] bg-white max-h-[40vh] p-1.5"
                    >
                      {categories.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          className="cursor-pointer py-2.5 px-3 rounded-xl focus:bg-emerald-50 focus:text-emerald-900 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-base shrink-0">
                              {c.iconName}
                            </span>
                            <span className="font-bold text-slate-700">{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Field 3: Budget Name (Tên ngân sách / Ghi chú - Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  Tên ngân sách <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <div className="bg-white rounded-2xl p-3.5 flex items-center shadow-sm border border-slate-200/80 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mr-3 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Ngân sách Ăn uống T7"
                    className="w-full border-none focus:outline-none text-base font-medium text-slate-800 placeholder-slate-300 bg-transparent p-0"
                  />
                </div>
              </div>

              {/* Field 4: Budget Type Selector (Linh hoạt vs Cố định) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  Phân loại chi tiêu
                </label>
                <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setType("FLEXIBLE")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                      type === "FLEXIBLE"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span>🎯 Linh hoạt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("BILL")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                      type === "BILL"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span>📌 Hóa đơn cố định</span>
                  </button>
                </div>
              </div>

              {/* Field 5: Toggles & Options */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4">
                
                {/* Mandatory Toggle */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isMandatory ? "text-amber-500" : "text-slate-400"}`} />
                      <span className="text-sm font-bold text-slate-700">Ưu tiên thanh toán hàng đầu</span>
                      <button
                        type="button"
                        onClick={() => toggleTooltip("mandatory")}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setIsMandatory(!isMandatory)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        isMandatory ? "bg-amber-400" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          isMandatory ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {activeTooltip === "mandatory" && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1 animate-in fade-in">
                      Hệ thống sẽ tự động giữ lại khoản tiền này trong ví để đảm bảo bạn không lỡ tay tiêu hết.
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100" />

                {/* Recurring Toggle */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Repeat className={`w-4 h-4 ${isRecurring ? "text-emerald-500" : "text-slate-400"}`} />
                      <span className="text-sm font-bold text-slate-700">Tự động lặp lại hàng tháng</span>
                      <button
                        type="button"
                        onClick={() => toggleTooltip("recurring")}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        isRecurring ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          isRecurring ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {activeTooltip === "recurring" && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1 animate-in fade-in">
                      Tự động duy trì hạn mức này sang tháng sau mà không cần thiết lập lại.
                    </div>
                  )}
                </div>
              </div>

              {/* Field 6: Due Date (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  Hạn thanh toán hàng tháng <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <div className="bg-white rounded-2xl p-3.5 flex items-center shadow-sm border border-slate-200/80 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mr-3 shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="date"
                    value={dueDateString}
                    min={getTodayString()}
                    onChange={(e) => setDueDateString(e.target.value)}
                    className="w-full border-none focus:outline-none text-base font-medium text-slate-800 bg-transparent p-0"
                    style={{
                      color: dueDateString ? "#1e293b" : "#9ca3af",
                      colorScheme: "light",
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-base font-extrabold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span>{editBudget ? "Cập nhật ngân sách" : "Lưu ngân sách ngay"}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
