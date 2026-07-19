"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/axios";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: { id: string; name: string; type: string; iconName: string };
  transactionDate: string;
  note: string;
  linkedExpenseId: string | null;
  isSplit?: boolean;
  splits?: any[];
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

interface EditTransactionDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditTransactionDrawer({
  transaction,
  open,
  onOpenChange,
  onUpdated,
}: EditTransactionDrawerProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitItem[]>([
    { categoryId: "", amount: "", note: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (open && transaction) {
      setAmount(new Intl.NumberFormat("vi-VN").format(transaction.amount));
      setNote(transaction.note || "");
      setCategoryId(transaction.category.id);
      
      if (transaction.isSplit && transaction.splits) {
        setIsSplit(true);
        setSplits(
          transaction.splits.map((s: any) => ({
            categoryId: s.category?.id || s.categoryId,
            amount: new Intl.NumberFormat("vi-VN").format(s.amount),
            note: s.note || "",
          }))
        );
      } else {
        setIsSplit(false);
        setSplits([{ categoryId: "", amount: "", note: "" }]);
      }

      api
        .get("/categories")
        .then((res) => setCategories(res.data))
        .catch(() => {});
    }
  }, [open, transaction]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAmount("");
      return;
    }
    setAmount(new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)));
  };

  const filteredCategories = categories.filter(
    (c) => c.type === transaction?.type,
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const rawAmount = Number(amount.replace(/\D/g, ""));
    if (!rawAmount) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }

    let payloadCategoryId = categoryId;
    let payloadSplits = undefined;

    if (isSplit) {
      const splitsData = splits.map((s) => ({
        categoryId: s.categoryId,
        amount: Number(s.amount.replace(/\D/g, "")),
        note: s.note || undefined,
      }));
      const totalSplit = splitsData.reduce((acc, curr) => acc + curr.amount, 0);
      if (totalSplit !== rawAmount) {
        toast.error(
          `Tổng chia nhỏ (${new Intl.NumberFormat("vi-VN").format(totalSplit)}đ) không khớp với tổng tiền (${new Intl.NumberFormat("vi-VN").format(rawAmount)}đ)`
        );
        return;
      }
      if (splitsData.some((s) => !s.categoryId || s.amount <= 0)) {
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
    try {
      await api.put(`/transactions/${transaction.id}`, {
        amount: rawAmount,
        categoryId: payloadCategoryId,
        note: note || undefined,
        isSplit: isSplit,
        splits: payloadSplits,
      });
      toast.success("Đã cập nhật giao dịch! ✅");
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    setShowConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    if (!transaction) return;
    setShowConfirmDelete(false);
    setDeleting(true);
    try {
      await api.delete(`/transactions/${transaction.id}`);
      toast.success("Đã xóa giao dịch!");
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể xóa giao dịch này",
      );
    } finally {
      setDeleting(false);
    }
  };

  const isLinked = !!transaction?.linkedExpenseId;

  // Tính số tiền còn thiếu cho tính năng Smart Split
  const currentTotalSplit = splits.reduce(
    (acc, s) => acc + Number(s.amount.replace(/\D/g, "")),
    0
  );
  const targetAmount = Number(amount.replace(/\D/g, ""));
  const remainder = Math.max(0, targetAmount - currentTotalSplit);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {isLinked ? "Chi tiết giao dịch" : "Phân loại / Sửa giao dịch"}
            </DrawerTitle>
            <DrawerDescription>
              {isLinked
                ? "Giao dịch này được tạo tự động từ nhóm, không thể sửa."
                : "Thay đổi danh mục hoặc chia nhỏ hóa đơn (Split)."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 max-h-[60vh] overflow-y-auto">
            {isLinked && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100">
                <span className="text-blue-500 text-lg">🔗</span>
                <span className="text-sm text-blue-700 font-medium">
                  Giao dịch đồng bộ từ nhóm
                </span>
              </div>
            )}

            <form
              id="edit-transaction-form"
              onSubmit={handleUpdate}
              className="space-y-4"
            >
              {/* Số tiền */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit-amount"
                  className="text-sm font-semibold text-gray-700"
                >
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    ₫
                  </span>
                  <Input
                    id="edit-amount"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    className="pl-8 text-lg font-bold border-gray-200 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    disabled={isLinked}
                    required
                  />
                </div>
              </div>

              {!isSplit && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Danh mục <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={categoryId}
                    onValueChange={(val) => {
                      if (val) setCategoryId(val);
                    }}
                    disabled={isLinked}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.iconName} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tính năng Split thông minh */}
              {!isLinked && transaction?.type === "EXPENSE" && (
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🔄 Chia nhỏ giao dịch (Split)
                    <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-bold">
                      Smart
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsSplit(!isSplit)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isSplit ? "bg-emerald-500" : "bg-gray-200"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSplit ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              )}

              {isSplit && (
                <div className="space-y-3 border border-emerald-100 p-3 rounded-xl bg-emerald-50/30">
                  <Label className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                    <span>Chi tiết chia nhỏ</span>
                    <span className={`text-xs font-bold ${remainder === 0 ? "text-emerald-600" : "text-amber-500"}`}>
                      Còn lại: {new Intl.NumberFormat("vi-VN").format(remainder)}đ
                    </span>
                  </Label>
                  
                  {splits.map((split, index) => (
                    <div
                      key={index}
                      className="space-y-2 pb-3 border-b border-gray-200 last:border-0 last:pb-0"
                    >
                      <div className="flex gap-2">
                        <Select
                          value={split.categoryId}
                          onValueChange={(val) => {
                            const newSplits = [...splits];
                            newSplits[index].categoryId = val || "";
                            setSplits(newSplits);
                          }}
                        >
                          <SelectTrigger className="w-1/2 bg-white">
                            {split.categoryId ? (
                              (() => {
                                const c = filteredCategories.find((cat) => cat.id === split.categoryId);
                                return c ? (
                                  <span className="truncate">{c.iconName} {c.name}</span>
                                ) : (
                                  <span>Chọn DM</span>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400">Chọn DM</span>
                            )}
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
                          className="w-1/2 bg-white font-semibold"
                          onChange={(e) => {
                            let raw = e.target.value.replace(/\D/g, "");
                            const newSplits = [...splits];
                            newSplits[index].amount = raw
                              ? new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10))
                              : "";
                            setSplits(newSplits);
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ghi chú (như: Mua thịt, Mua sữa...)"
                          value={split.note}
                          className="w-full text-xs h-8 bg-white"
                          onChange={(e) => {
                            const newSplits = [...splits];
                            newSplits[index].note = e.target.value;
                            setSplits(newSplits);
                          }}
                        />
                      </div>
                      {splits.length > 1 && (
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newSplits = [...splits];
                              newSplits.splice(index, 1);
                              setSplits(newSplits);
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded"
                          >
                            Xóa dòng này
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {remainder > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const formattedRemainder = new Intl.NumberFormat("vi-VN").format(remainder);
                        setSplits([
                          ...splits,
                          { categoryId: "", amount: formattedRemainder, note: "" },
                        ]);
                      }}
                      className="w-full text-sm border-dashed border-emerald-300 text-emerald-600 bg-white hover:bg-emerald-50"
                    >
                      + Tự động điền {new Intl.NumberFormat("vi-VN").format(remainder)}đ còn lại
                    </Button>
                  )}
                  {remainder === 0 && (
                     <div className="text-center text-xs text-emerald-600 font-bold bg-emerald-100 py-2 rounded-lg">
                       ✨ Đã khớp tổng tiền!
                     </div>
                  )}
                </div>
              )}

              {/* Ghi chú */}
              {!isSplit && (
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-note"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Ghi chú chung
                  </Label>
                  <Input
                    id="edit-note"
                    type="text"
                    placeholder="Ghi chú..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isLinked}
                  />
                </div>
              )}
            </form>
          </div>

          <DrawerFooter className="gap-2">
            {!isLinked && (
              <>
                <Button
                  type="submit"
                  form="edit-transaction-form"
                  disabled={loading}
                  className={`w-full py-6 text-base font-bold shadow-md rounded-xl ${
                    transaction?.type === "INCOME"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                  }`}
                >
                  {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="w-full py-5 text-sm font-bold text-red-500 border-red-200 hover:bg-red-50 rounded-xl"
                >
                  {deleting ? "Đang xóa..." : "🗑️ Xóa giao dịch"}
                </Button>
              </>
            )}
            {isLinked && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full py-5 font-bold rounded-xl"
              >
                Đóng
              </Button>
            )}
          </DrawerFooter>
        </div>

        {/* Confirm Delete Modal */}
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-[19px] font-extrabold text-slate-800 mb-2 text-center">
                Xóa giao dịch này?
              </h3>
              <p className="text-[13px] text-slate-500 text-center mb-6">
                Số dư ví sẽ được hoàn lại. Bạn có chắc chắn muốn xóa không?
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
