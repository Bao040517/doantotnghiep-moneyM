"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { CreateGroupModal } from "@/components/create-group-modal";
import { ProfileSetupDrawer } from "@/components/profile-setup-drawer";
import { GlobalDebtsDrawer, GlobalDebtTransaction } from "@/components/global-debts-drawer";
import { DashboardTab } from "@/components/dashboard-tab";
import { AddTransactionDrawer } from "@/components/add-transaction-drawer";
import { ReportTab } from "@/components/report-tab";
import { SavingsTab } from "@/components/savings-tab";
import { NotificationsDrawer } from "@/components/notifications-drawer";
import { HistoryTab } from "@/components/history-tab";
import { BudgetTab } from "@/components/budget-tab";

interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  email?: string;
  phone?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankQrUrl?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  creator: UserSummary;
  memberCount: number;
  totalAmount?: number;
}

interface DebtSummary {
  totalOwed: number;
  totalOwing: number;
}

const GROUP_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCESQZpPFHiV1CVbNCsfFVgpQkuGWCkY3iUVijNCus5_cQZpSXHptN0PCjFia1eh2QFOVcoIkLSPrxKdFhKVSe1PShIGavv2nRnG50AwL7ZKiQghHbhisGS2QUlz8rqJ6EgMYK4stJCGSZzGBM1v2lhqdyClBwrGPAnYFtNzHEWddSdPkr0yetyNuE0xfPfGrs5WIlL7onYTZt6XKrrTOy3qx13LCx-T8E_wsyXtJGbn8DOszJeh-qRPeH-4K_LM8YwXlU6_oCmIkE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCYOIaWid8x5ZNElc46aBfNYCLI5VRkmZqLjiTO5VRDSZLMY6g2UwzYVgs_ktJYJNKiobRLrCe-1LnIJ6Vxif9j0v0N1-SfMAWxp-FobOEpm4W-5hul4oue2crzq0aLj5vSoINMd4BlEA-9WMeMfoGa1UR8M9wAGblOp-6ic5MUKRPdBg2mMF0VPYQNTTvj9cuEMND828JCFpk3N3ngoMT9BS56oi_7fHFyq_XFK0rDelemm3QlDyoFkgw2xrY5inxoTs2eWA_Fzhc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuArCk4zl2q4IzgJWDzX6F5XhUle7GlLV8ICgjH3k1IbH9r96gcUnVLLYZgqYgOIiObmX1BaWDFuR4Gl1WHvD7B7Kbzmpi7v8550CiWabq8-XtijDWYE2d9E58SmjRlBkRt7zEF_bWDtQojygQIFDo6yGoQVw7U_Amp8LK9guW1fzglGUcG4n9W3JrFqBtDt9U1FUtet-bY7UpkwpTe39oaibdfniAFqxMUdDaDig4u-eXiubiTgve7bwEuF8j0X4eBULEJvLMSUFVc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAbVRdc680yL2hY0vZiC1sZ2cVkw3zsfz0OHHSpw81Y9OUe_TtuCdMgzvxYqNBwLo4tPNaD3oI2BME-5H_XFUvpsOAMxo4tx5Ca2io6Il86gzjAXBG0vACqiw-eeU1fULlgtAjrShGO83YKtjAeSc64aYRxTr_kIMXTjXdTNweiByxwHsknnrQmeRgnbsk3BfSlB_8J_y_ocHsb20vNkXTusM7bCzAHYNoFZM0xycfpnjgMeLfs8pBqj-Obez-DNE0v8CVu5puolMc",
];

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

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [debtSummary, setDebtSummary] = useState<DebtSummary>({ totalOwed: 0, totalOwing: 0 });
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [showTxDrawer, setShowTxDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"groups" | "report" | "profile" | "dashboard" | "savings" | "history" | "budget">("dashboard");
  const [walletId, setWalletId] = useState<string | undefined>(undefined);
  const [walletBalance, setWalletBalance] = useState(0);
  const [detailedDebts, setDetailedDebts] = useState<{ myDebts: GlobalDebtTransaction[], owedToMe: GlobalDebtTransaction[] }>({ myDebts: [], owedToMe: [] });
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneForm, setPhoneForm] = useState("");
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const router = useRouter();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const fetchData = async () => {
    try {
      const [groupsRes] = await Promise.all([
        api.get("/groups"),
      ]);
      setGroups(groupsRes.data);

      // Compute debt summary across all groups
      let totalOwed = 0;
      let totalOwing = 0;
      const myDebts: GlobalDebtTransaction[] = [];
      const owedToMe: GlobalDebtTransaction[] = [];

      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const debtPromises = groupsRes.data.map((g: Group) =>
          api.get(`/groups/${g.id}/debts`).then(r => ({ groupId: g.id, groupName: g.name, data: r.data })).catch(() => null)
        );
        const allDebts = await Promise.all(debtPromises);
        allDebts.forEach(res => {
          if (!res?.data?.transactions) return;
          res.data.transactions.forEach((t: any) => {
            if (t.from.id === user.id) {
              totalOwing += t.amount;
              myDebts.push({ groupId: res.groupId, groupName: res.groupName, from: t.from, to: t.to, amount: t.amount });
            }
            if (t.to.id === user.id) {
              totalOwed += t.amount;
              owedToMe.push({ groupId: res.groupId, groupName: res.groupName, from: t.from, to: t.to, amount: t.amount });
            }
          });
        });
      }
      setDebtSummary({ totalOwed, totalOwing });
      setDetailedDebts({ myDebts, owedToMe });

      const balanceRes = await api.get("/wallets/total-balance").catch(() => ({ data: { totalBalance: 0 } }));
      setWalletBalance(balanceRes.data.totalBalance);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/auth"); return; }
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (!user.phone) {
        setShowPhoneModal(true);
      }
    }
    fetchData();
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPhone(true);
    setPhoneError("");
    try {
      await api.put(`/users/me/phone`, { phone: phoneForm });

      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userObj.phone = phoneForm;
        localStorage.setItem("user", JSON.stringify(userObj));
        setCurrentUser(userObj);
      }
      setShowPhoneModal(false);
    } catch (err: any) {
      setPhoneError(err?.response?.data?.message || "Đã có lỗi xảy ra khi cập nhật số điện thoại.");
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: "#FDF9F0" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#B3E5D1] border-t-[#45b39d] animate-spin" />
          <p className="text-[#45b39d] font-medium text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col relative" style={{
      background: activeTab === "profile" ? "linear-gradient(180deg, #d4f7e6 0%, #e0f2fe 50%, #bae6fd 100%)" : "#e8f5f1"
    }}>
      {activeTab === "dashboard" ? (
        <DashboardTab onNavigate={(tab) => setActiveTab(tab as any)} />
      ) : activeTab === "savings" ? (
        <>
          <header className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2" style={{ backgroundColor: "rgba(232, 245, 241, 0.95)", backdropFilter: "blur(8px)" }}>
            <button onClick={() => setActiveTab("dashboard")} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-gray-800">Tiết kiệm</h1>
          </header>
          <SavingsTab />
        </>
      ) : activeTab === "report" ? (
        <>
          <header className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2" style={{ backgroundColor: "rgba(232, 245, 241, 0.95)", backdropFilter: "blur(8px)" }}>
            <button onClick={() => setActiveTab("dashboard")} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-gray-800">Thống kê</h1>
          </header>
          <ReportTab onBack={() => setActiveTab("dashboard")} />
        </>
      ) : activeTab === "history" ? (
        <>
          <header className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2" style={{ backgroundColor: "rgba(232, 245, 241, 0.95)", backdropFilter: "blur(8px)" }}>
            <button onClick={() => setActiveTab("dashboard")} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-gray-800">Lịch sử giao dịch</h1>
          </header>
          <HistoryTab />
        </>
      ) : activeTab === "budget" ? (
        <>
          <header className="sticky top-0 z-50 px-5 pt-4 pb-3 flex items-center gap-2" style={{ backgroundColor: "rgba(232, 245, 241, 0.95)", backdropFilter: "blur(8px)" }}>
            <button onClick={() => setActiveTab("dashboard")} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-xl font-extrabold text-gray-800">Quản lý Ngân sách</h1>
              <p className="text-[11px] text-gray-500 font-medium leading-none">Đặt hạn mức chi tiêu hàng tháng</p>
            </div>
          </header>
          <div className="px-5 pb-28">
            <BudgetTab year={new Date().getFullYear()} month={new Date().getMonth() + 1} walletBalance={walletBalance} />
          </div>
        </>
      ) : activeTab !== "profile" ? (
        <>
          {/* ─── STICKY HEADER ─── */}
          <header className="sticky top-0 z-50 px-5 pt-4 pb-3"
            style={{ backgroundColor: "rgba(232, 245, 241, 0.95)", backdropFilter: "blur(8px)" }}>
            {/* Top row */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                {activeTab === "groups" && (
                  <button onClick={() => setActiveTab("dashboard")} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-700 active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h1 className="text-xl font-extrabold text-gray-800">{activeTab === "groups" ? "Nhóm" : "ShareMoney"}</h1>
              </div>
              <div className="flex items-center gap-2">
                <NotificationsDrawer />
                <ProfileSetupDrawer />
                {/* User avatar */}
                <button
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#45b39d] flex items-center justify-center cursor-default"
                  style={{ backgroundColor: "#B3E5D1" }}
                >
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-[#437d6e]">
                      {currentUser?.name?.charAt(0) ?? "U"}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Greeting */}
            <p className="text-sm text-gray-600">
              Chào ngày mới, <span className="font-bold text-gray-800">{currentUser?.name?.split(" ").pop()} 👋</span>
            </p>
          </header>

          {/* ─── DEBT SUMMARY CARDS (Bento) ─── */}
          <section className="px-5 mt-4 grid grid-cols-2 gap-3">
            {/* Tiền đang bay về */}
            <GlobalDebtsDrawer myDebts={detailedDebts.myDebts} owedToMe={detailedDebts.owedToMe} defaultTab="owedToMe">
              <button className="aspect-[4/3] rounded-[28px] p-4 flex flex-col justify-between shadow-sm text-left transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, #c3f4e1 0%, #a0ead5 100%)" }}>
                <span className="text-xs font-semibold text-black/60">Tiền đang bay về 💰</span>
                <div>
                  <div className="text-lg font-black text-gray-800 leading-tight">
                    {formatCurrency(debtSummary.totalOwed)}
                  </div>
                  <p className="text-[10px] text-black/50 mt-0.5">Người khác nợ bạn</p>
                </div>
              </button>
            </GlobalDebtsDrawer>

            {/* Tiền cần trả */}
            <GlobalDebtsDrawer myDebts={detailedDebts.myDebts} owedToMe={detailedDebts.owedToMe} defaultTab="myDebts">
              <button className="aspect-[4/3] rounded-[28px] p-4 flex flex-col justify-between shadow-sm text-left transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, #ffe8cc 0%, #ffc099 100%)" }}>
                <span className="text-xs font-semibold text-black/60">Tiền cần trả 😩</span>
                <div>
                  <div className="text-lg font-black text-gray-800 leading-tight">
                    {formatCurrency(debtSummary.totalOwing)}
                  </div>
                  <p className="text-[10px] text-black/50 mt-0.5">Bạn nợ người khác</p>
                </div>
              </button>
            </GlobalDebtsDrawer>
          </section>

          {/* ─── GROUPS SECTION ─── */}
          <main className="flex-1 px-5 mt-6 pb-28">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-extrabold text-gray-800">Nhóm của bạn</h2>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Create new group card */}
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="rounded-[2.5rem] p-4 flex flex-col items-center justify-center border-2 border-dashed border-[#b3e5d1] bg-white/60 min-h-[180px] transition-all active:scale-95"
              >
                <div className="w-14 h-14 rounded-full bg-[#B3E5D1] flex items-center justify-center mb-3 shadow-sm">
                  <svg className="w-7 h-7 text-[#437d6e]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-700">Tạo Nhóm Mới</p>
                <p className="text-xs text-gray-400 mt-1 text-center">Bắt đầu chia sẻ chi phí</p>
              </button>

              {/* Group cards */}
              {groups.map((group, idx) => (
                <button
                  key={group.id}
                  onClick={() => router.push(`/groups/${group.id}`)}
                  className="rounded-[2.5rem] p-4 flex flex-col text-left shadow-sm border-2 border-[#ffd8c2] bg-[#FFF9EF] transition-all active:scale-95"
                >
                  {/* Group image */}
                  <div className="rounded-3xl w-full aspect-square overflow-hidden mb-3">
                    <img
                      src={GROUP_IMAGES[idx % GROUP_IMAGES.length]}
                      alt={group.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{group.name}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="bg-[#e8f5f1] p-1 rounded text-emerald-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                    </span>
                    <p className="text-[11px] text-gray-500">{group.memberCount} thành viên</p>
                  </div>
                </button>
              ))}
            </div>

            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-[#B3E5D1] flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-[#437d6e]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <p className="font-bold text-gray-700 text-lg">Chưa có nhóm nào</p>
                <p className="text-sm text-gray-400 mt-1">Tạo nhóm đầu tiên để bắt đầu!</p>
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="px-5 mt-8 max-w-md mx-auto w-full pb-28">
          {/* ─── PROFILE HEADER ─── */}
          <section className="flex flex-col items-center mb-8">
            <div className="mb-4 shadow-sm p-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #a7f3d0 0%, #7dd3fc 100%)" }}>
              <img
                alt="Profile Picture"
                className="w-[110px] h-[110px] rounded-full object-cover border-4 border-white"
                src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || "U")}`}
              />
            </div>
            <h1 className="text-2xl font-semibold text-slate-700 mb-1">{currentUser?.name}</h1>
            <p className="text-slate-500 text-sm">Tiêu xài thông minh ✨</p>
          </section>

          {/* ─── CARDS SECTION ─── */}
          <section className="space-y-4">
            {/* Personal Info Card */}
            <article className="p-5 rounded-[1.25rem] shadow-sm" style={{ backgroundColor: "#fcf9f2" }}>
              <h2 className="text-lg font-medium text-slate-800 mb-4">Thông tin cá nhân</h2>
              <div className="space-y-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center mr-4 shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  </div>
                  <div className="flex-1 flex justify-between items-center min-w-0">
                    <span className="text-slate-700 truncate">Email</span>
                    <span className="text-slate-800 ml-2 truncate">{currentUser?.email || "Chưa cập nhật"}</span>
                  </div>
                </div>
                <div
                  className="flex items-center cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
                  onClick={() => { setPhoneForm(""); setShowPhoneModal(true); }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#d1fae5] flex items-center justify-center mr-4 shrink-0">
                    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  </div>
                  <div className="flex-1 flex items-center min-w-0">
                    <span className="text-slate-700 truncate flex-1">Số điện thoại</span>
                    <span className="text-slate-800 ml-2 truncate">{currentUser?.phone || "Chưa cập nhật"}</span>
                    <svg className="w-4 h-4 text-gray-400 ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </article>

            {/* Unified Financial Info & VietQR Card */}
            <ProfileSetupDrawer onSave={fetchData}>
              <article className="p-5 rounded-[1.25rem] shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all" style={{ backgroundColor: "#fcf9f2" }}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-medium text-slate-800">Tài chính & Nhận tiền</h2>
                  {(currentUser?.bankQrUrl || (currentUser?.bankBin && currentUser?.bankAccountNo)) && (
                    <div className="bg-white p-1 rounded-lg shadow-sm">
                      <img alt="QR Code" className="w-8 h-8 object-contain" src={currentUser?.bankQrUrl || `https://img.vietqr.io/image/${currentUser.bankBin}-${currentUser.bankAccountNo}-compact2.png?amount=0&addInfo=&accountName=${encodeURIComponent(currentUser.name)}`} />
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center mr-4 shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  </div>
                  <div className="flex-1 flex items-center min-w-0">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-slate-700 truncate">Ngân hàng</span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">Nhấn để cấu hình VietQR</span>
                    </div>
                    <span className="text-slate-800 ml-2 truncate font-medium">
                      {POPULAR_BANKS.find(b => b.bin === currentUser?.bankBin)?.shortName || "Chưa cấu hình"} {currentUser?.bankAccountNo ? `- *${currentUser.bankAccountNo.slice(-4)}` : ""}
                    </span>
                    <svg className="w-4 h-4 text-gray-400 ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </article>
            </ProfileSetupDrawer>

            {/* Logout Card */}
            <button onClick={handleLogout} className="w-full bg-[#fcf9f2] rounded-[1.25rem] p-4 flex items-center justify-center gap-2 text-red-500 shadow-sm hover:bg-red-50 transition-colors mt-8">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              <span className="font-semibold text-lg">Đăng xuất tài khoản</span>
            </button>
          </section>
        </main>
      )}

      {/* ─── BOTTOM NAVIGATION ─── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-end py-3 px-3 z-50"
        style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>

        <button
          onClick={() => setActiveTab("dashboard")}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeTab === "dashboard" ? "text-[#45b39d]" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className={`text-[10px] font-medium ${activeTab === "dashboard" ? "text-[#45b39d]" : "text-gray-400"}`}>Tổng quan</span>
        </button>
        {/* Report (Thống kê) */}
        <button
          onClick={() => setActiveTab("report")}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeTab === "report" ? "text-[#45b39d]" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
          <span className={`text-[10px] font-medium ${activeTab === "report" ? "text-[#45b39d]" : "text-gray-400"}`}>Thống kê</span>
        </button>



        {/* Center Add Button (Quick Actions) */}
        <button
          onClick={() => setShowQuickAction(true)}
          className="relative flex items-center justify-center -top-6 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-lg shadow-emerald-200 border-4 border-white hover:scale-105 active:scale-95 transition-transform"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        {/* History */}
        <button
          onClick={() => setActiveTab("history")}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeTab === "history" ? "text-[#45b39d]" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-[10px] font-medium ${activeTab === "history" ? "text-[#45b39d]" : "text-gray-400"}`}>Lịch sử</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => setActiveTab("profile")}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeTab === "profile" ? "text-[#45b39d]" : "text-gray-400"}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span className={`text-[10px] font-medium ${activeTab === "profile" ? "text-[#45b39d]" : "text-gray-400"}`}>Cá nhân</span>
        </button>
      </nav>

      {/* ─── MODALS & DRAWERS ─── */}
      <CreateGroupModal
        open={showCreateGroupModal}
        onOpenChange={setShowCreateGroupModal}
        onGroupCreated={fetchData}
      />

      {/* QUICK ACTION DRAWER */}
      {showQuickAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowQuickAction(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-6 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Bạn muốn làm gì?</h3>
            <div className="space-y-3">
              <button
                onClick={() => { setShowQuickAction(false); setShowTxDrawer(true); }}
                className="w-full flex items-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-colors"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm mr-4">💰</div>
                <div className="text-left">
                  <p className="font-bold text-emerald-800">Ghi chép Cá nhân</p>
                  <p className="text-xs text-emerald-600">Thêm khoản thu nhập hoặc chi tiêu</p>
                </div>
              </button>

              <button
                onClick={() => { setShowQuickAction(false); setShowCreateGroupModal(true); }}
                className="w-full flex items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm mr-4">🧑‍🤝‍🧑</div>
                <div className="text-left">
                  <p className="font-bold text-blue-800">Tạo Nhóm đi chơi</p>
                  <p className="text-xs text-blue-600">Mời bạn bè và bắt đầu chia tiền</p>
                </div>
              </button>
            </div>
            <button className="w-full mt-6 py-3 font-bold text-gray-500 hover:text-gray-700" onClick={() => setShowQuickAction(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}


      {/* Phone Setup Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[#e2f8f4] rounded-3xl p-6 shadow-2xl border border-white/50 relative overflow-hidden"
            style={{ background: "linear-gradient(to bottom, #e2f8f4 0%, #cff1e9 100%)" }}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/20 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-[#6ebda9]/20 blur-2xl"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md bg-[#6ebda9]">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>

              <h2 className="text-2xl font-extrabold text-[#437d6e] mb-2 text-center">Cập nhật Số điện thoại</h2>
              <p className="text-sm text-[#437d6e]/80 mb-6 text-center leading-relaxed">
                Bạn cần thêm số điện thoại để bạn bè có thể tìm thấy và mời bạn vào nhóm.
              </p>

              <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#437d6e] block mb-1">Số điện thoại cũ</label>
                  <input
                    type="tel"
                    value={currentUser?.phone || "Chưa có"}
                    disabled
                    className="w-full bg-white/50 border border-[#b3e5d1]/50 rounded-2xl px-4 py-3.5 text-gray-500 cursor-not-allowed shadow-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#437d6e] block mb-1">Số điện thoại mới</label>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={phoneForm}
                    onChange={e => setPhoneForm(e.target.value)}
                    required
                    className="w-full bg-white/80 border border-[#b3e5d1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6ebda9] transition shadow-sm"
                  />
                </div>

                {phoneError && (
                  <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">{phoneError}</p>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 py-4 rounded-full text-[#437d6e] text-lg font-bold shadow-sm bg-white border border-[#b3e5d1] hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPhone || !phoneForm.trim() || phoneForm === currentUser?.phone}
                    className="flex-1 py-4 rounded-full text-white text-lg font-bold shadow-lg active:scale-95 transition-all disabled:opacity-60 bg-[#6ebda9]"
                  >
                    {isSubmittingPhone ? "Đang lưu..." : "Xác nhận"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
