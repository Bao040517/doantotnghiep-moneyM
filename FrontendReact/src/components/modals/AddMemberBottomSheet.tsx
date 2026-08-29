import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toast } from "../ui/Toast";
import { Search, Camera, QrCode } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { groupService } from "../../services/groupService";
import { ScanReceiptModal } from "./ScanReceiptModal";

interface AddMemberBottomSheetProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onMemberAdded: () => void;
}

interface MemberCandidate {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export const AddMemberBottomSheet: React.FC<AddMemberBottomSheetProps> = ({
  visible,
  groupId,
  onClose,
  onMemberAdded,
}) => {
  const [memberTab, setMemberTab] = useState<"past" | "phone" | "qr">("past");
  const [pastMembers, setPastMembers] = useState<MemberCandidate[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [qrFullscreenVisible, setQrFullscreenVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Search by phone state
  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MemberCandidate | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    if (visible) {
      setMemberTab("past");
      setSearchPhone("");
      setSearchResult(null);
      fetchPastMembers();
    }
  }, [visible]);

  const fetchPastMembers = async () => {
    setLoadingPast(true);
    try {
      const data = await groupService.getPastMembers().catch(() => []);
      setPastMembers(data || []);
    } catch (e) {
      setPastMembers([]);
    } finally {
      setLoadingPast(false);
    }
  };

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handleAddMemberById = async (userId: string, userName: string) => {
    try {
      await groupService.addMemberToGroup(groupId, userId);
      showToast(`Đã thêm ${userName} vào nhóm thành công! 🎉`, "success");
      setTimeout(() => {
        onClose();
        onMemberAdded();
      }, 1000);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể thêm thành viên này vào nhóm.", "error");
    }
  };

  const handleSearchByPhone = async () => {
    const cleanPhone = searchPhone.trim();
    if (!cleanPhone) {
      showToast("Vui lòng nhập số điện thoại cần tìm.", "error");
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const userObj = await groupService.searchUserByPhone(cleanPhone);
      if (userObj && userObj.id) {
        setSearchResult(userObj);
      } else {
        showToast("Không tìm thấy tài khoản với SĐT này.", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không tìm thấy tài khoản với SĐT này.", "error");
    } finally {
      setSearching(false);
    }
  };

  const inviteUrl = `https://sharemoney.app/groups/${groupId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Thêm Thành Viên Mới 👤">
      <View style={styles.container}>
        {/* ─── COMMERCIAL MEMBER SELECTION CONTAINER ─── */}
        <View style={styles.fixedMemberCard}>
          <Text style={styles.memberContainerHeader}>👥 Thêm Thành Viên Nhóm</Text>

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

          {/* TAB 1: Người quen (Vertical Scroll List) */}
          {memberTab === "past" && (
            <View style={styles.tabFixedBody}>
              {loadingPast ? (
                <ActivityIndicator size="small" color={colors.indigo600} />
              ) : pastMembers.length === 0 ? (
                <Text style={styles.emptySubText}>Chưa có lịch sử bạn bè từng chung nhóm</Text>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.pastMemberVerticalList}
                  nestedScrollEnabled={true}
                >
                  {pastMembers.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => handleAddMemberById(m.id, m.name)}
                      style={styles.pastMemberVerticalRow}
                    >
                      <View style={styles.avatarCircle}>
                        {m.avatarUrl ? (
                          <Image source={{ uri: m.avatarUrl }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarLetter}>{m.name.charAt(0)}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pastMemberName}>{m.name}</Text>
                        {m.phone && <Text style={styles.pastMemberPhone}>📞 {m.phone}</Text>}
                      </View>
                      <View style={styles.addMemberBtnPill}>
                        <Text style={styles.addMemberBtnText}>+ Thêm</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* TAB 2: Số điện thoại */}
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
                    onPress={() => handleAddMemberById(searchResult.id, searchResult.name)}
                    style={styles.addBtn}
                  >
                    <Text style={styles.addBtnText}>+ Thêm vào nhóm</Text>
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
                onPress={() => setScannerVisible(true)}
                style={styles.scanFriendBtn}
                activeOpacity={0.8}
              >
                <Camera size={14} color={colors.white} />
                <Text style={styles.scanFriendBtnText}>📷 Mở Camera Quét QR Bạn Bè</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQrFullscreenVisible(true)}
                activeOpacity={0.8}
                style={styles.qrFrame}
              >
                <Image source={{ uri: qrApiUrl }} style={styles.qrImage} resizeMode="contain" />
              </TouchableOpacity>

              <Text style={styles.qrTitle}>Mã Nhóm: #{groupId?.slice(0, 8)}</Text>
              <TouchableOpacity
                onPress={() => showToast("Đã sao chép link mời nhóm thành công! ✨", "success")}
                style={styles.copyLinkBtn}
              >
                <Text style={styles.copyLinkBtnText}>📋 Sao chép Link Mời Nhóm</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

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

            <Text style={styles.fullscreenGroupId}>Mã Nhóm: #{groupId?.slice(0, 8)}</Text>
            <Text style={styles.fullscreenDismissHint}>Chạm bất kỳ đâu để đóng</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Live Camera Scanner to add friend by QR */}
      <ScanReceiptModal
        visible={scannerVisible}
        targetGroupId={groupId}
        onClose={() => setScannerVisible(false)}
        onMemberAdded={(u) => {
          setScannerVisible(false);
          showToast(`Đã thêm ${u?.name || "thành viên"} vào nhóm! 🎉`, "success");
          setTimeout(() => {
            onClose();
            onMemberAdded();
          }, 800);
        }}
      />

      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 16,
  },

  /* ─── FIXED HEIGHT CONTAINER (KHUNG VUÔNG CỐ ĐỊNH 330PX) ─── */
  fixedMemberCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
    height: 330, // EXPANDED FIXED HEIGHT FOR ROOMIER DISPLAY!
    justifyContent: "flex-start",
  },
  memberContainerHeader: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 8,
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
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate700,
  },
  pastMemberName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  pastMemberPhone: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 1,
  },
  addMemberBtnPill: {
    backgroundColor: colors.indigo600,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  addMemberBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },

  /* Tab 2: SĐT Search */
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
    backgroundColor: colors.emerald600,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },

  /* Tab 3: Mã QR */
  scanFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.indigo600,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    marginBottom: 8,
    shadowColor: colors.indigo600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanFriendBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
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
    marginBottom: 8,
  },
  copyLinkBtn: {
    backgroundColor: colors.indigo50,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  copyLinkBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.indigo600,
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
  fullscreenGroupId: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.indigo600,
    marginBottom: 8,
  },
  fullscreenDismissHint: {
    fontSize: 11,
    color: colors.slate400,
    fontStyle: "italic",
  },
});
