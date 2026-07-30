"use client";

import { useState } from "react";
import { CreateGroupModal } from "@/components/hop-thoai-tao-nhom";
import { ProfileSetupDrawer } from "@/components/ngan-keo-cap-nhat-ho-so";
import { GlobalDebtsDrawer } from "@/components/ngan-keo-tong-hop-no";
import { DashboardTab } from "@/components/tab-tong-quan";
import { AddTransactionDrawer } from "@/components/ngan-keo-them-giao-dich";
import { ReportTab } from "@/components/tab-thong-ke";
import { SavingsTab } from "@/components/tab-tiet-kiem";
import { NotificationsDrawer } from "@/components/ngan-keo-thong-bao";
import { HistoryTab } from "@/components/tab-lich-su";
import { BudgetTab } from "@/components/tab-ngan-sach";
import { AdvisorTab } from "@/components/tab-tu-van";
import { useAppData } from "@/lib/hooks/use-app-data";
import { BottomNavigation } from "@/components/thanh-dieu-huong-duoi";
import { QuickActionDrawer } from "@/components/ngan-keo-thao-tac-nhanh";
import { PhoneSetupModal } from "@/components/hop-thoai-thiet-lap-sdt";
import { GroupsTab } from "@/components/tab-nhom";
import { ProfileTab } from "@/components/tab-ca-nhan";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [targetBudgetId, setTargetBudgetId] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showTxDrawer, setShowTxDrawer] = useState(false);
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [showQuickAction, setShowQuickAction] = useState(false);

  const {
    groups,
    isLoading,
    currentUser,
    setCurrentUser,
    debtSummary,
    walletId,
    walletBalance,
    detailedDebts,
    showPhoneModal,
    setShowPhoneModal,
    refreshTrigger,
    fetchData,
    handleLogout,
  } = useAppData();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  if (isLoading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ backgroundColor: "#FDF9F0" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#B3E5D1] border-t-[#45b39d] animate-spin" />
          <p className="text-[#45b39d] font-medium text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col relative"
      style={{
        background:
          activeTab === "profile"
            ? "linear-gradient(180deg, #d4f7e6 0%, #e0f2fe 50%, #bae6fd 100%)"
            : "#e8f5f1",
      }}
    >
      {activeTab === "dashboard" ? (
        <DashboardTab
          onNavigate={(tab, extra) => {
            setActiveTab(tab as any);
            setTargetBudgetId(extra || null);
          }}
          refreshTrigger={refreshTrigger}
        />
      ) : activeTab === "savings" ? (
        <>
          <header
            className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2"
            style={{
              backgroundColor: "rgba(232, 245, 241, 0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-gray-800">Tiết kiệm</h1>
          </header>
          <SavingsTab />
        </>
      ) : activeTab === "report" ? (
        <>
          <header
            className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2"
            style={{
              backgroundColor: "rgba(232, 245, 241, 0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-gray-800">Thống kê</h1>
          </header>
          <ReportTab
            onBack={() => setActiveTab("dashboard")}
            refreshTrigger={refreshTrigger}
          />
        </>
      ) : activeTab === "history" ? (
        <>
          <header
            className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2"
            style={{
              backgroundColor: "rgba(232, 245, 241, 0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-gray-800">
              Lịch sử giao dịch
            </h1>
          </header>
          <HistoryTab />
        </>
      ) : activeTab === "budget" ? (
        <>
          <header
            className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2"
            style={{
              backgroundColor: "rgba(232, 245, 241, 0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-xl font-extrabold text-gray-800">
                Quản lý Ngân sách
              </h1>
              <p className="text-[11px] text-gray-500 font-medium leading-none">
                Đặt hạn mức chi tiêu hàng tháng
              </p>
            </div>
          </header>
          <div className="px-5 pb-28">
            <BudgetTab
              year={new Date().getFullYear()}
              month={new Date().getMonth() + 1}
              walletBalance={walletBalance}
              targetBudgetId={targetBudgetId}
            />
          </div>
        </>
      ) : activeTab === "advisor" ? (
        <>
          <header
            className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2"
            style={{
              backgroundColor: "rgba(232, 245, 241, 0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-xl font-extrabold text-gray-800">
                Tư vấn Tài chính
              </h1>
              <p className="text-[11px] text-gray-500 font-medium leading-none">
                Phân tích thông minh dựa trên dữ liệu
              </p>
            </div>
          </header>
          <AdvisorTab />
        </>
      ) : activeTab === "profile" ? (
        <ProfileTab
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenPhoneModal={() => setShowPhoneModal(true)}
          onProfileSaved={fetchData}
        />
      ) : (
        <>
          {/* ─── STICKY HEADER ─── */}
          <header
            className="sticky top-0 z-50 px-5 pt-4 pb-3"
            style={{
              backgroundColor: "rgba(232, 245, 241, 0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                {activeTab === "groups" && (
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
                <h1 className="text-xl font-extrabold text-gray-800">
                  {activeTab === "groups" ? "Nhóm" : "ShareMoney"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <NotificationsDrawer />
                <ProfileSetupDrawer />
                <button
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#45b39d] flex items-center justify-center cursor-default"
                  style={{ backgroundColor: "#B3E5D1" }}
                >
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[#437d6e]">
                      {currentUser?.name?.charAt(0) ?? "U"}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Chào ngày mới,{" "}
              <span className="font-bold text-gray-800">
                {currentUser?.name?.split(" ").pop()} 👋
              </span>
            </p>
          </header>

          {/* ─── DEBT SUMMARY CARDS ─── */}
          <section className="px-5 mt-4 grid grid-cols-2 gap-3">
            <GlobalDebtsDrawer
              myDebts={detailedDebts.myDebts}
              owedToMe={detailedDebts.owedToMe}
              defaultTab="owedToMe"
            >
              <button
                className="aspect-[4/3] rounded-[28px] p-4 flex flex-col justify-between shadow-sm text-left transition-transform active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #c3f4e1 0%, #a0ead5 100%)",
                }}
              >
                <span className="text-xs font-semibold text-black/60">
                  Tiền đang bay về 💰
                </span>
                <div>
                  <div className="text-lg font-black text-gray-800 leading-tight">
                    {formatCurrency(debtSummary.totalOwed)}
                  </div>
                  <p className="text-[10px] text-black/50 mt-0.5">
                    Người khác nợ bạn
                  </p>
                </div>
              </button>
            </GlobalDebtsDrawer>

            <GlobalDebtsDrawer
              myDebts={detailedDebts.myDebts}
              owedToMe={detailedDebts.owedToMe}
              defaultTab="myDebts"
            >
              <button
                className="aspect-[4/3] rounded-[28px] p-4 flex flex-col justify-between shadow-sm text-left transition-transform active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #ffe8cc 0%, #ffc099 100%)",
                }}
              >
                <span className="text-xs font-semibold text-black/60">
                  Tiền cần trả 😩
                </span>
                <div>
                  <div className="text-lg font-black text-gray-800 leading-tight">
                    {formatCurrency(debtSummary.totalOwing)}
                  </div>
                  <p className="text-[10px] text-black/50 mt-0.5">
                    Bạn nợ người khác
                  </p>
                </div>
              </button>
            </GlobalDebtsDrawer>
          </section>

          {/* ─── GROUPS SECTION ─── */}
          <GroupsTab
            groups={groups}
            onOpenCreateGroup={() => setShowCreateGroupModal(true)}
          />
        </>
      )}

      {/* ─── BOTTOM NAVIGATION ─── */}
      <BottomNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setShowQuickAction={setShowQuickAction}
      />

      {/* ─── MODALS & DRAWERS ─── */}
      <CreateGroupModal
        open={showCreateGroupModal}
        onOpenChange={setShowCreateGroupModal}
        onGroupCreated={fetchData}
      />

      <QuickActionDrawer
        open={showQuickAction}
        onOpenChange={setShowQuickAction}
        onSelectTxType={(type) => {
          setTxType(type);
          setShowQuickAction(false);
          setShowTxDrawer(true);
        }}
        onSelectCreateGroup={() => {
          setShowQuickAction(false);
          setShowCreateGroupModal(true);
        }}
      />

      <PhoneSetupModal
        open={showPhoneModal}
        onOpenChange={setShowPhoneModal}
        currentUser={currentUser}
        onSuccess={(phone) => {
          if (currentUser) {
            const updated = { ...currentUser, phone };
            setCurrentUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
          }
        }}
      />

      <AddTransactionDrawer
        open={showTxDrawer}
        onOpenChange={setShowTxDrawer}
        walletId={walletId}
        type={txType}
        onCreated={fetchData}
      />
    </div>
  );
}
