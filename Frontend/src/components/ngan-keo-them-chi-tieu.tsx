"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Loader2,
  Receipt,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  Pill,
  Package,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { ReceiptScanner } from "@/components/quet-hoa-don";

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

// Member interface based on GroupDetailResponse
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

interface AddExpenseDrawerProps {
  groupId: string;
  members: Member[];
  onExpenseCreated: () => void;
  floating?: boolean;
}

const expenseSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tên khoản chi").max(200),
  amount: z
    .string()
    .min(1, "Vui lòng nhập số tiền")
    .refine((val) => {
      const rawVal = val.replace(/\D/g, "");
      return !isNaN(Number(rawVal)) && Number(rawVal) > 0;
    }, "Số tiền phải lớn hơn 0"),
  category: z.string().max(50).optional(),
  paidBy: z.string().min(1, "Vui lòng chọn người thanh toán"),
});

// CATEGORIES list is now fetched dynamically from API

export function AddExpenseDrawer({
  groupId,
  members,
  onExpenseCreated,
  floating,
}: AddExpenseDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<
    string,
    number
  > | null>(null);

  const [currency, setCurrency] = useState("VND");
  const [exchangeRate, setExchangeRate] = useState(1);

  // By default, split equally among all members (including payer)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    members.map((m) => m.user.id),
  );
  const [splitMode, setSplitMode] = useState<"all" | "custom">("all");

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "Khác",
      paidBy: "",
    },
  });

  // Automatically set the payer to the current user when the drawer opens
  useEffect(() => {
    if (open) {
      setSelectedUserIds(members.map((m) => m.user.id));
      setSplitMode("all");
      setShowScanner(false);
      setCustomSplitAmounts(null);
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const currentUser = JSON.parse(userStr);
        // Only set if the current user is actually a member of the group
        if (members.some((m) => m.user.id === currentUser.id)) {
          form.setValue("paidBy", currentUser.id);
        } else if (members.length > 0) {
          form.setValue("paidBy", members[0].user.id);
        }
      } else if (members.length > 0) {
        form.setValue("paidBy", members[0].user.id);
      }
    }
  }, [open, members, form]);

  useEffect(() => {
    if (open) {
      api
        .get("/categories")
        .then((res) => {
          setCategories(
            res.data.filter(
              (c: any) =>
                c.type === "EXPENSE" && c.name !== "Mục tiêu tiết kiệm"
            )
          );
        })
        .catch((err) => console.error(err));
    }
  }, [open]);

  // Xử lý khi Scanner trả về kết quả Itemized Split
  const handleScanConfirm = (data: {
    title: string;
    amount: number;
    splitAmounts: Record<string, number>;
  }) => {
    // Điền tự động vào form
    form.setValue("title", data.title);
    form.setValue("amount", new Intl.NumberFormat("vi-VN").format(data.amount));

    // Lưu custom split amounts
    setCustomSplitAmounts(data.splitAmounts);

    // Cập nhật danh sách user được chọn (chỉ những người có số tiền > 0)
    const assignedUserIds = Object.entries(data.splitAmounts)
      .filter(([, amount]) => amount > 0)
      .map(([userId]) => userId);
    setSelectedUserIds(assignedUserIds);
    setSplitMode("custom");

    // Đóng scanner, hiện lại form
    setShowScanner(false);
    toast.success(
      `Đã nhận diện ${Object.keys(data.splitAmounts).length} người từ hóa đơn!`,
    );
  };

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  useEffect(() => {
    if (currency === "VND") {
      setExchangeRate(1);
      return;
    }
    const fetchRate = async () => {
      try {
        const res = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${currency.toLowerCase()}.json`,
        );
        const data = await res.json();
        if (data[currency.toLowerCase()] && data[currency.toLowerCase()].vnd) {
          setExchangeRate(data[currency.toLowerCase()].vnd);
        }
      } catch (e) {
        console.error("Failed to fetch exchange rate", e);
      }
    };
    fetchRate();
  }, [currency]);

  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }
      const currentUser = JSON.parse(userStr);

      if (selectedUserIds.length === 0) {
        toast.error("Vui lòng chọn ít nhất 1 người để chia tiền");
        setIsLoading(false);
        return;
      }

      let finalAmount = Number(values.amount.replace(/\D/g, ""));
      if (currency !== "VND" && exchangeRate > 0) {
        finalAmount = Math.round(finalAmount * exchangeRate);
      }

      const payload: any = {
        paidBy: values.paidBy,
        title: values.title,
        amount: finalAmount,
        category: values.category,
        splitUserIds: selectedUserIds,
      };

      // Nếu có custom split amounts (từ Receipt Scanner), gửi kèm
      if (customSplitAmounts) {
        payload.splitAmounts = customSplitAmounts;
      }

      await api.post(`/groups/${groupId}/expenses`, payload);

      toast.success("Đã thêm khoản chi mới!");
      form.reset();
      setOpen(false);
      onExpenseCreated();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Có lỗi xảy ra khi thêm khoản chi",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {floating ? (
        <DialogTrigger
          className="w-16 h-16 rounded-full flex items-center justify-center text-gray-800 shadow-xl transition-all active:scale-95"
          style={{
            backgroundColor: "#B3E5D1",
            boxShadow: "0 4px 15px rgba(69,179,157,0.4)",
          }}
        >
          <svg
            className="w-9 h-9"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </DialogTrigger>
      ) : (
        <DialogTrigger
          className="text-xs font-bold px-4 py-2 rounded-full text-white transition-all active:scale-95"
          style={{ backgroundColor: "#8bc3a1" }}
        >
          + Thêm hóa đơn
        </DialogTrigger>
      )}

      {/* max-h-[85vh] prevents it from overflowing vertically and adds scrolling */}
      <DialogContent className="max-w-md w-[92vw] rounded-3xl p-6 bg-white overflow-y-auto max-h-[85vh] no-scrollbar border-none">
        <DialogHeader className="mb-2 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💵</span>
            <DialogTitle className="text-xl font-extrabold text-gray-900">
              Thêm khoản chi mới
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            Nhập thông tin hoá đơn hoặc quét ảnh để chia tiền theo từng món.
          </DialogDescription>
        </DialogHeader>

        {/* Nút Quét hóa đơn AI */}
        {!showScanner && !customSplitAmounts && (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full mb-1 py-3 rounded-2xl border-2 border-dashed border-[#b8e6d0] text-[#27AE60] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#f0faf5] transition-all active:scale-[0.98]"
          >
            <ScanLine className="w-5 h-5" />
            📸 Quét hóa đơn bằng AI
          </button>
        )}

        {/* Badge khi đã quét xong */}
        {customSplitAmounts && (
          <div className="flex items-center justify-between bg-[#f0faf5] border border-[#d1f2e6] rounded-2xl px-4 py-2.5 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm font-bold text-[#1e7e5d]">
                Đã chia tiền theo món
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomSplitAmounts(null);
                setShowScanner(true);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Quét lại
            </button>
          </div>
        )}

        {/* Receipt Scanner */}
        {showScanner && (
          <ReceiptScanner
            members={members}
            onConfirm={handleScanConfirm}
            onCancel={() => setShowScanner(false)}
          />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Expense Name */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm text-gray-800 font-medium mb-1">
                    Tên khoản chi
                  </FormLabel>
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

            {/* Amount & Currency */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm text-gray-800 font-medium mb-1">
                    Số tiền
                  </FormLabel>

                  <FormControl>
                    <div className="flex gap-2 relative">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-3.5 text-gray-700 font-medium text-[16px] focus:outline-none focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                          placeholder="0"
                          value={field.value}
                          onChange={(e) => {
                            let rawValue = e.target.value.replace(/\D/g, "");
                            if (rawValue === "") {
                              field.onChange("");
                              return;
                            }
                            const formatted = new Intl.NumberFormat(
                              "vi-VN",
                            ).format(parseInt(rawValue, 10));
                            field.onChange(formatted);
                          }}
                        />
                      </div>

                      <div className="relative w-28 bg-[#eafaf1] border border-[#d4efdf] rounded-2xl overflow-hidden flex items-center">
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full h-full px-3 bg-transparent font-bold text-gray-700 appearance-none outline-none focus:ring-0 cursor-pointer text-[14px]"
                        >
                          <option value="VND">VND</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="JPY">JPY</option>
                          <option value="THB">THB</option>
                          <option value="KRW">KRW</option>
                          <option value="SGD">SGD</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                          <svg
                            className="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </FormControl>

                  {currency !== "VND" && exchangeRate > 0 && field.value && (
                    <p className="text-xs text-emerald-600 font-medium flex justify-end mt-1">
                      ≈{" "}
                      {new Intl.NumberFormat("vi-VN").format(
                        Math.round(
                          Number(field.value.replace(/\D/g, "")) * exchangeRate,
                        ),
                      )}{" "}
                      đ (1 {currency} ={" "}
                      {new Intl.NumberFormat("vi-VN").format(
                        Math.round(exchangeRate),
                      )}{" "}
                      đ)
                    </p>
                  )}
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
                  <FormLabel className="block text-sm text-gray-800 font-medium mb-1">
                    Danh mục
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-6 text-gray-700 focus:ring-[#27AE60] text-sm h-auto">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border border-slate-100 shadow-xl p-1.5 w-[--radix-select-trigger-width] min-w-[200px] bg-white">
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.name}
                          className="p-2 mb-0.5 rounded-xl cursor-pointer focus:bg-[#E8F6F3] data-[state=checked]:bg-[#E8F6F3]"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-[16px]">{cat.iconName}</span>
                            <span className="text-[15px] font-medium text-slate-800">
                              {cat.name}
                            </span>
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
                  <FormLabel className="block text-sm text-gray-800 font-medium mb-1">
                    Ai là người trả tiền?
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-[#eafaf1] border border-[#d4efdf] rounded-2xl px-4 py-6 text-gray-700 focus:ring-[#27AE60] text-sm h-auto">
                        <SelectValue placeholder="Chọn người trả tiền">
                          {(() => {
                            const selectedMember = members.find(
                              (m) => m.user.id === field.value,
                            );
                            if (selectedMember) {
                              return (
                                selectedMember.user.name +
                                (selectedMember.role === "OWNER"
                                  ? " (Chủ nhóm)"
                                  : "")
                              );
                            }
                            return "Chọn người trả tiền";
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border border-slate-100 shadow-xl p-1.5 w-[--radix-select-trigger-width] min-w-[200px] bg-white">
                      {members.map((member, index) => {
                        const avatarBgColors = [
                          "bg-[#2585A6]",
                          "bg-[#2CA880]",
                          "bg-[#ED5C5C]",
                          "bg-[#F39C12]",
                          "bg-[#9B59B6]",
                        ];
                        const bgColor =
                          avatarBgColors[index % avatarBgColors.length];

                        return (
                          <SelectItem
                            key={member.user.id}
                            value={member.user.id}
                            className="py-2 pl-2 pr-8 mb-0.5 rounded-xl cursor-pointer focus:bg-[#E8F6F3] data-[state=checked]:bg-[#E8F6F3]"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${bgColor} overflow-hidden`}
                              >
                                {member.user.avatarUrl ? (
                                  <img
                                    src={member.user.avatarUrl}
                                    alt={member.user.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  member.user.name.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <span className="text-[15px] font-medium text-slate-800">
                                {member.user.name}{" "}
                                {member.role === "OWNER" ? "(Chủ nhóm)" : ""}
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
                <h2 className="text-sm font-semibold text-gray-800">
                  Chia cho ai?
                </h2>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode("all");
                      setSelectedUserIds(members.map((m) => m.user.id));
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
                  <p className="text-sm font-semibold text-[#1e7e5d]">
                    Chia đều cả nhóm
                  </p>
                  <p className="text-xs text-[#3ca27d] mt-0.5 font-medium">
                    Hóa đơn này sẽ tự động chia đều cho tất cả {members.length}{" "}
                    thành viên trong nhóm.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                  {members.map((member, index) => {
                    const isSelected = selectedUserIds.includes(member.user.id);
                    const avatarBgColors = [
                      "bg-[#2585A6]",
                      "bg-[#2CA880]",
                      "bg-[#ED5C5C]",
                      "bg-[#F39C12]",
                      "bg-[#9B59B6]",
                    ];
                    const bgColor =
                      avatarBgColors[index % avatarBgColors.length];

                    return (
                      <div
                        key={member.user.id}
                        onClick={() => toggleUser(member.user.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#f4f7f6] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.05)] border border-transparent"
                            : "bg-white border border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${bgColor} overflow-hidden`}
                          >
                            {member.user.avatarUrl ? (
                              <img
                                src={member.user.avatarUrl}
                                alt={member.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              member.user.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="font-medium text-gray-800">
                            {member.user.name}{" "}
                            {member.role === "OWNER" ? "(Chủ nhóm)" : ""}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#68e2b8]" : "bg-gray-200"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M5 13l4 4L19 7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                              ></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-gray-500 px-1 mt-3">
                Mặc định chia đều cho tất cả người được chọn.
              </p>
            </section>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-3xl text-gray-800 font-bold text-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(90deg, #74e5b8 0%, #4ed8b6 100%)",
                  boxShadow: "0 4px 15px rgba(69, 209, 176, 0.3)",
                }}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Tạo hoá đơn
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
