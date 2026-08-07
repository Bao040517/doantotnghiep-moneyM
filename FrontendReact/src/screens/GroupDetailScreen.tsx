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
} from "react-native";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { BottomSheet } from "../components/ui/BottomSheet";
import { VietQRCard } from "../components/features/VietQRCard";
import { ExpenseChart } from "../components/features/ExpenseChart";
import { AddMemberBottomSheet } from "../components/modals/AddMemberBottomSheet";
import { ExpenseDetailBottomSheet } from "../components/modals/ExpenseDetailBottomSheet";
import { PaymentSandboxModal } from "../components/modals/PaymentSandboxModal";
import { Toast } from "../components/ui/Toast";
import { colors } from "../constants/colors";
import { groupService } from "../services/groupService";
import { useAuth } from "../hooks/useAuth";
import { Group, GroupExpense } from "../types";

interface GroupDetailScreenProps {
  groupId: string;
  onBack: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Ăn uống": "🍜",
  "Di chuyển": "🚗",
  "Lưu trú": "🏨",
  "Giải trí": "🎮",
  "Mua sắm": "🛍️",
  "Sức khỏe": "💊",
  "Hóa đơn": "🧾",
  "Khác": "📦",
};

const GROUP_IMAGES = [
  "https://images.unsplash.com/photo-1539635273304-0e8723e0f016?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80",
];

