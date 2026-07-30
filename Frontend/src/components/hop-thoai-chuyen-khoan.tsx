"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Search, ChevronLeft, Building2 } from "lucide-react";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialAmount?: number;
  initialNote?: string;
  initialCategoryId?: string;
  initialBankId?: string;
  initialAccountNumber?: string;
  linkedBudgetId?: string;
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

const BANKS = [
  {
    id: "vcb",
    name: "Vietcombank",
    fullName: "Ngân hàng TMCP Ngoại thương Việt Nam",
    shortName: "VCB",
    color: "bg-[#71c358]",
    text: "text-white",
  },
  {
    id: "mb",
    name: "MBBank",
    fullName: "Ngân hàng TMCP Quân Đội",
    shortName: "MB",
    color: "bg-[#14238e]",
    text: "text-white",
  },
  {
    id: "bidv",
    name: "BIDV",
    fullName: "Ngân hàng TMCP Đầu tư và Phát triển",
    shortName: "BIDV",
    color: "bg-[#0b6b85]",
    text: "text-white",
  },
  {
    id: "tcb",
    name: "Techcombank",
    fullName: "Ngân hàng TMCP Kỹ thương Việt Nam",
    shortName: "TCB",
    color: "bg-[#e11b22]",
    text: "text-white",
  },
  {
    id: "ctg",
    name: "VietinBank",
    fullName: "Ngân hàng TMCP Công thương Việt Nam",
    shortName: "CTG",
    color: "bg-[#1866b4]",
    text: "text-white",
  },
  {
    id: "acb",
    name: "ACB",
    fullName: "Ngân hàng TMCP Á Châu",
    shortName: "ACB",
    color: "bg-[#005fb8]",
    text: "text-white",
  },
  {
    id: "vpb",
    name: "VPBank",
    fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    shortName: "VPB",
    color: "bg-[#009b4d]",
    text: "text-white",
  },
  {
    id: "stb",
    name: "SACOMBANK",
    fullName: "Ngân hàng TMCP Sài Gòn Thương Tín",
    shortName: "STB",
    color: "bg-[#0065b3]",
    text: "text-white",
  },
  {
    id: "ocb",
    name: "OCB",
    fullName: "Ngân hàng TMCP Phương Đông",
    shortName: "OCB",
    color: "bg-[#007f3f]",
    text: "text-white",
  },
  {
    id: "tpb",
    name: "TPBank",
    fullName: "Ngân hàng TMCP Tiên Phong",
    shortName: "TPB",
    color: "bg-[#703083]",
    text: "text-white",
  },
  {
    id: "agr",
    name: "Agribank",
    fullName: "Ngân hàng NN&PTNT Việt Nam",
    shortName: "AGR",
    color: "bg-[#b12822]",
    text: "text-white",
  },
];

