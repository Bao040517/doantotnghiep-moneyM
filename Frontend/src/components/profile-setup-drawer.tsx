"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Settings, CheckCircle2, Loader2, QrCode, ImageIcon } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const POPULAR_BANKS = [
  { bin: "970436", name: "Vietcombank", shortName: "VCB" },
  { bin: "970407", name: "Techcombank", shortName: "TCB" },
  { bin: "970422", name: "MBBank", shortName: "MB" },
  { bin: "970416", name: "ACB", shortName: "ACB" },
  { bin: "970415", name: "VietinBank", shortName: "CTG" },
  { bin: "970418", name: "BIDV", shortName: "BIDV" },
  { bin: "970405", name: "Agribank", shortName: "VBA" },
  { bin: "970423", name: "TPBank", shortName: "TPB" },
  { bin: "970432", name: "VPBank", shortName: "VPB" },
];

export function ProfileSetupDrawer({ children, onSave }: { children?: React.ReactNode, onSave?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [bankBin, setBankBin] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankQrUrl, setBankQrUrl] = useState("");

  useEffect(() => {
    if (open) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        setBankBin(u.bankBin || "");
        setBankAccountNo(u.bankAccountNo || "");
        setBankQrUrl(u.bankQrUrl || "");
      }
    }
  }, [open]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await api.put("/users/me/qr", {
        bankBin: bankBin || null,
        bankAccountNo: bankAccountNo || null,
        bankQrUrl: bankQrUrl || null
      });

      // Update local storage
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);

      toast.success("Cập nhật thông tin thành công!");
      setOpen(false);
      if (onSave) onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/50 dark:bg-slate-800/50 rounded-full h-10 w-10 border border-slate-200 dark:border-slate-700">
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="bg-white dark:bg-slate-950 max-h-[96vh]">
        <div className="mx-auto w-full max-w-sm px-4 pb-8 pt-4 overflow-y-auto max-h-[90vh]">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-bold flex items-center">
              <User className="mr-2 h-6 w-6 text-indigo-500" />
              Tài khoản của bạn
            </DrawerTitle>
            <DrawerDescription>
              Cấu hình ngân hàng để tự động tạo mã QR nhận tiền.
            </DrawerDescription>
          </DrawerHeader>

          {user && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <Avatar className="h-14 w-14 border-2 border-indigo-100">
                <AvatarImage src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
          )}

          {/* QR Previews */}
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2 snap-x">
            {/* VietQR Tự Động */}
            <div className="flex-shrink-0 w-40 flex flex-col items-center bg-emerald-50 rounded-xl p-3 border border-emerald-100 snap-center">
              <p className="text-xs font-bold text-emerald-700 mb-2">VietQR Tự Động</p>
              {user?.bankBin && user?.bankAccountNo ? (
                <Dialog>
                  <DialogTrigger className="bg-white p-2 rounded-lg shadow-sm w-full aspect-square flex items-center justify-center cursor-pointer hover:opacity-80 transition-all active:scale-95 border-none outline-none text-left">
                      <img
                        src={`https://img.vietqr.io/image/${user.bankBin}-${user.bankAccountNo}-compact2.png?amount=0&addInfo=&accountName=${encodeURIComponent(user.name)}`}
                        alt="VietQR"
                        className="w-full h-full object-contain"
                      />
                  </DialogTrigger>
                  <DialogContent className="max-w-sm bg-white flex flex-col items-center justify-center p-8 border-none shadow-2xl rounded-3xl" showCloseButton={false}>
                    <DialogTitle className="sr-only">Phóng to VietQR</DialogTitle>
                    <img
                      src={`https://img.vietqr.io/image/${user.bankBin}-${user.bankAccountNo}-compact2.png?amount=0&addInfo=&accountName=${encodeURIComponent(user.name)}`}
                      alt="VietQR"
                      className="w-full max-h-[70vh] object-contain rounded-xl"
                    />
                    <p className="text-emerald-700 font-bold mt-4">Mã VietQR của bạn</p>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="bg-white/50 p-2 rounded-lg w-full aspect-square flex flex-col items-center justify-center border border-emerald-200 border-dashed">
                  <QrCode className="w-8 h-8 text-emerald-300 mb-1" />
                  <span className="text-[10px] text-emerald-600 text-center font-medium">Chưa cấu hình</span>
                </div>
              )}
            </div>

            {/* QR Tĩnh */}
            <div className="flex-shrink-0 w-40 flex flex-col items-center bg-blue-50 rounded-xl p-3 border border-blue-100 snap-center">
              <p className="text-xs font-bold text-blue-700 mb-2">QR Tĩnh (Cá nhân)</p>
              {user?.bankQrUrl ? (
                <Dialog>
                  <DialogTrigger className="bg-white p-2 rounded-lg shadow-sm w-full aspect-square flex items-center justify-center cursor-pointer hover:opacity-80 transition-all active:scale-95 border-none outline-none text-left">
                      <img
                        src={user.bankQrUrl}
                        alt="Static QR"
                        className="w-full h-full object-contain"
                      />
                  </DialogTrigger>
                  <DialogContent className="max-w-sm bg-white flex flex-col items-center justify-center p-8 border-none shadow-2xl rounded-3xl" showCloseButton={false}>
                    <DialogTitle className="sr-only">Phóng to QR Tĩnh</DialogTitle>
                    <img
                      src={user.bankQrUrl}
                      alt="Static QR"
                      className="w-full max-h-[70vh] object-contain rounded-xl"
                    />
                    <p className="text-blue-700 font-bold mt-4">Mã QR cá nhân</p>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="bg-white/50 p-2 rounded-lg w-full aspect-square flex flex-col items-center justify-center border border-blue-200 border-dashed">
                  <ImageIcon className="w-8 h-8 text-blue-300 mb-1" />
                  <span className="text-[10px] text-blue-600 text-center font-medium">Chưa có ảnh tĩnh</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ngân hàng</Label>
              <Select value={bankBin} onValueChange={(val) => setBankBin(val || "")}>
                <SelectTrigger>
                  <span className={`flex-1 text-left ${!bankBin ? "text-slate-500" : ""}`}>
                    {bankBin
                      ? (() => {
                        const b = POPULAR_BANKS.find(bank => bank.bin === bankBin);
                        return b ? `${b.shortName} - ${b.name}` : bankBin;
                      })()
                      : "Chọn ngân hàng của bạn"}
                  </span>
                </SelectTrigger>
                <SelectContent portal={false}>
                  {POPULAR_BANKS.map((b) => (
                    <SelectItem key={b.bin} value={b.bin}>
                      {b.shortName} - {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Số tài khoản</Label>
              <Input
                placeholder="Ví dụ: 0123456789"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
              />
              <p className="text-xs text-emerald-600 flex items-center mt-1">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Hệ thống sẽ tự động sinh mã VietQR từ thông tin này.
              </p>
            </div>

            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">HOẶC DÙNG QR TĨNH</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <QrCode className="w-4 h-4 mr-2 text-slate-500" />
                Link ảnh QR Cá nhân
              </Label>
              <Input
                placeholder="https://..."
                value={bankQrUrl}
                onChange={(e) => setBankQrUrl(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Nếu nhập, chúng tôi sẽ dùng ảnh này trong trường hợp sinh mã tự động thất bại.
              </p>
            </div>

            <Button
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
