import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Animated,
} from "react-native";
import { colors } from "../../constants/colors";
import { Payee, SavePayeePayload } from "../../types/payee";
import { payeeService } from "../../services/payeeService";

const { height: SCREEN_H } = Dimensions.get("window");

// ─── Ngân hàng phổ biến (có logo từ VietQR) ───
const POPULAR_BANKS = [
  { name: "MBBank",      bin: "970422", short: "MB" },
  { name: "VCB",         bin: "970436", short: "VCB" },
  { name: "Techcombank", bin: "970407", short: "TCB" },
  { name: "BIDV",        bin: "970418", short: "BIDV" },
  { name: "VietinBank",  bin: "970415", short: "VTB" },
  { name: "TPBank",      bin: "970423", short: "TP" },
  { name: "VPBank",      bin: "970432", short: "VP" },
  { name: "ACB",         bin: "970416", short: "ACB" },
  { name: "MSB",         bin: "970426", short: "MSB" },
  { name: "Agribank",    bin: "970405", short: "ARG" },
  { name: "SHB",         bin: "970443", short: "SHB" },
  { name: "OCB",         bin: "970448", short: "OCB" },
];

// Màu nền avatar theo tên
const AVATAR_COLORS = ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444"];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials    = (name: string) => name.trim().split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();

interface PayeeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPayee: (payee: Payee, saveAsDefault?: boolean) => void;
  onOfflineSettle?: (payeeName: string, note?: string) => Promise<void>;
  preselectedPayeeId?: string;
  defaultAmount?: number;
  recentPayee?: {
    bankBin?: string;
    bankAccount?: string;
    accountName?: string;
    name?: string;
  };
}

