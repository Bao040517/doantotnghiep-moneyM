"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Receipt, Utensils, Car, Home, Gamepad2, ShoppingBag, Pill, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/axios";

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt: string;
}

interface EditExpenseDrawerProps {
  groupId: string;
  expenseId: string;
  members: Member[];
  onExpenseUpdated: () => void;
  children: React.ReactNode;
}

const expenseSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tên khoản chi").max(200),
  amount: z.string().min(1, "Vui lòng nhập số tiền").refine((val) => {
    const rawVal = val.replace(/\D/g, "");
    return !isNaN(Number(rawVal)) && Number(rawVal) > 0;
  }, "Số tiền phải lớn hơn 0"),
  category: z.string().max(50).optional(),
  paidBy: z.string().min(1, "Vui lòng chọn người thanh toán"),
});

const CATEGORIES = [
  { value: "Ăn uống", label: "Ăn uống", icon: Utensils, bgColor: "bg-[#FFE4E4]", iconColor: "text-[#F08080]" },
  { value: "Di chuyển", label: "Di chuyển", icon: Car, bgColor: "bg-[#E5D1FF]", iconColor: "text-purple-400" },
  { value: "Lưu trú", label: "Lưu trú", icon: Home, bgColor: "bg-[#D1E9FF]", iconColor: "text-blue-500" },
  { value: "Giải trí", label: "Giải trí", icon: Gamepad2, bgColor: "bg-[#D1FFF5]", iconColor: "text-teal-400" },
  { value: "Mua sắm", label: "Mua sắm", icon: ShoppingBag, bgColor: "bg-[#FFF9D1]", iconColor: "text-yellow-500" },
  { value: "Sức khỏe", label: "Sức khỏe", icon: Pill, bgColor: "bg-[#FFD1E6]", iconColor: "text-pink-400" },
  { value: "Hóa đơn", label: "Hóa đơn", icon: Receipt, bgColor: "bg-[#D6EAF8]", iconColor: "text-[#2980B9]" },
  { value: "Khác", label: "Khác", icon: Package, bgColor: "bg-slate-100", iconColor: "text-slate-400" },
];