export function TransferModal({
  open,
  onOpenChange,
  onSuccess,
  initialAmount,
  initialNote,
  initialCategoryId,
  initialBankId,
  initialAccountNumber,
  linkedBudgetId,
}: TransferModalProps) {
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

  // Wizard States: 0 = Choose Bank, 1 = Transfer Form, 2 = Budget Alert
  const [step, setStep] = useState(0);
  const [searchBank, setSearchBank] = useState("");
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [accountNumber, setAccountNumber] = useState("");

  const [budgets, setBudgets] = useState<any[]>([]);
  const [matchingBudget, setMatchingBudget] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setAmount(
        initialAmount
          ? new Intl.NumberFormat("vi-VN").format(initialAmount)
          : "",
      );
      setWalletId("");
      setNote(initialNote || "");
      setCategoryId(initialCategoryId || "");
      setGroupId("none");

      if (initialBankId) {
        const bank = BANKS.find((b) => b.id === initialBankId);
        if (bank) {
          setSelectedBank(bank);
          setStep(1);
        } else {
          setStep(0);
          setSelectedBank(null);
        }
      } else {
        setStep(0);
        setSelectedBank(null);
      }

      setSearchBank("");
      setAccountNumber(initialAccountNumber || "");
      setMatchingBudget(null);

      // Fetch wallets
      api
        .get("/wallets")
        .then((res) => {
          const walletData = res.data?.data || res.data;
          const allWallets: Wallet[] = Array.isArray(walletData)
            ? walletData
            : walletData
              ? [walletData]
              : [];

          setWallets(allWallets);

          if (allWallets.length > 0) {
            let selectedW = allWallets[0].id;
            if (initialBankId) {
              const matchedWallet = allWallets.find(
                (wallet: any) => wallet.bankBin === initialBankId,
              );
              if (matchedWallet) {
                selectedW = matchedWallet.id;
              }
            }
            setWalletId(selectedW);
          }
        })
        .catch((err) => console.error("Failed to load wallets", err));

      // Fetch categories
      api
        .get("/categories")
        .then((res) => {
          const c = Array.isArray(res.data) ? res.data : res.data?.data || [];
          const expCategories = c.filter(
            (cat: Category) => cat.type === "EXPENSE",
          );
          setCategories(expCategories);

          if (!initialCategoryId) {
            const defaultCat = expCategories.find(
              (cat: Category) =>
                cat.iconName === "Utensils" ||
                cat.name.toLowerCase().includes("ăn"),
            );
            if (defaultCat) {
              setCategoryId(defaultCat.id);
            } else if (expCategories.length > 0) {
              setCategoryId(expCategories[0].id);
            }
          } else {
            setCategoryId(initialCategoryId);
          }
        })
        .catch((err) => console.error("Failed to load categories", err));

      // Fetch groups
      api
        .get("/groups")
        .then((res) => {
          setGroups(res.data || []);
        })
        .catch((err) => console.error("Failed to load groups", err));

      // Fetch budgets
      const now = new Date();
      api
        .get(
          `/budgets/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
        )
        .then((res) => {
          setBudgets(res.data || []);
        })
        .catch((err) => console.error("Failed to load budgets", err));
    }
  }, [open]);

  const filteredBanks = BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      b.shortName.toLowerCase().includes(searchBank.toLowerCase()),
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(
      parseInt(rawValue, 10),
    );
    setAmount(formatted);
  };

  const handleNextToForm = (bank: any) => {
    setSelectedBank(bank);
    setStep(1);
  };

  const handleNextToConfirm = async (e: React.FormEvent) => {
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
    if (!accountNumber.trim()) {
      toast.error("Vui lòng nhập số tài khoản");
      return;
    }

    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (selectedWallet && rawAmount > selectedWallet.balance) {
      window.alert(
        `⚠️ SỐ DƯ KHÔNG ĐỦ!\n\nSố tiền bạn muốn chuyển (${new Intl.NumberFormat("vi-VN").format(rawAmount)}đ) vượt quá số dư trong ${selectedWallet.name} (hiện có ${new Intl.NumberFormat("vi-VN").format(selectedWallet.balance)}đ).`
      );
      return;
    }

    const budget = budgets.find((b) => b.categoryId === categoryId);
    if (budget) {
      setMatchingBudget(budget);
      setStep(2);
    } else {
      await executeTransfer();
    }
  };

  const executeTransfer = async () => {
    setLoading(true);
    try {
      const rawAmount = Number(amount.replace(/\D/g, ""));
      const finalNote =
        `[${selectedBank?.shortName} - ${accountNumber}] ${note}`.trim();

      const finalLinkedBudgetId = linkedBudgetId || matchingBudget?.budgetId;

      const txRes = await api.post(`/transactions/${walletId}`, {
        amount: rawAmount,
        categoryId: categoryId,
        note: finalNote,
        transactionDate: new Date(
          new Date().getTime() - new Date().getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, -1),
        isSplit: false,
        linkedBudgetId: finalLinkedBudgetId,
      });

      const newTxId = txRes.data?.id;

      if (groupId && groupId !== "none" && newTxId) {
        const currentUserStr = localStorage.getItem("user");
        const paidById = currentUserStr ? JSON.parse(currentUserStr).id : "";
        await api.post(`/groups/${groupId}/expenses`, {
          paidBy: paidById,
          title: finalNote || "Chuyển khoản",
          amount: rawAmount,
          category: categories.find((c) => c.id === categoryId)?.name || "Khác",
          linkedTransactionId: newTxId,
        });
      }

      toast.success("Đã chuyển khoản thành công!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Có lỗi xảy ra khi lưu giao dịch",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#f8f9fa] p-0 overflow-hidden rounded-[24px]">
        {/* Header changes based on step */}
        {step === 0 && (
          <div className="bg-white p-4 pb-3 shadow-sm z-10 relative border-b border-gray-100">
            <DialogTitle className="text-[17px] font-extrabold text-gray-800 text-center mb-3">
              Chuyển tiền ngân hàng
            </DialogTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm ngân hàng, số tài khoản..."
                value={searchBank}
                onChange={(e) => setSearchBank(e.target.value)}
                className="pl-9 bg-gray-100/80 border-none rounded-2xl h-10 text-[14px]"
              />
            </div>
          </div>
        )}

        {step === 1 && selectedBank && (
          <div className="bg-white p-4 shadow-sm z-10 relative flex items-center border-b border-gray-100">
            <button
              onClick={() => setStep(0)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 mr-2 -ml-2 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <DialogTitle className="text-[17px] font-extrabold text-gray-800">
              Đến ngân hàng
            </DialogTitle>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-4 shadow-sm z-10 relative flex items-center border-b border-gray-100">
            <button
              onClick={() => setStep(1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 mr-2 -ml-2 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <DialogTitle className="text-[17px] font-extrabold text-gray-800">
              Xác nhận chuyển khoản
            </DialogTitle>
          </div>
        )}

        <div className="p-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* STEP 0: Select Bank */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[13px] font-bold text-gray-600 mb-3 ml-1">
                  Ngân hàng phổ biến
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => handleNextToForm(bank)}
                      className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center gap-2 border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all active:scale-95"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${bank.color} ${bank.text}`}
                      >
                        {bank.shortName}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight line-clamp-1">
                        {bank.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Transfer Form */}
          {step === 1 && selectedBank && (
            <form onSubmit={handleNextToConfirm} className="space-y-4">
              {/* Bank Header Card */}
              <div
                className={`${selectedBank.color} p-4 rounded-t-2xl text-white flex items-center gap-3 relative overflow-hidden shadow-sm`}
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm relative z-10">
                  <span
                    className={`text-[12px] font-black ${selectedBank.text.replace("text-white", "text-gray-800")}`}
                  >
                    {selectedBank.shortName}
                  </span>
                </div>
                <div className="relative z-10 flex-1">
                  <h3 className="font-extrabold text-[15px] leading-tight">
                    {selectedBank.name}
                  </h3>
                  <p className="text-[11px] opacity-90 line-clamp-1 mt-0.5">
                    {selectedBank.fullName}
                  </p>
                </div>
              </div>

              {/* Body Form */}
              <div className="bg-white rounded-b-2xl -mt-5 pt-5 p-4 border border-t-0 border-gray-100 shadow-sm space-y-4 relative z-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label
                      htmlFor="account"
                      className="text-[12px] font-bold text-gray-500"
                    >
                      Số thẻ/tài khoản <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[11px] font-bold text-[#b82a55] flex items-center gap-1 cursor-pointer bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors">
                      <Building2 className="w-3 h-3" /> Chọn STK
                    </span>
                  </div>
                  <Input
                    id="account"
                    type="text"
                    inputMode="numeric"
                    placeholder="Nhập số thẻ / tài khoản"
                    value={accountNumber}
                    onChange={(e) =>
                      setAccountNumber(e.target.value.replace(/\D/g, ""))
                    }
                    className="border-none bg-gray-50/80 rounded-xl font-bold text-[15px] focus-visible:ring-1 focus-visible:ring-[#b82a55] h-12"
                    required
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2 relative">
                <Label
                  htmlFor="amount"
                  className="text-[12px] font-bold text-gray-500"
                >
                  Số tiền chuyển <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-500">
                    đ
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={handleAmountChange}
                    className="border-none bg-transparent rounded-none border-b-2 border-gray-100 focus-visible:ring-0 focus-visible:border-[#b82a55] font-black text-2xl text-gray-800 h-14 px-0 pb-2 shadow-none"
                    required
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
                <Label
                  htmlFor="note"
                  className="text-[12px] font-bold text-gray-500"
                >
                  Lời nhắn (Tùy chọn)
                </Label>
                <Input
                  id="note"
                  placeholder="VD: Trả tiền phở, Chuyển cho A..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="border-none bg-gray-50/80 rounded-xl font-medium focus-visible:ring-1 focus-visible:ring-[#b82a55] h-12 text-[14px]"
                />
              </div>

              {/* Advanced App Specific Info */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
                <p className="text-[11px] font-bold text-[#b82a55] flex items-center gap-1.5 uppercase tracking-wide border-b border-rose-50 pb-2">
                  ✨ Thiết lập phân bổ
                </p>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold text-gray-500">
                    Trích từ Nguồn tiền <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={walletId}
                    onValueChange={(val) => setWalletId(val || "")}
                  >
                    <SelectTrigger className="w-full bg-gray-50/80 border-none rounded-xl h-11 font-semibold text-[14px]">
                      {walletId && wallets.find((w) => w.id === walletId) ? (
                        `${wallets.find((w) => w.id === walletId)?.name} (${new Intl.NumberFormat("vi-VN").format(wallets.find((w) => w.id === walletId)?.balance || 0)}đ)`
                      ) : (
                        <span className="text-gray-400">Chọn nguồn tiền</span>
                      )}
                    </SelectTrigger>
                    <SelectContent portal={false}>
                      {wallets.map((w) => (
                        <SelectItem
                          key={w.id}
                          value={w.id}
                          className="font-semibold"
                        >
                          {w.name} (
                          {new Intl.NumberFormat("vi-VN").format(w.balance)}đ)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[12px] font-bold text-gray-500">
                      Danh mục <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={categoryId}
                      onValueChange={(val) => {
                        setCategoryId(val || "");
                        if (val && !amount) {
                          const b = budgets.find(
                            (b: any) =>
                              b.categoryId === val && b.type !== "FLEXIBLE",
                          );
                          if (b) {
                            const remaining = Math.max(
                              0,
                              b.limitAmount - b.spentAmount,
                            );
                            if (remaining > 0) {
                              setAmount(
                                new Intl.NumberFormat("vi-VN").format(
                                  remaining,
                                ),
                              );
                            }
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-gray-50/80 border-none rounded-xl h-11 font-semibold text-[14px]">
                        {categoryId ? (
                          categories.find((c) => c.id === categoryId)?.name
                        ) : (
                          <span className="text-gray-400">Chọn...</span>
                        )}
                      </SelectTrigger>
                      <SelectContent portal={false}>
                        {categories.map((c) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="font-semibold"
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-bold text-gray-500">
                      Chia sẻ Nhóm
                    </Label>
                    <Select
                      value={groupId}
                      onValueChange={(val) => setGroupId(val || "")}
                    >
                      <SelectTrigger className="w-full bg-gray-50/80 border-none rounded-xl h-11 font-semibold text-[14px]">
                        {groupId === "none"
                          ? "Không chia"
                          : groups.find((g: any) => g.id === groupId)?.name}
                      </SelectTrigger>
                      <SelectContent portal={false}>
                        <SelectItem value="none" className="font-semibold">
                          Không chia
                        </SelectItem>
                        {groups.map((g: any) => (
                          <SelectItem
                            key={g.id}
                            value={g.id}
                            className="font-semibold"
                          >
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-2 sticky bottom-0 pb-2 z-10">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[50px] rounded-[18px] bg-[#b82a55] hover:bg-[#a12349] text-white font-bold text-[16px] shadow-md transition-all active:scale-[0.98]"
                >
                  Tiếp tục
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: Budget Confirm */}
          {step === 2 && (
            <div className="space-y-4 mt-2">
              <div className="p-6 bg-white rounded-[24px] shadow-sm border border-emerald-100 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-4xl shadow-inner mb-2">
                  🤔
                </div>
                <p className="font-semibold text-[16px] text-gray-800 leading-relaxed">
                  Có phải bạn vừa thanh toán{" "}
                  <span className="font-bold text-emerald-600">
                    {matchingBudget?.categoryName}
                  </span>{" "}
                  tháng này:{" "}
                  <span className="font-black text-rose-500">{amount}đ</span>{" "}
                  không?
                </p>
                {matchingBudget && (
                  <div className="w-full bg-gray-50 rounded-2xl p-4 mt-2 shadow-inner border border-gray-100 text-[14px]">
                    {matchingBudget.limitAmount -
                      matchingBudget.spentAmount -
                      Number(amount.replace(/\D/g, "")) >=
                    0 ? (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">
                          Ngân sách còn thừa:
                        </span>
                        <span className="font-black text-emerald-600 text-[16px]">
                          {new Intl.NumberFormat("vi-VN").format(
                            matchingBudget.limitAmount -
                              matchingBudget.spentAmount -
                              Number(amount.replace(/\D/g, "")),
                          )}
                          đ
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">
                          Bị vượt ngân sách:
                        </span>
                        <span className="font-black text-rose-500 text-[16px]">
                          {new Intl.NumberFormat("vi-VN").format(
                            Math.abs(
                              matchingBudget.limitAmount -
                                matchingBudget.spentAmount -
                                Number(amount.replace(/\D/g, "")),
                            ),
                          )}
                          đ
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="pt-4">
                <Button
                  type="button"
                  onClick={executeTransfer}
                  disabled={loading}
                  className="w-full h-[50px] rounded-[18px] bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-[16px] shadow-md transition-all active:scale-[0.98]"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận & Chuyển tiền"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
