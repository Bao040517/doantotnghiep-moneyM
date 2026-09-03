import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { BottomSheet } from "../components/ui/BottomSheet";
import { ExpenseChart } from "../components/features/ExpenseChart";
import { AddMemberBottomSheet } from "../components/modals/AddMemberBottomSheet";
import { ExpenseDetailBottomSheet } from "../components/modals/ExpenseDetailBottomSheet";
import { RemindDebtBottomSheet } from "../components/modals/RemindDebtBottomSheet";
import { PaymentSandboxModal } from "../components/modals/PaymentSandboxModal";
import { PayeeSelectorModal } from "../components/modals/PayeeSelectorModal";
import { Toast } from "../components/ui/Toast";
import { GroupDetailSkeleton } from "../components/ui/SkeletonLoader";
import { QrCode, AlertTriangle, Receipt, Camera, UserPlus, Trash2, LogOut } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { colors } from "../constants/colors";
import { groupService } from "../services/groupService";
import { useAuth } from "../hooks/useAuth";
import { Group, GroupExpense, Payee } from "../types";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { useTopSafeInset } from "../utils/responsive";

interface GroupDetailScreenProps {
  groupId: string;
  onBack: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Ăn uống": "🍽️",
  "Chi tiêu hàng ngày": "🧴",
  "Quần áo": "👕",
  "Mỹ phẩm": "💄",
  "Phí giao lưu": "🥂",
  "Y tế": "💊",
  "Giáo dục": "📚",
  "Tiền điện": "💡",
  "Đi lại": "🚆",
  "Phí liên lạc": "📱",
  "Tiền nhà": "🏠",
  "Mục tiêu tiết kiệm": "🎯",
  "Mua sắm": "🛍️",
  "Giải trí": "🎮",
  "Lưu trú": "🏨",
  "Di chuyển": "🚗",
  "Khác": "📦",
  "Lương": "💰",
  "Thưởng": "🎁",
  "Được biếu tặng": "🧧",
  "Thu nhập khác": "💵",
};

const GROUP_IMAGES = [
  "https://images.unsplash.com/photo-1539635273304-0e8723e0f016?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80",
];

