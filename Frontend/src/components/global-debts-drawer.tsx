"use client";

import { useState } from "react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HandCoins, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface GlobalDebtTransaction {
  groupId: string;
  groupName: string;
  from: UserSummary;
  to: UserSummary;
  amount: number;
}

interface GlobalDebtsDrawerProps {
  myDebts: GlobalDebtTransaction[];
  owedToMe: GlobalDebtTransaction[];
  defaultTab?: "owedToMe" | "myDebts";
  children: React.ReactNode;
}

export function GlobalDebtsDrawer({ myDebts, owedToMe, defaultTab = "owedToMe", children }: GlobalDebtsDrawerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleNavigateToGroup = (groupId: string) => {
    setOpen(false);
    router.push(`/groups/${groupId}`);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-xl">Chi tiết Công nợ</DrawerTitle>
            <DrawerDescription>
              Tổng hợp tất cả các khoản nợ của bạn trên toàn bộ các nhóm.
            </DrawerDescription>
          </DrawerHeader>

          <Tabs defaultValue={defaultTab} className="w-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mb-4 w-[calc(100%-32px)]">
              <TabsTrigger value="owedToMe" className="flex items-center">
                <Landmark className="w-4 h-4 mr-2" /> Đang bay về
              </TabsTrigger>
              <TabsTrigger value="myDebts" className="flex items-center">
                <HandCoins className="w-4 h-4 mr-2" /> Cần trả
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="owedToMe" className="px-4 pb-4">
              <div className="overflow-y-auto max-h-[50vh] space-y-3">
                {owedToMe.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🎉</div>
                    <p className="font-semibold text-slate-700">Không ai nợ bạn!</p>
                    <p className="text-xs text-slate-500 mt-1">Các khoản nợ đã được thanh toán hết.</p>
                  </div>
                ) : (
                  owedToMe.map((t, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-slate-200">
                        <AvatarImage src={t.from.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.from.name)}`} />
                        <AvatarFallback>{t.from.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{t.from.name}</p>
                        <p className="text-xs text-slate-500 truncate">Nhóm: {t.groupName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(t.amount)}</p>
                        <button onClick={() => handleNavigateToGroup(t.groupId)} className="text-[10px] font-bold text-emerald-700 underline mt-0.5">Vào nhóm</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="myDebts" className="px-4 pb-4">
              <div className="overflow-y-auto max-h-[50vh] space-y-3">
                {myDebts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">😎</div>
                    <p className="font-semibold text-slate-700">Bạn không nợ ai!</p>
                    <p className="text-xs text-slate-500 mt-1">Tài chính quá vững mạnh.</p>
                  </div>
                ) : (
                  myDebts.map((t, idx) => (
                    <div key={idx} className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100 flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-slate-200">
                        <AvatarImage src={t.to.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.to.name)}`} />
                        <AvatarFallback>{t.to.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{t.to.name}</p>
                        <p className="text-xs text-slate-500 truncate">Nhóm: {t.groupName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-500">{formatCurrency(t.amount)}</p>
                        <button onClick={() => handleNavigateToGroup(t.groupId)} className="text-[10px] font-bold text-rose-600 underline mt-0.5">Vào nhóm trả nợ</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </DrawerContent>
    </Drawer>
  );
}
