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
  const [paidBy, setPaidBy] = useState<string>("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [payerDropdownOpen, setPayerDropdownOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"all" | "custom">("all");
  const [selectedSplitUserIds, setSelectedSplitUserIds] = useState<string[]>([]);
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
    if (!title.trim() || rawNumber <= 0 || !groupId || !group) {
      Alert.alert("Lỗi", "Vui lòng nhập tên và số tiền hợp lệ");
      return;
    }

    const currentPayerId = paidBy || user?.id || (group.members?.[0]?.user?.id || group.members?.[0]?.id);
    if (!currentPayerId) {
      Alert.alert("Lỗi", "Vui lòng chọn người thanh toán");
      return;
    }

    const targetSplitIds = splitMode === "all"
      ? (group.members?.map((m) => m.user?.id || m.id) || [])
      : selectedSplitUserIds;

    if (targetSplitIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất 1 người để chia tiền");
      return;
    }

    setSavingExpense(true);
    try {
      await groupService.createGroupExpense(groupId, {
        title: title.trim(),
        amount: rawNumber,
        category,
        paidBy: currentPayerId,
        splitUserIds: targetSplitIds,
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
        <View style={styles.modalBodyWrapper}>
          <ScrollView
            style={styles.formScrollArea}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <Text style={styles.formTitle}>Thêm Hóa Đơn Chi Tiêu Mới</Text>
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
              <Text style={styles.dropdownSelectedIcon}>
                {CATEGORY_EMOJI[category] || "📦"}
              </Text>
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
                          <Text style={{ fontSize: 16 }}>{CATEGORY_EMOJI[catName]}</Text>
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

          {/* Chia cho những ai? */}
          <View style={styles.splitSectionHeader}>
            <Text style={styles.label}>Chia cho những ai? (*)</Text>
            <View style={styles.splitModeToggle}>
              <TouchableOpacity
                onPress={() => setSplitMode("all")}
                style={[styles.splitModeBtn, splitMode === "all" && styles.splitModeBtnActive]}
              >
                <Text style={[styles.splitModeText, splitMode === "all" && styles.splitModeTextActive]}>
                  Tất cả ({group?.members?.length || 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSplitMode("custom");
                  if (selectedSplitUserIds.length === 0) {
                    setSelectedSplitUserIds(group?.members?.map((m) => m.user?.id || m.id) || []);
                  }
                }}
                style={[styles.splitModeBtn, splitMode === "custom" && styles.splitModeBtnActive]}
              >
                <Text style={[styles.splitModeText, splitMode === "custom" && styles.splitModeTextActive]}>
                  Tùy chọn
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {splitMode === "all" ? (
            <View style={styles.splitAllNotice}>
              <Text style={styles.splitAllNoticeText}>
                👥 Hóa đơn sẽ được chia đều cho tất cả {group?.members?.length || 0} thành viên trong nhóm.
              </Text>
            </View>
          ) : (
            <View style={styles.splitCustomList}>
              {group?.members?.map((m) => {
                const uId = m.user?.id || m.id;
                const uName = m.user?.name || "Thành viên";
                const isSelected = selectedSplitUserIds.includes(uId);
                return (
                  <TouchableOpacity
                    key={uId}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedSplitUserIds(selectedSplitUserIds.filter((id) => id !== uId));
                      } else {
                        setSelectedSplitUserIds([...selectedSplitUserIds, uId]);
                      }
                    }}
                    style={[styles.memberCheckRow, isSelected && styles.memberCheckRowActive]}
                  >
                    <View style={styles.memberCheckLeft}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarText}>{uName.charAt(0)}</Text>
                      </View>
                      <Text style={styles.memberCheckName}>{uName}</Text>
                    </View>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          </ScrollView>

          {/* Sticky Bottom Footer */}
          <View style={styles.stickyFooterBox}>
            <Button title="Lưu hóa đơn" variant="primary" onPress={handleSaveExpense} loading={savingExpense} />
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
                    const debtorName = t.from?.name || "Người nợ";
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

                        {/* Action Pill Buttons */}
                        <View style={styles.debtCardActions}>
                          <TouchableOpacity
                            onPress={() => setRemindDebtData(t)}
                            style={styles.remindCompactBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.remindCompactBtnText}>🔔 Nhắc nợ</Text>
                          </TouchableOpacity>
                        </View>
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
                    const creditorName = t.to?.name || "Chủ nợ";
                    return (
                      <View key={i} style={[styles.debtCompactRow, { backgroundColor: "#fff5f5", borderColor: "#fed7d7" }]}>
                        <View style={styles.debtMemberInfo}>
                          <View style={[styles.debtAvatarBox, { backgroundColor: "#fee2e2" }]}>
                            <Text style={[styles.debtAvatarText, { color: "#b91c1c" }]}>{creditorName.charAt(0)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.debtNameText} numberOfLines={1}>{creditorName}</Text>
                            <Text style={styles.debtAmountPayable}>
                              -{fmt(t.amount)}
                            </Text>
                          </View>
                        </View>

                        {/* Action Pill Buttons */}
                        <View style={styles.debtCardActions}>
                          <TouchableOpacity
                            onPress={() => setQrSettleDebt(t)}
                            style={styles.payNowCompactBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.payNowCompactBtnText}>Trả nợ 📲</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
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
                groupId: groupId,
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
    paddingHorizontal: 14,
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
  payNowCompactBtn: {
    backgroundColor: "#f43f5e",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  payNowCompactBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
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
    fontSize: 12,
    color: colors.slate500,
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
  modalBodyWrapper: {
    maxHeight: 520,
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
  splitSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  splitModeToggle: {
    flexDirection: "row",
    backgroundColor: colors.slate100,
    borderRadius: 12,
    padding: 2,
  },
  splitModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  splitModeBtnActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  splitModeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate500,
  },
  splitModeTextActive: {
    color: colors.slate900,
  },
  splitAllNotice: {
    backgroundColor: "#ecfdf5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  splitAllNoticeText: {
    fontSize: 12,
    color: "#065f46",
    fontWeight: "600",
    lineHeight: 18,
  },
  splitCustomList: {
    gap: 8,
    marginBottom: 16,
    maxHeight: 180,
  },
  memberCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  memberCheckRowActive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  memberCheckLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberCheckName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  checkCircleActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkMark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
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
