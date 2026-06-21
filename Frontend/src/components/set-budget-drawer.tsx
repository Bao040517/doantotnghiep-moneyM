"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/axios";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className = "w-5 h-5 text-teal-600" }: { name?: string, className?: string }) {
  if (!name) return <span className="text-xl">💰</span>;
  
  // Convert dash-case or lowercase to PascalCase (e.g. "shopping-cart" -> "ShoppingCart", "utensils" -> "Utensils")
  const pascalName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const IconComponent = (LucideIcons as any)[pascalName] || (LucideIcons as any)[name] || LucideIcons.Receipt;
  return <IconComponent className={className} />;
}

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
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SetBudgetDrawer({ open, onOpenChange, onSaved, year, month, editBudget }: SetBudgetDrawerProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isRollover, setIsRollover] = useState(false);
  const [type, setType] = useState("FLEXIBLE");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [dueDateString, setDueDateString] = useState("");
  const [payeeBankBin, setPayeeBankBin] = useState("");
  const [payeeBankAccount, setPayeeBankAccount] = useState("");
  const [payeeAccountName, setPayeeAccountName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const toggleTooltip = (key: string) => setActiveTooltip(activeTooltip === key ? null : key);

  useEffect(() => {
    if (open) {
      if (editBudget) {
        setName(editBudget.name || "");
        setAmount(new Intl.NumberFormat("vi-VN").format(editBudget.limitAmount));
        setCategoryId(editBudget.categoryId);
        setIsRollover(editBudget.isRollover || false);
        setType(editBudget.type || "FLEXIBLE");
        setIsRecurring(editBudget.isRecurring || false);
        setIsMandatory(editBudget.isMandatory || false);
        
        if (editBudget.dueDayOfMonth) {
           const y = year;
           const m = String(month).padStart(2, '0');
           const d = String(editBudget.dueDayOfMonth).padStart(2, '0');
           setDueDateString(`${y}-${m}-${d}`);
        } else {
           setDueDateString("");
        }
        setPayeeBankBin(editBudget.payeeBankBin || "");
        setPayeeBankAccount(editBudget.payeeBankAccount || "");
        setPayeeAccountName(editBudget.payeeAccountName || "");
      } else {
        setName("");
        setAmount("");
        setCategoryId("");
        setIsRollover(false);
        setType("FLEXIBLE");
        setIsRecurring(false);
        setIsMandatory(false);
        setDueDateString("");
        setPayeeBankBin("");
        setPayeeBankAccount("");
        setPayeeAccountName("");
      }
      api.get("/categories")
        .then(res => setCategories(res.data.filter((c: Category) => c.type === "EXPENSE" && c.name !== "Mục tiêu tiết kiệm")))
        .catch(() => {});
    }
  }, [open, editBudget, year, month]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setAmount(""); return; }
    setAmount(new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = amount.replace(/\D/g, "");
    if (!raw || !categoryId) { toast.error("Vui lòng điền đủ thông tin"); return; }
    setLoading(true);
    try {
      const payload: any = { 
        name: name || undefined, 
        categoryId, 
        limitAmount: Number(raw), 
        month, 
        year, 
        isRollover,
        type: type,
        isRecurring,
        isMandatory,
        dueDayOfMonth: dueDateString ? parseInt(dueDateString.split("-")[2], 10) : null,
        payeeBankBin,
        payeeBankAccount,
        payeeAccountName
      };
      if (editBudget?.budgetId) {
        payload.id = editBudget.budgetId;
      }
      
      await api.post("/budgets", payload);
      toast.success("Đã lưu thành công! 🎯");
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
      <DrawerContent className="bg-gradient-to-b from-[#f0faf8] to-[#e0f4f0] rounded-t-[40px] px-0 pb-0 border-none max-h-[95vh] flex flex-col font-sans overflow-hidden">
        {/* BEGIN: Decorative Elements */}
        <div className="absolute top-8 right-5 opacity-60 pointer-events-none">
          <img alt="Target" className="w-24 h-24" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDobG54qzOgdHgMZox8rd7DSIOhaOkv4-6KC31jbCAmWpPTYl_AAjDiCjkWFCkqrJZcwt0cMlEp0rUuRpDpSie1sBcrmkcAXXNRx1LUVeQYC8CcO86eo9Xs38QZLK_HI5bHC9j-FtTKwKe8LzEo558ZvzS32_V4E9Y3G-QuPfDgYEutbyx5kq3i9C6FbyJKBSU93b-mCmGny1Zrd9LBW_kMKLmHdzlw4nphXmzy31o8fDQUH7uCog5GzhL0mAOirzZ-D2fKmBSpmuc" />
        </div>
        <div className="absolute top-[180px] right-[30px] opacity-90 z-0 pointer-events-none">
          <img alt="Piggy Bank" className="w-20 h-20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtghcuUgPPi5Q-eIs0cuF9E42ywTt0j5wThayXKT7hTG11thYTI8bLqtuHHgoEb7xGrqCnqAReXA7m4tke6ZssoArSB8hzQJWVjm0sXo2LF1HAcx-Sx3lSImrf2q1MGeY4T48H3m5peMGZ-P1t4AVcWHhfdEaUk3-9f-Ff_kKPKezKMKPsgviqyIW6G2M5EV2jAf6lSI9pVUUUPP8j0DuNpdW8OrwFElCZ-BW3PIZtM9j8NkIBvyeKfBjkDkyyF2_nv5KhYNqbjo8" />
        </div>
        {/* Floating background line art */}
        <div className="absolute top-10 left-10 opacity-20 transform -rotate-12 pointer-events-none">
          <svg fill="none" height="40" stroke="#1f4d44" strokeWidth="1" viewBox="0 0 24 24" width="40"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"></path></svg>
        </div>
        {/* END: Decorative Elements */}

        <div className="mx-auto w-full max-w-md h-full overflow-y-auto hide-scrollbar z-10 relative">
          <div className="px-6 pb-24 pt-8 flex flex-col">
            {/* Header Section */}
            <DrawerHeader className="text-left pb-8 shrink-0 px-0">
              <DrawerTitle className="text-4xl font-bold text-[#1f4d44] leading-tight">
                {editBudget ? "Chỉnh Sửa Ngân Sách" : <><br/> Đặt <br/> Ngân Sách</>}
              </DrawerTitle>
            </DrawerHeader>
            
            <form id="set-budget-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Budget Name Input */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-3.5 flex items-center shadow-[0_8px_30px_rgba(31,77,68,0.06)] border border-[#66c2b1]/30 transition-all focus-within:bg-white focus-within:border-[#66c2b1] focus-within:shadow-[0_8px_30px_rgba(31,77,68,0.12)]">
                <div className="mr-4 text-[#66c2b1]">
                  <img alt="Pencil" className="w-7 h-7" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0k2nvrVf8h77CIl7mJAJsZKst1b1fMW64-rwnRrvMM9eT0B17FZaPeGIsw9unDzdhwUlOQjLlyOMkK33ep560Zmd-4PjQqwWzG6GhmqVRSMv9vZM97CwOwwWx3Gkt3a608hI5pz1ZZH5OZrqia3H10z5__YZvKKasOhxoYpy3dFQKwR2vJxTa7y5xto_F5xpRFcQ3Jytb-Qq0VnRnc-ASJ1vdwBsDz4egJvzi3hMFCzONVBrySN38murB2hbX4bmUlICFzmwxESA" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên ngân sách"
                  className="w-full border-none focus:ring-0 text-[17px] font-medium text-slate-800 placeholder-[#9ca3af] bg-transparent outline-none p-0"
                />
              </div>

              {/* Amount Input & Category Selector */}
              <div className="relative z-[60] bg-white/80 backdrop-blur-sm rounded-[24px] shadow-[0_8px_30px_rgba(31,77,68,0.06)] border border-[#66c2b1]/30 flex flex-col transition-all focus-within:bg-white focus-within:border-[#66c2b1] focus-within:shadow-[0_8px_30px_rgba(31,77,68,0.12)]">
                <div className="p-3.5 flex items-center">
                  <div className="mr-4">
                    <img alt="Coin" className="w-7 h-7" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBC2Da-YD4IZGX7oZjkp0YdzG2YT_8MPikbRQvHWLvyMob5kZ5kv1zZovHC26xYDYBMq3itDp7e9yE7HiKrXBfh_NQAyjnx4h_c5PMV-24HSCIjghsT_1HOmLaMxA1GU12EKcCXaFq38yVIC4pxSDWLbXlbgoIRiuOAXReo7HDKK-yDv42kMmANAAasdNnNnRG_aNyzKBuTa7szo1aZPI4N9SmEbJ2-V-yzUFMnxaSm3GEGV_h55VR-CCfp6zhXKYfoQAGzFHBxpIg" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Số tiền"
                    className="w-full border-none focus:ring-0 text-[17px] font-medium text-slate-800 placeholder-[#9ca3af] bg-transparent outline-none p-0"
                    required
                  />
                </div>
                <div className="border-t border-[#66c2b1]/20 p-1.5 relative">
                  <Select value={categoryId === "" ? null : categoryId} onValueChange={(val) => { if (val) setCategoryId(val); }}>
                    <SelectTrigger className="w-full h-11 border-none shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 text-[#66c2b1] font-semibold text-[15px] outline-none">
                      {categoryId ? (() => { const c = categories.find(cat => cat.id === categoryId); return c ? <div className="flex items-center gap-2"><DynamicIcon name={c.iconName} className="w-5 h-5" /><span>{c.name}</span></div> : "Chọn danh mục"; })() : "Chọn danh mục"}
                    </SelectTrigger>
                    <SelectContent portal={false} alignItemWithTrigger={false} className="rounded-2xl border-none shadow-[0_10px_40px_rgba(31,77,68,0.15)] z-[100] bg-white max-h-[40vh]">
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id} className="cursor-pointer py-3 rounded-xl focus:bg-[#e0f4f0]">
                          <div className="flex items-center gap-3">
                            <span className="bg-[#e0f4f0] text-[#1f4d44] w-8 h-8 flex items-center justify-center rounded-full"><DynamicIcon name={c.iconName} className="w-4 h-4" /></span>
                            <span className="font-medium text-gray-700">{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Budget Type Selector */}
              <div className="bg-slate-100 p-1.5 rounded-[20px] flex items-center shadow-inner mt-2">
                <button
                  type="button"
                  onClick={() => setType("FLEXIBLE")}
                  className={`flex-1 py-2.5 rounded-[16px] text-[14px] font-bold transition-all ${type === "FLEXIBLE" ? "bg-white text-[#1f4d44] shadow-[0_4px_10px_rgba(0,0,0,0.05)]" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Linh hoạt
                </button>
                <button
                  type="button"
                  onClick={() => { setType("BILL"); }}
                  className={`flex-1 py-2.5 rounded-[16px] text-[14px] font-bold transition-all ${type === "BILL" ? "bg-white text-[#1f4d44] shadow-[0_4px_10px_rgba(0,0,0,0.05)]" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Cố định
                </button>
              </div>

              {/* Payee Info for BILL type */}
              {type === "BILL" && (
                <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-[14px] font-bold text-slate-700 mb-1">Thông tin thanh toán (Người nhận)</h4>
                  
                  <div className="bg-white rounded-xl border border-slate-200">
                    <Select value={payeeBankBin} onValueChange={setPayeeBankBin}>
                      <SelectTrigger className="w-full h-11 border-none bg-transparent focus:ring-0 shadow-none text-slate-800 font-medium">
                        <SelectValue placeholder="Chọn Ngân hàng nhận" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="970436">Vietcombank</SelectItem>
                        <SelectItem value="970415">VietinBank</SelectItem>
                        <SelectItem value="970418">BIDV</SelectItem>
                        <SelectItem value="970405">Agribank</SelectItem>
                        <SelectItem value="970422">MBBank</SelectItem>
                        <SelectItem value="970407">Techcombank</SelectItem>
                        <SelectItem value="970432">VPBank</SelectItem>
                        <SelectItem value="970416">ACB</SelectItem>
                        <SelectItem value="970423">TPBank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                    <input
                      type="text"
                      value={payeeBankAccount}
                      onChange={(e) => setPayeeBankAccount(e.target.value)}
                      placeholder="Số tài khoản nhận"
                      className="w-full border-none focus:ring-0 text-[15px] font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none p-0"
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                    <input
                      type="text"
                      value={payeeAccountName}
                      onChange={(e) => setPayeeAccountName(e.target.value)}
                      placeholder="Tên người nhận (Đơn vị)"
                      className="w-full border-none focus:ring-0 text-[15px] font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none p-0"
                    />
                  </div>
                </div>
              )}

              {/* Toggles Section */}
              <div className="space-y-4 px-2 pt-2 pb-2">
                {/* Toggle 1: Rollover */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] text-gray-800 font-medium">Chuyển sang tháng sau</span>
                      <button type="button" onClick={() => toggleTooltip("rollover")} className="w-[18px] h-[18px] rounded-full bg-slate-200 text-slate-500 text-[11px] flex items-center justify-center font-bold pb-px hover:bg-slate-300 transition-colors">?</button>
                    </div>
                    <div className="relative inline-block w-12 h-7 align-middle select-none">
                      <input type="checkbox" checked={isRollover} onChange={() => setIsRollover(!isRollover)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer opacity-0 z-10" id="toggle1" />
                      <label htmlFor="toggle1" className={`toggle-label block overflow-hidden h-7 rounded-full cursor-pointer relative transition-colors duration-300 ${isRollover ? 'bg-[#a7f3d0]' : 'bg-gray-200'}`}>
                        <span className={`absolute top-[2px] left-[2px] w-[24px] h-[24px] bg-white rounded-full transition-transform duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.1)] ${isRollover ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                      </label>
                    </div>
                  </div>
                  {activeTooltip === "rollover" && (
                    <div className="text-[13px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                      Số dư còn lại của ngân sách sẽ được cộng dồn sang tháng tiếp theo.
                    </div>
                  )}
                </div>
                {/* Toggle 2: Mandatory */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] text-gray-800 font-medium">Ưu tiên thanh toán</span>
                      <button type="button" onClick={() => toggleTooltip("mandatory")} className="w-[18px] h-[18px] rounded-full bg-slate-200 text-slate-500 text-[11px] flex items-center justify-center font-bold pb-px hover:bg-slate-300 transition-colors">?</button>
                    </div>
                    <div className="relative inline-block w-12 h-7 align-middle select-none">
                      <input type="checkbox" checked={isMandatory} onChange={() => setIsMandatory(!isMandatory)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer opacity-0 z-10" id="toggle2" />
                      <label htmlFor="toggle2" className={`toggle-label block overflow-hidden h-7 rounded-full cursor-pointer relative transition-colors duration-300 ${isMandatory ? 'bg-[#a7f3d0]' : 'bg-gray-200'}`}>
                        <span className={`absolute top-[2px] left-[2px] w-[24px] h-[24px] bg-white rounded-full transition-transform duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.1)] ${isMandatory ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                      </label>
                    </div>
                  </div>
                  {activeTooltip === "mandatory" && (
                    <div className="text-[13px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                      Hệ thống sẽ ưu tiên trích tiền từ ví cho các khoản này trước.
                    </div>
                  )}
                </div>
                {/* Toggle 3: Recurring */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] text-gray-800 font-medium">Lặp lại hàng tháng</span>
                      <button type="button" onClick={() => toggleTooltip("recurring")} className="w-[18px] h-[18px] rounded-full bg-slate-200 text-slate-500 text-[11px] flex items-center justify-center font-bold pb-px hover:bg-slate-300 transition-colors">?</button>
                    </div>
                    <div className="relative inline-block w-12 h-7 align-middle select-none">
                      <input type="checkbox" checked={isRecurring} onChange={() => setIsRecurring(!isRecurring)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer opacity-0 z-10" id="toggle3" />
                      <label htmlFor="toggle3" className={`toggle-label block overflow-hidden h-7 rounded-full cursor-pointer relative transition-colors duration-300 ${isRecurring ? 'bg-[#a7f3d0]' : 'bg-gray-200'}`}>
                        <span className={`absolute top-[2px] left-[2px] w-[24px] h-[24px] bg-white rounded-full transition-transform duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.1)] ${isRecurring ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                      </label>
                    </div>
                  </div>
                  {activeTooltip === "recurring" && (
                    <div className="text-[13px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                      Tự động tạo lại khoản chi này vào mỗi tháng mới.
                    </div>
                  )}
                </div>
              </div>

              {/* Start Date Input (Due Date) */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-3.5 flex items-center shadow-[0_8px_30px_rgba(31,77,68,0.06)] border border-[#66c2b1]/30 transition-all focus-within:bg-white focus-within:border-[#66c2b1] focus-within:shadow-[0_8px_30px_rgba(31,77,68,0.12)]">
                <input
                  type="date"
                  value={dueDateString}
                  min={getTodayString()}
                  onChange={(e) => setDueDateString(e.target.value)}
                  className="w-full border-none focus:ring-0 text-[16px] font-medium text-slate-800 bg-transparent outline-none p-0"
                  style={{ color: dueDateString ? '#1e293b' : '#9ca3af', colorScheme: 'light', accentColor: '#66c2b1' }}
                />
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-[24px] bg-gradient-to-r from-[#88d6c8] to-[#60bba9] text-white text-[18px] font-bold shadow-[0_8px_20px_rgba(96,187,169,0.4)] active:scale-[0.98] transition-transform disabled:opacity-70"
                >
                  {loading ? "Đang lưu..." : "Lưu ngân sách"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
