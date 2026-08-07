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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { GroupDebtCard } from "../components/features/GroupDebtCard";
import { VietQRCard } from "../components/features/VietQRCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { GroupDetailScreen } from "./GroupDetailScreen";
import { CreateGroupBottomSheet } from "../components/modals/CreateGroupBottomSheet";
import { colors } from "../constants/colors";
import { groupService } from "../services/groupService";
import { useAuth } from "../hooks/useAuth";
import { Group, GroupDebtDetail, GroupDebtSummary } from "../types";

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
      setDebtSummary(dData);
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
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || "U"}</Text>
            </View>
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
        {/* ─── BENTO DEBT CARDS (2 Grid Cards) ─── */}
        <View style={styles.bentoRow}>
          {/* Tiền đang bay về */}
          <View style={[styles.bentoCard, styles.bentoCardOwed]}>
            <Text style={styles.bentoCardLabel}>Tiền đang bay về 💰</Text>
            <View>
              <Text style={styles.bentoCardVal}>{fmt(debtSummary?.totalOwed)}</Text>
              <Text style={styles.bentoCardSub}>Người khác nợ bạn</Text>
            </View>
          </View>

          {/* Tiền cần trả */}
          <View style={[styles.bentoCard, styles.bentoCardOwing]}>
            <Text style={styles.bentoCardLabel}>Tiền cần trả 🥱</Text>
            <View>
              <Text style={styles.bentoCardVal}>{fmt(debtSummary?.totalOwing)}</Text>
              <Text style={styles.bentoCardSub}>Bạn nợ người khác</Text>
            </View>
          </View>
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
                source={{ uri: GROUP_IMAGES[idx % GROUP_IMAGES.length] }}
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

      {/* VietQR Settlement Modal */}
      <BottomSheet
        visible={!!selectedDebt}
        onClose={() => setSelectedDebt(null)}
        title={selectedDebt?.amount && selectedDebt.amount > 0 ? "Tạo mã VietQR nhận tiền" : "Quét mã VietQR chuyển khoản"}
      >
        {selectedDebt && (
          <View style={styles.qrModalContent}>
            <VietQRCard
              bankBin={selectedDebt.bankBin || "970436"}
              accountNo={selectedDebt.bankAccountNo || "1012345678"}
              accountName={selectedDebt.bankAccountName || selectedDebt.otherMemberName}
              amount={Math.abs(selectedDebt.amount)}
              description={`ShareMoney quyet toan no ${selectedDebt.otherMemberName}`}
            />
          </View>
        )}
      </BottomSheet>

      {/* Create Group Modal */}
      <CreateGroupBottomSheet
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onGroupCreated={loadGroupData}
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
    height: 90,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    fontWeight: "600",
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

  settlementSection: {
    marginTop: 8,
  },
  qrModalContent: {
    alignItems: "center",
    paddingTop: 8,
  },
  modalForm: {
    paddingTop: 8,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  flexBtn: {
    flex: 1,
  },
});

