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
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  Image as ImageIcon,
  QrCode,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Users,
  UserPlus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react-native";
import { colors } from "../../constants/colors";
import { aiService, ScanReceiptResponse } from "../../services/aiService";
import { groupService } from "../../services/groupService";
import { GroupPreview } from "../../types/group";
import { parseScannedQr } from "../../utils/qrParser";
import { Button } from "../ui/Button";

interface ScanReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess?: (data: ScanReceiptResponse) => void;
  targetGroupId?: string;
  onGroupJoined?: (groupId: string) => void;
  onMemberAdded?: (user: any) => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
  targetGroupId,
  onGroupJoined,
  onMemberAdded,
}) => {
  // 2 chế độ: Quét mã QR ("qr") và Ảnh từ điện thoại ("image")
  const [scanMode, setScanMode] = useState<"qr" | "image">("qr");
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Scanned Results
  const [scannedResult, setScannedResult] = useState<ScanReceiptResponse | null>(null);
  const [scannedGroup, setScannedGroup] = useState<GroupPreview | null>(null);
  const [scannedUser, setScannedUser] = useState<any | null>(null);
  const [scannedQrCode, setScannedQrCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Laser Scan Animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (visible && scanMode === "qr") {
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
  }, [visible, scanMode]);

  useEffect(() => {
    if (visible && scanMode === "qr" && !cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [visible, scanMode, cameraPermission]);

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

      // CASE 3: Mã QR Hoá đơn điện tử / Mua sắm (RECEIPT_URL hoặc Fallback)
      const rawData = data.trim();
      const urlMatch = rawData.match(/https?:\/\/[^\s"'<>]+/i);
      const cleanUrl = urlMatch ? urlMatch[0] : rawData;

      const result = await aiService.scanQrReceipt(cleanUrl);
      if (!result || (!result.amount && !result.note)) {
        Alert.alert(
          "Không đọc được nội dung",
          "Mã QR này không hợp lệ hoặc chưa được hỗ trợ.",
          [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
        );
        return;
      }
      setScannedResult(result);
    } catch (e: any) {
      console.error("[ScanReceipt] Live QR scan error:", e);
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
      Alert.alert(
        "Thành công 🎉",
        `Bạn đã tham gia nhóm "${scannedGroup.name}" thành công!`,
        [
          {
            text: "Vào nhóm ngay",
            onPress: () => {
              const gId = scannedGroup.id;
              handleClose();
              if (onGroupJoined) onGroupJoined(gId);
            },
          },
        ]
      );
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
      Alert.alert(
        "Thành công 🎉",
        `Đã thêm ${scannedUser.name} vào nhóm thành công!`,
        [
          {
            text: "Xác nhận",
            onPress: () => {
              const u = scannedUser;
              handleClose();
              if (onMemberAdded) onMemberAdded(u);
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Lỗi thêm thành viên", err.response?.data?.message || "Không thể thêm thành viên này vào nhóm");
    } finally {
      setActionLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền thư viện ảnh để chọn ảnh");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setScannedResult(null);
        setScannedGroup(null);
        setScannedUser(null);
      }
    } catch (e) {
      console.error("[ScanReceiptModal] Pick image error:", e);
      Alert.alert("Thông báo", "Không thể mở thư viện ảnh. Vui lòng thử lại sau.");
    }
  };

  const handleScanImage = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const data = await aiService.scanReceipt(imageUri, type, filename);
      if (!data || (!data.amount && !data.note)) {
        Alert.alert(
          "Thông báo",
          "Không thể nhận diện được thông tin từ ảnh này. Vui lòng thử lại với ảnh rõ nét hơn."
        );
        return;
      }
      setScannedResult(data);
    } catch (e: any) {
      console.error("[ScanReceipt] OCR error:", e);
      const serverMsg =
        e.response?.data?.message ||
        "Không thể nhận diện nội dung từ ảnh này. Vui lòng thử lại sau.";
      Alert.alert("Thông báo", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResult = () => {
    if (scannedResult && onScanSuccess) {
      onScanSuccess(scannedResult);
      handleClose();
    }
  };

  const handleResetScan = () => {
    setScannedResult(null);
    setScannedGroup(null);
    setScannedUser(null);
    setScannedQrCode(false);
  };

  const handleClose = () => {
    setImageUri(null);
    setScannedResult(null);
    setScannedGroup(null);
    setScannedUser(null);
    setScannedQrCode(false);
    setLoading(false);
    setActionLoading(false);
    onClose();
  };

  const hasAnyResult = scannedResult || scannedGroup || scannedUser;

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
                <Text style={styles.subtitle}>Đặt mã QR vào giữa khung hình</Text>
              </View>
            </View>
          </View>

          {/* 2 Main Mode Tabs: Quét mã QR & Ảnh từ điện thoại */}
          {!hasAnyResult && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, scanMode === "qr" && styles.tabButtonActive]}
                onPress={() => {
                  setScanMode("qr");
                  handleResetScan();
                }}
                activeOpacity={0.8}
              >
                <QrCode size={16} color={scanMode === "qr" ? "#4F46E5" : "#64748B"} />
                <Text style={[styles.tabText, scanMode === "qr" && styles.tabTextActive]}>
                  Quét mã QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, scanMode === "image" && styles.tabButtonActive]}
                onPress={() => setScanMode("image")}
                activeOpacity={0.8}
              >
                <ImageIcon size={16} color={scanMode === "image" ? "#4F46E5" : "#64748B"} />
                <Text style={[styles.tabText, scanMode === "image" && styles.tabTextActive]}>
                  Ảnh từ điện thoại
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
            ) : scannedResult ? (
              /* 3. SCANNED RESULT: RECEIPT / BILL PREVIEW */
              <View style={styles.resultContainer}>
                <View style={styles.resultHeaderBadge}>
                  <CheckCircle2 size={20} color={colors.emerald600} />
                  <Text style={styles.resultHeaderBadgeText}>Đã bóc tách thông tin thành công</Text>
                </View>

                {/* Main Info Card */}
                <View style={styles.resultCard}>
                  <Text style={styles.resultStoreName}>
                    {scannedResult.note || "Hoá đơn"}
                  </Text>
                  <Text style={styles.resultAmountLabel}>Số tiền</Text>
                  <Text style={styles.resultAmountValue}>
                    {Number(scannedResult.amount || 0).toLocaleString("vi-VN")} đ
                  </Text>
                </View>

                {/* Line Items Breakdown if available */}
                {scannedResult.items && scannedResult.items.length > 0 && (
                  <View style={styles.itemsSection}>
                    <View style={styles.itemsSectionHeader}>
                      <ShoppingBag size={16} color={colors.slate700} />
                      <Text style={styles.itemsSectionTitle}>
                        Danh sách món hàng ({scannedResult.items.length})
                      </Text>
                    </View>
                    <View style={styles.itemsList}>
                      {scannedResult.items.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemDesc}>{item.description}</Text>
                            <Text style={styles.itemMeta}>
                              SL: {item.quantity || 1}
                              {item.unitPrice ? ` × ${Number(item.unitPrice).toLocaleString("vi-VN")}đ` : ""}
                            </Text>
                          </View>
                          <Text style={styles.itemPrice}>
                            {Number(item.totalPrice || item.unitPrice || 0).toLocaleString("vi-VN")} đ
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : scanMode === "qr" ? (
              /* 4. TAB 1: LIVE CAMERA QR SCANNER */
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
            ) : (
              /* 5. TAB 2: CHỌN ẢNH TỪ THƯ VIỆN */
              <View style={styles.modeBody}>
                {imageUri ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.clearImgBtn} onPress={() => setImageUri(null)}>
                      <Text style={styles.clearImgText}>✕ Chọn ảnh khác</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.singlePickerContainer}>
                    <TouchableOpacity
                      style={styles.singlePickerCard}
                      onPress={pickImageFromGallery}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pickerIconBg, { backgroundColor: "#EEF2FF" }]}>
                        <ImageIcon size={32} color="#4F46E5" />
                      </View>
                      <Text style={styles.pickerTitle}>Chọn từ thư viện</Text>
                      <Text style={styles.pickerSub}>Chọn ảnh có chứa mã QR từ thiết bị</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
            ) : scannedResult ? (
              <>
                <Button
                  title="Quét lại"
                  variant="secondary"
                  onPress={handleResetScan}
                  style={styles.flexBtn}
                  icon={<RotateCcw size={16} color="#334155" />}
                />
                <Button
                  title="Áp dụng"
                  variant="primary"
                  onPress={handleApplyResult}
                  style={styles.flexBtn}
                  icon={<CheckCircle2 size={16} color={colors.white} />}
                />
              </>
            ) : (
              <>
                <Button
                  title="Hủy"
                  variant="cancel"
                  onPress={handleClose}
                  style={styles.flexBtn}
                  disabled={loading}
                />
                {scanMode === "image" && (
                  <Button
                    title={loading ? "Đang xử lý..." : "Quét ảnh"}
                    variant="primary"
                    onPress={handleScanImage}
                    style={styles.flexBtn}
                    disabled={loading || !imageUri}
                    loading={loading}
                    icon={!loading ? <Sparkles size={16} color={colors.white} /> : undefined}
                  />
                )}
              </>
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#4F46E5",
    fontWeight: "900",
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
  singlePickerContainer: {
    paddingVertical: 10,
  },
  singlePickerCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerIconBg: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate800,
    textAlign: "center",
  },
  pickerSub: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: "center",
    marginTop: 4,
  },
  previewBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  clearImgBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
  },
  clearImgText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
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
  resultCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },
  resultStoreName: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 6,
    textAlign: "center",
  },
  resultAmountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultAmountValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#4F46E5",
    marginTop: 2,
  },
  itemsSection: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
  },
  itemsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemsSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate800,
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate800,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900,
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
