import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { VietQRCard } from "../components/features/VietQRCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { GroupDetailScreen } from "./GroupDetailScreen";
import { CreateGroupBottomSheet } from "../components/modals/CreateGroupBottomSheet";
import { RemindDebtBottomSheet } from "../components/modals/RemindDebtBottomSheet";
import { PaymentSandboxModal } from "../components/modals/PaymentSandboxModal";
import { PayeeSelectorModal } from "../components/modals/PayeeSelectorModal";
import { Toast } from "../components/ui/Toast";
import { colors } from "../constants/colors";
import { groupService } from "../services/groupService";
import { useAuth } from "../hooks/useAuth";
import { Group, GroupDebtDetail, GroupDebtSummary, Payee } from "../types";

const GROUP_IMAGES = [
  "https://images.unsplash.com/photo-1539635273304-0e8723e0f016?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80",
];

export const GroupsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [debtSummary, setDebtSummary] = useState<GroupDebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState<GroupDebtDetail | null>(null);

  // Group Detail Full Screen State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Debt Modal State: "owed" (Ai nợ tôi) vs "owing" (Tôi nợ ai)
  const [debtModalType, setDebtModalType] = useState<"owed" | "owing" | null>(null);
  const [remindDebtData, setRemindDebtData] = useState<any | null>(null);
  const [sandboxVisible, setSandboxVisible] = useState(false);
  const [payeeSelectorVisible, setPayeeSelectorVisible] = useState(false);
  const [pendingDebtForSelector, setPendingDebtForSelector] = useState<{
    groupId: string;
    otherMemberId: string;
    otherMemberName: string;
    amount: number;
    groupName: string;
  } | null>(null);

  const handleStartGroupDebtPayment = (item: any, creditorName: string, gName: string) => {
    const accNo = item.counterparty?.bankAccountNo || item.bankAccountNo;
    setDebtModalType(null);
    if (accNo) {
      // Có STK -> Bypass selector, mở thẳng QR sandbox
      setSelectedDebt({
        groupId: item.groupId || groups[0]?.id || "",
        otherMemberId: item.counterparty?.id || item.otherMemberId || "",
        otherMemberName: creditorName,
        bankBin: item.counterparty?.bankBin || item.bankBin || "970422",
        bankAccountNo: accNo,
        bankAccountName: item.counterparty?.name || creditorName,
        amount: Math.abs(item.amount),
        groupName: gName,
      });
      setSandboxVisible(true);
    } else {
      // Chưa có STK -> Mở PayeeSelectorModal để chọn / nhập tài khoản
      setPendingDebtForSelector({
        groupId: item.groupId || groups[0]?.id || "",
        otherMemberId: item.counterparty?.id || item.otherMemberId || "",
        otherMemberName: creditorName,
        amount: Math.abs(item.amount),
        groupName: gName,
      });
      setPayeeSelectorVisible(true);
    }
  };

  const handleSelectPayeeForGroupDebt = (payee: Payee) => {
    if (!pendingDebtForSelector) return;
    setSelectedDebt({
      groupId: pendingDebtForSelector.groupId,
      otherMemberId: pendingDebtForSelector.otherMemberId,
      otherMemberName: payee.accountName || payee.name || pendingDebtForSelector.otherMemberName,
      bankBin: payee.bankBin || "970422",
      bankAccountNo: payee.bankAccount,
      bankAccountName: payee.accountName || payee.name,
      amount: pendingDebtForSelector.amount,
      groupName: pendingDebtForSelector.groupName,
    });
    setPayeeSelectorVisible(false);
    setSandboxVisible(true);
  };

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMsg(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleHeaderBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.navigate) {
      navigation.navigate("Dashboard");
    }
  };

  // Create Group Form Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      const [gData, dData] = await Promise.all([
        groupService.getGroups().catch(() => []),
        groupService.getGroupDebtSummary().catch(() => null),
      ]);
      setGroups(gData);

      let finalDebtSummary = dData;

      // If dData?.details is empty or missing, aggregate debts across all groups
      if (!dData?.details || dData.details.length === 0) {
        const myId = user?.id;
        const allDetails: GroupDebtDetail[] = [];
        let totalOwed = 0;
        let totalOwing = 0;

        await Promise.all(
          gData.map(async (g) => {
            try {
              const debtsRes = await groupService.getGroupDebts(g.id);
              if (debtsRes?.transactions) {
                debtsRes.transactions.forEach((tx: any) => {
                  const isDebtor = tx.from?.id === myId;
                  const isCreditor = tx.to?.id === myId;
                  if (isDebtor) {
                    const amt = Math.abs(Number(tx.amount) || 0);
                    totalOwing += amt;
                    allDetails.push({
                      groupId: g.id,
                      groupName: g.name,
                      counterparty: tx.to,
                      otherMemberId: tx.to?.id,
                      otherMemberName: tx.to?.name,
                      bankBin: tx.to?.bankBin,
                      bankAccountNo: tx.to?.bankAccountNo,
                      bankAccountName: tx.to?.name,
                      amount: amt,
                      type: "OWING",
                    });
                  }
                  if (isCreditor) {
                    const amt = Math.abs(Number(tx.amount) || 0);
                    totalOwed += amt;
                    allDetails.push({
                      groupId: g.id,
                      groupName: g.name,
                      counterparty: tx.from,
                      otherMemberId: tx.from?.id,
                      otherMemberName: tx.from?.name,
                      bankBin: tx.from?.bankBin,
                      bankAccountNo: tx.from?.bankAccountNo,
                      bankAccountName: tx.from?.name,
                      amount: amt,
                      type: "OWED",
                    });
                  }
                });
              }
            } catch (err) {
              console.error(err);
            }
          })
        );

        finalDebtSummary = {
          totalOwed: dData?.totalOwed || totalOwed,
          totalOwing: dData?.totalOwing || totalOwing,
          details: allDetails,
        };
      }

      setDebtSummary(finalDebtSummary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupData();
  }, []);

  // If a group is clicked, open GroupDetailScreen full screen!
  if (selectedGroupId) {
    return (
      <GroupDetailScreen
        groupId={selectedGroupId}
        onBack={() => {
          setSelectedGroupId(null);
          loadGroupData();
        }}
      />
    );
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setIsCreating(true);
    try {
      await groupService.createGroup({ name: groupName.trim(), description: groupDesc.trim() });
      setGroupName("");
      setGroupDesc("");
      setCreateModalVisible(false);
      loadGroupData();
      showToast("Tạo nhóm mới thành công! 🎉", "success");
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể tạo nhóm");
    } finally {
      setIsCreating(false);
    }
  };

  const fmt = (val?: number) => {
    const safe = Math.round(Number(val) || 0);
    return safe.toLocaleString("vi-VN") + "đ";
  };

  const userName = user?.name ? user.name.split(" ").pop() : "Bạn";

  const handlePaymentSuccess = async (amount: number, toUserId?: string) => {
    try {
      const gId = selectedDebt?.groupId || groups[0]?.id;
      if (gId && toUserId) {
        await groupService.notifyPayment(gId, { toUserId, amount });
      }
      showToast("Đã mô phỏng thanh toán Sandbox thành công! 🎉", "success");
      setSandboxVisible(false);
      setSelectedDebt(null);
      loadGroupData();
    } catch (e: any) {
      console.error(e);
      showToast("Đã ghi nhận giao dịch Sandbox!", "success");
      setSandboxVisible(false);
      setSelectedDebt(null);
      loadGroupData();
    }
  };

  const handleNotifyPaymentDirectly = async () => {
    if (!selectedDebt) return;
    try {
      const gId = selectedDebt.groupId || groups[0]?.id;
      const toUserId = selectedDebt.otherMemberId;
      if (gId && toUserId) {
        await groupService.notifyPayment(gId, { toUserId, amount: Math.abs(selectedDebt.amount) });
        showToast(`Đã gửi thông báo thanh toán tiền mặt tới ${selectedDebt.otherMemberName}! 💵`, "success");
        setSelectedDebt(null);
        loadGroupData();
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể gửi thông báo chuyển tiền");
    }
  };

  // Filter lists for modal
  const owedList = (debtSummary?.details || []).filter(
    (d) => d.type === "OWED" || (d.amount && d.amount > 0 && d.type !== "OWING")
  );
  const owingList = (debtSummary?.details || []).filter(
    (d) => d.type === "OWING" || (d.amount && d.amount < 0)
  );

  return (
    <View style={styles.container}>
      {/* ─── STICKY HEADER ─── */}
      <View style={styles.headerBar}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleHeaderBack}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Nhóm</Text>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.iconCircle}>
              <Text style={{ fontSize: 15 }}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle}>
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => navigation.navigate("Profile" as never)}
              activeOpacity={0.8}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.greetingText}>
          Chào ngày mới, <Text style={styles.greetingName}>{userName} 👋</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGroupData} colors={[colors.indigo600]} />}
      >
        {/* ─── BENTO DEBT CARDS (Clickable Grid Cards) ─── */}
        <View style={styles.bentoRow}>
          {/* Tiền đang bay về 💰 */}
          <TouchableOpacity
            style={[styles.bentoCard, styles.bentoCardOwed]}
            onPress={() => setDebtModalType("owed")}
            activeOpacity={0.8}
          >
            <View style={styles.bentoCardHeaderRow}>
              <Text style={styles.bentoCardLabel}>Tiền đang bay về 💰</Text>
              <Text style={styles.bentoArrowHint}>→</Text>
            </View>
            <View>
              <Text style={styles.bentoCardVal}>{fmt(debtSummary?.totalOwed)}</Text>
              <Text style={styles.bentoCardSub}>Người khác nợ bạn (Bấm xem)</Text>
            </View>
          </TouchableOpacity>

          {/* Tiền cần trả 🥱 */}
          <TouchableOpacity
            style={[styles.bentoCard, styles.bentoCardOwing]}
            onPress={() => setDebtModalType("owing")}
            activeOpacity={0.8}
          >
            <View style={styles.bentoCardHeaderRow}>
              <Text style={styles.bentoCardLabel}>Tiền cần trả 🥱</Text>
              <Text style={styles.bentoArrowHint}>→</Text>
            </View>
            <View>
              <Text style={styles.bentoCardVal}>{fmt(debtSummary?.totalOwing)}</Text>
              <Text style={styles.bentoCardSub}>Bạn nợ người khác (Bấm xem)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── GROUPS SECTION ─── */}
        <Text style={styles.sectionTitle}>Nhóm của bạn</Text>

        <View style={styles.groupsGrid}>
          {/* Create New Group Card */}
          <TouchableOpacity style={styles.createGroupCard} onPress={() => setCreateModalVisible(true)}>
            <View style={styles.plusIconCircle}>
              <Text style={styles.plusIconText}>+</Text>
            </View>
            <Text style={styles.createGroupTitle}>Tạo Nhóm Mới</Text>
            <Text style={styles.createGroupSub}>Bắt đầu chia sẻ chi phí</Text>
          </TouchableOpacity>

          {/* Group Items */}
          {groups.map((g, idx) => (
            <TouchableOpacity
              key={g.id || `group-${idx}`}
              style={styles.groupCard}
              onPress={() => setSelectedGroupId(g.id)}
            >
              <Image
                source={{ uri: g.avatarUrl || GROUP_IMAGES[idx % GROUP_IMAGES.length] }}
                style={styles.groupImage}
                resizeMode="cover"
              />
              <Text style={styles.groupNameText} numberOfLines={2}>{g.name}</Text>
              <View style={styles.memberBadge}>
                <Text style={styles.memberIcon}>👥</Text>
                <Text style={styles.memberCountText}>{g.members?.length || g.memberCount || 0} thành viên</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ─── CENTERED FLOATING POPUP MODAL (PROJECT LAYOUT STANDARD) ─── */}
      <Modal
        visible={debtModalType !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDebtModalType(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDebtModalType(null)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            {/* Header Row: Title & Circle Close Button */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.titleBadgeRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: debtModalType === "owed" ? "#10b981" : "#ef4444" },
                  ]}
                />
                <Text style={styles.modalTitle}>
                  {debtModalType === "owed" ? "Người khác nợ bạn 🟢" : "Bạn nợ người khác 🔴"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setDebtModalType(null)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sub-header Banner */}
            <View style={debtModalType === "owed" ? styles.heroCardOwed : styles.heroCardOwing}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSubTitle}>
                  {debtModalType === "owed" ? "TỔNG SỐ TIỀN NGƯỜI KHÁC CHƯA TRẢ BẠN" : "TỔNG SỐ TIỀN BẠN CẦN THANH TOÁN"}
                </Text>
                <Text style={debtModalType === "owed" ? styles.heroAmountOwed : styles.heroAmountOwing}>
                  {debtModalType === "owed" ? fmt(debtSummary?.totalOwed) : fmt(debtSummary?.totalOwing)}
                </Text>
              </View>
              <View style={styles.heroIconBox}>
                <Text style={{ fontSize: 24 }}>{debtModalType === "owed" ? "💰" : "🥱"}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {debtModalType === "owed" ? (
                /* DANH SÁCH NGƯỜI KHÁC NỢ BẠN */
                owedList.length === 0 ? (
                  <View style={styles.emptyDebtBox}>
                    <Text style={styles.emptyDebtEmoji}>🎉</Text>
                    <Text style={styles.emptyDebtTitle}>Không ai nợ bạn</Text>
                    <Text style={styles.emptyDebtSub}>Mọi người trong các nhóm đã thanh toán sòng phẳng!</Text>
                  </View>
                ) : (
                  owedList.map((item, idx) => {
                    const debtorName = item.counterparty?.name || item.otherMemberName || "Người nợ";
                    const debtorId = item.counterparty?.id || item.otherMemberId || "";
                    const gName = item.groupName || "Nhóm chi tiêu";

                    return (
                      <View key={idx} style={styles.debtProjectCard}>
                        {/* Top row: Avatar + Name + Group pill + Amount */}
                        <View style={styles.debtProjectTopRow}>
                          <View style={styles.debtAvatarBoxGreen}>
                            <Text style={styles.debtAvatarTextGreen}>{debtorName.charAt(0)}</Text>
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.debtMemberName} numberOfLines={1}>{debtorName}</Text>
                            <View style={styles.groupPill}>
                              <Text style={styles.groupPillText} numberOfLines={1}>🏠 {gName}</Text>
                            </View>
                          </View>
                          <View style={styles.amountCol}>
                            <Text style={styles.debtTagLabelGreen}>Nợ bạn:</Text>
                            <Text style={styles.debtAmountGreen}>+{fmt(Math.abs(item.amount))}</Text>
                          </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                          onPress={() => {
                            setDebtModalType(null);
                            setRemindDebtData({
                              groupId: item.groupId || groups[0]?.id || "",
                              from: { id: debtorId, name: debtorName },
                              amount: Math.abs(item.amount),
                            });
                          }}
                          style={styles.remindActionBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.remindActionBtnText}>🔔 Soạn câu nhắc nợ với AI ✨</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )
              ) : (
                /* DANH SÁCH BẠN NỢ NGƯỜI KHÁC */
                owingList.length === 0 ? (
                  <View style={styles.emptyDebtBox}>
                    <Text style={styles.emptyDebtEmoji}>😎</Text>
                    <Text style={styles.emptyDebtTitle}>Bạn không nợ ai</Text>
                    <Text style={styles.emptyDebtSub}>Bạn quản lý tài chính nhóm rất chuẩn mực!</Text>
                  </View>
                ) : (
                  owingList.map((item, idx) => {
                    const creditorName = item.counterparty?.name || item.otherMemberName || "Chủ nợ";
                    const gName = item.groupName || "Nhóm chi tiêu";

                    return (
                      <View key={idx} style={[styles.debtProjectCard, { borderColor: "#fecdd3" }]}>
                        {/* Top row: Avatar + Name + Group pill + Amount */}
                        <View style={styles.debtProjectTopRow}>
                          <View style={styles.debtAvatarBoxRed}>
                            <Text style={styles.debtAvatarTextRed}>{creditorName.charAt(0)}</Text>
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.debtMemberName} numberOfLines={1}>{creditorName}</Text>
                            <View style={styles.groupPill}>
                              <Text style={styles.groupPillText} numberOfLines={1}>🏠 {gName}</Text>
                            </View>
                          </View>
                          <View style={styles.amountCol}>
                            <Text style={styles.debtTagLabelRed}>Bạn nợ:</Text>
                            <Text style={styles.debtAmountRed}>-{fmt(Math.abs(item.amount))}</Text>
                          </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                          onPress={() => handleStartGroupDebtPayment(item, creditorName, gName)}
                          style={styles.payActionBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.payActionBtnText}>⚡ Chuyển tiền ngay (1 Chạm 📲)</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* AI Remind Debt Bottom Sheet */}
      {remindDebtData && (
        <RemindDebtBottomSheet
          visible={!!remindDebtData}
          groupId={remindDebtData.groupId}
          debtorId={remindDebtData.from?.id}
          debtorName={remindDebtData.from?.name || "Người nợ"}
          amount={remindDebtData.amount}
          onClose={() => setRemindDebtData(null)}
          onSuccess={() => {
            showToast(`Đã gửi thông báo nhắc nợ tới ${remindDebtData.from?.name || "thành viên"}! 🔔`, "success");
            loadGroupData();
          }}
        />
      )}

      {/* Payee Selector Modal for Friends without Bank Account */}
      <PayeeSelectorModal
        visible={payeeSelectorVisible}
        onClose={() => {
          setPayeeSelectorVisible(false);
          setPendingDebtForSelector(null);
        }}
        onSelectPayee={handleSelectPayeeForGroupDebt}
        defaultAmount={pendingDebtForSelector?.amount}
      />

      {/* Payment Sandbox Simulation Modal */}
      <PaymentSandboxModal
        visible={sandboxVisible}
        debtInfo={
          selectedDebt
            ? {
                amount: Math.abs(selectedDebt.amount),
                toName: selectedDebt.otherMemberName,
                toBankBin: selectedDebt.bankBin || "",
                toAccountNo: selectedDebt.bankAccountNo || "",
                toUserId: selectedDebt.otherMemberId,
                groupName: selectedDebt.groupName,
                groupId: selectedDebt.groupId,
              }
            : null
        }
        onClose={() => {
          setSandboxVisible(false);
          setPendingDebtForSelector(null);
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Create Group Modal */}
      <CreateGroupBottomSheet
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onGroupCreated={loadGroupData}
      />

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
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 12,
    backgroundColor: "rgba(232, 245, 241, 0.95)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
    fontSize: 22,
    fontWeight: "900",
    color: colors.slate800,
    flex: 1,
    marginLeft: 12,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  greetingText: {
    fontSize: 14,
    color: colors.slate600,
  },
  greetingName: {
    fontWeight: "800",
    color: colors.slate900,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Bento Cards Row */
  bentoRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    height: 96,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bentoCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bentoArrowHint: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(0, 0, 0, 0.4)",
  },
  bentoCardOwed: {
    backgroundColor: "#C3F4E1",
  },
  bentoCardOwing: {
    backgroundColor: "#FFD8C2",
  },
  bentoCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0, 0, 0, 0.65)",
  },
  bentoCardVal: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    lineHeight: 20,
  },
  bentoCardSub: {
    fontSize: 10,
    color: "rgba(0, 0, 0, 0.5)",
    fontWeight: "700",
  },

  /* Section Title */
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.slate800,
    marginBottom: 16,
  },

  /* Groups Grid */
  groupsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  createGroupCard: {
    width: "48%",
    minHeight: 200,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#b3e5d1",
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginBottom: 16,
  },
  plusIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#B3E5D1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  plusIconText: {
    fontSize: 32,
    color: "#437d6e",
    fontWeight: "300",
    marginTop: -2,
  },
  createGroupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate800,
    marginBottom: 4,
  },
  createGroupSub: {
    fontSize: 11,
    color: colors.slate500,
    textAlign: "center",
  },

  groupCard: {
    width: "48%",
    minHeight: 200,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#ffd8c2",
    backgroundColor: "#FFF9EF",
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupImage: {
    width: "100%",
    height: 115,
    borderRadius: 26,
    marginBottom: 10,
  },
  groupNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate800,
    lineHeight: 18,
    marginBottom: 6,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  memberIcon: {
    fontSize: 12,
  },
  memberCountText: {
    fontSize: 11,
    color: colors.slate600,
    fontWeight: "600",
  },

  /* ─── PROJECT STANDARD CENTERED POPUP MODAL STYLES ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#0f172a",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: -1,
  },

  /* Hero Summary Card */
  heroCardOwed: {
    backgroundColor: "#10b981",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCardOwing: {
    backgroundColor: "#f43f5e",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroSubTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroAmountOwed: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.white,
  },
  heroAmountOwing: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.white,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollArea: {
    paddingBottom: 8,
  },

  /* Debt Card Item (Project Layout) */
  debtProjectCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 10,
  },
  debtProjectTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  debtAvatarBoxGreen: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  debtAvatarTextGreen: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
  },
  debtAvatarBoxRed: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  debtAvatarTextRed: {
    fontSize: 15,
    fontWeight: "900",
    color: "#b91c1c",
  },
  debtMemberName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  groupPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupPillText: {
    fontSize: 10,
    color: colors.slate600,
    fontWeight: "600",
  },
  amountCol: {
    alignItems: "flex-end",
  },
  debtTagLabelGreen: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  debtAmountGreen: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
  },
  debtTagLabelRed: {
    fontSize: 10,
    fontWeight: "700",
    color: "#dc2626",
  },
  debtAmountRed: {
    fontSize: 15,
    fontWeight: "900",
    color: "#dc2626",
  },

  /* Action Buttons */
  remindActionBtn: {
    backgroundColor: "#fef3c7",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
  },
  remindActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b45309",
  },
  payActionBtn: {
    backgroundColor: "#f43f5e",
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },

  /* Empty State */
  emptyDebtBox: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyDebtEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyDebtTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate800,
    marginBottom: 4,
  },
  emptyDebtSub: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: "center",
  },
  qrModalContent: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  settleActionBtnContainer: {
    width: "100%",
    marginTop: 16,
    gap: 10,
  },
  sandboxSimulateBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sandboxSimulateBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.white,
  },
  notifyPaymentDirectBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notifyPaymentDirectBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.white,
  },
});
