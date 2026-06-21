"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/axios";

interface AddTransactionDrawerProps {
  walletId?: string;
  type: "INCOME" | "EXPENSE";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  iconName: string;
}

interface SplitItem {
  categoryId: string;
  amount: string;
  note: string;
}

export function AddTransactionDrawer({ walletId, type, open, onOpenChange, onCreated }: AddTransactionDrawerProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitItem[]>([{ categoryId: "", amount: "", note: "" }]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [linkedBudgetId, setLinkedBudgetId] = useState<string>("");
  const [isGroupExpense, setIsGroupExpense] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form
      setAmount("");
      setNote("");
      setCategoryId("");
      setLinkedBudgetId("");
      setPayeeName("");
      setTagsInput("");
      setIsSplit(false);
      setSplits([{ categoryId: "", amount: "", note: "" }]);
      // Fetch categories
      api.get("/categories")
        .then(res => {
          setCategories(res.data);
        })
        .catch(err => {
          console.error("Failed to load categories", err);
        });
      // Fetch groups
      api.get("/groups")
        .then(res => setGroups(res.data))
        .catch(err => console.error("Failed to load groups", err));
      // Fetch budgets to link bills
      const now = new Date();
      api.get(`/budgets/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
        .then(res => {
          setBudgets(res.data);
        })
        .catch(err => {
          console.error("Failed to load budgets", err);
        });
    }
  }, [open]);

  // Format the amount visually
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(rawValue, 10));
    setAmount(formatted);
  };

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId) {
      toast.error("Không tìm thấy ví hợp lệ");
      return;
    }
    const rawAmount = amount.replace(/\D/g, "");
    if (!rawAmount) {
      toast.error("Vui lòng nhập số tiền");
      return;
    }

    let payloadCategoryId = categoryId;
    let payloadSplits = undefined;

    if (isSplit) {
      const splitsData = splits.map(s => ({
        categoryId: s.categoryId,
        amount: Number(s.amount.replace(/\D/g, "")),
        note: s.note || undefined
      }));
      const totalSplit = splitsData.reduce((acc, curr) => acc + curr.amount, 0);
      if (totalSplit !== Number(rawAmount)) {
        toast.error(`Tổng chia nhỏ (${totalSplit}) không khớp với tổng tiền (${rawAmount})`);
        return;
      }
      if (splitsData.some(s => !s.categoryId || s.amount <= 0)) {
        toast.error("Vui lòng điền đủ thông tin cho các phần chia nhỏ");
        return;
      }
      payloadCategoryId = splitsData[0].categoryId;
      payloadSplits = splitsData;
    } else {
      if (!categoryId) {
        toast.error("Vui lòng chọn danh mục");
        return;
      }
    }

    setLoading(true);
    const tagsArray = tagsInput.split(",").map(t => t.trim()).filter(t => t.length > 0);
    try {
      if (isGroupExpense && selectedGroupId) {
        const groupDetail = await api.get(`/groups/${selectedGroupId}`);
        const members = groupDetail.data.members || [];
        const splitUserIds = members.map((m: any) => m.user.id);
        
        const currentUserStr = localStorage.getItem("user");
        let paidById = currentUserStr ? JSON.parse(currentUserStr).id : "";
        const categoryName = filteredCategories.find(c => c.id === payloadCategoryId)?.name || "Khác";

        await api.post(`/groups/${selectedGroupId}/expenses`, {
          paidBy: paidById,
          title: note || categoryName,
          amount: Number(rawAmount),
          category: categoryName,
          splitUserIds: splitUserIds
        });
        toast.success("Đã thêm khoản chi nhóm (tự động chia đều)!");
      } else {
        await api.post(`/transactions/${walletId}`, {
          amount: Number(rawAmount),
          categoryId: payloadCategoryId,
          note: note || undefined,
          payeeName: payeeName || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          transactionDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1),
          isSplit: isSplit,
          splits: payloadSplits,
          linkedBudgetId: linkedBudgetId || undefined
        });
        toast.success(type === "INCOME" ? "Đã thêm thu nhập! 🎉" : "Đã thêm chi tiêu!");
      }
      onCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {type === "INCOME" ? "Thêm thu nhập" : "Thêm chi tiêu"}
            </DrawerTitle>
            <DrawerDescription>
              Nhập số tiền và chọn danh mục cho giao dịch.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <form id="add-transaction-form" onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    ₫
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={handleAmountChange}
                    className="pl-8 text-lg font-bold"
                    required
                  />
                </div>
              </div>

                {!isSplit && (
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                      Danh mục <span className="text-red-500">*</span>
                    </Label>
                    <Select value={categoryId} onValueChange={(val) => { if (val) { setCategoryId(val); setLinkedBudgetId(""); } }}>
                      <SelectTrigger className="w-full">
                        {categoryId 
                          ? (() => {
                              const c = filteredCategories.find(cat => cat.id === categoryId);
                              return c ? (
                                <span className="flex items-center gap-2">
                                  {c.iconName} {c.name}
                                </span>
                              ) : <span className="text-gray-400">Chọn danh mục</span>;
                            })()
                          : <span className="text-gray-400">Chọn danh mục</span>
                        }
                      </SelectTrigger>
                      <SelectContent portal={false} className="z-[100]">
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.iconName} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!isSplit && categoryId && budgets.filter(b => b.categoryId === categoryId).length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="linkedBill" className="text-sm font-semibold text-gray-700">
                      Trừ vào ngân sách (Tùy chọn)
                    </Label>
                    <Select value={linkedBudgetId} onValueChange={(val) => setLinkedBudgetId(val && val !== "none" ? val : "")}>
                      <SelectTrigger className="w-full">
                        {linkedBudgetId 
                          ? (() => {
                              const b = budgets.find(bud => bud.budgetId === linkedBudgetId);
                              return b ? <span>{b.name}</span> : <span className="text-gray-400">Không liên kết</span>;
                            })()
                          : <span className="text-gray-400">Không liên kết</span>
                        }
                      </SelectTrigger>
                      <SelectContent portal={false} className="z-[100]">
                        <SelectItem value="none">Không liên kết</SelectItem>
                        {budgets.filter(b => b.categoryId === categoryId).map((b) => (
                          <SelectItem key={b.budgetId} value={b.budgetId}>
                            {b.name} ({new Intl.NumberFormat("vi-VN").format(b.limitAmount)}đ)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isSplit && (
                  <div className="space-y-3 border border-gray-200 p-3 rounded-lg bg-gray-50">
                    <Label className="text-sm font-semibold text-gray-700 flex justify-between">
                      <span>Chi tiết chia nhỏ</span>
                      <span className="text-xs text-gray-500 font-normal">
                        Còn lại: {new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(amount.replace(/\D/g,"")) - splits.reduce((acc, s) => acc + Number(s.amount.replace(/\D/g,"")), 0)))}đ
                      </span>
                    </Label>
                    {splits.map((split, index) => (
                      <div key={index} className="space-y-2 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                        <div className="flex gap-2">
                          <Select 
                            value={split.categoryId} 
                            onValueChange={(val) => {
                              const newSplits = [...splits];
                              newSplits[index].categoryId = val || "";
                              setSplits(newSplits);
                            }}
                          >
                            <SelectTrigger className="w-1/2">
                              {split.categoryId 
                                ? (() => {
                                    const c = filteredCategories.find(cat => cat.id === split.categoryId);
                                    return c ? <span className="truncate">{c.iconName} {c.name}</span> : <span>Chọn DM</span>;
                                  })()
                                : <span className="text-gray-400">Chọn DM</span>
                              }
                            </SelectTrigger>
                            <SelectContent portal={false} className="z-[100]">
                              {filteredCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.iconName} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Số tiền"
                            value={split.amount}
                            className="w-1/2"
                            onChange={(e) => {
                              let raw = e.target.value.replace(/\D/g, "");
                              const newSplits = [...splits];
                              newSplits[index].amount = raw ? new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)) : "";
                              setSplits(newSplits);
                            }}
                          />
                        </div>
                        {index > 0 && (
                          <div className="flex justify-end">
                            <button 
                              type="button" 
                              onClick={() => {
                                const newSplits = [...splits];
                                newSplits.splice(index, 1);
                                setSplits(newSplits);
                              }}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Xóa dòng này
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSplits([...splits, { categoryId: "", amount: "", note: "" }])}
                      className="w-full text-sm border-dashed border-gray-300"
                    >
                      + Thêm hạng mục
                    </Button>
                  </div>
                )}

              {!isSplit && (
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-sm font-semibold text-gray-700">
                    Ghi chú
                  </Label>
                  <Input
                    id="note"
                    type="text"
                    placeholder="VD: Nhận lương tháng 5"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              )}



              {type === "EXPENSE" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payee" className="text-sm font-semibold text-gray-700">
                      Đối tác / Người nhận
                    </Label>
                    <Input
                      id="payee"
                      type="text"
                      placeholder="VD: Vinmart, Shopee..."
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-semibold text-gray-700">
                      Thẻ (phân cách bằng dấu phẩy)
                    </Label>
                    <Input
                      id="tags"
                      type="text"
                      placeholder="VD: du_lich, an_uong..."
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                    />
                  </div>
                </>
              )}

              {type === "EXPENSE" && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-700">Chi hộ nhóm? (Tự động chia đều)</Label>
                    <button
                      type="button"
                      onClick={() => { setIsGroupExpense(!isGroupExpense); setIsSplit(false); }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${isGroupExpense ? 'bg-rose-500' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isGroupExpense ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {isGroupExpense && (
                    <div className="space-y-2 mt-2">
                      <Label className="text-sm font-semibold text-gray-700">Chọn nhóm</Label>
                      <Select value={selectedGroupId} onValueChange={(val) => setSelectedGroupId(val || "")}>
                        <SelectTrigger className="w-full">
                          {selectedGroupId 
                            ? (() => {
                                const g = groups.find(x => x.id === selectedGroupId);
                                return g ? <span>{g.name}</span> : <span className="text-gray-400">Chọn nhóm</span>;
                              })()
                            : <span className="text-gray-400">Chọn nhóm</span>
                          }
                        </SelectTrigger>
                        <SelectContent portal={false} className="z-[100]">
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Mặc định chia đều cho tất cả thành viên trong nhóm.</p>
                    </div>
                  )}

                  {!isGroupExpense && (
                    <div className="flex items-center justify-between pt-2">
                      <Label className="text-sm font-semibold text-gray-700">Chia nhỏ giao dịch</Label>
                      <button
                        type="button"
                        onClick={() => setIsSplit(!isSplit)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${isSplit ? 'bg-rose-500' : 'bg-gray-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSplit ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
          <DrawerFooter>
            <Button 
              type="submit" 
              form="add-transaction-form" 
              disabled={loading}
              className={`w-full py-6 text-base font-bold shadow-md rounded-xl ${
                type === "INCOME" 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white" 
                  : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
              }`}
            >
              {loading ? "Đang xử lý..." : "Lưu giao dịch"}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
