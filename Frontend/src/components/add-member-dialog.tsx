"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/axios";

interface AddMemberDialogProps {
  groupId: string;
  onMemberAdded: () => void;
}

export function AddMemberDialog({ groupId, onMemberAdded }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteLink(`${window.location.origin}/groups/${groupId}`);
    }
  }, [groupId]);

  const handleAddMember = async () => {
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại của người cần mời");
      return;
    }

    try {
      setIsLoading(true);
      
      // 1. Search user by email
      let userRes;
      try {
        userRes = await api.get(`/users/search?phone=${encodeURIComponent(phone)}`);
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error("Không tìm thấy tài khoản nào với số điện thoại này.");
        } else {
          toast.error("Lỗi khi tìm kiếm người dùng.");
        }
        setIsLoading(false);
        return;
      }

      const userId = userRes.data.id;

      // 2. Add user to group
      await api.post(`/groups/${groupId}/members`, { userId });
      
      toast.success(`Đã thêm ${userRes.data.name} vào nhóm!`);
      setPhone("");
      setOpen(false);
      onMemberAdded();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Không thể thêm thành viên này vào nhóm.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button onClick={(e) => e.currentTarget.blur()} className="px-4 py-1.5 rounded-full text-sm font-semibold bg-[#FEF7E6] text-gray-700 shadow-sm transition-all active:scale-95">
          Mời bạn bè
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Thêm thành viên mới
            </DrawerTitle>
            <DrawerDescription>
              Mời bạn bè tham gia nhóm để cùng nhau chia sẻ chi phí.
            </DrawerDescription>
          </DrawerHeader>

          <Tabs defaultValue="email" className="w-full flex flex-col px-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="phone" className="flex items-center">
                <UserPlus className="w-4 h-4 mr-2" /> Số điện thoại
              </TabsTrigger>
              <TabsTrigger value="qrcode" className="flex items-center">
                <QrCode className="w-4 h-4 mr-2" /> Mã QR
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="phone" className="space-y-4 outline-none">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="font-semibold text-gray-700 mb-1">Số điện thoại người mời</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                />
              </div>
              <DrawerFooter className="px-0 pb-0 pt-2">
                <Button onClick={handleAddMember} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Thêm vào nhóm
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full">Hủy</Button>
                </DrawerClose>
              </DrawerFooter>
            </TabsContent>

            <TabsContent value="qrcode" className="outline-none">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-sm text-slate-500 mb-4 text-center">Đưa mã này cho bạn bè quét để tham gia nhóm ngay lập tức</p>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <QRCodeSVG 
                    value={inviteLink}
                    size={180}
                    level={"H"}
                    includeMargin={false}
                  />
                </div>
                <Button 
                  variant="link" 
                  className="mt-4 text-emerald-600 font-semibold"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Đã copy link mời!");
                  }}
                >
                  Copy Link Mời
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