export const PayeeSelectorModal: React.FC<PayeeSelectorModalProps> = ({
  visible,
  onClose,
  onSelectPayee,
  onOfflineSettle,
  preselectedPayeeId,
  defaultAmount,
  recentPayee,
}) => {
  // ─── Tabs chính ───
  // 1: "recent" (Gần nhất) | 2: "saved" (Đã giao dịch / Danh bạ) | 3: "new" (Thêm mới)
  const [activeTab, setActiveTab] = useState<"recent" | "saved" | "new">(
    recentPayee && recentPayee.bankAccount ? "recent" : "saved"
  );

  const [suggestions, setSuggestions] = useState<Payee[]>([]);
  const [loading, setLoading]         = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);

  // ─── Form Thêm mới State ───
  const [newName, setNewName]               = useState("");
  const [newAccNo, setNewAccNo]             = useState("");
  const [newBankBin, setNewBankBin]         = useState("970422");
  const [newBankName, setNewBankName]       = useState("MBBank");
  const [newNote, setNewNote]               = useState("");
  const [newSaveDefault, setNewSaveDefault] = useState(true);

  const [isSubmittingQR, setIsSubmittingQR]     = useState(false);
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();

      setActiveTab(recentPayee && recentPayee.bankAccount ? "recent" : "saved");
      setLoading(true);
      payeeService.getSuggestions()
        .then((data) => {
          setSuggestions(data || []);
          if (data && data.length > 0) {
            const found = preselectedPayeeId ? data.find(p => p.id === preselectedPayeeId) : null;
            setSelectedPayee(found || data[0]);
          }
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, recentPayee, preselectedPayeeId]);

  // Reset khi đóng
  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      setNewName("");
      setNewAccNo("");
      setNewNote("");
      setSelectedPayee(null);
    }
  }, [visible]);

  // Filter cho Tab Saved
  const filtered = suggestions.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.bankAccount || "").includes(q) ||
      (p.bankName || "").toLowerCase().includes(q)
    );
  });

  const savedList  = filtered.filter((p) => p.source === "saved");
  const friendList = filtered.filter((p) => p.source === "group_member");

  // ─── 1. XỬ LÝ THANH TOÁN VIETQR ───
  const handlePayWithQR = async () => {
    if (activeTab === "recent") {
      if (recentPayee && recentPayee.bankAccount) {
        onSelectPayee({
          name: recentPayee.name || recentPayee.accountName || "Người nhận gần nhất",
          bankBin: recentPayee.bankBin,
          bankAccount: recentPayee.bankAccount,
          accountName: recentPayee.accountName,
          source: "saved",
        }, true);
        onClose();
      }
    } else if (activeTab === "saved") {
      if (selectedPayee && selectedPayee.bankAccount) {
        onSelectPayee(selectedPayee, false);
        onClose();
      }
    } else if (activeTab === "new") {
      if (!newAccNo.trim()) return;
      setIsSubmittingQR(true);
      const payeeName = newName.trim() || `Tài khoản ${newAccNo.trim()}`;
      const payload: SavePayeePayload = {
        name: payeeName,
        bankAccount: newAccNo.trim(),
        bankBin: newBankBin,
        bankName: newBankName,
        accountName: newName.trim() || undefined,
      };

      try {
        if (newSaveDefault) {
          const saved = await payeeService.savePayee(payload);
          onSelectPayee(saved, true);
        } else {
          onSelectPayee({ ...payload, source: "saved" }, false);
        }
        onClose();
      } catch {
        onSelectPayee({ ...payload, source: "saved" }, newSaveDefault);
        onClose();
      } finally {
        setIsSubmittingQR(false);
      }
    }
  };

  // ─── 2. XỬ LÝ THANH TOÁN TIỀN MẶT / GHI SỔ TRỰC TIẾP ───
  const handlePayWithCash = async () => {
    if (!onOfflineSettle) return;
    setIsSubmittingCash(true);

    try {
      if (activeTab === "recent") {
        const targetName = recentPayee?.accountName || recentPayee?.name || "Người nhận gần nhất";
        await onOfflineSettle(targetName, "Đã đưa tiền mặt");
        onClose();
      } else if (activeTab === "saved") {
        if (!selectedPayee) return;
        const targetName = selectedPayee.accountName || selectedPayee.name;
        await onOfflineSettle(targetName, "Đã đưa tiền mặt");
        onClose();
      } else if (activeTab === "new") {
        const targetName = newName.trim() || (newAccNo.trim() ? `STK ${newAccNo.trim()}` : "Người nhận mới");
        await onOfflineSettle(targetName, newNote.trim() || "Đã thanh toán tiền mặt");
        onClose();
      }
    } finally {
      setIsSubmittingCash(false);
    }
  };

  // ─── Render payee card cho Tab 2 ───
  const renderPayeeCard = (p: Payee, idx: number) => {
    const isSelected = selectedPayee?.bankAccount === p.bankAccount || (selectedPayee?.id && selectedPayee.id === p.id);
    const isFriend   = p.source === "group_member";
    const initials   = getInitials(p.name || "?");
    const avatarBg   = getAvatarColor(p.name || "?");

    return (
      <TouchableOpacity
        key={p.id || `${p.bankAccount}-${idx}`}
        style={[styles.payeeCard, isSelected && styles.payeeCardSelected]}
        onPress={() => setSelectedPayee(p)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {isFriend ? (
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        ) : (
          <View style={styles.bankLogoWrap}>
            {p.bankBin ? (
              <Image
                source={{ uri: `https://api.vietqr.io/img/${POPULAR_BANKS.find(b => b.bin === p.bankBin)?.short || p.bankBin}.png` }}
                style={styles.bankLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: "#DCFCE7" }]}>
                <Text style={styles.avatarInitials}>🏦</Text>
              </View>
            )}
          </View>
        )}

        {/* Info */}
        <View style={styles.payeeInfo}>
          <View style={styles.payeeNameRow}>
            <Text style={styles.payeeName} numberOfLines={1}>{p.name}</Text>
            {p.id && p.id === preselectedPayeeId && (
              <View style={styles.lastUsedBadge}>
                <Text style={styles.lastUsedText}>Lần trước</Text>
              </View>
            )}
          </View>
          <Text style={styles.payeeBank} numberOfLines={1}>
            {p.bankName ? `${p.bankName}` : (isFriend ? "Thành viên nhóm" : "Ngân hàng")}
          </Text>
          {p.bankAccount ? (
            <Text style={styles.payeeAccNo} numberOfLines={1}>
              {p.bankAccount.replace(/(\d{4})(?=\d)/g, "$1 ")}
            </Text>
          ) : null}
        </View>

        {/* Selection check */}
        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
          {isSelected && <View style={styles.radioInnerDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const isSubmitting = isSubmittingQR || isSubmittingCash;

  // Validation QR button
  const isQRDisabled =
    (activeTab === "recent" && (!recentPayee || !recentPayee.bankAccount)) ||
    (activeTab === "saved" && (!selectedPayee || !selectedPayee.bankAccount)) ||
    (activeTab === "new" && !newAccNo.trim()) ||
    isSubmitting;

  // Validation Cash button
  const isCashDisabled =
    (activeTab === "recent" && (!recentPayee || (!recentPayee.name && !recentPayee.accountName))) ||
    (activeTab === "saved" && !selectedPayee) ||
    (activeTab === "new" && !newName.trim() && !newAccNo.trim()) ||
    isSubmitting;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <View style={styles.sheet}>
                {/* ── Drag Handle ── */}
                <View style={styles.dragHandle} />

                {/* ── Header ── */}
                <View style={styles.header}>
                  <View>
                    <Text style={styles.headerTitle}>Xác nhận người nhận tiền</Text>
                    <Text style={styles.headerSub}>
                      {defaultAmount ? `${defaultAmount.toLocaleString("vi-VN")} ₫ • ` : ""}Chọn nguồn thụ hưởng
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* ─── 3 TABS NHỎ PHÍA TRÊN ─── */}
                <View style={styles.tabBar}>
                  <TouchableOpacity
                    style={[styles.tabItem, activeTab === "recent" && styles.tabItemActive]}
                    onPress={() => setActiveTab("recent")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabItemText, activeTab === "recent" && styles.tabItemTextActive]}>
                      ⭐ Gần nhất
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabItem, activeTab === "saved" && styles.tabItemActive]}
                    onPress={() => setActiveTab("saved")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabItemText, activeTab === "saved" && styles.tabItemTextActive]}>
                      👥 Đã giao dịch
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabItem, activeTab === "new" && styles.tabItemActive]}
                    onPress={() => setActiveTab("new")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabItemText, activeTab === "new" && styles.tabItemTextActive]}>
                      ➕ Thêm mới
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ─── BODY CHÍNH CỦA TAB ─── */}
                <ScrollView
                  style={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  {/* ═══════════ TAB 1: GẦN NHẤT ═══════════ */}
                  {activeTab === "recent" && (
                    <View style={{ paddingTop: 6 }}>
                      {recentPayee && (recentPayee.bankAccount || recentPayee.name) ? (
                        <View style={styles.recentFullCard}>
                          <View style={styles.recentBadgeRow}>
                            <View style={styles.recentBadge}>
                              <Text style={styles.recentBadgeText}>⭐ ĐÃ CHUYỂN KHOẢN NÀY LẦN GẦN NHẤT</Text>
                            </View>
                          </View>

                          <View style={styles.recentHeroBox}>
                            <View style={styles.recentHeroLogoWrap}>
                              {recentPayee.bankBin ? (
                                <Image
                                  source={{ uri: `https://api.vietqr.io/img/${POPULAR_BANKS.find(b => b.bin === recentPayee.bankBin)?.short || recentPayee.bankBin}.png` }}
                                  style={styles.recentHeroLogo}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Text style={{ fontSize: 32 }}>🏦</Text>
                              )}
                            </View>
                            <Text style={styles.recentHeroName}>
                              {recentPayee.accountName || recentPayee.name}
                            </Text>
                            <Text style={styles.recentHeroBank}>
                              {POPULAR_BANKS.find(b => b.bin === recentPayee.bankBin)?.name || "Ngân hàng"} • Napas 247
                            </Text>
                            {recentPayee.bankAccount ? (
                              <Text style={styles.recentHeroAccNo}>
                                {recentPayee.bankAccount.replace(/(\d{4})(?=\d)/g, "$1 ")}
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.recentHintBox}>
                            <Text style={styles.recentHintText}>
                              💡 Chọn **Thanh toán VietQR** (để quét mã chuyển) hoặc **Đã đưa tiền mặt** ở bên dưới.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.emptyTabState}>
                          <Text style={{ fontSize: 44, marginBottom: 10 }}>📭</Text>
                          <Text style={styles.emptyTabTitle}>Chưa có người nhận lần trước</Text>
                          <Text style={styles.emptyTabSub}>
                            Khoản ngân sách này chưa từng được thanh toán. Hãy chọn từ danh bạ hoặc thêm người nhận mới.
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                            <TouchableOpacity
                              style={styles.emptyTabBtn}
                              onPress={() => setActiveTab("saved")}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.emptyTabBtnText}>👥 Chọn người quen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.emptyTabBtn, { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" }]}
                              onPress={() => setActiveTab("new")}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.emptyTabBtnText, { color: "#4F46E5" }]}>➕ Thêm người mới</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* ═══════════ TAB 2: ĐÃ GIAO DỊCH / DANH BẠ ═══════════ */}
                  {activeTab === "saved" && (
                    <View style={{ paddingTop: 4 }}>
                      {/* Search bar */}
                      <View style={styles.searchBox}>
                        <Text style={styles.searchIconText}>🔍</Text>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Tìm tên, số tài khoản, ngân hàng..."
                          placeholderTextColor="#94A3B8"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                            <Text style={{ fontSize: 16, color: "#94A3B8" }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {loading ? (
                        <View style={styles.loadingBox}>
                          <ActivityIndicator size="large" color="#6366F1" />
                          <Text style={styles.loadingText}>Đang tải danh bạ...</Text>
                        </View>
                      ) : (
                        <>
                          {/* Danh bạ đã lưu */}
                          {savedList.length > 0 && (
                            <View style={styles.section}>
                              <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionIcon}>🏦</Text>
                                <Text style={styles.sectionTitle}>Danh bạ đã lưu</Text>
                                <Text style={styles.sectionCount}>{savedList.length}</Text>
                              </View>
                              {savedList.map(renderPayeeCard)}
                            </View>
                          )}

                          {/* Bạn bè nhóm */}
                          {friendList.length > 0 && (
                            <View style={styles.section}>
                              <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionIcon}>👥</Text>
                                <Text style={styles.sectionTitle}>Thành viên nhóm</Text>
                                <Text style={styles.sectionCount}>{friendList.length}</Text>
                              </View>
                              {friendList.map(renderPayeeCard)}
                            </View>
                          )}

                          {/* Empty state */}
                          {savedList.length === 0 && friendList.length === 0 && (
                            <View style={styles.emptyTabState}>
                              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
                              <Text style={styles.emptyTabTitle}>
                                {searchQuery ? "Không tìm thấy" : "Chưa có danh bạ"}
                              </Text>
                              <Text style={styles.emptyTabSub}>
                                {searchQuery
                                  ? `Không có kết quả nào cho "${searchQuery}"`
                                  : "Chuyển sang tab 'Thêm mới' để nhập thông tin người nhận."}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}

                  {/* ═══════════ TAB 3: THÊM MỚI ═══════════ */}
                  {activeTab === "new" && (
                    <View style={{ paddingTop: 4 }}>
                      <View style={styles.formCard}>
                        {/* Tên người nhận */}
                        <Text style={styles.drawerLabel}>Tên người nhận (Chủ nhà mới, Bác Hùng...) *</Text>
                        <View style={styles.drawerInputWrap}>
                          <TextInput
                            style={styles.drawerInput}
                            placeholder="VD: Bác Hùng chủ trọ, Cô Lan, Tiệm sửa xe..."
                            placeholderTextColor="#94A3B8"
                            value={newName}
                            onChangeText={setNewName}
                          />
                        </View>

                        {/* Số tài khoản (Tùy chọn) */}
                        <Text style={styles.drawerLabel}>
                          Số tài khoản <Text style={styles.optionalNote}>(Nếu muốn quét VietQR)</Text>
                        </Text>
                        <View style={styles.drawerInputWrap}>
                          <TextInput
                            style={styles.drawerInput}
                            placeholder="VD: 0987654321 (Để trống nếu trả tiền mặt)"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={newAccNo}
                            onChangeText={setNewAccNo}
                          />
                        </View>

                        {/* Ngân hàng (chỉ cần khi có STK) */}
                        {newAccNo.trim().length > 0 && (
                          <>
                            <Text style={styles.drawerLabel}>Ngân hàng thụ hưởng</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                              <View style={{ flexDirection: "row", gap: 6, paddingVertical: 2 }}>
                                {POPULAR_BANKS.map((b) => (
                                  <TouchableOpacity
                                    key={b.bin}
                                    style={[styles.drawerBankChip, newBankBin === b.bin && styles.drawerBankChipSelected]}
                                    onPress={() => { setNewBankBin(b.bin); setNewBankName(b.name); }}
                                    activeOpacity={0.75}
                                  >
                                    <Text style={[styles.drawerBankChipText, newBankBin === b.bin && styles.drawerBankChipTextSelected]}>
                                      {b.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>

                            {/* Checkbox ghi nhớ */}
                            <TouchableOpacity
                              style={styles.drawerCheckRow}
                              onPress={() => setNewSaveDefault(!newSaveDefault)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.drawerCheckbox, newSaveDefault && styles.drawerCheckboxChecked]}>
                                {newSaveDefault && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>✓</Text>}
                              </View>
                              <Text style={styles.drawerCheckText}>
                                ⭐ Đặt làm người nhận mặc định cho các tháng sau
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {/* Ghi chú */}
                        <Text style={styles.drawerLabel}>Ghi chú thêm (Tùy chọn)</Text>
                        <View style={styles.drawerInputWrap}>
                          <TextInput
                            style={styles.drawerInput}
                            placeholder="VD: Tiền phòng tháng 8, Tiền cọc..."
                            placeholderTextColor="#94A3B8"
                            value={newNote}
                            onChangeText={setNewNote}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* ─── BOTTOM STICKY ACTION BAR: CẢ 2 LỰA CHỌN THANH TOÁN ─── */}
                <View style={styles.bottomBar}>
                  {/* Nút 1: VietQR */}
                  <TouchableOpacity
                    style={[
                      styles.bottomPrimaryBtn,
                      isQRDisabled && styles.bottomBtnDisabled,
                    ]}
                    onPress={handlePayWithQR}
                    disabled={isQRDisabled}
                    activeOpacity={0.85}
                  >
                    {isSubmittingQR ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.bottomPrimaryBtnText}>⚡ Tiếp tục thanh toán VietQR ➔</Text>
                    )}
                  </TouchableOpacity>

                  {/* Nút 2: Tiền mặt */}
                  <TouchableOpacity
                    style={[
                      styles.bottomCashBtn,
                      isCashDisabled && styles.bottomCashBtnDisabled,
                    ]}
                    onPress={handlePayWithCash}
                    disabled={isCashDisabled}
                    activeOpacity={0.75}
                  >
                    {isSubmittingCash ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Text style={{ fontSize: 15 }}>💵</Text>
                        <Text style={styles.bottomCashBtnText}>Đã trả tiền mặt (Ghi sổ ngay)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    justifyContent: "flex-end",
  },
  sheetWrapper: {
    height: SCREEN_H * 0.90,
  },
  sheet: {
    flex: 1,
    backgroundColor: "#FAFBFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },

  // Handle
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: "#fff",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tabItemText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748B",
  },
  tabItemTextActive: {
    color: "#4F46E5",
    fontWeight: "900",
  },

  // List Container
  listContainer: { flex: 1, paddingHorizontal: 20 },

  // ── Tab 1: Recent Full Card ──
  recentFullCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    padding: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  recentBadgeRow: {
    alignItems: "center",
    marginBottom: 14,
  },
  recentBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recentBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#7C3AED",
    letterSpacing: 0.5,
  },
  recentHeroBox: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
  },
  recentHeroLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  recentHeroLogo: {
    width: 50,
    height: 50,
  },
  recentHeroName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  recentHeroBank: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366F1",
  },
  recentHeroAccNo: {
    fontSize: 16,
    fontWeight: "900",
    color: "#334155",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
  recentHintBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recentHintText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    fontWeight: "500",
    textAlign: "center",
  },

  // ── Tab 2: Saved / Contacts ──
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    height: 46,
    gap: 8,
  },
  searchIconText: { fontSize: 15 },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    fontWeight: "500",
    height: "100%",
  },
  section: { marginBottom: 14 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sectionIcon: { fontSize: 13 },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  payeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  payeeCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#F5F3FF",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
  },
  bankLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bankLogo: {
    width: 32,
    height: 32,
  },
  payeeInfo: { flex: 1 },
  payeeNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  payeeName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  lastUsedBadge: {
    backgroundColor: "#EDE9FE",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lastUsedText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#7C3AED",
  },
  payeeBank: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  payeeAccNo: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6366F1",
  },

  // ── Tab 3: New Payee ──
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    padding: 14,
  },
  optionalNote: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "500",
    textTransform: "none",
  },
  drawerLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
    marginTop: 6,
    textTransform: "uppercase",
  },
  drawerInputWrap: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 4,
  },
  drawerInput: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  drawerBankChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  drawerBankChipSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  drawerBankChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  drawerBankChipTextSelected: {
    color: "#4F46E5",
    fontWeight: "900",
  },
  drawerCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 10,
  },
  drawerCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCheckboxChecked: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  drawerCheckText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },

  // ── Bottom Sticky Bar ──
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomPrimaryBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },
  bottomCashBtn: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  bottomCashBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
  },
  bottomCashBtnDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    opacity: 0.6,
  },
  bottomBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },

  // Empty / Loading
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  emptyTabState: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16 },
  emptyTabTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A", marginBottom: 4 },
  emptyTabSub: { fontSize: 12.5, color: "#64748B", textAlign: "center", lineHeight: 18 },
  emptyTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTabBtnText: { fontSize: 12, fontWeight: "800", color: "#334155" },
});
