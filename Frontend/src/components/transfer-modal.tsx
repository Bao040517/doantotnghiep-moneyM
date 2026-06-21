"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/axios";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Wallet {
  id: string;
  name: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  iconName: string;
}

export function TransferModal({ open, onOpenChange, onSuccess }: TransferModalProps) {
  const [loading, setLoading] = useState(false);

  // States
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupId, setGroupId] = useState<string>("none");
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setAmount("");
      setWalletId("");
      setNote("");
      setCategoryId("");
      setGroupId("none");
      
      // Fetch wallets
      api.get("/wallets/me")
        .then(res => {
          const walletData = res.data?.data || res.data;
          const w = Array.isArray(walletData) ? walletData : (walletData ? [walletData] : []);
          setWallets(w);
          if (w.length > 0) {
            setWalletId(w[0].id);
          }
        })
        .catch(err => console.error("Failed to load wallets", err));

      // Fetch categories
      api.get("/categories")
        .then(res => {
          const c = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const expCategories = c.filter((cat: Category) => cat.type === "EXPENSE");
          setCategories(expCategories);
          
          // Smart default: Ăn uống (Utensils)
          const defaultCat = expCategories.find((cat: Category) => cat.iconName === "Utensils" || cat.name.toLowerCase().includes("ăn"));
          if (defaultCat) {
            setCategoryId(defaultCat.id);
          } else if (expCategories.length > 0) {
            setCategoryId(expCategories[0].id);
          }
        })
        .catch(err => console.error("Failed to load categories", err));
        
      // Fetch groups
      api.get("/groups")
        .then(res => {
          setGroups(res.data || []);
        })
        .catch(err => console.error("Failed to load groups", err));
    }
  }, [open]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(rawValue, 10));
    setAmount(formatted);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = Number(amount.replace(/\D/g, ""));
    if (!rawAmount || rawAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (!walletId) {
      toast.error("Vui lòng chọn ví nguồn");
      return;
    }
    if (!categoryId) {
      toast.error("Vui lòng chọn danh mục chi tiêu");
      return;
    }

    setLoading(true);
    try {
      const txRes = await api.post(`/transactions/${walletId}`, {
        amount: rawAmount,
        categoryId: categoryId,
        note: note || "Chuyển khoản / Chi tiêu",
        transactionDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1),
        isSplit: false
      });
      
      const newTxId = txRes.data?.id;

      if (groupId && groupId !== "none" && newTxId) {
        const currentUserStr = localStorage.getItem("user");
        const paidById = currentUserStr ? JSON.parse(currentUserStr).id : "";
        await api.post(`/groups/${groupId}/expenses`, {
          paidBy: paidById,
          title: note || "Ăn uống chung",
          amount: rawAmount,
          category: categories.find(c => c.id === categoryId)?.name || "Khác",
          linkedTransactionId: newTxId
        });
      }

      toast.success("Đã chuyển khoản & Ghi nhận chi tiêu thành công!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu giao dịch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Chuyển tiền / Thanh toán</DialogTitle>
          <DialogDescription>
            Điền thông tin và chuyển khoản nhanh. Mọi thứ sẽ được tự động phân bổ.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">Số tiền (VNĐ) <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₫</span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                className="pl-8 text-lg font-bold border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet" className="text-sm font-semibold text-gray-700">Từ ví <span className="text-red-500">*</span></Label>
            <Select value={walletId} onValueChange={(val) => setWalletId(val || "")}>
              <SelectTrigger className="w-full">
                {walletId ? wallets.find(w => w.id === walletId)?.name : <span className="text-gray-400">Chọn ví nguồn</span>}
              </SelectTrigger>
              <SelectContent portal={false}>
                {Array.isArray(wallets) && wallets.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({new Intl.NumberFormat("vi-VN").format(w.balance)}đ)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-semibold text-gray-700">Đến ai / Ghi chú (Tùy chọn)</Label>
            <Input
              id="note"
              placeholder="VD: Trả tiền phở, Chuyển cho A..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
            <div className="space-y-2 mt-2">
              <Label htmlFor="category" className="text-sm font-semibold text-gray-700">Danh mục</Label>
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                  {categoryId ? (
                    categories.find(c => c.id === categoryId)?.name || "Chọn danh mục"
                  ) : (
                    <span className="text-gray-400">Chọn danh mục</span>
                  )}
                </SelectTrigger>
                <SelectContent portal={false}>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 mt-2">
              <Label htmlFor="group" className="text-sm font-semibold text-gray-700">Chia sẻ Nhóm</Label>
              <Select value={groupId} onValueChange={(val) => setGroupId(val || "")}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:ring-emerald-500">
                  {groupId === "none" ? (
                    "Cá nhân (Không chia)"
                  ) : (
                    groups.find((g: any) => g.id === groupId)?.name || "Cá nhân (Không chia)"
                  )}
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="none">Cá nhân (Không chia)</SelectItem>
                  {groups.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={loading} className="bg-[#45b39d] hover:bg-[#3ba08b] text-white">
              {loading ? "Đang xử lý..." : "Chuyển tiền & Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