export function EditExpenseDrawer({ groupId, expenseId, members, onExpenseUpdated, children }: EditExpenseDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<"all" | "custom">("all");
  const [isOwner, setIsOwner] = useState(false);
  const [expenseInfo, setExpenseInfo] = useState<{ payerName: string; amount: number; title: string } | null>(null);

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "Khác",
      paidBy: "",
    },
  });

  useEffect(() => {
    if (open) {
      const fetchExpense = async () => {
        try {
          const res = await api.get(`/groups/${groupId}/expenses/${expenseId}`);
          const data = res.data;

          form.setValue("title", data.title);
          form.setValue("amount", new Intl.NumberFormat("vi-VN").format(data.amount));
          form.setValue("category", data.category);
          form.setValue("paidBy", data.payer.id);

          const splitIds = data.splits.map((s: any) => s.user.id);
          setSelectedUserIds(splitIds);

          const isAllSelected = members.length > 0 && members.every(m => splitIds.includes(m.user.id));
          setSplitMode(isAllSelected ? "all" : "custom");

          // Kiểm tra quyền sửa: chỉ người tạo (payer) mới được
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          setIsOwner(currentUser?.id === data.payer.id);
          setExpenseInfo({ payerName: data.payer.name, amount: data.amount, title: data.title });
        } catch (error) {
          console.error(error);
          toast.error("Không thể tải thông tin khoản chi");
        }
      };
      fetchExpense();
    } else {
      form.reset();
      setIsOwner(false);
      setExpenseInfo(null);
    }
  }, [open, groupId, expenseId, form, members]);

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    if (selectedUserIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 người để chia tiền");
      return;
    }

    try {
      setIsLoading(true);
      await api.put(`/groups/${groupId}/expenses/${expenseId}`, {
        paidBy: values.paidBy,
        title: values.title,
        amount: Number(values.amount.replace(/\D/g, "")),
        category: values.category,
        splitUserIds: selectedUserIds
      });

      toast.success("Đã cập nhật khoản chi!");
      setOpen(false);
      onExpenseUpdated();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật khoản chi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      toast.success("Đã xóa khoản chi!");
      setIsConfirmDeleteOpen(false);
      setOpen(false);
      onExpenseUpdated();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi xóa khoản chi");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="block w-full text-left active:scale-[0.98] transition-transform">
        {children}
      </DialogTrigger>

      <DialogContent className="max-w-md w-[92vw] rounded-3xl p-6 bg-white overflow-y-auto max-h-[85vh] no-scrollbar border-none">
        <DialogHeader className="mb-2 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{isOwner ? '✏️' : '👁️'}</span>
            <DialogTitle className="text-xl font-extrabold text-gray-900">
              {isOwner ? 'Chỉnh sửa khoản chi' : 'Xem khoản chi'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            {isOwner
              ? 'Thay đổi số tiền, người trả hoặc danh sách chia tiền.'
              : 'Chỉ người tạo khoản chi mới có quyền chỉnh sửa.'}
          </DialogDescription>
        </DialogHeader>

        {!isOwner && expenseInfo && (
          <div className="bg-gray-50 rounded-2xl p-4 text-center text-sm text-gray-600 space-y-1">
            <p className="font-bold text-gray-800 text-lg">{expenseInfo.title}</p>
            <p className="text-2xl font-black text-[#27AE60]">{new Intl.NumberFormat('vi-VN').format(expenseInfo.amount)}đ</p>
            <p>Người trả: <span className="font-semibold text-gray-800">{expenseInfo.payerName}</span></p>
            <p className="text-xs text-gray-400 mt-2">Bạn đang xem với tư cách thành viên được chia tiền</p>
          </div>
        )}

        {isOwner && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Expense Name */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm text-gray-800 font-medium mb-1">Tên khoản chi</FormLabel>
                    <FormControl>
                      <input
                        className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-3.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                        placeholder="VD: Ăn lẩu Thái, Vé xem phim..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm text-gray-800 font-medium mb-1">Số tiền (VND)</FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-3.5 text-gray-700 font-medium focus:outline-none focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                        placeholder="0"
                        value={field.value}
                        onChange={(e) => {
                          let rawValue = e.target.value.replace(/\D/g, "");
                          if (rawValue === "") {
                            field.onChange("");
                            return;
                          }
                          const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(rawValue, 10));
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Select */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm text-gray-800 font-medium mb-1">Danh mục</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || null}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-6 text-gray-700 focus:ring-[#27AE60] text-sm h-auto">
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border border-slate-100 shadow-xl p-1.5 w-[--radix-select-trigger-width] min-w-[200px] bg-white">
                        {CATEGORIES.map((cat) => (
                          <SelectItem
                            key={cat.value}
                            value={cat.value}
                            className="p-2 mb-0.5 rounded-xl cursor-pointer focus:bg-[#E8F6F3] data-[state=checked]:bg-[#E8F6F3]"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full ${cat.bgColor} flex items-center justify-center`}>
                                <cat.icon className={`w-4 h-4 ${cat.iconColor}`} />
                              </div>
                              <span className="text-[15px] font-medium text-slate-800">{cat.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payer Select */}
              <FormField
                control={form.control}
                name="paidBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm text-gray-800 font-medium mb-1">Ai là người trả tiền?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || null}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-6 text-gray-700 focus:ring-[#27AE60] text-sm h-auto">
                          <SelectValue placeholder="Chọn người trả tiền">
                            {(() => {
                              const selectedMember = members.find(m => m.user.id === field.value);
                              if (selectedMember) {
                                return selectedMember.user.name + (selectedMember.role === 'OWNER' ? ' (Chủ nhóm)' : '');
                              }
                              return "Chọn người trả tiền";
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border border-slate-100 shadow-xl p-1.5 w-[--radix-select-trigger-width] min-w-[200px] bg-white">
                        {members.map((member, index) => {
                          const avatarBgColors = ["bg-[#2585A6]", "bg-[#2CA880]", "bg-[#ED5C5C]", "bg-[#F39C12]", "bg-[#9B59B6]"];
                          const bgColor = avatarBgColors[index % avatarBgColors.length];

                          return (
                            <SelectItem
                              key={member.user.id}
                              value={member.user.id}
                              className="py-2 pl-2 pr-8 mb-0.5 rounded-xl cursor-pointer focus:bg-[#E8F6F3] data-[state=checked]:bg-[#E8F6F3]"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${bgColor} overflow-hidden`}>
                                  {member.user.avatarUrl ? (
                                    <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
                                  ) : (
                                    member.user.name.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <span className="text-[15px] font-medium text-slate-800">
                                  {member.user.name} {member.role === 'OWNER' ? '(Chủ nhóm)' : ''}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Split Section */}
              <section className="pt-2">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold text-gray-800">Chia cho ai?</h2>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode("all");
                        setSelectedUserIds(members.map(m => m.user.id));
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        splitMode === "all"
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Chia đều cả nhóm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (splitMode !== "custom") {
                          setSelectedUserIds([]);
                        }
                        setSplitMode("custom");
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        splitMode === "custom"
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Chọn người chia
                    </button>
                  </div>
                </div>

                {splitMode === "all" ? (
                  <div className="bg-[#f0f9f6] border border-[#d1f2e6] rounded-2xl p-4 text-center">
                    <span className="text-xl mb-1 block">👥</span>
                    <p className="text-sm font-semibold text-[#1e7e5d]">Chia đều cả nhóm</p>
                    <p className="text-xs text-[#3ca27d] mt-0.5 font-medium">
                      Hóa đơn này sẽ tự động chia đều cho tất cả {members.length} thành viên trong nhóm.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {members.map((member, index) => {
                      const isSelected = selectedUserIds.includes(member.user.id);
                      const avatarBgColors = ["bg-[#2585A6]", "bg-[#2CA880]", "bg-[#ED5C5C]", "bg-[#F39C12]", "bg-[#9B59B6]"];
                      const bgColor = avatarBgColors[index % avatarBgColors.length];

                      return (
                        <div
                          key={member.user.id}
                          onClick={() => toggleUser(member.user.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${isSelected
                            ? "bg-[#f4f7f6] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.05)] border border-transparent"
                            : "bg-white border border-gray-100 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${bgColor} overflow-hidden`}>
                              {member.user.avatarUrl ? (
                                <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
                              ) : (
                                member.user.name.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="font-medium text-gray-800">
                              {member.user.name} {member.role === 'OWNER' ? '(Chủ nhóm)' : ''}
                            </span>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? "bg-[#68e2b8]" : "bg-gray-200"
                            }`}>
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path></svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500 px-1 mt-3">Mặc định chia đều cho tất cả người được chọn.</p>
              </section>

              {/* Submit and Delete Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  disabled={isDeleting || isLoading}
                  className="w-14 h-14 shrink-0 rounded-[1.25rem] bg-red-50 text-red-500 flex items-center justify-center transition-all active:scale-95 disabled:opacity-70"
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                </button>

                <button
                  type="submit"
                  disabled={isLoading || isDeleting}
                  className="flex-1 h-14 rounded-[1.25rem] text-gray-800 font-bold text-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(90deg, #74e5b8 0%, #4ed8b6 100%)",
                    boxShadow: "0 4px 15px rgba(69, 209, 176, 0.3)"
                  }}
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Lưu khoản chi
                </button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent showCloseButton={false} className="max-w-[270px] w-[85vw] bg-white border border-[#88c9ad] rounded-[20px] p-5 shadow-xl text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 flex items-center justify-center transform -rotate-12">
              <svg className="w-12 h-12 fill-[#88c9ad]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.36 2.72L20.78 4.14L15.06 9.85C16.13 11.39 16.28 13.24 15.38 14.44L9.06 8.12C10.26 7.22 12.11 7.37 13.65 8.44L19.36 2.72M5.93 17.57C3.92 15.56 2.69 13.16 2.35 10.92L7.23 8.34C7.57 10.58 8.8 12.98 10.81 15C12.82 17.01 15.22 18.24 17.46 18.58L14.88 23.46C12.64 23.12 10.24 21.89 8.23 19.88L5.93 17.57Z"></path>
              </svg>
            </div>
          </div>
          <div className="space-y-1.5 mb-5">
            <h1 className="text-[17px] font-bold text-[#1a2b3c] leading-tight font-sans">
              Xóa khoản chi?
            </h1>
            <p className="text-[13px] text-[#4a5568] leading-snug font-sans">
              Hành động này không thể hoàn tác.
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              className="flex-1 py-2 text-[14px] font-semibold text-[#999999] active:opacity-60 transition-opacity font-sans"
              type="button"
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Hủy
            </button>
            <button
              className="flex-1 py-2 px-3 bg-[#ced4da] text-[#1e293b] text-[14px] font-bold rounded-lg active:brightness-95 transition-all shadow-sm font-sans flex items-center justify-center"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Xóa ngay"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
