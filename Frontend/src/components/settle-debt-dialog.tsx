"use client";

import { useState } from "react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Banknote, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRPay } from "vietnam-qr-pay";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  bankQrUrl?: string | null;
  bankBin?: string | null;
  bankAccountNo?: string | null;
}

interface SettleDebtDialogProps {
  groupId: string;
  toUser: UserSummary;
  amount: number;
  onSettle: () => void;
}

export function SettleDebtDialog({ groupId, toUser, amount, onSettle }: SettleDebtDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [activeTab, setActiveTab] = useState("transfer");

  const [tempBankBin, setTempBankBin] = useState(toUser.bankBin || "");
  const [tempBankAccount, setTempBankAccount] = useState(toUser.bankAccountNo || "");
  const [tempAccountName, setTempAccountName] = useState(toUser.name || "");
  const [tempAmount, setTempAmount] = useState(amount.toString());
  const [errors, setErrors] = useState<any>({});

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleConfirm = async () => {
    const rawAmount = parseInt(tempAmount.replace(/\D/g, ""), 10);
    
    let newErrors: any = {};
    if (activeTab === "transfer") {
      if (!tempBankBin) newErrors.bankBin = true;
      if (!tempBankAccount.trim()) newErrors.bankAccount = true;
      if (!tempAccountName.trim()) newErrors.accountName = true;
    }
    if (!rawAmount || rawAmount <= 0) newErrors.amount = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSettling(true);
    try {
      await api.post(`/groups/${groupId}/debts/notify-payment`, {
        toUserId: toUser.id,
        amount: rawAmount
      });
      toast.success(`Đã gửi thông báo cho ${toUser.name}. Vui lòng chờ xác nhận!`);
      setOpen(false);
      onSettle();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi thanh toán");
    } finally {
      setIsSettling(false);
    }
  };

  // Generate QR String entirely offline
  let qrString = "";
  let hasDynamicQr = false;
  
  const rawAmount = parseInt(tempAmount.replace(/\D/g, ""), 10) || 0;

  if (tempBankBin && tempBankAccount) {
    try {
      const qr = QRPay.initVietQR({
        bankBin: tempBankBin,
        bankNumber: tempBankAccount,
        amount: rawAmount > 0 ? rawAmount.toString() : amount.toString(),
        purpose: `Thanh toan no cho ${toUser.name}`.substring(0, 50),
      });
      qrString = qr.build();
      hasDynamicQr = true;
    } catch (e) {
      console.error("Failed to generate VietQR", e);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="font-bold py-1.5 px-4 rounded-xl text-xs w-full text-white shadow-md transition-all active:scale-95"
          style={{ backgroundColor: "#FF9E7D" }}
        >
          Trả nợ
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-xl">Thanh toán nợ</DrawerTitle>
            <DrawerDescription>
              Bạn đang trả <span className="font-bold text-rose-600">{formatCurrency(amount)}</span> cho {toUser.name}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 overflow-y-auto max-h-[60vh]">

        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg my-2 border border-slate-100 dark:border-slate-800">
          <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarImage src={toUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(toUser.name)}`} />
            <AvatarFallback>{toUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Người nhận</p>
            <p className="text-sm font-bold">{toUser.name}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfer" className="flex items-center">
              <QrCode className="w-4 h-4 mr-2" /> Chuyển khoản
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center">
              <Banknote className="w-4 h-4 mr-2" /> Tiền mặt
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transfer" className="mt-4 space-y-4">
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              {hasDynamicQr ? (
                <div className="text-center space-y-2">
                  <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-slate-100">
                    <QRCodeSVG 
                      value={qrString}
                      size={160}
                      level={"M"}
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs font-semibold text-emerald-600">Quét mã VietQR (Tự động cập nhật)</p>
                </div>
              ) : toUser.bankQrUrl ? (
                <div className="text-center space-y-2">
                  <div className="bg-white p-2 rounded-xl shadow-sm inline-block border border-slate-100">
                    <img 
                      src={toUser.bankQrUrl} 
                      alt="Bank QR" 
                      className="w-40 h-40 object-cover rounded-lg"
                    />
                  </div>
                  <p className="text-xs font-semibold text-rose-500">Mã QR tĩnh từ ảnh cá nhân</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-[12px] font-medium text-slate-500">Hãy nhập thông tin bên dưới để tạo QR</p>
                </div>
              )}
            </div>

            {/* Editable Transaction Details */}
            <div className="w-full bg-slate-50 rounded-2xl p-4 text-[12px] space-y-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex flex-col gap-1.5">
                  <span className={`font-medium text-[11px] ${errors.bankBin ? 'text-rose-500' : 'text-slate-500'}`}>Ngân hàng nhận</span>
                  <div className={`bg-white dark:bg-slate-950 rounded-lg border relative ${errors.bankBin ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <select 
                      value={tempBankBin} 
                      onChange={(e) => { setTempBankBin(e.target.value); setErrors((prev: any) => ({...prev, bankBin: false})); }}
                      className="w-full h-9 px-3 border-none bg-transparent focus:ring-0 text-slate-800 dark:text-white font-bold text-[12px] outline-none appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Chọn Ngân hàng</option>
                      <option value="970436">Vietcombank</option>
                      <option value="970415">VietinBank</option>
                      <option value="970418">BIDV</option>
                      <option value="970405">Agribank</option>
                      <option value="970422">MBBank</option>
                      <option value="970407">Techcombank</option>
                      <option value="970432">VPBank</option>
                      <option value="970416">ACB</option>
                      <option value="970423">TPBank</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className={`font-medium text-[11px] ${errors.bankAccount ? 'text-rose-500' : 'text-slate-500'}`}>Số tài khoản nhận</span>
                  <input
                    type="text"
                    value={tempBankAccount}
                    onChange={(e) => { setTempBankAccount(e.target.value); setErrors((prev: any) => ({...prev, bankAccount: false})); }}
                    placeholder="Nhập số tài khoản"
                    className={`w-full h-9 px-3 rounded-lg border bg-white dark:bg-slate-950 focus:ring-0 text-[12px] font-bold text-slate-800 dark:text-white outline-none transition-colors ${errors.bankAccount ? 'border-rose-500 ring-1 ring-rose-500/20 placeholder-rose-300' : 'border-slate-200 dark:border-slate-700'}`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className={`font-medium text-[11px] ${errors.accountName ? 'text-rose-500' : 'text-slate-500'}`}>Tên người nhận</span>
                  <input
                    type="text"
                    value={tempAccountName}
                    onChange={(e) => { setTempAccountName(e.target.value); setErrors((prev: any) => ({...prev, accountName: false})); }}
                    placeholder="Nhập tên người nhận"
                    className={`w-full h-9 px-3 rounded-lg border bg-white dark:bg-slate-950 focus:ring-0 text-[12px] font-bold text-slate-800 dark:text-white outline-none transition-colors ${errors.accountName ? 'border-rose-500 ring-1 ring-rose-500/20 placeholder-rose-300' : 'border-slate-200 dark:border-slate-700'}`}
                  />
                </div>

                <div className="border-t border-slate-200/60 dark:border-slate-800 mt-2 pt-3 flex flex-col gap-1.5">
                  <span className={`font-bold text-[12px] ${errors.amount ? 'text-rose-500' : 'text-slate-500'}`}>Số tiền thực tế:</span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tempAmount ? new Intl.NumberFormat("vi-VN").format(parseInt(tempAmount, 10)) : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setTempAmount(raw);
                        setErrors((prev: any) => ({...prev, amount: false}));
                      }}
                      className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-950 focus:ring-1 text-[16px] font-black text-rose-600 outline-none transition-all pr-8 ${errors.amount ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-emerald-600'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-600 font-black">đ</span>
                  </div>
                </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cash" className="mt-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Banknote className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium">Gặp mặt trả tiền mặt</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-[250px]">
                Hãy đưa trực tiếp số tiền <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(amount)}</span> cho {toUser.name}. Sau khi đưa tiền, hãy nhấn Xác nhận bên dưới.
              </p>
            </div>
          </TabsContent>
        </Tabs>

          </div>

          <DrawerFooter>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={handleConfirm}
              disabled={isSettling}
            >
              {isSettling ? "Đang xử lý..." : <><CheckCircle2 className="w-4 h-4 mr-2" /> Báo đã chuyển tiền</>}
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">
                Hủy bỏ
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
