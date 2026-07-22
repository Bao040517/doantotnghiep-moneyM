"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  existingMemberIds?: string[];
}

export function AddMemberDialog({
  groupId,
  onMemberAdded,
  existingMemberIds = [],
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [pastMembers, setPastMembers] = useState<any[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteLink(`${window.location.origin}/groups/${groupId}`);
    }
  }, [groupId]);

  useEffect(() => {
    if (open) {
      setPhone("");
      setFetchingMembers(true);
      api
        .get("/groups/past-members")
        .then((res) => {
          setPastMembers(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setFetchingMembers(false));
    }
  }, [open]);

  const handleAddPastMember = async (userId: string, userName: string) => {
    try {
      setIsLoading(true);
      await api.post(`/groups/${groupId}/members`, { userId });
      toast.success(`Đã thêm ${userName} vào nhóm!`);
      setOpen(false);
      onMemberAdded();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Không thể thêm thành viên này vào nhóm.",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        userRes = await api.get(
          `/users/search?phone=${encodeURIComponent(phone)}`,
        );
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
      toast.error(
        error.response?.data?.message ||
          "Không thể thêm thành viên này vào nhóm.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="px-4 py-1.5 rounded-full text-sm font-semibold bg-[#FEF7E6] text-gray-700 shadow-sm transition-all active:scale-95 hover:bg-[#faeed6]"
      >
        Mời bạn bè
      </DialogTrigger>
      <DialogContent className="bg-white sm:max-w-md rounded-[2rem] p-6 shadow-2xl border-0">
        <div className="mx-auto w-full">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-600" />
              </div>
              Thêm thành viên mới
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-2 text-sm">
              Mời bạn bè tham gia nhóm để cùng nhau chia sẻ chi phí dễ dàng hơn.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="phone" className="w-full flex flex-col">
            <TabsList className="flex w-full mb-6 bg-slate-100/80 rounded-2xl p-1 h-auto border border-slate-200/60">
              <TabsTrigger 
                value="phone" 
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all data-active:bg-white data-active:text-emerald-700 data-active:shadow-sm text-slate-500"
              >
                <UserPlus className="w-4 h-4 mr-2" /> SĐT
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all data-active:bg-white data-active:text-emerald-700 data-active:shadow-sm text-slate-500"
              >
                <Users className="w-4 h-4 mr-2" /> Quen biết
              </TabsTrigger>
              <TabsTrigger 
                value="qrcode" 
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all data-active:bg-white data-active:text-emerald-700 data-active:shadow-sm text-slate-500"
              >
                <QrCode className="w-4 h-4 mr-2" /> Mã QR
              </TabsTrigger>
            </TabsList>

            <div className="min-h-[360px]">
              <TabsContent value="phone" className="space-y-4 outline-none animate-in fade-in-50 zoom-in-95 duration-200 mt-0">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="phone"
                    className="font-bold text-gray-700 mb-1 ml-1"
                  >
                    Số điện thoại người mời
                  </Label>
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
                    className="rounded-2xl px-4 py-6 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 text-base"
                  />
                </div>
                <div className="flex flex-col gap-3 mt-6">
                  <Button
                    onClick={handleAddMember}
                    disabled={isLoading}
                    className="w-full py-6 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-95"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    Thêm vào nhóm
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full py-6 rounded-2xl text-base font-semibold text-gray-500 hover:bg-gray-100" 
                    onClick={() => setOpen(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="past" className="outline-none animate-in fade-in-50 zoom-in-95 duration-200 mt-0">
                <div className="flex flex-col gap-3">
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl text-sm font-medium flex items-start gap-2 border border-emerald-100">
                    <div className="mt-0.5 shrink-0">💡</div>
                    Thêm nhanh những người đã từng chung nhóm với bạn mà không cần nhập SĐT.
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto pr-2 space-y-2 mt-2 custom-scrollbar">
                    {fetchingMembers ? (
                      <div className="flex flex-col items-center justify-center py-8 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-50" />
                        <p className="text-sm font-medium opacity-70">Đang tải danh sách...</p>
                      </div>
                    ) : pastMembers.length === 0 ? (
                      <div className="text-sm text-center text-slate-400 py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                        Chưa có người quen nào
                      </div>
                    ) : (
                      pastMembers.map((member) => {
                        const isExistingMember = existingMemberIds.includes(member.id);
                        return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between gap-3 p-3 rounded-2xl border shadow-sm transition-all group ${
                            isExistingMember 
                              ? "bg-slate-50 border-transparent shadow-none" 
                              : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md"
                          }`}
                        >
                          <div className={`flex items-center gap-3 min-w-0 ${isExistingMember ? "opacity-60" : ""}`}>
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                member.name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[15px] font-bold truncate transition-colors ${
                                isExistingMember ? "text-slate-500" : "text-gray-800 group-hover:text-emerald-700"
                              }`}>
                                {member.name}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddPastMember(member.id, member.name)}
                            disabled={isLoading || isExistingMember}
                            className={`h-9 px-4 rounded-xl font-bold shadow-none ${
                              isExistingMember
                                ? "bg-slate-200 text-slate-500 hover:bg-slate-200 opacity-70"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                          >
                            {isExistingMember ? "Đã tham gia" : "Thêm"}
                          </Button>
                        </div>
                      )})
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qrcode" className="outline-none animate-in fade-in-50 zoom-in-95 duration-200 mt-0 h-full">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-emerald-100 rounded-3xl bg-emerald-50/50 h-[360px]">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 mb-6 transition-transform hover:scale-105 duration-300">
                    <QRCodeSVG
                      value={inviteLink}
                      size={180}
                      level={"H"}
                      includeMargin={false}
                      fgColor="#047857"
                    />
                  </div>
                  <p className="text-sm font-medium text-emerald-800 mb-5 text-center px-4">
                    Đưa mã này cho bạn bè quét để tham gia nhóm!
                  </p>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Đã copy link mời!");
                    }}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 font-bold px-8 shadow-md"
                  >
                    Copy Link Mời
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
