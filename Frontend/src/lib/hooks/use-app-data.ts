import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { GlobalDebtTransaction } from "@/components/ngan-keo-tong-hop-no";

export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  email?: string;
  phone?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankQrUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  creator: UserSummary;
  memberCount: number;
  totalAmount?: number;
}

export interface DebtSummary {
  totalOwed: number;
  totalOwing: number;
}

export function useAppData() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [debtSummary, setDebtSummary] = useState<DebtSummary>({
    totalOwed: 0,
    totalOwing: 0,
  });
  const [walletId, setWalletId] = useState<string | undefined>(undefined);
  const [walletBalance, setWalletBalance] = useState(0);
  const [detailedDebts, setDetailedDebts] = useState<{
    myDebts: GlobalDebtTransaction[];
    owedToMe: GlobalDebtTransaction[];
  }>({ myDebts: [], owedToMe: [] });
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = async () => {
    setRefreshTrigger((prev) => prev + 1);
    try {
      const [groupsRes] = await Promise.all([api.get("/groups")]);
      setGroups(groupsRes.data);

      let totalOwed = 0;
      let totalOwing = 0;
      const myDebts: GlobalDebtTransaction[] = [];
      const owedToMe: GlobalDebtTransaction[] = [];

      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const debtPromises = groupsRes.data.map((g: Group) =>
          api
            .get(`/groups/${g.id}/debts`)
            .then((r) => ({ groupId: g.id, groupName: g.name, data: r.data }))
            .catch(() => null),
        );
        const allDebts = await Promise.all(debtPromises);
        allDebts.forEach((res) => {
          if (!res?.data?.transactions) return;
          res.data.transactions.forEach((t: any) => {
            if (t.from.id === user.id) {
              totalOwing += t.amount;
              myDebts.push({
                groupId: res.groupId,
                groupName: res.groupName,
                from: t.from,
                to: t.to,
                amount: t.amount,
              });
            }
            if (t.to.id === user.id) {
              totalOwed += t.amount;
              owedToMe.push({
                groupId: res.groupId,
                groupName: res.groupName,
                from: t.from,
                to: t.to,
                amount: t.amount,
              });
            }
          });
        });
      }
      setDebtSummary({ totalOwed, totalOwing });
      setDetailedDebts({ myDebts, owedToMe });

      const balanceRes = await api
        .get("/wallets/total-balance")
        .catch(() => ({ data: { totalBalance: 0 } }));
      setWalletBalance(balanceRes.data.totalBalance);

      const walletRes = await api
        .get("/wallets/me")
        .catch(() => ({ data: [{ id: undefined }] }));
      const walletData = walletRes.data;
      const defaultWallet =
        Array.isArray(walletData) && walletData.length > 0
          ? walletData[0]
          : walletData;
      setWalletId(defaultWallet?.id || null);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/auth");
      return;
    }
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (!user.phone) {
        setShowPhoneModal(true);
      }
    }
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/auth");
  };

  return {
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
  };
}