export const GroupDetailScreen: React.FC<GroupDetailScreenProps> = ({ groupId, onBack }) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [debts, setDebts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "history" | "members">("expenses");
  const [historyFilter, setHistoryFilter] = useState<"group" | "personal">("group");

  // Add Member Modal state
  const [addMemberVisible, setAddMemberVisible] = useState(false);

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

  // Add Expense form state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [savingExpense, setSavingExpense] = useState(false);

  // VietQR settlement state
  const [qrSettleDebt, setQrSettleDebt] = useState<any | null>(null);
  const [sandboxVisible, setSandboxVisible] = useState(false);
  const [pendingDebtors, setPendingDebtors] = useState<string[]>([]);
  const [pendingSent, setPendingSent] = useState<string[]>([]);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      showToast(`Đã báo chuyển tiền cho ${creditorName}! ⏳`, "success");
      fetchGroupDetails();
    } catch (e: any) {
      showToast(e.response?.data?.message || "Lỗi khi báo chuyển tiền", "error");
    }
  };

  const handleApproveSettle = async (debtorId: string, amount: number, debtorName: string) => {
    try {
      await groupService.approveSettle(groupId, { debtorId, amount });
      showToast(`Đã xác nhận thanh toán xong từ ${debtorName}! 🎉`, "success");
      fetchGroupDetails();
    } catch (e: any) {
      showToast(e.response?.data?.message || "Lỗi khi xác nhận thanh toán", "error");
    }
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

  const handleSaveExpense = async () => {
    const rawNumber = parseFloat(amount.replace(/\./g, "")) || 0;
    if (!title.trim() || rawNumber <= 0 || !groupId || !group) return;
    setSavingExpense(true);
    try {
      const memberIds = group.members?.map((m) => m.user?.id || m.id) || [];
      await groupService.createGroupExpense(groupId, {
        title: title.trim(),
        amount: rawNumber,
        category,
        payerId: user?.id,
        splitMemberIds: memberIds,
      });
      setTitle("");
      setAmount("");
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
    const safe = Math.round(Number(n) || 0);
    return safe.toLocaleString("vi-VN") + " ₫";
  };

  const myDebts = debts?.transactions?.filter((t: any) => t.from?.id === user?.id) || [];
  const owedToMe = debts?.transactions?.filter((t: any) => t.to?.id === user?.id) || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo600} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
        <Text style={styles.emptyText}>Không tìm thấy thông tin nhóm</Text>
        <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 4, textAlign: "center", paddingHorizontal: 32 }}>
          Không thể tải dữ liệu nhóm từ máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <Button title="← Quay lại" variant="secondary" onPress={onBack} />
          <Button title="🔄 Thử lại" variant="primary" onPress={fetchGroupDetails} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── FULL SCREEN HEADER ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={() => setAddMemberVisible(true)}>
          <Text style={styles.inviteBtnText}>Mời bạn bè</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* ─── HERO HEADER BANNER ─── */}
        <View style={styles.heroBanner}>
          <Image source={{ uri: GROUP_IMAGES[0] }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <Text style={styles.groupHeaderName}>{group.name}</Text>
            <Text style={styles.groupHeaderDesc}>{group.description || "Nhóm chia sẻ chi phí chung"}</Text>
            <View style={styles.memberAvatarsRow}>
              {group.members?.slice(0, 5).map((m, i) => (
                <View key={m.id || i} style={styles.avatarBubble}>
                  <Text style={styles.avatarLetter}>{(m.user?.name || "U").charAt(0)}</Text>
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
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  style={[styles.addBillBtn, { backgroundColor: colors.emerald50, borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" }]}
                  onPress={async () => {
                    try {
                      await groupService.exportExpenses(groupId);
                      showToast("Đã tải dữ liệu báo cáo CSV thành công! 📊", "success");
                    } catch (e: any) {
                      showToast("Lỗi khi xuất file báo cáo CSV", "error");
                    }
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colors.emerald700 }}>Xuất CSV 📊</Text>
                </TouchableOpacity>
                <Button title="+ Thêm hóa đơn" variant="primary" onPress={() => setIsAddingExpense(true)} style={styles.addBillBtn} textStyle={{ fontSize: 12 }} />
              </View>
            </View>

            {expenses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🧾</Text>
                <Text style={styles.emptyText}>Chưa có hóa đơn nào trong nhóm</Text>
                <Text style={styles.emptySubText}>Bấm "+ Thêm hóa đơn" để tạo khoản chi đầu tiên!</Text>
              </View>
            ) : (
              expenses.map((exp) => (
                <TouchableOpacity
                  key={exp.id}
                  style={styles.expenseCard}
                  onPress={() => {
                    setSelectedExpenseId(exp.id);
                    setExpenseDetailVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.expenseIconBg}>
                    <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[exp.category] || "📦"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseTitle}>{exp.title}</Text>
                    <Text style={styles.expensePayer}>
                      <Text style={{ fontWeight: "700" }}>{exp.payer?.name || "Thành viên"}</Text> đã trả · chia {exp.splitCount || group.members?.length || 1} người
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>{fmt(exp.amount)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ─── AI NỢ AI TAB ─── */}
        {activeTab === "balances" && (
          <View style={styles.tabContent}>
            {/* Column 1: Người khác nợ bạn */}
            <View style={styles.balanceSection}>
              <Text style={[styles.balanceHeader, { color: colors.emerald600 }]}>🟢 Người khác nợ bạn</Text>
              {owedToMe.length === 0 ? (
                <Text style={styles.emptySubText}>Không ai nợ bạn trong nhóm này 🎉</Text>
              ) : (
                owedToMe.map((t: any, i: number) => {
                  const debtorId = t.from?.id;
                  const isPending = pendingDebtors.includes(debtorId);

                  return (
                    <View key={i} style={styles.debtItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.debtMemberName}>{t.from?.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Text style={styles.debtSubLabel}>Nợ bạn:</Text>
                          <Text style={[styles.debtAmountInline, { color: colors.emerald600 }]}>{fmt(t.amount)}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        {isPending && (
                          <View style={styles.pendingTag}>
                            <Text style={styles.pendingTagText}>Đã chuyển ⏳</Text>
                          </View>
                        )}
                        {isPending ? (
                          <TouchableOpacity
                            onPress={() => handleApproveSettle(debtorId, t.amount, t.from?.name || "Người nợ")}
                            style={[styles.qrSmallBtn, { backgroundColor: colors.emerald100 }]}
                          >
                            <Text style={[styles.qrSmallBtnText, { color: colors.emerald700 }]}>✓ Xác nhận</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleRemindDebt(debtorId, t.amount, t.from?.name || "Người nợ")}
                            style={[styles.qrSmallBtn, { backgroundColor: "#FEF3C7" }]}
                          >
                            <Text style={[styles.qrSmallBtnText, { color: "#D97706" }]}>🔔 Nhắc nợ</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setQrSettleDebt(t)} style={styles.qrSmallBtn}>
                          <Text style={styles.qrSmallBtnText}>VietQR 📲</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Column 2: Bạn nợ người khác */}
            <View style={[styles.balanceSection, { marginTop: 16 }]}>
              <Text style={[styles.balanceHeader, { color: colors.rose600 }]}>🔴 Bạn nợ người khác</Text>
              {myDebts.length === 0 ? (
                <Text style={styles.emptySubText}>Bạn không nợ ai trong nhóm này 😎</Text>
              ) : (
                myDebts.map((t: any, i: number) => {
                  const creditorId = t.to?.id;
                  const isSentPending = pendingSent.includes(creditorId);

                  return (
                    <View key={i} style={styles.debtItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.debtMemberName}>{t.to?.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Text style={styles.debtSubLabel}>Bạn nợ:</Text>
                          <Text style={[styles.debtAmountInline, { color: colors.rose600 }]}>{fmt(t.amount)}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        {isSentPending && (
                          <View style={styles.pendingSentTag}>
                            <Text style={styles.pendingSentTagText}>Chờ duyệt ⏳</Text>
                          </View>
                        )}
                        <TouchableOpacity onPress={() => setQrSettleDebt(t)} style={[styles.qrSmallBtn, { backgroundColor: colors.rose50 }]}>
                          <Text style={[styles.qrSmallBtnText, { color: colors.rose600 }]}>Thanh toán 📲</Text>
                        </TouchableOpacity>
                      </View>
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
                    <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[exp.category] || "📦"}</Text>
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
            <Text style={styles.sectionHeaderTitle}>Danh sách thành viên ({group.members?.length || 0})</Text>
            {group.members?.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatarCircle}>
                  <Text style={styles.memberAvatarText}>{(m.user?.name || "U").charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.user?.name}</Text>
                  <Text style={styles.memberEmail}>{m.user?.email || "Chưa có email"}</Text>
                </View>
                {m.role === "ADMIN" && (
                  <View style={styles.adminTag}>
                    <Text style={styles.adminTagText}>ADMIN</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* ─── DEDICATED PAYMENT BOTTOMSHEET MODAL (TRANG THANH TOÁN) ─── */}
      <BottomSheet
        visible={!!qrSettleDebt}
        onClose={() => setQrSettleDebt(null)}
        title="Thanh Toán Trả Nợ"
      >
        {qrSettleDebt && (
          <View style={{ paddingTop: 4, paddingBottom: 12 }}>
            <VietQRCard
              bankBin={qrSettleDebt.to?.bankBin || "970436"}
              accountNo={qrSettleDebt.to?.bankAccountNo || "10928888999"}
              accountName={qrSettleDebt.to?.name}
              amount={qrSettleDebt.amount}
              description={`Quyet toan no ${group?.name || "nhom"}`}
              receiverId={qrSettleDebt.to?.id}
            />

            <View style={{ marginTop: 16 }}>
              <Button
                title="Thanh toán ngay 💳"
                variant="primary"
                onPress={() => {
                  setSandboxVisible(true);
                }}
              />
            </View>
          </View>
        )}
      </BottomSheet>

      {/* ─── BANKING SANDBOX GATEWAY MODAL ─── */}
      <PaymentSandboxModal
        visible={sandboxVisible}
        debtInfo={
          qrSettleDebt
            ? {
                amount: qrSettleDebt.amount,
                toName: qrSettleDebt.to?.name || "Người nhận",
                toBankBin: qrSettleDebt.to?.bankBin || "970436",
                toAccountNo: qrSettleDebt.to?.bankAccountNo || "10928888999",
                toUserId: qrSettleDebt.to?.id,
                groupName: group?.name,
              }
            : null
        }
        onClose={() => {
          setSandboxVisible(false);
          setQrSettleDebt(null);
        }}
        onPaymentSuccess={async (amt, toUserId) => {
          if (toUserId) {
            await handleNotifyPayment(toUserId, amt, qrSettleDebt?.to?.name || "Chủ nợ");
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
        <View style={styles.formContainer}>
          <Input label="Tên khoản chi (*)" placeholder="VD: Tiền Ăn Tối, Xe Ô Tô Du Lịch" value={title} onChangeText={setTitle} />
          <Input label="Số tiền (VND) (*)" placeholder="VD: 500.000" keyboardType="numeric" value={amount} onChangeText={handleAmountChange} />

          <Text style={styles.label}>Danh mục chi tiêu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catPillsRow}>
            {Object.keys(CATEGORY_EMOJI).map((catName) => (
              <TouchableOpacity
                key={catName}
                onPress={() => setCategory(catName)}
                style={[styles.catPill, category === catName && styles.catPillActive]}
              >
                <Text style={[styles.catPillText, category === catName && styles.catPillTextActive]}>
                  {CATEGORY_EMOJI[catName]} {catName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={() => setIsAddingExpense(false)} style={styles.flexBtn} />
            <Button title="Lưu hóa đơn" variant="primary" onPress={handleSaveExpense} loading={savingExpense} style={styles.flexBtn} />
          </View>
        </View>
      </BottomSheet>

      {/* Add Member Bottom Sheet */}
      <AddMemberBottomSheet
        visible={addMemberVisible}
        groupId={groupId}
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
  inviteBtn: {
    backgroundColor: "#FEF7E6",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
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
    fontSize: 11,
    color: colors.slate400,
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
});
