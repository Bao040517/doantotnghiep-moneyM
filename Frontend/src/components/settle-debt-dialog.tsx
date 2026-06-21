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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleConfirm = async () => {
    setIsSettling(true);
    try {
      await api.post(`/groups/${groupId}/debts/notify-payment`, {
        toUserId: toUser.id,
        amount: amount
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
  
  if (toUser.bankBin && toUser.bankAccountNo) {
    try {
      const qr = QRPay.initVietQR({
        bankBin: toUser.bankBin,
        bankNumber: toUser.bankAccountNo,
        amount: amount.toString(),
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

        <Tabs defaultValue="transfer" className="w-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfer" className="flex items-center">
              <QrCode className="w-4 h-4 mr-2" /> Chuyển khoản
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center">
              <Banknote className="w-4 h-4 mr-2" /> Tiền mặt
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transfer" className="mt-4">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              {hasDynamicQr ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-slate-500 mb-2">Quét mã QR dưới đây bằng ứng dụng ngân hàng</p>
                  <div className="bg-white p-4 rounded-xl shadow-sm inline-block border border-slate-100">
                    <QRCodeSVG 
                      value={qrString}
                      size={200}
                      level={"M"}
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs font-semibold text-emerald-600">Đã tích hợp tự động nhập số tiền: {formatCurrency(amount)}</p>
                  <p className="text-[10px] text-slate-400">QR sinh ra hoàn toàn offline (Không qua bên thứ 3)</p>
                </div>
              ) : toUser.bankQrUrl ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-slate-500 mb-2">Quét mã QR cá nhân của {toUser.name}</p>
                  <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-slate-100">
                    <img 
                      src={toUser.bankQrUrl} 
                      alt="Bank QR" 
                      className="w-48 h-48 object-cover rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-rose-500">Lưu ý: Bạn phải tự nhập số tiền {formatCurrency(amount)}</p>
                  <p className="text-[10px] text-slate-400">Ảnh QR tĩnh do người dùng tải lên</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Chưa có thông tin nhận tiền</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                    {toUser.name} chưa cấu hình STK Ngân hàng hoặc mã QR. Hãy trả bằng tiền mặt.
                  </p>
                </div>
              )}
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
