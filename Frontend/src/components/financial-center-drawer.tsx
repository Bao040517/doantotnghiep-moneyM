"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { BudgetTab } from "@/components/budget-tab";

interface FinancialCenterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
}

export function FinancialCenterDrawer({ open, onOpenChange, walletBalance }: FinancialCenterDrawerProps) {
  const now = new Date();
  
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#f8fafc] h-[90vh]">
        <div className="mx-auto w-full max-w-md h-full flex flex-col">
          <DrawerHeader className="bg-white border-b border-gray-100 shrink-0 text-center pb-6 pt-4 rounded-t-2xl shadow-sm z-10 relative">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <DrawerTitle className="text-xl font-black text-gray-800">Quản lý Ngân sách</DrawerTitle>
            <DrawerDescription className="text-gray-500 text-sm mt-1">
              Đặt hạn mức và kế hoạch chi tiêu hàng tháng
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <BudgetTab year={now.getFullYear()} month={now.getMonth() + 1} walletBalance={walletBalance} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