export const GroupDetailScreen: React.FC<GroupDetailScreenProps> = ({ groupId, onBack }) => {
  const { user } = useAuth();
  const safeTopPadding = useTopSafeInset(10);
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [debts, setDebts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "history" | "members">("expenses");
  const [historyFilter, setHistoryFilter] = useState<"group" | "personal">("group");

  // Add Member Modal state
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [groupQrVisible, setGroupQrVisible] = useState(false);

  // Expense Detail Modal state
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [expenseDetailVisible, setExpenseDetailVisible] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handlePickGroupPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh bìa nhóm.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const photoUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setUpdatingPhoto(true);
        await groupService.updateGroupAvatar(groupId, photoUri);
        showToast("Đã cập nhật ảnh đại diện nhóm! 🎉", "success");
        fetchGroupDetails();
      }
    } catch (err: any) {
      showToast("Không thể cập nhật ảnh nhóm", "error");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // Add Expense form state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [paidBy, setPaidBy] = useState<string>("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [payerDropdownOpen, setPayerDropdownOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"all" | "custom">("all");
  const [selectedSplitUserIds, setSelectedSplitUserIds] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT">("EQUAL");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    if (!isAddingExpense) {
      setTitle("");
      setAmount("");
      setCategory("Ăn uống");
      setCategoryDropdownOpen(false);
      setPayerDropdownOpen(false);
      setSplitMode("all");
      setSplitType("EQUAL");
      setCustomAmounts({});
      if (group?.members && group.members.length > 0) {
        setSelectedSplitUserIds(group.members.map((m: any) => m.user?.id || m.id));
      }
    }
  }, [isAddingExpense]);

  // VietQR settlement state
  const [qrSettleDebt, setQrSettleDebt] = useState<any | null>(null);
  const [sandboxVisible, setSandboxVisible] = useState(false);
  const [payeeSelectorVisible, setPayeeSelectorVisible] = useState(false);
  const [pendingSettleDebt, setPendingSettleDebt] = useState<any | null>(null);
  const [remindDebtData, setRemindDebtData] = useState<any | null>(null);
  const [pendingDebtors, setPendingDebtors] = useState<string[]>([]);
  const [pendingSent, setPendingSent] = useState<string[]>([]);

  const handleStartDebtPayment = (debtItem: any) => {
    if (debtItem?.hasPendingRevision) {
      Alert.alert(
        "Khoản chi chưa hoàn tất",
        debtItem.pendingRevisionMessage ||
          "Khoản chi này đang có yêu cầu chỉnh sửa từ thành viên nhóm và chưa được chủ khoản chi xác nhận. Vui lòng đợi chủ khoản chi cập nhật trước khi thanh toán để tránh sai lệch số tiền!",
        [{ text: "Đã hiểu" }]
      );
      return;
    }
    const creditorAccNo = debtItem.to?.bankAccountNo;
    if (creditorAccNo) {
      // Đã có STK ngân hàng -> Bypass selector, mở thẳng QR sandbox
      setQrSettleDebt({
        amount: debtItem.amount,
        toName: debtItem.to?.name || "Người nhận",
        toBankBin: debtItem.to?.bankBin || "970422",
        toAccountNo: creditorAccNo,
        toUserId: debtItem.to?.id,
        groupName: group?.name,
        groupId: groupId,
      });
      setSandboxVisible(true);
    } else {
      // Chưa có STK -> Mở PayeeSelectorModal để chọn từ danh bạ/bạn bè hoặc nhập mới
      setPendingSettleDebt(debtItem);
      setPayeeSelectorVisible(true);
    }
  };

  const handleSelectPayeeForDebt = (payee: Payee) => {
    if (!pendingSettleDebt) return;
    setQrSettleDebt({
      amount: pendingSettleDebt.amount,
      toName: payee.accountName || payee.name || pendingSettleDebt.to?.name || "Người nhận",
      toBankBin: payee.bankBin || "970422",
      toAccountNo: payee.bankAccount,
      toUserId: pendingSettleDebt.to?.id,
      groupName: group?.name,
      groupId: groupId,
    });
    setPayeeSelectorVisible(false);
    setSandboxVisible(true);
  };

  const fetchGroupDetails = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [gData, expData, debtData, pDebtors, pSent] = await Promise.all([
        groupService.getGroupDetail(groupId).catch(() => null),
        groupService.getGroupExpenses(groupId).catch(() => ({ content: [] })),
        groupService.getGroupDebts(groupId).catch(() => ({ transactions: [] })),
        groupService.getPendingDebtors(groupId).catch(() => []),
        groupService.getPendingSent(groupId).catch(() => []),
      ]);
      setGroup(gData);
      setExpenses(expData.content || []);
      setDebts(debtData);
      setPendingDebtors(pDebtors || []);
      setPendingSent(pSent || []);

      if (gData?.members && gData.members.length > 0) {
        const allIds = gData.members.map((m: any) => m.user?.id || m.id);
        setSelectedSplitUserIds(allIds);
        if (!paidBy) {
          const myId = user?.id;
          const foundMe = gData.members.find((m: any) => (m.user?.id || m.id) === myId);
          setPaidBy(foundMe ? (foundMe.user?.id || foundMe.id) : allIds[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (targetMember: any) => {
    const targetUserId = targetMember.user?.id || targetMember.id;
    const targetName = targetMember.user?.name || "thành viên này";
    const isSelf = targetUserId === user?.id;

    Alert.alert(
      isSelf ? "Rời khỏi nhóm" : "Xóa thành viên",
      isSelf
        ? `Bạn có chắc chắn muốn rời khỏi nhóm "${group?.name}"?`
        : `Bạn có chắc chắn muốn xóa "${targetName}" ra khỏi nhóm?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: isSelf ? "Rời nhóm" : "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.removeMemberFromGroup(groupId!, targetUserId);
              showToast(isSelf ? "Đã rời nhóm thành công" : `Đã xóa ${targetName} khỏi nhóm`, "success");
              if (isSelf) {
                onBack();
              } else {
                fetchGroupDetails();
              }
            } catch (err: any) {
              const errMsg = err?.response?.data?.message || err?.message || "Không thể thực hiện thao tác này";
              showToast(errMsg, "error");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const handleRemindDebt = async (debtorId: string, amount: number, debtorName: string) => {
    try {
      await groupService.remindDebt(groupId, { debtorId, amount, message: `Nhắc nợ: ${debtorName} ơi thanh toán cho mình nhé!` });
      showToast(`Đã gửi thông báo nhắc nợ tới ${debtorName}! 🔔`, "success");
    } catch (e: any) {
      showToast(e.response?.data?.message || "Không thể gửi nhắc nợ", "error");
    }
  };

  const handleNotifyPayment = async (toUserId: string, amount: number, creditorName: string) => {
    try {
      await groupService.notifyPayment(groupId, { toUserId, amount });
      showToast(`Đã gửi thông báo thanh toán tới ${creditorName}! ⏳`, "success");
      fetchGroupDetails();
    } catch (e: any) {
      showToast(e.response?.data?.message || "Lỗi khi báo chuyển tiền", "error");
    }
  };

  const handleApproveSettle = async (debtorId: string, amount: number, debtorName: string) => {
    Alert.alert(
      "Xác nhận đã nhận tiền",
      `Bạn xác nhận đã nhận đủ ${fmt(amount)} từ ${debtorName}?\n\nKhoản nợ này sẽ được gạch bỏ và quyết toán tự động trên hệ thống.`,
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Xác nhận",
          style: "default",
          onPress: async () => {
            try {
              await groupService.approveSettle(groupId, { debtorId, amount });
              showToast(`Đã xác nhận thanh toán xong từ ${debtorName}! 🎉`, "success");
              fetchGroupDetails();
            } catch (e: any) {
              showToast(e.response?.data?.message || "Lỗi khi xác nhận thanh toán", "error");
            }
          },
        },
      ]
    );
  };

  const handleAmountChange = (text: string) => {
    const cleanDigits = text.replace(/\D/g, "");
    if (!cleanDigits) {
      setAmount("");
      return;
    }
    const formatted = parseInt(cleanDigits, 10).toLocaleString("vi-VN");
    setAmount(formatted);
  };

  const handleCustomAmountChange = (targetUserId: string, text: string) => {
    const cleanDigits = text.replace(/\D/g, "");
    const formatted = cleanDigits ? parseInt(cleanDigits, 10).toLocaleString("vi-VN") : "";
    setCustomAmounts((prev) => ({ ...prev, [targetUserId]: formatted }));
  };

  const handleToggleMemberExact = (uId: string) => {
    if (selectedSplitUserIds.includes(uId)) {
      if (selectedSplitUserIds.length <= 1) {
        showToast("Phải có ít nhất 1 người tham gia", "info");
        return;
      }
      setSelectedSplitUserIds(selectedSplitUserIds.filter((id) => id !== uId));
    } else {
      setSelectedSplitUserIds([...selectedSplitUserIds, uId]);
    }
  };

  const handleSaveExpense = async () => {
    const rawNumber = parseFloat(amount.replace(/\./g, "")) || 0;
    if (!title.trim() || rawNumber <= 0 || !groupId || !group) {
      showToast("Vui lòng nhập tên và số tiền hợp lệ", "error");
      return;
    }

    const currentPayerId = paidBy || user?.id || (group.members?.[0]?.user?.id || group.members?.[0]?.id);
    if (!currentPayerId) {
      showToast("Vui lòng chọn người thanh toán", "error");
      return;
    }

    let targetSplitIds: string[] = [];
    let parsedCustomAmounts: Record<string, number> | undefined = undefined;

    if (splitType === "EQUAL") {
      targetSplitIds = selectedSplitUserIds;
      if (targetSplitIds.length === 0) {
        showToast("Vui lòng chọn ít nhất 1 người để chia tiền", "error");
        return;
      }
    } else {
      parsedCustomAmounts = {};
      let sum = 0;
      for (const uId of selectedSplitUserIds) {
        const val = parseFloat((customAmounts[uId] || "0").replace(/\./g, "")) || 0;
        if (val > 0) {
          parsedCustomAmounts[uId] = val;
          targetSplitIds.push(uId);
        }
        sum += val;
      }

      if (selectedSplitUserIds.length === 0 || targetSplitIds.length === 0) {
        showToast("Vui lòng chọn người tham gia và nhập số tiền lớn hơn 0", "error");
        return;
      }

      if (sum !== rawNumber) {
        showToast(`Tổng chia (${sum.toLocaleString("vi-VN")} ₫) chưa khớp hóa đơn (${rawNumber.toLocaleString("vi-VN")} ₫)`, "error");
        return;
      }
    }

    setSavingExpense(true);
    try {
      await groupService.createGroupExpense(groupId, {
        title: title.trim(),
        amount: rawNumber,
        category,
        paidBy: currentPayerId,
        splitUserIds: targetSplitIds,
        splitAmounts: parsedCustomAmounts,
      });
      setTitle("");
      setAmount("");
      setCustomAmounts({});
      setIsAddingExpense(false);
      showToast("Đã tạo hóa đơn chi tiêu thành công! 🎉", "success");
      fetchGroupDetails();
    } catch (e: any) {
      showToast(e.response?.data?.message || "Không thể tạo hóa đơn mới", "error");
    } finally {
      setSavingExpense(false);
    }
  };

  const fmt = (n?: number) => {
    const safe = Math.abs(Math.round(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + " ₫";
  };

  const myDebts = debts?.transactions?.filter((t: any) => t.from?.id === user?.id) || [];
  const owedToMe = debts?.transactions?.filter((t: any) => t.to?.id === user?.id) || [];

  if (loading && !group) {
    return <GroupDetailSkeleton />;
  }

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <AlertTriangle size={36} color="#F59E0B" strokeWidth={1.5} style={{ marginBottom: 12 }} />
        <Text style={styles.emptyText}>Không tìm thấy thông tin nhóm</Text>
        <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 4, textAlign: "center", paddingHorizontal: 32 }}>
          Không thể tải dữ liệu nhóm từ máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <Button title="Quay lại" variant="secondary" onPress={onBack} />
          <Button title="Thử lại" variant="primary" onPress={fetchGroupDetails} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── FULL SCREEN HEADER ─── */}
      <View style={[styles.topHeader, { paddingTop: safeTopPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.qrHeaderBtn}
            onPress={() => setGroupQrVisible(true)}
            activeOpacity={0.8}
          >
            <QrCode size={15} color="#4F46E5" strokeWidth={2.4} />
            <Text style={styles.qrHeaderBtnText}>Mã QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => setAddMemberVisible(true)}
            activeOpacity={0.8}
          >
            <UserPlus size={15} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.inviteBtnText}>+ Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ─── HERO HEADER BANNER ─── */}
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: group.avatarUrl || GROUP_IMAGES[0] }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.editGroupPhotoBtn}
            onPress={handlePickGroupPhoto}
            disabled={updatingPhoto}
            activeOpacity={0.8}
          >
            {updatingPhoto ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Camera size={13} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.editGroupPhotoText}>Đổi ảnh</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.bannerOverlay}>
            <Text style={styles.groupHeaderName}>{group.name}</Text>
            <Text style={styles.groupHeaderDesc}>{group.description || "Nhóm chia sẻ chi phí chung"}</Text>
            <View style={styles.memberAvatarsRow}>
              {group.members?.slice(0, 5).map((m, i) => (
                <View key={m.id || i} style={styles.avatarBubble}>
                  {m.user?.avatarUrl ? (
                    <Image source={{ uri: m.user.avatarUrl }} style={styles.avatarBubbleImg} />
                  ) : (
                    <Text style={styles.avatarLetter}>{(m.user?.name || "U").charAt(0)}</Text>
                  )}
                </View>
              ))}
              {(group.members?.length || 0) > 5 && (
                <View style={[styles.avatarBubble, { backgroundColor: colors.slate200 }]}>
                  <Text style={[styles.avatarLetter, { color: colors.slate700 }]}>+{(group.members?.length || 0) - 5}</Text>
                </View>
              )}
              <Text style={styles.memberCountTag}>{group.members?.length || 0} thành viên</Text>
            </View>
          </View>
        </View>

        {/* ─── SUB TABS PILLS ─── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab("expenses")}
              style={[styles.tabPill, activeTab === "expenses" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "expenses" && styles.tabPillTextActive]}>
                Lịch sử ăn chơi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("balances")}
              style={[styles.tabPill, activeTab === "balances" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "balances" && styles.tabPillTextActive]}>
                Ai nợ ai
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("history")}
              style={[styles.tabPill, activeTab === "history" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "history" && styles.tabPillTextActive]}>
                Lịch sử
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("members")}
              style={[styles.tabPill, activeTab === "members" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "members" && styles.tabPillTextActive]}>
                Thành viên
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ─── EXPENSES LIST TAB ─── */}
        {activeTab === "expenses" && (
          <View style={styles.tabContent}>
            {/* Chart Phân Tích Chi Tiêu theo Danh Mục */}
            <ExpenseChart expenses={expenses} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Danh sách hóa đơn</Text>
              <Button title="+ Thêm hóa đơn" variant="primary" onPress={() => setIsAddingExpense(true)} style={styles.addBillBtn} textStyle={{ fontSize: 12 }} />
            </View>

            {expenses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Receipt size={36} color="#94A3B8" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>Chưa có hóa đơn nào trong nhóm</Text>
                <Text style={styles.emptySubText}>Bấm "+ Thêm hóa đơn" để tạo khoản chi đầu tiên!</Text>
              </View>
            ) : (
              expenses.map((exp) => {
                const isPending = Boolean(exp.isPendingRevision ?? (exp as any).pendingRevision);
                return (
                  <TouchableOpacity
                    key={exp.id}
                    style={[
                      styles.expenseCard,
                      isPending && styles.expenseCardPending
                    ]}
                    onPress={() => {
                      setSelectedExpenseId(exp.id);
                      setExpenseDetailVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.expenseIconBg,
                      isPending && { backgroundColor: "#FEF3C7" }
                    ]}>
                      <CategoryIcon name={exp.category || "Khác"} size={26} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <Text style={[styles.expenseTitle, isPending && { color: "#92400E" }]}>{exp.title}</Text>
                        {isPending && (
                          <View style={styles.pendingRevisionTag}>
                            <Text style={styles.pendingRevisionTagText}>⚠️ Có yêu cầu sửa</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.expensePayer}>
                        <Text style={{ fontWeight: "700" }}>{exp.payer?.name || "Thành viên"}</Text> đã trả · chia {exp.splitCount || group?.members?.length || 1} người
                      </Text>
                      {isPending && (exp.proposedAmount || exp.proposedTitle) && (
                        <View style={styles.proposedPreviewRow}>
                          <Text style={styles.proposedPreviewText}>
                            Đề xuất: {exp.proposedTitle ? `"${exp.proposedTitle}" ` : ""}{exp.proposedAmount ? `(${fmt(exp.proposedAmount)})` : ""}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.expenseAmount, isPending && { color: "#D97706" }]}>{fmt(exp.amount)}</Text>
                      {isPending && (
                        <Text style={{ fontSize: 10, color: "#D97706", fontWeight: "700", marginTop: 2 }}>Bấm để duyệt 👆</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ─── AI NỢ AI TAB ─── */}
        {activeTab === "balances" && (
          <View style={styles.tabContent}>
            {/* Column 1: Người khác nợ bạn */}
            <View style={styles.debtSectionCard}>
              <View style={styles.debtSectionHeader}>
                <View style={styles.debtHeaderTitleRow}>
                  <View style={[styles.debtDot, { backgroundColor: "#10b981" }]} />
                  <Text style={styles.debtSectionTitle}>Người khác nợ bạn</Text>
                </View>
                {owedToMe.length > 0 && (
                  <View style={styles.totalBadgeReceivable}>
                    <Text style={styles.totalBadgeReceivableText}>
                      Tổng: {fmt(owedToMe.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0))}
                    </Text>
                  </View>
                )}
              </View>

              {owedToMe.length === 0 ? (
                <View style={styles.emptyDebtBox}>
                  <Text style={styles.emptyDebtEmoji}>🎉</Text>
                  <Text style={styles.emptyDebtText}>Không ai nợ bạn trong nhóm này</Text>
                  <Text style={styles.emptyDebtSub}>Mọi người đã thanh toán sòng phẳng!</Text>
                </View>
              ) : (
                owedToMe.map((t: any, i: number) => {
                  const debtorId = t.from?.id;
                  const debtorName = t.from?.name || "Người nợ";
                  const isPending = pendingDebtors.includes(debtorId);

                  return (
                    <View key={i} style={styles.debtCompactRow}>
                      <View style={styles.debtMemberInfo}>
                        <View style={styles.debtAvatarBox}>
                          <Text style={styles.debtAvatarText}>{debtorName.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.debtNameText} numberOfLines={1}>{debtorName}</Text>
                          <Text style={styles.debtAmountReceivable}>
                            +{fmt(t.amount)}
                          </Text>
                        </View>
                      </View>

                      {isPending ? (
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <View style={styles.pendingNotificationBadge}>
                            <Text style={styles.pendingNotificationBadgeText}>💰 Đã báo chuyển</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleApproveSettle(debtorId, t.amount, debtorName)}
                            style={styles.approveCompactBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.approveCompactBtnText}>✓ Xác nhận</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleApproveSettle(debtorId, t.amount, debtorName)}
                            style={styles.manualSettleBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.manualSettleBtnText}>✓ Đã nhận</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setRemindDebtData(t)}
                            style={styles.remindCompactBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.remindCompactBtnText}>🔔 Nhắc nợ</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Column 2: Bạn nợ người khác */}
            <View style={[styles.debtSectionCard, { marginTop: 18 }]}>
              <View style={styles.debtSectionHeader}>
                <View style={styles.debtHeaderTitleRow}>
                  <View style={[styles.debtDot, { backgroundColor: "#ef4444" }]} />
                  <Text style={[styles.debtSectionTitle, { color: "#991b1b" }]}>Bạn nợ người khác</Text>
                </View>
                {myDebts.length > 0 && (
                  <View style={styles.totalBadgePayable}>
                    <Text style={styles.totalBadgePayableText}>
                      Tổng: {fmt(myDebts.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0))}
                    </Text>
                  </View>
                )}
              </View>

              {myDebts.length === 0 ? (
                <View style={styles.emptyDebtBox}>
                  <Text style={styles.emptyDebtEmoji}>😎</Text>
                  <Text style={styles.emptyDebtText}>Bạn không nợ ai trong nhóm này</Text>
                  <Text style={styles.emptyDebtSub}>Bạn quản lý tài chính rất chuẩn mực!</Text>
                </View>
              ) : (
                myDebts.map((t: any, i: number) => {
                  const creditorId = t.to?.id;
                  const creditorName = t.to?.name || "Chủ nợ";
                  const isSentPending = pendingSent.includes(creditorId);

                  return (
                    <View key={i} style={[styles.debtCompactRow, { backgroundColor: "#fff5f5", borderColor: "#fed7d7" }]}>
                      <View style={styles.debtMemberInfo}>
                        <View style={[styles.debtAvatarBox, { backgroundColor: "#fee2e2" }]}>
                          <Text style={[styles.debtAvatarText, { color: "#b91c1c" }]}>{creditorName.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.debtNameText} numberOfLines={1}>{creditorName}</Text>
                          <Text style={styles.debtAmountPayable}>
                            {fmt(t.amount)}
                          </Text>
                        </View>
                      </View>

                      {isSentPending ? (
                        <View style={styles.pendingCompactTag}>
                          <Text style={styles.pendingCompactTagText}>⏳ Đang chờ duyệt</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleNotifyPayment(creditorId, t.amount, creditorName)}
                            style={styles.cashNotifyBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cashNotifyBtnText}>💵 Báo chuyển</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStartDebtPayment(t)}
                            style={styles.payNowCompactBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.payNowCompactBtnText}>Trả nợ 📲</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ─── HISTORY TAB ─── */}
        {activeTab === "history" && (
          <View style={styles.tabContent}>
            <View style={styles.historyFilterRow}>
              <TouchableOpacity
                onPress={() => setHistoryFilter("group")}
                style={[styles.historyFilterBtn, historyFilter === "group" && styles.historyFilterBtnActive]}
              >
                <Text style={[styles.historyFilterText, historyFilter === "group" && styles.historyFilterTextActive]}>
                  Của cả nhóm
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHistoryFilter("personal")}
                style={[styles.historyFilterBtn, historyFilter === "personal" && styles.historyFilterBtnActive]}
              >
                <Text style={[styles.historyFilterText, historyFilter === "personal" && styles.historyFilterTextActive]}>
                  Của tôi
                </Text>
              </TouchableOpacity>
            </View>

            {expenses
              .filter((e) => {
                if (historyFilter === "group") return true;
                return e.payer?.id === user?.id;
              })
              .map((exp) => (
                <View key={exp.id} style={styles.expenseCard}>
                  <View style={styles.expenseIconBg}>
                    <CategoryIcon name={exp.category || "Khác"} size={26} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseTitle}>{exp.title}</Text>
                    <Text style={styles.expensePayer}>
                      <Text style={{ fontWeight: "700" }}>{exp.payer?.name}</Text> đã chi {fmt(exp.amount)}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>{fmt(exp.amount)}</Text>
                </View>
              ))}

            {expenses.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có lịch sử giao dịch nào</Text>
              </View>
            )}
          </View>
        )}

        {/* ─── MEMBERS TAB ─── */}
        {activeTab === "members" && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Danh sách thành viên ({group.members?.length || 0})</Text>
            </View>
            {group.members?.map((m) => {
              const mUserId = m.user?.id || m.id;
              const isOwnerMember = m.role === "OWNER" || m.role === "owner" || group.owner?.id === mUserId;
              const isMe = mUserId === user?.id;
              const isCurrentUserOwner = group.owner?.id === user?.id;

              return (
                <View key={m.id || mUserId} style={styles.memberRow}>
                  <View style={styles.memberAvatarCircle}>
                    {m.user?.avatarUrl ? (
                      <Image source={{ uri: m.user.avatarUrl }} style={styles.memberAvatarImg} />
                    ) : (
                      <Text style={styles.memberAvatarText}>{(m.user?.name || "U").charAt(0)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {m.user?.name} {isMe ? "(Bạn)" : ""}
                    </Text>
                    <Text style={styles.memberEmail}>{m.user?.email || "Chưa có email"}</Text>
                  </View>

                  {isOwnerMember ? (
                    <View style={styles.adminTag}>
                      <Text style={styles.adminTagText}>CHỦ NHÓM</Text>
                    </View>
                  ) : isCurrentUserOwner ? (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(m)}
                      style={styles.removeMemberBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={colors.rose500} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : isMe ? (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(m)}
                      style={styles.leaveGroupBtn}
                      activeOpacity={0.7}
                    >
                      <LogOut size={14} color={colors.rose600} strokeWidth={2} style={{ marginRight: 4 }} />
                      <Text style={styles.leaveGroupBtnText}>Rời nhóm</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* ─── PAYEE SELECTOR MODAL (CHO THÀNH VIÊN CHƯA CÓ STK) ─── */}
      <PayeeSelectorModal
        visible={payeeSelectorVisible}
        onClose={() => {
          setPayeeSelectorVisible(false);
          setPendingSettleDebt(null);
        }}
        onSelectPayee={handleSelectPayeeForDebt}
        defaultAmount={pendingSettleDebt?.amount}
        onOfflineSettle={async (payeeName, note) => {
          if (!pendingSettleDebt) return;
          try {
            const toUserId = pendingSettleDebt.to?.id;
            if (groupId && toUserId) {
              await groupService.notifyPayment(groupId, { toUserId, amount: pendingSettleDebt.amount });
              showToast(`Đã ghi nhận thanh toán tiền mặt cho ${payeeName}! 💵`, "success");
            }
            setPayeeSelectorVisible(false);
            setPendingSettleDebt(null);
            fetchGroupDetails();
          } catch {
            showToast("Không thể ghi nhận thanh toán", "error");
          }
        }}
      />

      {/* ─── BANKING SANDBOX GATEWAY MODAL ─── */}
      <PaymentSandboxModal
        visible={sandboxVisible}
        debtInfo={
          qrSettleDebt
            ? {
                amount: qrSettleDebt.amount,
                toName: qrSettleDebt.toName || qrSettleDebt.to?.name || "Người nhận",
                toBankBin: qrSettleDebt.toBankBin || qrSettleDebt.to?.bankBin || "",
                toAccountNo: qrSettleDebt.toAccountNo || qrSettleDebt.to?.bankAccountNo || "",
                toUserId: qrSettleDebt.toUserId || qrSettleDebt.to?.id,
                groupName: qrSettleDebt.groupName || group?.name,
                groupId: qrSettleDebt.groupId || groupId,
              }
            : null
        }
        onClose={() => {
          setSandboxVisible(false);
          setQrSettleDebt(null);
          setPendingSettleDebt(null);
        }}
        onPaymentSuccess={async (amt, toUserId) => {
          if (toUserId && groupId) {
            try {
              await groupService.notifyPayment(groupId, {
                toUserId: toUserId,
                amount: amt,
              });
              showToast("Đã gửi thông báo thanh toán tới chủ nợ! ⏳", "success");
            } catch (e) {
              console.log("Failed to notify payment:", e);
            }
          }
          fetchGroupDetails();
        }}
      />

      {/* Add Expense Drawer Modal */}
      <BottomSheet
        visible={isAddingExpense}
        onClose={() => setIsAddingExpense(false)}
        title="Thêm Hóa Đơn Chi Tiêu Mới"
      >
        <View style={styles.modalBodyWrapper}>
          <ScrollView
            style={styles.formScrollArea}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <Input label="Tên khoản chi (*)" placeholder="VD: Tiền Ăn Tối, Xe Ô Tô Du Lịch" value={title} onChangeText={setTitle} />
            <Input label="Số tiền (VND) (*)" placeholder="VD: 500.000" keyboardType="numeric" value={amount} onChangeText={handleAmountChange} />

            {/* Danh mục chi tiêu Dropdown */}
          <Text style={styles.label}>Danh mục chi tiêu</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, categoryDropdownOpen && styles.dropdownTriggerActive]}
            onPress={() => {
              setCategoryDropdownOpen(!categoryDropdownOpen);
              setPayerDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownSelectedContent}>
              <View style={{ marginRight: 8 }}>
                <CategoryIcon name={category || "Khác"} size={22} />
              </View>
              <Text style={styles.dropdownSelectedText}>
                {category}
              </Text>
            </View>
            <Text style={styles.dropdownChevron}>
              {categoryDropdownOpen ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {categoryDropdownOpen && (
            <View style={styles.dropdownListCard}>
              <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                {Object.keys(CATEGORY_EMOJI).map((catName) => {
                  const isSelected = category === catName;
                  return (
                    <TouchableOpacity
                      key={catName}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        setCategory(catName);
                        setCategoryDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownItemLeft}>
                        <View style={[styles.dropdownItemIconBox, isSelected && styles.dropdownItemIconBoxActive]}>
                          <CategoryIcon name={catName} size={20} />
                        </View>
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                          {catName}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.dropdownCheckBadge}>
                          <Text style={{ fontSize: 12, color: "#059669", fontWeight: "900" }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Ai là người trả tiền? Dropdown */}
          <Text style={[styles.label, { marginTop: 12 }]}>Ai là người trả tiền? (*)</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, payerDropdownOpen && styles.dropdownTriggerActive]}
            onPress={() => {
              setPayerDropdownOpen(!payerDropdownOpen);
              setCategoryDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownSelectedContent}>
              {(() => {
                const currentPayerId = paidBy || user?.id || (group?.members?.[0]?.user?.id || group?.members?.[0]?.id);
                const selectedMember = group?.members?.find((m) => (m.user?.id || m.id) === currentPayerId);
                const name = selectedMember?.user?.name || user?.name || "Chọn người trả";
                const isMe = (selectedMember?.user?.id || selectedMember?.id) === user?.id;
                return (
                  <>
                    <View style={styles.payerSelectedAvatar}>
                      <Text style={styles.payerSelectedAvatarText}>{name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                      {name} {isMe ? "(Bạn)" : selectedMember?.role === "OWNER" ? "(Chủ nhóm)" : ""}
                    </Text>
                  </>
                );
              })()}
            </View>
            <Text style={styles.dropdownChevron}>
              {payerDropdownOpen ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {payerDropdownOpen && (
            <View style={styles.dropdownListCard}>
              <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                {group?.members?.map((m) => {
                  const uId = m.user?.id || m.id;
                  const uName = m.user?.name || "Thành viên";
                  const isSelected = (paidBy || user?.id) === uId;
                  const isMe = uId === user?.id;
                  return (
                    <TouchableOpacity
                      key={uId}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        setPaidBy(uId);
                        setPayerDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownItemLeft}>
                        <View style={[styles.payerSelectedAvatar, isSelected && { backgroundColor: "#10b981" }]}>
                          <Text style={[styles.payerSelectedAvatarText, isSelected && { color: colors.white }]}>
                            {uName.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]} numberOfLines={1}>
                            {uName} {isMe ? "(Bạn)" : m.role === "OWNER" ? "(Chủ nhóm)" : ""}
                          </Text>
                          {m.user?.email && (
                            <Text style={styles.dropdownItemSubText} numberOfLines={1}>{m.user.email}</Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.dropdownCheckBadge}>
                          <Text style={{ fontSize: 12, color: "#059669", fontWeight: "900" }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── PHÂN CHIA HÓA ĐƠN ─── */}
          <View style={{ marginTop: 14, marginBottom: 8 }}>
            <Text style={styles.label}>Cách phân chia hóa đơn (*)</Text>

            {/* Split Type Selector Tabs */}
            <View style={styles.splitTabContainer}>
              <TouchableOpacity
                onPress={() => setSplitType("EQUAL")}
                style={[styles.splitTabBtn, splitType === "EQUAL" && styles.splitTabBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.splitTabText, splitType === "EQUAL" && styles.splitTabTextActive]}>
                  Chia đều
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSplitType("EXACT");
                  if (Object.keys(customAmounts).length === 0 && group?.members) {
                    const rawNum = parseFloat(amount.replace(/\./g, "")) || 0;
                    if (rawNum > 0 && selectedSplitUserIds.length > 0) {
                      const splitVal = Math.floor(rawNum / selectedSplitUserIds.length);
                      const modVal = rawNum % selectedSplitUserIds.length;
                      const initial: Record<string, string> = {};
                      selectedSplitUserIds.forEach((uId, idx) => {
                        initial[uId] = (splitVal + (idx === 0 ? modVal : 0)).toLocaleString("vi-VN");
                      });
                      setCustomAmounts(initial);
                    }
                  }
                }}
                style={[styles.splitTabBtn, splitType === "EXACT" && styles.splitTabBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.splitTabText, splitType === "EXACT" && styles.splitTabTextActive]}>
                  Số tiền cụ thể
                </Text>
              </TouchableOpacity>
            </View>

            {splitType === "EQUAL" ? (
              <View style={styles.splitContentBox}>
                {/* Header bar */}
                <View style={styles.splitHeaderRow}>
                  <Text style={styles.splitHeaderSubText}>
                    Chọn người tham gia ({selectedSplitUserIds.length}/{group?.members?.length || 0})
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedSplitUserIds.length === (group?.members?.length || 0)) {
                        const myId = user?.id || group?.members?.[0]?.user?.id || group?.members?.[0]?.id;
                        setSelectedSplitUserIds(myId ? [myId] : []);
                      } else {
                        setSelectedSplitUserIds(group?.members?.map((m: any) => m.user?.id || m.id) || []);
                      }
                    }}
                    style={styles.selectAllBtn}
                  >
                    <Text style={styles.selectAllBtnText}>
                      {selectedSplitUserIds.length === (group?.members?.length || 0) ? "Bỏ chọn bớt" : "Chọn tất cả"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Member checklist */}
                <View style={styles.memberListGrid}>
                  {group?.members?.map((m: any) => {
                    const uId = m.user?.id || m.id;
                    const uName = m.user?.name || "Thành viên";
                    const isSelected = selectedSplitUserIds.includes(uId);
                    const rawNum = parseFloat(amount.replace(/\./g, "")) || 0;
                    const perPerson = selectedSplitUserIds.length > 0 && isSelected
                      ? Math.round(rawNum / selectedSplitUserIds.length)
                      : 0;

                    return (
                      <TouchableOpacity
                        key={uId}
                        onPress={() => {
                          if (isSelected) {
                            if (selectedSplitUserIds.length > 1) {
                              setSelectedSplitUserIds(selectedSplitUserIds.filter((id) => id !== uId));
                            } else {
                              showToast("Phải có ít nhất 1 người chia tiền", "info");
                            }
                          } else {
                            setSelectedSplitUserIds([...selectedSplitUserIds, uId]);
                          }
                        }}
                        style={[styles.memberCard, isSelected && styles.memberCardActive]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.memberCardLeft}>
                          <View style={[styles.memberAvatarCircle, isSelected && { backgroundColor: "#10b981" }]}>
                            {m.user?.avatarUrl ? (
                              <Image source={{ uri: m.user.avatarUrl }} style={styles.memberAvatarImg} />
                            ) : (
                              <Text style={[styles.memberAvatarText, isSelected && { color: colors.white }]}>
                                {uName.charAt(0)}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.memberCardName, isSelected && styles.memberCardNameActive]} numberOfLines={1}>
                              {uName} {uId === user?.id ? "(Bạn)" : ""}
                            </Text>
                            <Text style={styles.memberCardRole}>
                              {m.role === "OWNER" ? "Chủ nhóm" : "Thành viên"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.memberCardRight}>
                          {isSelected ? (
                            <View style={styles.amountBadgeActive}>
                              <Text style={styles.amountBadgeText}>{perPerson.toLocaleString("vi-VN")} ₫</Text>
                            </View>
                          ) : (
                            <View style={styles.amountBadgeInactive}>
                              <Text style={styles.amountBadgeInactiveText}>Không chia</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Equal summary tip */}
                {selectedSplitUserIds.length > 0 && (
                  <View style={styles.equalTipBox}>
                    <Text style={styles.equalTipText}>
                      💡 Chia đều cho <Text style={{ fontWeight: "800", color: "#065f46" }}>{selectedSplitUserIds.length} người</Text>: mỗi người trả <Text style={{ fontWeight: "800", color: "#065f46" }}>{Math.round((parseFloat(amount.replace(/\./g, "")) || 0) / selectedSplitUserIds.length).toLocaleString("vi-VN")} ₫</Text>
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.splitContentBox}>
                {/* Header bar for Exact */}
                <View style={styles.splitHeaderRow}>
                  <Text style={styles.splitHeaderSubText}>
                    Chọn người tham gia ({selectedSplitUserIds.length}/{group?.members?.length || 0})
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedSplitUserIds.length === (group?.members?.length || 0)) {
                        const myId = user?.id || group?.members?.[0]?.user?.id || group?.members?.[0]?.id;
                        setSelectedSplitUserIds(myId ? [myId] : []);
                      } else {
                        setSelectedSplitUserIds(group?.members?.map((m: any) => m.user?.id || m.id) || []);
                      }
                    }}
                    style={styles.selectAllBtn}
                  >
                    <Text style={styles.selectAllBtnText}>
                      {selectedSplitUserIds.length === (group?.members?.length || 0) ? "Bỏ chọn bớt" : "Chọn tất cả"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.memberListGrid}>
                  {group?.members?.map((m: any) => {
                    const uId = m.user?.id || m.id;
                    const uName = m.user?.name || "Thành viên";
                    const isSelected = selectedSplitUserIds.includes(uId);
                    const currentVal = customAmounts[uId] || "";

                    return (
                      <View key={`exact-${uId}`} style={[styles.memberInputRow, isSelected && styles.memberInputRowActive]}>
                        <TouchableOpacity
                          onPress={() => handleToggleMemberExact(uId)}
                          style={styles.memberCardLeft}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkCircleSmall, isSelected && styles.checkCircleSmallActive]}>
                            {isSelected ? (
                              <Text style={{ color: colors.white, fontSize: 10, fontWeight: "900" }}>✓</Text>
                            ) : null}
                          </View>

                          <View style={[styles.memberAvatarCircle, isSelected && { backgroundColor: "#10b981" }]}>
                            {m.user?.avatarUrl ? (
                              <Image source={{ uri: m.user.avatarUrl }} style={styles.memberAvatarImg} />
                            ) : (
                              <Text style={[styles.memberAvatarText, isSelected && { color: colors.white }]}>
                                {uName.charAt(0)}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.memberCardName, isSelected && styles.memberCardNameActive]} numberOfLines={1}>
                              {uName} {uId === user?.id ? "(Bạn)" : ""}
                            </Text>
                            <Text style={styles.memberCardRole}>
                              {isSelected ? "Được phân chia" : "Không tham gia"}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {isSelected ? (
                          <View style={{ width: 130 }}>
                            <TextInput
                              placeholder="0 ₫"
                              placeholderTextColor={colors.slate400}
                              keyboardType="numeric"
                              value={currentVal}
                              onChangeText={(txt) => handleCustomAmountChange(uId, txt)}
                              style={styles.customAmountInput}
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleToggleMemberExact(uId)}
                            style={styles.amountBadgeInactive}
                          >
                            <Text style={styles.amountBadgeInactiveText}>+ Thêm</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Only show warning if there is a mismatch */}
                {(() => {
                  const rawNum = parseFloat(amount.replace(/\./g, "")) || 0;
                  let sum = 0;
                  selectedSplitUserIds.forEach((uId) => {
                    sum += parseFloat((customAmounts[uId] || "0").replace(/\./g, "")) || 0;
                  });
                  const diff = rawNum - sum;

                  if (diff === 0 || rawNum <= 0 || selectedSplitUserIds.length === 0) {
                    return null;
                  }

                  return (
                    <View style={styles.warningMismatchCard}>
                      <View style={styles.warningMismatchHeader}>
                        <Text style={styles.warningMismatchTitle}>
                          {diff > 0 ? "⚠️ Chưa khớp: Còn thiếu tiền" : "⚠️ Chưa khớp: Vượt quá hóa đơn"}
                        </Text>
                        <Text style={[styles.warningMismatchDiff, diff > 0 ? { color: "#D97706" } : { color: "#DC2626" }]}>
                          {diff > 0 ? `Thiếu ${diff.toLocaleString("vi-VN")} ₫` : `Thừa ${Math.abs(diff).toLocaleString("vi-VN")} ₫`}
                        </Text>
                      </View>
                      <Text style={styles.warningMismatchSubText}>
                        Đã chia: <Text style={{ fontWeight: "800", color: colors.slate800 }}>{sum.toLocaleString("vi-VN")} ₫</Text> / Tổng: <Text style={{ fontWeight: "800", color: colors.slate800 }}>{rawNum.toLocaleString("vi-VN")} ₫</Text>
                      </Text>

                      {diff > 0 && (
                        <TouchableOpacity
                          onPress={handleAutoFillRemainder}
                          style={styles.autoFillBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.autoFillBtnText}>⚡ Tự chia đều {diff.toLocaleString("vi-VN")} ₫ còn thiếu</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
          </ScrollView>

          {/* Sticky Bottom Footer */}
          <View style={styles.stickyFooterBox}>
            <Button title="Lưu hóa đơn" variant="primary" onPress={handleSaveExpense} loading={savingExpense} />
          </View>
        </View>
      </BottomSheet>

      {/* Add Member Bottom Sheet */}
      <AddMemberBottomSheet
        visible={addMemberVisible}
        groupId={groupId}
        existingMemberIds={group?.members?.map((m: any) => m.user?.id || m.id) || []}
        onClose={() => setAddMemberVisible(false)}
        onMemberAdded={fetchGroupDetails}
      />

      {/* Expense Detail Bottom Sheet */}
      <ExpenseDetailBottomSheet
        visible={expenseDetailVisible}
        groupId={groupId}
        expenseId={selectedExpenseId}
        onClose={() => setExpenseDetailVisible(false)}
        onRefresh={fetchGroupDetails}
      />

      {/* AI Remind Debt Bottom Sheet */}
      {remindDebtData && (
        <RemindDebtBottomSheet
          visible={!!remindDebtData}
          groupId={groupId}
          debtorId={remindDebtData.from?.id}
          debtorName={remindDebtData.from?.name || "Người nợ"}
          amount={remindDebtData.amount}
          onClose={() => setRemindDebtData(null)}
          onSuccess={() => {
            showToast(`Đã gửi nhắc nợ tới ${remindDebtData.from?.name || "thành viên"}! 🔔`, "success");
            fetchGroupDetails();
          }}
        />
      )}

      {/* VietQR Settlement Payment Sandbox Modal */}
      <PaymentSandboxModal
        visible={sandboxVisible}
        debtInfo={qrSettleDebt}
        onClose={() => setSandboxVisible(false)}
        onPaymentSuccess={async (amount, toUserId) => {
          const targetUserId = toUserId || qrSettleDebt?.toUserId;
          const creditorName = qrSettleDebt?.toName || "người nhận";
          if (targetUserId && groupId) {
            await handleNotifyPayment(targetUserId, amount, creditorName);
          }
          setSandboxVisible(false);
          fetchGroupDetails();
        }}
        onChangePayee={() => {
          setSandboxVisible(false);
          setPendingSettleDebt({
            amount: qrSettleDebt?.amount || 0,
            to: {
              id: qrSettleDebt?.toUserId,
              name: qrSettleDebt?.toName,
            },
          });
          setPayeeSelectorVisible(true);
        }}
      />

      {/* Payee Selector Modal */}
      <PayeeSelectorModal
        visible={payeeSelectorVisible}
        onClose={() => setPayeeSelectorVisible(false)}
        onSelectPayee={handleSelectPayeeForDebt}
        onOfflineSettle={async (payeeName, note) => {
          if (!pendingSettleDebt && !qrSettleDebt) return;
          try {
            const toUserId = pendingSettleDebt?.to?.id || qrSettleDebt?.toUserId;
            const amt = pendingSettleDebt?.amount || qrSettleDebt?.amount || 0;
            if (groupId && toUserId) {
              await groupService.notifyPayment(groupId, { toUserId, amount: amt });
              showToast(`Đã ghi nhận thanh toán tiền mặt cho ${payeeName}! 💵`, "success");
            }
            setPayeeSelectorVisible(false);
            setPendingSettleDebt(null);
            setQrSettleDebt(null);
            fetchGroupDetails();
          } catch {
            showToast("Không thể ghi nhận thanh toán", "error");
          }
        }}
      />

      {/* ─── GROUP QR LIGHTBOX MODAL ─── */}
      <Modal
        transparent
        visible={groupQrVisible}
        animationType="fade"
        onRequestClose={() => setGroupQrVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setGroupQrVisible(false)}
          style={styles.groupQrModalOverlay}
        >
          <View style={styles.groupQrModalCard}>
            <TouchableOpacity
              onPress={() => setGroupQrVisible(false)}
              style={styles.groupQrModalCloseBtn}
            >
              <Text style={styles.groupQrModalCloseText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.groupQrModalHeader}>
              {group.avatarUrl ? (
                <Image source={{ uri: group.avatarUrl }} style={styles.groupQrAvatar} />
              ) : (
                <View style={styles.groupQrAvatarFallback}>
                  <Text style={styles.groupQrAvatarText}>{group.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.groupQrModalGroupName} numberOfLines={1}>
                {group.name}
              </Text>
              <Text style={styles.groupQrModalSub}>
                Quét mã QR bằng Camera ShareMoney để tham gia nhóm ngay
              </Text>
            </View>

            <View style={styles.groupQrBox}>
              <QRCode
                value={`https://sharemoney.app/groups/${group.id}`}
                size={200}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>

            <View style={styles.groupQrCodePill}>
              <Text style={styles.groupQrCodeText}>Mã nhóm: #{group.id.slice(0, 8)}</Text>
            </View>

            <TouchableOpacity
              style={styles.groupQrCopyBtn}
              onPress={() => {
                showToast("Đã sao chép liên kết mời nhóm thành công! ✨", "success");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.groupQrCopyBtnText}>📋 Sao chép Link Mời Nhóm</Text>
            </TouchableOpacity>

            <Text style={styles.groupQrDismissHint}>Chạm bất kỳ đâu bên ngoài để đóng</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f5f1",
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(232, 245, 241, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.slate800,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    flex: 1,
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qrHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  qrHeaderBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4F46E5",
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8f5f1",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 20,
    height: 160,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    padding: 16,
    justifyContent: "flex-end",
  },
  groupHeaderName: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.white,
    marginBottom: 2,
  },
  groupHeaderDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 10,
  },
  memberAvatarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.white,
    marginRight: -6,
  },
  avatarLetter: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  memberCountTag: {
    fontSize: 12,
    color: colors.white,
    fontWeight: "700",
    marginLeft: 16,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  tabPillActive: {
    backgroundColor: "#b3e5d1",
    borderColor: "#b3e5d1",
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate600,
  },
  tabPillTextActive: {
    color: colors.slate900,
  },
  tabContent: {
    paddingTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
  },
  addBillBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: colors.white,
    borderRadius: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate800,
  },
  emptySubText: {
    fontSize: 12,
    color: colors.slate400,
    marginTop: 4,
    textAlign: "center",
  },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  expenseIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fce7f3",
    alignItems: "center",
    justifyContent: "center",
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  expensePayer: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
  },
  // ─── DEBT & BALANCE STYLES ───
  debtSectionCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  debtSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  debtHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  debtDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  debtSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#065f46",
  },
  totalBadgeReceivable: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  totalBadgeReceivableText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  totalBadgePayable: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  totalBadgePayableText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
  },
  emptyDebtBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyDebtEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyDebtText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate800,
  },
  emptyDebtSub: {
    fontSize: 12,
    color: colors.slate400,
    marginTop: 2,
  },
  debtCompactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    gap: 12,
  },
  debtMemberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  remindCompactBtn: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  remindCompactBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b45309",
  },
  manualSettleBtn: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  manualSettleBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
  },
  cashNotifyBtn: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  cashNotifyBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b45309",
  },
  pendingNotificationBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6ee7b7",
    alignSelf: "flex-end",
  },
  pendingNotificationBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065f46",
  },
  approveCompactBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  approveCompactBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  payNowCompactBtn: {
    backgroundColor: "#f43f5e",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  payNowCompactBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  pendingCompactTag: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  pendingCompactTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  debtAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  debtAvatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
  },
  debtNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  debtAmountReceivable: {
    fontSize: 14,
    fontWeight: "900",
    color: "#059669",
    marginTop: 1,
  },
  debtAmountPayable: {
    fontSize: 14,
    fontWeight: "900",
    color: "#dc2626",
    marginTop: 1,
  },
  balanceSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
  },
  balanceHeader: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  debtItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  debtMemberName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  debtSubLabel: {
    fontSize: 12,
    color: colors.slate500,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: "900",
    marginRight: 10,
  },
  debtAmountInline: {
    fontSize: 14,
    fontWeight: "900",
  },
  pendingTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  pendingSentTag: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  pendingSentTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
  },
  qrSmallBtn: {
    backgroundColor: colors.emerald50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  qrSmallBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.emerald600,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  memberAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#b3e5d1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#437d6e",
  },
  memberName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.slate400,
  },
  adminTag: {
    backgroundColor: colors.emerald100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.emerald700,
  },
  qrWrapper: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
  },
  modalBodyWrapper: {
    maxHeight: 580,
  },
  formScrollArea: {
    flexShrink: 1,
  },
  formScrollContent: {
    paddingBottom: 8,
  },
  stickyFooterBox: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: colors.white,
  },
  formContainer: {
    paddingTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate700,
    marginBottom: 8,
    marginTop: 4,
  },
  catPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.slate100,
  },
  catPillActive: {
    backgroundColor: colors.indigo600,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate700,
  },
  catPillTextActive: {
    color: colors.white,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eafaf1",
    borderWidth: 1.5,
    borderColor: "#d4efdf",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dropdownTriggerActive: {
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  dropdownSelectedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dropdownSelectedIcon: {
    fontSize: 18,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate800,
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: colors.slate500,
    marginLeft: 8,
  },
  dropdownListCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 6,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  dropdownItemActive: {
    backgroundColor: "#ecfdf5",
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dropdownItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItemIconBoxActive: {
    backgroundColor: "#d1fae5",
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate700,
  },
  dropdownItemTextActive: {
    color: "#065f46",
    fontWeight: "800",
  },
  dropdownItemSubText: {
    fontSize: 11,
    color: colors.slate400,
  },
  dropdownCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#a7f3d0",
    alignItems: "center",
    justifyContent: "center",
  },
  payerSelectedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#b3e5d1",
    alignItems: "center",
    justifyContent: "center",
  },
  payerSelectedAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065f46",
  },
  splitTabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    gap: 6,
  },
  splitTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  splitTabBtnActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  splitTabIcon: {
    fontSize: 14,
  },
  splitTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate600,
  },
  splitTabTextActive: {
    color: colors.slate900,
    fontWeight: "800",
  },
  splitContentBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 8,
  },
  splitHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  splitHeaderSubText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
  },
  selectAllBtn: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate700,
  },
  memberListGrid: {
    gap: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  memberCardActive: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  memberCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  memberCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  memberCardNameActive: {
    color: "#065F46",
    fontWeight: "800",
  },
  memberCardRole: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
  memberCardRight: {
    alignItems: "flex-end",
  },
  amountBadgeActive: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  amountBadgeInactive: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  amountBadgeInactiveText: {
    fontSize: 11,
    color: colors.slate400,
    fontWeight: "600",
  },
  equalTipBox: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  equalTipText: {
    fontSize: 12,
    color: "#065F46",
    lineHeight: 18,
  },
  memberInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  memberInputRowActive: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  checkCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  checkCircleSmallActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  customAmountInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate900,
    textAlign: "right",
  },
  warningMismatchCard: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#FCD34D",
  },
  warningMismatchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  warningMismatchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  warningMismatchDiff: {
    fontSize: 13,
    fontWeight: "900",
  },
  warningMismatchSubText: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: 2,
  },
  customCalcCard: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  customCalcCardMatch: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  customCalcCardMismatch: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate600,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  calcDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 6,
  },
  calcStatusLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate800,
  },
  calcStatusValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  autoFillBtn: {
    marginTop: 8,
    backgroundColor: colors.indigo600,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  autoFillBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  flexBtn: {
    flex: 1,
  },
  historyFilterRow: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  historyFilterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
  },
  historyFilterBtnActive: {
    backgroundColor: "#b3e5d1",
  },
  historyFilterText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
  },
  historyFilterTextActive: {
    color: colors.slate900,
    fontWeight: "800",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.indigo50,
    borderWidth: 1.5,
    borderColor: colors.indigo100,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  scanIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.indigo900,
  },
  scanSub: {
    fontSize: 11,
    color: colors.indigo600,
    marginTop: 1,
  },
  editGroupPhotoBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    zIndex: 10,
  },
  editGroupPhotoText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  avatarBubbleImg: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  groupQrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  groupQrModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#0F172A",
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  groupQrModalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    zIndex: 10,
  },
  groupQrModalCloseText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  groupQrModalHeader: {
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  groupQrAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#4F46E5",
    marginBottom: 8,
  },
  groupQrAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  groupQrAvatarText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4F46E5",
  },
  groupQrModalGroupName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  groupQrModalSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  groupQrBox: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
  },
  groupQrCodePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  groupQrCodeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  groupQrCopyBtn: {
    width: "100%",
    backgroundColor: "#4F46E5",
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3730A3",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  groupQrCopyBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  adminTagText: {
    color: colors.indigo600,
    fontSize: 10,
    fontWeight: "700",
  },
  removeMemberBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  leaveGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  leaveGroupBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose600,
  },
  groupQrDismissHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 12,
    fontWeight: "500",
  },
  pendingRevisionTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingRevisionTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  expenseCardPending: {
    backgroundColor: "#FFFDF7",
    borderColor: "#F59E0B",
    borderWidth: 2,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  proposedPreviewRow: {
    marginTop: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  proposedPreviewText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "700",
  },
});
