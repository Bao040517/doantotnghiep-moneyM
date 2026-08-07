import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Search } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { groupService } from "../../services/groupService";

interface CreateGroupBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

interface MemberCandidate {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export const CreateGroupBottomSheet: React.FC<CreateGroupBottomSheetProps> = ({
  visible,
  onClose,
  onGroupCreated,
}) => {
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Sub-tab selection state: "past" | "phone" | "qr"
  const [memberTab, setMemberTab] = useState<"past" | "phone" | "qr">("past");
  const [qrFullscreenVisible, setQrFullscreenVisible] = useState(false);

  // Past members & search state
  const [pastMembers, setPastMembers] = useState<MemberCandidate[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<MemberCandidate[]>([]);

  // Search by Phone state
  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MemberCandidate | null>(null);

  useEffect(() => {
    if (visible) {
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
      setSearchPhone("");
      setSearchResult(null);
      setMemberTab("past");
      fetchPastMembers();
    }
  }, [visible]);

  const fetchPastMembers = async () => {
    setLoadingPast(true);
    try {
      const data = await groupService.getPastMembers().catch(() => []);
      setPastMembers(data || []);
    } catch (e) {
      console.log("Error loading past members:", e);
    } finally {
      setLoadingPast(false);
    }
  };

  const handleSearchByPhone = async () => {
    const cleanPhone = searchPhone.trim();
    if (!cleanPhone) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await groupService.searchUserByPhone(cleanPhone);
      if (res && res.id) {
        setSearchResult(res);
      } else {
        Alert.alert("Thông báo", "Không tìm thấy người dùng với số điện thoại này");
      }
    } catch (e: any) {
      Alert.alert("Thông báo", e.response?.data?.message || "Không tìm thấy người dùng với SĐT này");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelectMember = (candidate: MemberCandidate) => {
    const exists = selectedMembers.some((m) => m.id === candidate.id);
    if (exists) {
      setSelectedMembers((prev) => prev.filter((m) => m.id !== candidate.id));
    } else {
      setSelectedMembers((prev) => [...prev, candidate]);
    }
  };

  const handleCreateGroup = async () => {
    const cleanName = groupName.trim();
    if (!cleanName) {
      Alert.alert("Cảnh báo", "Vui lòng nhập tên nhóm chi tiêu");
      return;
    }
    setIsCreating(true);
    try {
      // 1. Create Group
      const newGroup = await groupService.createGroup({
        name: cleanName,
        description: groupDesc.trim(),
      });

      // 2. Add selected members to the group
      if (newGroup && newGroup.id && selectedMembers.length > 0) {
        await Promise.all(
          selectedMembers.map((m) =>
            groupService.addMemberToGroup(newGroup.id, m.id).catch((err) => {
              console.log(`Failed to add member ${m.name}:`, err);
            })
          )
        );
      }

      Alert.alert(
        "Thành công 🎉",
        `Đã tạo nhóm "${cleanName}"${
          selectedMembers.length > 0 ? ` kèm ${selectedMembers.length} thành viên` : ""
        }!`
      );
      onClose();
      onGroupCreated();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể tạo nhóm chi tiêu");
    } finally {
      setIsCreating(false);
    }
  };

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent("ShareMoneyGroupInvite")}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Tạo Nhóm Chi Tiêu Mới 👥">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Basic Info Inputs */}
        <Input
          label="Tên nhóm (*)"
          placeholder="VD: Nhóm Du Lịch Xô Xát 2026, Hội Ăn Nhậu"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Input
          label="Mô tả nhóm (Tùy chọn)"
          placeholder="VD: Quản lý chia chi phí du lịch Đà Lạt"
          value={groupDesc}
          onChangeText={setGroupDesc}
        />

        {/* ─── COMMERCIAL MEMBER SELECTION CONTAINER ─── */}
        <View style={styles.fixedMemberCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.memberContainerHeader}>👥 Thêm Thành Viên Nhóm</Text>
            {selectedMembers.length > 0 && (
              <View style={styles.selectedCountBadge}>
                <Text style={styles.selectedCountBadgeText}>
                  Đã chọn {selectedMembers.length}
                </Text>
              </View>
            )}
          </View>

          {/* Commercial Segmented Tab Control */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              onPress={() => setMemberTab("past")}
              style={[styles.subTabBtn, memberTab === "past" && styles.subTabBtnActive]}
            >
              <Text style={[styles.subTabText, memberTab === "past" && styles.subTabTextActive]}>
                👥 Bạn bè
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMemberTab("phone")}
              style={[styles.subTabBtn, memberTab === "phone" && styles.subTabBtnActive]}
            >
              <Text style={[styles.subTabText, memberTab === "phone" && styles.subTabTextActive]}>
                📱 Tìm SĐT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMemberTab("qr")}
              style={[styles.subTabBtn, memberTab === "qr" && styles.subTabBtnActive]}
            >
              <Text style={[styles.subTabText, memberTab === "qr" && styles.subTabTextActive]}>
                📲 Quét QR
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: Người quen (DANH SÁCH DỌC VERTICAL LIST) */}
          {memberTab === "past" && (
            <View style={styles.tabFixedBody}>
              {loadingPast ? (
                <ActivityIndicator size="small" color={colors.indigo600} />
              ) : pastMembers.length === 0 ? (
                <Text style={styles.emptySubText}>Chưa có lịch sử nhóm cũ</Text>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.pastMemberVerticalList}
                  nestedScrollEnabled={true}
                >
                  {pastMembers.map((m) => {
                    const isSelected = selectedMembers.some((sm) => sm.id === m.id);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => toggleSelectMember(m)}
                        style={[
                          styles.pastMemberVerticalRow,
                          isSelected && styles.pastMemberVerticalRowSelected,
                        ]}
                      >
                        <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                          <Text style={[styles.avatarLetter, isSelected && styles.avatarLetterSelected]}>
                            {m.name.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.pastMemberName,
                              isSelected && styles.pastMemberNameSelected,
                            ]}
                          >
                            {m.name}
                          </Text>
                          {m.phone && <Text style={styles.pastMemberPhone}>📞 {m.phone}</Text>}
                        </View>

                        <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleSelected]}>
                          {isSelected && <Text style={styles.checkboxCheckText}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* TAB 2: Số Điện Thoại */}
          {memberTab === "phone" && (
            <View style={styles.tabFixedBody}>
              <View style={styles.integratedSearchBox}>
                <TextInput
                  placeholder="Nhập SĐT (VD: 0912345678)"
                  value={searchPhone}
                  onChangeText={setSearchPhone}
                  keyboardType="phone-pad"
                  style={styles.integratedSearchInput}
                  placeholderTextColor={colors.slate400}
                />
                <TouchableOpacity
                  onPress={handleSearchByPhone}
                  disabled={searching}
                  style={styles.integratedSearchBtn}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Search size={14} color={colors.white} />
                      <Text style={styles.integratedSearchBtnText}>Tìm</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {searchResult ? (
                <View style={styles.searchResultCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchResultName}>{searchResult.name}</Text>
                    <Text style={styles.searchResultPhone}>📞 {searchResult.phone}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => toggleSelectMember(searchResult)}
                    style={[
                      styles.addBtn,
                      selectedMembers.some((m) => m.id === searchResult.id) && styles.addBtnAdded,
                    ]}
                  >
                    <Text style={styles.addBtnText}>
                      {selectedMembers.some((m) => m.id === searchResult.id) ? "✓ Đã chọn" : "+ Thêm"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.searchHintText}>
                  Nhập chính xác SĐT tài khoản ShareMoney để kết nối nhanh
                </Text>
              )}
            </View>
          )}

          {/* TAB 3: Mã QR */}
          {memberTab === "qr" && (
            <View style={[styles.tabFixedBody, { alignItems: "center" }]}>
              <TouchableOpacity
                onPress={() => setQrFullscreenVisible(true)}
                activeOpacity={0.8}
                style={styles.qrFrame}
              >
                <Image source={{ uri: qrApiUrl }} style={styles.qrImage} resizeMode="contain" />
              </TouchableOpacity>

              <Text style={styles.qrTitle}>Quét Mã QR Cá Nhân</Text>
              <Text style={styles.qrSub}>Đưa mã QR thành viên vào camera để tự động thêm</Text>
            </View>
          )}
        </View>

        {/* Modal Action Buttons */}
        <View style={styles.modalBtnRow}>
          <Button title="Hủy" variant="secondary" onPress={onClose} style={styles.flexBtn} />
          <Button
            title="Tạo nhóm"
            variant="primary"
            onPress={handleCreateGroup}
            loading={isCreating}
            style={styles.flexBtn}
          />
        </View>
      </ScrollView>

      {/* ─── FULL SCREEN QR LIGHTBOX MODAL ─── */}
      <Modal
        transparent
        visible={qrFullscreenVisible}
        animationType="fade"
        onRequestClose={() => setQrFullscreenVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setQrFullscreenVisible(false)}
          style={styles.fullscreenOverlay}
        >
          <View style={styles.fullscreenCard}>
            <TouchableOpacity
              onPress={() => setQrFullscreenVisible(false)}
              style={styles.fullscreenCloseBtn}
            >
              <Text style={styles.fullscreenCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.fullscreenTitle}>Mã QR Mời Nhóm 📲</Text>
            <Text style={styles.fullscreenSub}>Đưa mã này cho bạn bè quét để tham gia nhóm ngay lập tức</Text>

            <View style={styles.fullscreenQrFrame}>
              <Image
                source={{ uri: qrApiUrl }}
                style={styles.fullscreenQrImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.fullscreenDismissHint}>Chạm bất kỳ đâu để đóng</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    maxHeight: 540,
  },
  sectionBox: {
    marginTop: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate800,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.indigo50,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.indigo700,
  },
  chipRemoveX: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.indigo600,
  },

  /* ─── FIXED HEIGHT CONTAINER (KHUNG VUÔNG CỐ ĐỊNH 330PX) ─── */
  fixedMemberCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 10,
    marginBottom: 8,
    height: 330, // EXPANDED FIXED HEIGHT FOR ROOMIER DISPLAY!
    justifyContent: "flex-start",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  memberContainerHeader: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate900,
  },
  selectedCountBadge: {
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald600,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedCountBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.emerald700,
  },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 3,
    marginBottom: 8,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 11,
  },
  subTabBtnActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
  },
  subTabTextActive: {
    color: colors.indigo600,
    fontWeight: "900",
  },

  /* TAB FIXED BODY INSIDE FIXED CARD */
  tabFixedBody: {
    flex: 1,
    justifyContent: "flex-start",
  },
  emptySubText: {
    fontSize: 12,
    color: colors.slate400,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },

  /* Tab 1: Vertical List for Past Members */
  pastMemberVerticalList: {
    gap: 6,
    paddingVertical: 2,
  },
  pastMemberVerticalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 10,
  },
  pastMemberVerticalRowSelected: {
    backgroundColor: colors.emerald50,
    borderColor: colors.emerald600,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircleSelected: {
    backgroundColor: colors.emerald600,
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate700,
  },
  avatarLetterSelected: {
    color: colors.white,
  },
  pastMemberName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  pastMemberNameSelected: {
    color: colors.emerald700,
    fontWeight: "800",
  },
  pastMemberPhone: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 1,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircleSelected: {
    backgroundColor: colors.emerald600,
    borderColor: colors.emerald600,
  },
  checkboxCheckText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },

  /* Tab 2: SĐT search */
  integratedSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 4,
    height: 48,
    marginBottom: 8,
  },
  integratedSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.slate900,
    height: "100%",
  },
  integratedSearchBtn: {
    backgroundColor: colors.indigo600,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  integratedSearchBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 14,
    padding: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
  },
  searchResultPhone: {
    fontSize: 11,
    color: colors.slate500,
  },
  searchHintText: {
    fontSize: 11,
    color: colors.slate400,
    textAlign: "center",
    marginTop: 12,
  },
  addBtn: {
    backgroundColor: colors.indigo600,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnAdded: {
    backgroundColor: colors.emerald600,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },

  /* Tab 3: Mã QR */
  qrFrame: {
    width: 135,
    height: 135,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginBottom: 8,
    marginTop: 4,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
  },
  qrSub: {
    fontSize: 10,
    color: colors.slate500,
    textAlign: "center",
    marginTop: 1,
  },
  zoomHintText: {
    fontSize: 11,
    color: colors.indigo600,
    fontWeight: "700",
    marginBottom: 6,
  },

  /* Full Screen QR Lightbox Styles */
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fullscreenCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  fullscreenCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate600,
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  fullscreenSub: {
    fontSize: 12,
    color: colors.slate500,
    textAlign: "center",
    marginBottom: 16,
  },
  fullscreenQrFrame: {
    width: 250,
    height: 250,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  fullscreenQrImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenDismissHint: {
    fontSize: 11,
    color: colors.slate400,
    fontStyle: "italic",
  },

  /* Bottom Actions */
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  flexBtn: {
    flex: 1,
  },
});
