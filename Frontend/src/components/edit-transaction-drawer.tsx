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

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: { id: string; name: string; type: string; iconName: string };
  transactionDate: string;
  note: string;
  linkedExpenseId: string | null;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  iconName: string;
}

interface EditTransactionDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditTransactionDrawer({ transaction, open, onOpenChange, onUpdated }: EditTransactionDrawerProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (open && transaction) {
      // Pre-fill dữ liệu hiện tại
      setAmount(new Intl.NumberFormat("vi-VN").format(transaction.amount));
      setNote(transaction.note || "");
      setCategoryId(transaction.category.id);

      // Fetch danh mục
      api.get("/categories")
        .then(res => setCategories(res.data))
        .catch(() => {});
    }
  }, [open, transaction]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setAmount(""); return; }
    setAmount(new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)));
  };

  const filteredCategories = categories.filter(c => c.type === transaction?.type);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const rawAmount = amount.replace(/\D/g, "");
    if (!rawAmount || !categoryId) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/transactions/${transaction.id}`, {
        amount: Number(rawAmount),
        categoryId,
        note: note || undefined,
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
      toast.error(error.response?.data?.message || "Không thể xóa giao dịch này");
    } finally {
      setDeleting(false);
    }
  };

  const isLinked = !!transaction?.linkedExpenseId;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {isLinked ? "Chi tiết giao dịch" : "Sửa giao dịch"}
            </DrawerTitle>
            <DrawerDescription>
              {isLinked
                ? "Giao dịch này được tạo tự động từ nhóm, không thể sửa."
                : "Thay đổi thông tin giao dịch cá nhân."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0">
            {/* Badge linked expense */}
            {isLinked && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100">
                <span className="text-blue-500 text-lg">🔗</span>
                <span className="text-sm text-blue-700 font-medium">Giao dịch đồng bộ từ nhóm</span>
              </div>
            )}

            <form id="edit-transaction-form" onSubmit={handleUpdate} className="space-y-4">
              {/* Số tiền */}
              <div className="space-y-2">
                <Label htmlFor="edit-amount" className="text-sm font-semibold text-gray-700">
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₫</span>
                  <Input
                    id="edit-amount"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    className="pl-8 text-lg font-bold"
                    disabled={isLinked}
                    required
                  />
                </div>
              </div>

              {/* Danh mục */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Danh mục <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={categoryId}
                  onValueChange={(val) => { if (val) setCategoryId(val); }}
                  disabled={isLinked}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.iconName} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loại trừ khỏi Ngân sách */}


              {/* Ghi chú */}
              <div className="space-y-2">
                <Label htmlFor="edit-note" className="text-sm font-semibold text-gray-700">Ghi chú</Label>
                <Input
                  id="edit-note"
                  type="text"
                  placeholder="Ghi chú..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  disabled={isLinked}
                />
              </div>
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
              <h3 className="text-[19px] font-extrabold text-slate-800 mb-2 text-center">Xóa giao dịch này?</h3>
              <p className="text-[13px] text-slate-500 text-center mb-6">Số dư ví sẽ được hoàn lại. Bạn có chắc chắn muốn xóa không?</p>
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
