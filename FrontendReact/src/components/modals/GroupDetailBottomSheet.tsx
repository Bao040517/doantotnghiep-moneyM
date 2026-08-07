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
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { VietQRCard } from "../features/VietQRCard";
import { PaymentSandboxModal } from "./PaymentSandboxModal";
import { RemindDebtBottomSheet } from "./RemindDebtBottomSheet";
import { colors } from "../../constants/colors";
import { groupService } from "../../services/groupService";
import { useAuth } from "../../hooks/useAuth";
import { Group, GroupExpense } from "../../types";

interface GroupDetailBottomSheetProps {
  visible: boolean;
  groupId: string | null;
  onClose: () => void;
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

export const GroupDetailBottomSheet: React.FC<GroupDetailBottomSheetProps> = ({
  visible,
  groupId,
  onClose,
}) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [debts, setDebts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "members">("expenses");

  // Add Expense form state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [savingExpense, setSavingExpense] = useState(false);

  // VietQR settlement state
  const [qrSettleDebt, setQrSettleDebt] = useState<any | null>(null);
  const [sandboxVisible, setSandboxVisible] = useState(false);
  
  // Remind Debt state
  const [remindDebtData, setRemindDebtData] = useState<any | null>(null);

  const fetchGroupDetails = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [gData, expData, debtData] = await Promise.all([
        groupService.getGroupDetail(groupId).catch(() => null),
        groupService.getGroupExpenses(groupId).catch(() => ({ content: [] })),
        groupService.getGroupDebts(groupId).catch(() => ({ transactions: [] })),
      ]);
      setGroup(gData);
      setExpenses(expData.content || []);
      setDebts(debtData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && groupId) {
      fetchGroupDetails();
    }
  }, [visible, groupId]);

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
      fetchGroupDetails();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể tạo hóa đơn mới");
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

  return (
    <BottomSheet visible={visible} onClose={onClose} title={group?.name || "Chi Tiết Nhóm"}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.indigo600} />
        </View>
      ) : !group ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Không tìm thấy thông tin nhóm</Text>
        </View>
      ) : isAddingExpense ? (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Thêm Hóa Đơn Chi Tiêu Mới</Text>
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
                <Text style={styles.catPillText}>
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
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab("expenses")}
              style={[styles.tabPill, activeTab === "expenses" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "expenses" && styles.tabPillTextActive]}>
                🧾 Ăn chơi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("balances")}
              style={[styles.tabPill, activeTab === "balances" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "balances" && styles.tabPillTextActive]}>
                ⚖️ Ai nợ ai
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("members")}
              style={[styles.tabPill, activeTab === "members" && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, activeTab === "members" && styles.tabPillTextActive]}>
                👥 Thành viên
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── EXPENSES LIST TAB ─── */}
          {activeTab === "expenses" && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Danh sách hóa đơn ({expenses.length})</Text>
                <Button title="+ Thêm hóa đơn" variant="primary" onPress={() => setIsAddingExpense(true)} style={styles.addBillBtn} textStyle={{ fontSize: 12 }} />
              </View>

              {expenses.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🧾</Text>
                  <Text style={styles.emptyText}>Chưa có hóa đơn nào trong nhóm</Text>
                  <Text style={styles.emptySubText}>Bấm "+ Thêm hóa đơn" để tạo khoản chi đầu tiên!</Text>
                </View>
              ) : (
                expenses.map((exp) => (
                  <View key={exp.id} style={styles.expenseCard}>
                    <View style={styles.expenseIconBg}>
                      <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[exp.category] || "📦"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseTitle}>{exp.title}</Text>
                      <Text style={styles.expensePayer}>
                        {exp.payer?.name || "Thành viên"} đã trả · {exp.splitCount || group.members?.length || 1} người
                      </Text>
                    </View>
                    <Text style={styles.expenseAmount}>{fmt(exp.amount)}</Text>
                  </View>
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
                  owedToMe.map((t: any, i: number) => (
                    <View key={i} style={styles.debtItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.debtMemberName}>{t.from?.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Text style={styles.debtSubLabel}>Nợ bạn:</Text>
                          <Text style={[styles.debtAmountInline, { color: colors.emerald600 }]}>{fmt(t.amount)}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <TouchableOpacity onPress={() => setRemindDebtData(t)} style={[styles.qrSmallBtn, { backgroundColor: colors.indigo50 }]}>
                          <Text style={[styles.qrSmallBtnText, { color: colors.indigo600 }]}>Nhắc nợ 🔔</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setQrSettleDebt(t)} style={styles.qrSmallBtn}>
                          <Text style={styles.qrSmallBtnText}>VietQR 📲</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Column 2: Bạn nợ người khác */}
              <View style={[styles.balanceSection, { marginTop: 16 }]}>
                <Text style={[styles.balanceHeader, { color: colors.rose600 }]}>🔴 Bạn nợ người khác</Text>
                {myDebts.length === 0 ? (
                  <Text style={styles.emptySubText}>Bạn không nợ ai trong nhóm này 😎</Text>
                ) : (
                  myDebts.map((t: any, i: number) => (
                    <View key={i} style={styles.debtItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.debtMemberName}>{t.to?.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Text style={styles.debtSubLabel}>Bạn nợ:</Text>
                          <Text style={[styles.debtAmountInline, { color: colors.rose600 }]}>{fmt(t.amount)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setQrSettleDebt(t)} style={[styles.qrSmallBtn, { backgroundColor: colors.rose50 }]}>
                        <Text style={[styles.qrSmallBtnText, { color: colors.rose600 }]}>Trả nợ 📲</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
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

          {/* ─── VIETQR SETTLEMENT MODAL ─── */}
          {qrSettleDebt && (
            <View style={styles.qrWrapper}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: colors.slate900, marginBottom: 12, textAlign: "center" }}>
                Thanh Toán Trả Nợ
              </Text>
              <VietQRCard
                bankBin={qrSettleDebt.to?.bankBin || "970436"}
                accountNo={qrSettleDebt.to?.bankAccountNo || "10928888999"}
                accountName={qrSettleDebt.to?.name}
                amount={qrSettleDebt.amount}
                description={`Quyet toan no ${group.name}`}
                receiverId={qrSettleDebt.to?.id}
              />
              <View style={{ marginTop: 12 }}>
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
        </ScrollView>
      )}

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
          if (toUserId && groupId) {
            await groupService.notifyPayment(groupId, { toUserId, amount: amt }).catch(() => {});
          }
          fetchGroupDetails();
        }}
      />

      {/* ─── REMIND DEBT MODAL ─── */}
      <RemindDebtBottomSheet
        visible={!!remindDebtData}
        groupId={groupId || ""}
        debtorId={remindDebtData?.from?.id}
        debtorName={remindDebtData?.from?.name}
        amount={remindDebtData?.amount}
        onClose={() => setRemindDebtData(null)}
        onSuccess={() => fetchGroupDetails()}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBanner: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    height: 140,
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
    fontSize: 20,
    fontWeight: "900",
    color: colors.white,
    marginBottom: 2,
  },
  groupHeaderDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  memberAvatarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.white,
    marginRight: -6,
  },
  avatarLetter: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  memberCountTag: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "700",
    marginLeft: 14,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.slate100,
  },
  tabPillActive: {
    backgroundColor: colors.indigo600,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
  },
  tabPillTextActive: {
    color: colors.white,
  },
  tabContent: {
    paddingTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
  },
  addBillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: colors.white,
    borderRadius: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate700,
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
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  expenseIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fce7f3",
    alignItems: "center",
    justifyContent: "center",
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  expensePayer: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900,
  },
  balanceSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
  },
  balanceHeader: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  debtItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  debtMemberName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900,
  },
  debtSubLabel: {
    fontSize: 11,
    color: colors.slate400,
  },
  debtAmount: {
    fontSize: 15,
    fontWeight: "900",
    marginRight: 10,
  },
  debtAmountInline: {
    fontSize: 14,
    fontWeight: "900",
  },
  qrSmallBtn: {
    backgroundColor: colors.emerald50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  qrSmallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald600,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  memberAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#b3e5d1",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#437d6e",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
  },
  memberEmail: {
    fontSize: 11,
    color: colors.slate400,
  },
  adminTag: {
    backgroundColor: colors.emerald100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 12,
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
    paddingHorizontal: 12,
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
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  flexBtn: {
    flex: 1,
  },
});
