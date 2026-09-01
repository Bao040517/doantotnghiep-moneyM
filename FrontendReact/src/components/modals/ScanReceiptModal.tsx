import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  QrCode,
  CheckCircle2,
  RotateCcw,
  Users,
  UserPlus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react-native";
import { colors } from "../../constants/colors";
import { groupService } from "../../services/groupService";
import { GroupPreview } from "../../types/group";
import { parseScannedQr } from "../../utils/qrParser";
import { Button } from "../ui/Button";

interface ScanQrModalProps {
  visible: boolean;
  onClose: () => void;
  targetGroupId?: string;
  onGroupJoined?: (groupId: string) => void;
  onMemberAdded?: (user: any) => void;
}

export const ScanReceiptModal: React.FC<ScanQrModalProps> = ({
  visible,
  onClose,
  targetGroupId,
  onGroupJoined,
  onMemberAdded,
}) => {
  const [loading, setLoading] = useState(false);
  const [scannedGroup, setScannedGroup] = useState<GroupPreview | null>(null);
  const [scannedUser, setScannedUser] = useState<any | null>(null);
  const [scannedQrCode, setScannedQrCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Laser Scan Animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (visible) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    }
    return () => {
      animLoop?.stop();
    };
  }, [visible]);

  useEffect(() => {
    if (visible && !cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [visible, cameraPermission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedQrCode || loading || !data) return;

    setScannedQrCode(true);
    setLoading(true);

    try {
      const parsed = parseScannedQr(data);

      // CASE 1: Mã QR Mời tham gia nhóm (GROUP_INVITE)
      if (parsed.type === "GROUP_INVITE" && parsed.groupId) {
        try {
          const groupPreview = await groupService.getGroupPreview(parsed.groupId);
          if (groupPreview && groupPreview.id) {
            setScannedGroup(groupPreview);
            return;
          }
        } catch (groupErr: any) {
          console.warn("[ScanQR] Group preview error:", groupErr);
          Alert.alert(
            "Không tìm thấy nhóm",
            "Mã QR nhóm này không tồn tại hoặc đã bị xóa.",
            [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
          );
          return;
        }
      }

      // CASE 2: Mã QR Cá nhân / Thành viên (USER_PROFILE)
      if (parsed.type === "USER_PROFILE" && parsed.userId) {
        try {
          const userObj = await groupService.getUserById(parsed.userId);
          if (userObj && userObj.id) {
            setScannedUser(userObj);
            return;
          }
        } catch (userErr: any) {
          console.warn("[ScanQR] User fetch error:", userErr);
          Alert.alert(
            "Không tìm thấy tài khoản",
            "Mã QR cá nhân này không tồn tại trên hệ thống.",
            [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
          );
          return;
        }
      }

      // CASE 3: Mã QR không được hỗ trợ
      Alert.alert(
        "Mã QR không hợp lệ",
        "Vui lòng quét mã QR nhóm hoặc mã QR cá nhân của thành viên ShareMoney.",
        [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
      );
    } catch (e: any) {
      console.error("[ScanQR] QR scan error:", e);
      Alert.alert(
        "Lỗi đọc mã QR",
        e.response?.data?.message || "Không thể tải dữ liệu từ mã QR này. Vui lòng thử lại.",
        [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinScannedGroup = async () => {
    if (!scannedGroup) return;
    setActionLoading(true);
    try {
      await groupService.joinGroup(scannedGroup.id);
      const gId = scannedGroup.id;
      handleClose();
      if (onGroupJoined) {
        onGroupJoined(gId);
      }
    } catch (err: any) {
      Alert.alert("Lỗi tham gia nhóm", err.response?.data?.message || "Không thể tham gia nhóm");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddScannedUserToGroup = async () => {
    if (!scannedUser || !targetGroupId) return;
    setActionLoading(true);
    try {
      await groupService.addMemberToGroup(targetGroupId, scannedUser.id);
      const u = scannedUser;
      handleClose();
      if (onMemberAdded) {
        onMemberAdded(u);
      }
    } catch (err: any) {
      Alert.alert("Lỗi thêm thành viên", err.response?.data?.message || "Không thể thêm thành viên này vào nhóm");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetScan = () => {
    setScannedGroup(null);
    setScannedUser(null);
    setScannedQrCode(false);
  };

  const handleClose = () => {
    setScannedGroup(null);
    setScannedUser(null);
    setScannedQrCode(false);
    setLoading(false);
    setActionLoading(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBg}>
                <QrCode size={22} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.title}>Quét Mã QR</Text>
                <Text style={styles.subtitle}>Đặt mã QR nhóm hoặc tài khoản vào giữa khung</Text>
              </View>
            </View>
          </View>

          {/* Content Area */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. SCANNED RESULT: GROUP INVITE PREVIEW */}
            {scannedGroup ? (
              <View style={styles.resultContainer}>
                <View style={[styles.resultHeaderBadge, { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" }]}>
                  <Users size={20} color="#4F46E5" />
                  <Text style={[styles.resultHeaderBadgeText, { color: "#3730A3" }]}>
                    Đã tìm thấy Nhóm chi tiêu ShareMoney
                  </Text>
                </View>

                <View style={styles.groupPreviewCard}>
                  <View style={styles.groupPreviewAvatarBox}>
                    {scannedGroup.avatarUrl ? (
                      <Image source={{ uri: scannedGroup.avatarUrl }} style={styles.groupPreviewAvatar} />
                    ) : (
                      <Users size={32} color="#4F46E5" />
                    )}
                  </View>
                  <Text style={styles.groupPreviewName}>{scannedGroup.name}</Text>
                  {scannedGroup.description ? (
                    <Text style={styles.groupPreviewDesc}>{scannedGroup.description}</Text>
                  ) : null}

                  <View style={styles.groupMetaRow}>
                    <View style={styles.groupMetaPill}>
                      <Text style={styles.groupMetaText}>👥 {scannedGroup.memberCount || 1} thành viên</Text>
                    </View>
                    {scannedGroup.owner ? (
                      <View style={styles.groupMetaPill}>
                        <Text style={styles.groupMetaText}>👑 {scannedGroup.owner.name}</Text>
                      </View>
                    ) : null}
                  </View>

                  {scannedGroup.isJoined ? (
                    <View style={styles.alreadyJoinedBox}>
                      <ShieldCheck size={16} color="#059669" />
                      <Text style={styles.alreadyJoinedText}>Bạn đã là thành viên trong nhóm này</Text>
                    </View>
                  ) : (
                    <Text style={styles.groupInviteHint}>
                      Quét mã thành công! Bạn có muốn tham gia nhóm chi tiêu này không?
                    </Text>
                  )}
                </View>
              </View>
            ) : scannedUser ? (
              /* 2. SCANNED RESULT: USER PROFILE PREVIEW */
              <View style={styles.resultContainer}>
                <View style={[styles.resultHeaderBadge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                  <UserPlus size={20} color="#059669" />
                  <Text style={[styles.resultHeaderBadgeText, { color: "#065F46" }]}>
                    {targetGroupId ? "Thêm Thành Viên Vào Nhóm" : "Hồ Sơ Thành Viên ShareMoney"}
                  </Text>
                </View>

                <View style={styles.userPreviewCard}>
                  <View style={styles.userPreviewAvatarBox}>
                    {scannedUser.avatarUrl ? (
                      <Image source={{ uri: scannedUser.avatarUrl }} style={styles.userPreviewAvatar} />
                    ) : (
                      <Text style={styles.userPreviewAvatarLetter}>
                        {scannedUser.name?.charAt(0) || "U"}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.userPreviewName}>{scannedUser.name}</Text>
                  {scannedUser.phone && (
                    <Text style={styles.userPreviewPhone}>📞 {scannedUser.phone}</Text>
                  )}
                  {scannedUser.email && (
                    <Text style={styles.userPreviewEmail}>✉️ {scannedUser.email}</Text>
                  )}
                </View>
              </View>
            ) : (
              /* 3. LIVE CAMERA QR SCANNER */
              <View style={styles.modeBody}>
                <View style={styles.cameraBoxContainer}>
                  {cameraPermission?.granted ? (
                    <View style={styles.cameraFrame}>
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        autofocus="on"
                        barcodeScannerSettings={{
                          barcodeTypes: [
                            "qr",
                            "aztec",
                            "datamatrix",
                            "pdf417",
                            "code128",
                            "code39",
                            "ean13",
                            "ean8",
                            "upc_a",
                            "upc_e",
                          ],
                        }}
                        onBarcodeScanned={scannedQrCode || loading ? undefined : handleBarcodeScanned}
                      />

                      {/* Viewfinder Target Overlay */}
                      <View style={styles.cameraOverlay}>
                        {/* Center Active Scanning Frame with Moving Laser Line */}
                        <View style={styles.scanTargetBox}>
                          <View style={[styles.corner, styles.cornerTL]} />
                          <View style={[styles.corner, styles.cornerTR]} />
                          <View style={[styles.corner, styles.cornerBL]} />
                          <View style={[styles.corner, styles.cornerBR]} />

                          {/* Animated Sweeping Laser Bar */}
                          <Animated.View
                            style={[
                              styles.laserLine,
                              {
                                transform: [
                                  {
                                    translateY: scanAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [10, 190],
                                    }),
                                  },
                                ],
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {loading && (
                        <View style={styles.cameraLoadingOverlay}>
                          <ActivityIndicator size="large" color="#FFFFFF" />
                          <Text style={styles.cameraLoadingText}>Đang nhận diện mã QR...</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.permissionBox}>
                      <View style={styles.permissionIconBg}>
                        <QrCode size={36} color="#4F46E5" />
                      </View>
                      <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
                      <Text style={styles.permissionSub}>
                        Cho phép ShareMoney sử dụng camera để quét mã QR.
                      </Text>
                      <Button
                        title="Cấp quyền Camera"
                        variant="primary"
                        onPress={requestCameraPermission}
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {scannedGroup ? (
              <>
                <Button
                  title="Quét lại"
                  variant="secondary"
                  onPress={handleResetScan}
                  style={styles.flexBtn}
                  icon={<RotateCcw size={16} color="#334155" />}
                  disabled={actionLoading}
                />
                {scannedGroup.isJoined ? (
                  <Button
                    title="Vào xem nhóm"
                    variant="primary"
                    onPress={() => {
                      const gId = scannedGroup.id;
                      handleClose();
                      if (onGroupJoined) onGroupJoined(gId);
                    }}
                    style={styles.flexBtn}
                    icon={<ArrowRight size={16} color={colors.white} />}
                  />
                ) : (
                  <Button
                    title={actionLoading ? "Đang tham gia..." : "Tham gia nhóm ngay"}
                    variant="primary"
                    onPress={handleJoinScannedGroup}
                    style={styles.flexBtn}
                    loading={actionLoading}
                    icon={!actionLoading ? <Users size={16} color={colors.white} /> : undefined}
                  />
                )}
              </>
            ) : scannedUser ? (
              <>
                <Button
                  title="Quét lại"
                  variant="secondary"
                  onPress={handleResetScan}
                  style={styles.flexBtn}
                  icon={<RotateCcw size={16} color="#334155" />}
                  disabled={actionLoading}
                />
                {targetGroupId ? (
                  <Button
                    title={actionLoading ? "Đang thêm..." : "+ Thêm vào nhóm"}
                    variant="primary"
                    onPress={handleAddScannedUserToGroup}
                    style={styles.flexBtn}
                    loading={actionLoading}
                    icon={!actionLoading ? <UserPlus size={16} color={colors.white} /> : undefined}
                  />
                ) : (
                  <Button
                    title="Xong"
                    variant="primary"
                    onPress={handleClose}
                    style={styles.flexBtn}
                    icon={<CheckCircle2 size={16} color={colors.white} />}
                  />
                )}
              </>
            ) : (
              <Button
                title="Hủy"
                variant="cancel"
                onPress={handleClose}
                style={styles.flexBtn}
                disabled={loading}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  scrollArea: {
    maxHeight: 420,
  },
  cameraBoxContainer: {
    width: "100%",
    height: 330,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    marginBottom: 8,
  },
  cameraFrame: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  scanTargetBox: {
    width: 240,
    height: 200,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    overflow: "hidden",
  },
  laserLine: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: "#6366F1",
    borderRadius: 2,
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#6366F1",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  cameraLoadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
  },
  permissionIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 6,
    textAlign: "center",
  },
  permissionSub: {
    fontSize: 12,
    color: colors.slate500,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  modeBody: {
    paddingVertical: 4,
  },
  resultContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  resultHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald200,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  resultHeaderBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.emerald800,
  },
  /* Group Preview Card Styles */
  groupPreviewCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  groupPreviewAvatarBox: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  groupPreviewAvatar: {
    width: "100%",
    height: "100%",
  },
  groupPreviewName: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.slate900,
    textAlign: "center",
    marginBottom: 4,
  },
  groupPreviewDesc: {
    fontSize: 12,
    color: colors.slate500,
    textAlign: "center",
    marginBottom: 10,
  },
  groupMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  groupMetaPill: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  groupMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate700,
  },
  groupInviteHint: {
    fontSize: 12,
    color: colors.indigo600,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  alreadyJoinedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginTop: 4,
  },
  alreadyJoinedText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },

  /* User Preview Card Styles */
  userPreviewCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  userPreviewAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.indigo50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#C7D2FE",
  },
  userPreviewAvatar: {
    width: "100%",
    height: "100%",
  },
  userPreviewAvatarLetter: {
    fontSize: 24,
    fontWeight: "900",
    color: "#4F46E5",
  },
  userPreviewName: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 4,
    textAlign: "center",
  },
  userPreviewPhone: {
    fontSize: 13,
    color: colors.slate600,
    fontWeight: "700",
    marginTop: 2,
  },
  userPreviewEmail: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  flexBtn: {
    flex: 1,
  },
});
