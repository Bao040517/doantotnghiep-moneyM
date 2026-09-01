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
  Alert,
} from "react-native";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS, BankInfo } from "../../constants/banks";
import { Payee, SavePayeePayload } from "../../types/payee";
import { payeeService } from "../../services/payeeService";
import { verifyBankAccount } from "../../utils/bankAccountVerification";
import { VietnameseTextInput } from "../ui/VietnameseTextInput";
import { Building2 } from "lucide-react-native";

const { height: SCREEN_H } = Dimensions.get("window");

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
  const [newBankBin, setNewBankBin]         = useState("");
  const [newBankName, setNewBankName]       = useState("");
  const [newNote, setNewNote]               = useState("");
  const [newSaveDefault, setNewSaveDefault] = useState(true);

  // ─── Bank Picker Modal & Auto Lookup States ───
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [searchBank, setSearchBank]               = useState("");
  const [lookupLoading, setLookupLoading]         = useState(false);
  const [lookupVerified, setLookupVerified]       = useState(false);
  const [lookupMessage, setLookupMessage]         = useState<string | null>(null);
  const lookupRequestRef = useRef(0);

  const [isSubmittingQR, setIsSubmittingQR]     = useState(false);
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  const selectedNewBank = newBankBin ? VIETQR_BANKS.find((b) => b.bin === newBankBin) : null;

  const filteredBanks = VIETQR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      b.shortName.toLowerCase().includes(searchBank.toLowerCase())
  );

  // Auto lookup account owner name when bank and account number change
  const handleLookupAccount = async (targetBin?: string, targetAccNo?: string) => {
    const currentBin = targetBin || newBankBin;
    const currentAcc = (targetAccNo !== undefined ? targetAccNo : newAccNo).trim();
    if (!currentBin || currentAcc.length < 6) return;

    const requestId = ++lookupRequestRef.current;
    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const verified = await verifyBankAccount(currentBin, currentAcc);
      if (requestId !== lookupRequestRef.current) return;
      setNewName(verified.accountName || newName);
      setLookupVerified(true);
      {
        const bankObj = VIETQR_BANKS.find((b) => b.bin === currentBin);
        setLookupMessage(`✓ Đã xác thực chính chủ từ ${bankObj?.shortName || "Ngân hàng"}`);
      }
    } catch (error: any) {
      if (requestId !== lookupRequestRef.current) return;
      setLookupVerified(false);
      setLookupMessage(error?.message || "STK không tồn tại hoặc chưa xác thực được chủ tài khoản");
    } finally {
      if (requestId === lookupRequestRef.current) setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (visible && activeTab === "new" && newBankBin && newAccNo.trim().length >= 6) {
      const timer = setTimeout(() => {
        handleLookupAccount(newBankBin, newAccNo.trim());
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setLookupVerified(false);
      setLookupMessage(null);
    }
  }, [newBankBin, newAccNo, visible, activeTab]);

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
      setNewBankBin("");
      setNewBankName("");
      setNewNote("");
      setSelectedPayee(null);
      setBankPickerVisible(false);
      setSearchBank("");
      setLookupVerified(false);
      setLookupMessage(null);
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
        try {
          const verified = await verifyBankAccount(recentPayee.bankBin, recentPayee.bankAccount);
          onSelectPayee({
            name: recentPayee.name || verified.accountName || "Người nhận gần nhất",
            bankBin: verified.bin,
            bankAccount: verified.accountNumber,
            accountName: verified.accountName,
            source: "saved",
          }, true);
          onClose();
        } catch (error: any) {
          Alert.alert("Không thể tạo QR", error?.message || "STK chưa được ngân hàng xác thực.");
        }
      }
    } else if (activeTab === "saved") {
      if (selectedPayee && selectedPayee.bankAccount) {
        try {
          const verified = await verifyBankAccount(selectedPayee.bankBin, selectedPayee.bankAccount);
          onSelectPayee({
            ...selectedPayee,
            bankBin: verified.bin,
            bankAccount: verified.accountNumber,
            accountName: verified.accountName,
          }, false);
          onClose();
        } catch (error: any) {
          Alert.alert("Không thể tạo QR", error?.message || "STK chưa được ngân hàng xác thực.");
        }
      }
    } else if (activeTab === "new") {
      if (!newBankBin) {
        Alert.alert("Chưa chọn ngân hàng", "Vui lòng chọn ngân hàng thụ hưởng trước khi tiếp tục.");
        return;
      }
      if (!newAccNo.trim()) {
        Alert.alert("Chưa nhập số tài khoản", "Vui lòng nhập số tài khoản người nhận.");
        return;
      }
      let verifiedAccount;
      try {
        verifiedAccount = await verifyBankAccount(newBankBin, newAccNo);
      } catch (error: any) {
        setLookupVerified(false);
        Alert.alert("Không thể tạo QR", error?.message || "STK chưa được ngân hàng xác thực.");
        return;
      }
      setIsSubmittingQR(true);
      const bankObj = VIETQR_BANKS.find((b) => b.bin === newBankBin);
      const bName = bankObj?.shortName || newBankName || "Ngân hàng";
      const payeeName = newName.trim() || verifiedAccount.accountName || "Người nhận";
      const payload: SavePayeePayload = {
        name: payeeName,
        bankAccount: verifiedAccount.accountNumber,
        bankBin: verifiedAccount.bin,
        bankName: bName,
        accountName: verifiedAccount.accountName || payeeName,
      };

      try {
        // Tự động lưu vào danh bạ đã lưu để tái sử dụng
        const saved = await payeeService.savePayee(payload);
        onSelectPayee(saved, newSaveDefault);
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
        if (newAccNo.trim().length >= 6 && newSaveDefault) {
          try {
            const bankObj = VIETQR_BANKS.find((b) => b.bin === newBankBin);
            await payeeService.savePayee({
              name: targetName,
              bankAccount: newAccNo.trim(),
              bankBin: newBankBin,
              bankName: bankObj?.shortName || newBankName || "Ngân hàng",
              accountName: newName.trim() || undefined,
            });
          } catch {
            // Không block nếu lưu danh bạ lỗi
          }
        }
        await onOfflineSettle(targetName, newNote.trim() || "Đã thanh toán tiền mặt");
        onClose();
      }
    } catch {
      // Giữ nguyên modal nếu có lỗi để người dùng kiểm tra thông báo
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

    const bankObj = VIETQR_BANKS.find((b) => b.bin === p.bankBin);
    const logoUri = bankObj?.logo || (p.bankBin ? `https://api.vietqr.io/img/${p.bankBin}.png` : undefined);

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
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
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
            {p.bankName || bankObj?.shortName || (isFriend ? "Thành viên nhóm" : "Ngân hàng")}
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
    (activeTab === "new" && (!newBankBin || !newAccNo.trim() || !lookupVerified || lookupLoading)) ||
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
                                  source={{ uri: VIETQR_BANKS.find(b => b.bin === recentPayee.bankBin)?.logo || `https://api.vietqr.io/img/${recentPayee.bankBin}.png` }}
                                  style={styles.recentHeroLogo}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Building2 size={28} color="#64748B" strokeWidth={1.5} />
                              )}
                            </View>
                            <Text style={styles.recentHeroName}>
                              {recentPayee.accountName || recentPayee.name}
                            </Text>
                            <Text style={styles.recentHeroBank}>
                              {VIETQR_BANKS.find(b => b.bin === recentPayee.bankBin)?.name || "Ngân hàng"} • Napas 247
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
                        <VietnameseTextInput
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
                        {/* Info Tip */}
                        <View style={styles.formTipBox}>
                          <Text style={styles.formTipText}>
                            💡 Nhập thông tin để tự động tạo mã QR VietQR và lưu vào danh bạ cho các tháng sau.
                          </Text>
                        </View>

                        {/* 1. CHỌN NGÂN HÀNG THỤ HƯỞNG */}
                        <Text style={styles.drawerLabel}>Ngân hàng thụ hưởng *</Text>
                        <TouchableOpacity
                          style={[styles.bankSelectCardBtn, !selectedNewBank && { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" }]}
                          onPress={() => setBankPickerVisible(true)}
                          activeOpacity={0.8}
                        >
                          {selectedNewBank ? (
                            <>
                              <View style={styles.bankSelectCardLeft}>
                                <View style={styles.bankSelectCardLogoBox}>
                                  <Image
                                    source={{ uri: selectedNewBank.logo }}
                                    style={styles.bankSelectCardLogo}
                                    resizeMode="contain"
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.bankSelectCardShortName}>
                                    {selectedNewBank.shortName}
                                  </Text>
                                  <Text style={styles.bankSelectCardFullName} numberOfLines={1}>
                                    {selectedNewBank.name}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.bankSelectCardChangeBadge}>
                                <Text style={styles.bankSelectCardChangeText}>Thay đổi ▼</Text>
                              </View>
                            </>
                          ) : (
                            <>
                              <View style={styles.bankSelectCardLeft}>
                                <View style={[styles.bankSelectCardLogoBox, { backgroundColor: "#F1F5F9" }]}>
                                  <Text style={{ fontSize: 20 }}>🏦</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.bankSelectCardShortName, { color: "#64748B", fontWeight: "700" }]}>
                                    Chọn ngân hàng
                                  </Text>
                                  <Text style={[styles.bankSelectCardFullName, { color: "#94A3B8" }]} numberOfLines={1}>
                                    Chạm để chọn ngân hàng thụ hưởng
                                  </Text>
                                </View>
                              </View>
                              <View style={[styles.bankSelectCardChangeBadge, { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" }]}>
                                <Text style={[styles.bankSelectCardChangeText, { color: "#4F46E5", fontWeight: "800" }]}>Chọn ▼</Text>
                              </View>
                            </>
                          )}
                        </TouchableOpacity>

                        {/* 2. SỐ TÀI KHOẢN */}
                        <Text style={styles.drawerLabel}>
                          Số tài khoản <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <View style={styles.drawerInputWrap}>
                          <TextInput
                            style={styles.drawerInput}
                            placeholder="VD: 0987654321, 1012345678..."
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={newAccNo}
                            onChangeText={(val) => {
                              setNewAccNo(val);
                              setLookupVerified(false);
                            }}
                          />
                          {newAccNo.length > 0 && (
                            <TouchableOpacity
                              onPress={() => {
                                setNewAccNo("");
                                setLookupVerified(false);
                                setLookupMessage(null);
                              }}
                              style={styles.clearInputBtn}
                            >
                              <Text style={styles.clearInputText}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Lookup Status Indicator */}
                        {lookupLoading && (
                          <View style={styles.lookupStatusRow}>
                            <ActivityIndicator size="small" color="#6366F1" />
                            <Text style={styles.lookupLoadingText}>Đang tra cứu tên từ ngân hàng...</Text>
                          </View>
                        )}

                        {lookupVerified && (
                          <View style={styles.lookupVerifiedRow}>
                            <Text style={styles.lookupVerifiedText}>
                              ✓ Đã xác thực: {newName} ({selectedNewBank?.shortName || "Ngân hàng"})
                            </Text>
                          </View>
                        )}

                        {/* 3. TÊN NGƯỜI NHẬN / CHỦ TÀI KHOẢN */}
                        <Text style={styles.drawerLabel}>
                          Tên người nhận / Tên gợi nhớ <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <View style={styles.drawerInputWrap}>
                          <VietnameseTextInput
                            style={styles.drawerInput}
                            placeholder="VD: Bác Hùng chủ trọ, EVN HCMC, Cô Lan..."
                            placeholderTextColor="#94A3B8"
                            value={newName}
                            onChangeText={setNewName}
                          />
                        </View>

                        {/* 4. GHI CHÚ THÊM */}
                        <Text style={styles.drawerLabel}>Ghi chú thêm (Tùy chọn)</Text>
                        <View style={styles.drawerInputWrap}>
                          <VietnameseTextInput
                            style={styles.drawerInput}
                            placeholder="VD: Tiền phòng tháng 8, Tiền cọc..."
                            placeholderTextColor="#94A3B8"
                            value={newNote}
                            onChangeText={setNewNote}
                          />
                        </View>

                        {/* 5. CHECKBOX GHI NHỚ VÀO DANH BẠ */}
                        <TouchableOpacity
                          style={styles.drawerCheckRow}
                          onPress={() => setNewSaveDefault(!newSaveDefault)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.drawerCheckbox, newSaveDefault && styles.drawerCheckboxChecked]}>
                            {newSaveDefault && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>✓</Text>}
                          </View>
                          <Text style={styles.drawerCheckText}>
                            ⭐ Lưu vào danh bạ đã lưu để tạo QR và dùng lại cho các tháng sau
                          </Text>
                        </TouchableOpacity>
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

      {/* ─── BANK PICKER SUB-MODAL ─── */}
      <Modal
        visible={bankPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBankPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setBankPickerVisible(false)}
        >
          <TouchableOpacity style={styles.pickerContent} activeOpacity={1}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn Ngân Hàng Thụ Hưởng 🏦</Text>
              <TouchableOpacity onPress={() => setBankPickerVisible(false)} style={styles.pickerCloseBtn}>
                <Text style={styles.pickerCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBox}>
              <Text style={{ fontSize: 15 }}>🔍</Text>
              <TextInput
                placeholder="Tìm tên hoặc mã ngân hàng (MB, VCB, BIDV...)"
                placeholderTextColor="#94A3B8"
                value={searchBank}
                onChangeText={setSearchBank}
                style={styles.pickerSearchInput}
                autoFocus={false}
              />
              {searchBank.length > 0 && (
                <TouchableOpacity onPress={() => setSearchBank("")}>
                  <Text style={{ color: "#94A3B8", fontSize: 15 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {filteredBanks.map((bank) => {
                const isSelected = bank.bin === newBankBin;
                return (
                  <TouchableOpacity
                    key={bank.bin}
                    style={[styles.bankPickerItem, isSelected && styles.bankPickerItemSelected]}
                    onPress={() => {
                      setNewBankBin(bank.bin);
                      setNewBankName(bank.shortName);
                      setBankPickerVisible(false);
                      setSearchBank("");
                      if (newAccNo.trim().length >= 6) {
                        handleLookupAccount(bank.bin, newAccNo.trim());
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bankPickerItemLogoWrap}>
                      <Image source={{ uri: bank.logo }} style={styles.bankPickerItemLogo} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.bankPickerItemShortName, isSelected && { color: "#4F46E5", fontWeight: "900" }]}>
                        {bank.shortName}
                      </Text>
                      <Text style={styles.bankPickerItemFullName} numberOfLines={1}>
                        {bank.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.bankPickerCheckmark}>
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  formTipBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  formTipText: {
    fontSize: 12,
    color: "#4338CA",
    fontWeight: "600",
    lineHeight: 17,
  },
  requiredStar: {
    color: "#EF4444",
    fontWeight: "900",
  },
  drawerLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
    textTransform: "uppercase",
  },
  bankSelectCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    padding: 10,
    marginBottom: 8,
  },
  bankSelectCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  bankSelectCardLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  bankSelectCardLogo: {
    width: "100%",
    height: "100%",
  },
  bankSelectCardShortName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  bankSelectCardFullName: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 1,
  },
  bankSelectCardChangeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  bankSelectCardChangeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  drawerInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 4,
  },
  drawerInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  clearInputBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearInputText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "700",
  },
  lookupStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  lookupLoadingText: {
    fontSize: 11.5,
    color: "#6366F1",
    fontWeight: "600",
  },
  lookupVerifiedRow: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  lookupVerifiedText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#059669",
  },
  drawerCheckRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
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
    marginTop: 1,
  },
  drawerCheckboxChecked: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  drawerCheckText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
    lineHeight: 17,
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

  // ── Bank Picker Sub-Modal Styles ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  pickerContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  pickerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCloseBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  pickerSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  bankPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  bankPickerItemSelected: {
    backgroundColor: "#EEF2FF",
  },
  bankPickerItemLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  bankPickerItemLogo: {
    width: "100%",
    height: "100%",
  },
  bankPickerItemShortName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  bankPickerItemFullName: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  bankPickerCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
});
