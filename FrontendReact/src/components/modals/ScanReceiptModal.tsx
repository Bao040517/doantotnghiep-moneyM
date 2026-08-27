import React, { useState, useEffect } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  Camera,
  Image as ImageIcon,
  QrCode,
  Link as LinkIcon,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Sparkles,
  ClipboardPaste,
  ShoppingBag,
  Focus,
  ScanLine,
} from "lucide-react-native";
import { colors } from "../../constants/colors";
import { aiService, ScanReceiptResponse } from "../../services/aiService";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface ScanReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: ScanReceiptResponse) => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
}) => {
  // Đúng 2 chế độ: Quét mã QR ("qr") và Ảnh từ điện thoại ("image")
  const [scanMode, setScanMode] = useState<"qr" | "image">("qr");
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [scannedResult, setScannedResult] = useState<ScanReceiptResponse | null>(null);
  const [scannedQrCode, setScannedQrCode] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
      const cleanUrl = data.trim();
      const result = await aiService.scanQrReceipt(cleanUrl);
      if (!result || (!result.amount && !result.note)) {
        Alert.alert(
          "Không đọc được hoá đơn",
          "Mã QR này không chứa dữ liệu hoá đơn hợp lệ hoặc chưa được hỗ trợ.",
          [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
        );
        return;
      }
      setScannedResult(result);
    } catch (e: any) {
      console.error("[ScanReceipt] Live QR scan error:", e);
      Alert.alert(
        "Lỗi đọc QR hoá đơn",
        e.response?.data?.message || "Không thể tải hoá đơn từ mã QR này. Vui lòng thử lại.",
        [{ text: "Quét lại", onPress: () => setScannedQrCode(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (useCamera: boolean = false) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Quyền truy cập", "Vui lòng cấp quyền camera để chụp ảnh hóa đơn");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setImageUri(result.assets[0].uri);
          setScannedResult(null);
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Quyền truy cập", "Vui lòng cấp quyền thư viện ảnh để tải ảnh hóa đơn");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setImageUri(result.assets[0].uri);
          setScannedResult(null);
        }
      }
    } catch (e) {
      console.error("[ScanReceiptModal] Pick image error:", e);
      Alert.alert("Thông báo", "Tính năng đang được hoàn thiện & phát triển. Vui lòng thử lại sau.");
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const content = await Clipboard.getStringAsync();
      if (content && (content.startsWith("http://") || content.startsWith("https://"))) {
        setQrUrl(content.trim());
      } else if (content) {
        setQrUrl(content.trim());
      } else {
        Alert.alert("Thông báo", "Clipboard trống.");
      }
    } catch (e) {
      console.error("Paste clipboard error:", e);
    }
  };

  const handleScanImage = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const filename = imageUri.split("/").pop() || "receipt.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const data = await aiService.scanReceipt(imageUri, type, filename);
      if (!data || (!data.amount && !data.note)) {
        Alert.alert(
          "Thông báo",
          "Tính năng đọc ảnh hoá đơn đang được phát triển & nâng cấp AI. Bạn có thể thử lại với ảnh rõ nét hơn hoặc nhập thủ công."
        );
        return;
      }
      setScannedResult(data);
    } catch (e: any) {
      console.error("[ScanReceipt] OCR error:", e);
      Alert.alert(
        "Thông báo",
        "Tính năng nhận diện ảnh đang được nâng cấp & hoàn thiện. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScanQrUrl = async () => {
    if (!qrUrl || !qrUrl.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập hoặc dán link hoá đơn từ mã QR");
      return;
    }
    const cleanUrl = qrUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      Alert.alert("Thông báo", "Đường dẫn hoá đơn phải bắt đầu bằng http:// hoặc https://");
      return;
    }

    setLoading(true);
    try {
      const data = await aiService.scanQrReceipt(cleanUrl);
      if (!data || (!data.amount && !data.note)) {
        Alert.alert(
          "Thông báo",
          "Hệ thống hoá đơn này đang trong quá trình tích hợp & phát triển. Vui lòng thử lại sau."
        );
        return;
      }
      setScannedResult(data);
    } catch (e: any) {
      console.error("[ScanReceipt] QR url error:", e);
      Alert.alert(
        "Thông báo",
        "Tính năng đọc QR hoá đơn từ nguồn này đang được hoàn thiện & phát triển. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResult = () => {
    if (scannedResult) {
      onScanSuccess(scannedResult);
      handleClose();
    }
  };

  const handleClose = () => {
    setImageUri(null);
    setQrUrl("");
    setShowManualUrl(false);
    setScannedResult(null);
    setScannedQrCode(false);
    setLoading(false);
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
                <Text style={styles.title}>Quét Hoá Đơn Mua Sắm (AI)</Text>
                <Text style={styles.subtitle}>Tự động nhận diện hoá đơn & bóc tách món hàng</Text>
              </View>
            </View>
          </View>

          {/* 2 Main Mode Tabs: Quét mã QR & Ảnh từ điện thoại */}
          {!scannedResult && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, scanMode === "qr" && styles.tabButtonActive]}
                onPress={() => {
                  setScanMode("qr");
                  setScannedQrCode(false);
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
            {/* 1. SCANNED RESULT PREVIEW STATE */}
            {scannedResult ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeaderBadge}>
                  <CheckCircle2 size={20} color={colors.emerald600} />
                  <Text style={styles.resultHeaderBadgeText}>Đã bóc tách hoá đơn thành công</Text>
                </View>

                {/* Main Info Card */}
                <View style={styles.resultCard}>
                  <Text style={styles.resultStoreName}>
                    {scannedResult.note || "Hoá đơn mua sắm"}
                  </Text>
                  <Text style={styles.resultAmountLabel}>Tổng tiền hoá đơn</Text>
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
              /* 2. TAB 1: LIVE CAMERA QR SCANNER */
              <View style={styles.modeBody}>
                {!showManualUrl ? (
                  <>
                    <View style={styles.cameraBoxContainer}>
                      {cameraPermission?.granted ? (
                        <View style={styles.cameraFrame}>
                          <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            onBarcodeScanned={scannedQrCode || loading ? undefined : handleBarcodeScanned}
                          />
                          {/* Viewfinder Target Overlay */}
                          <View style={styles.cameraOverlay}>
                            <View style={styles.scanTargetBox}>
                              <View style={[styles.corner, styles.cornerTL]} />
                              <View style={[styles.corner, styles.cornerTR]} />
                              <View style={[styles.corner, styles.cornerBL]} />
                              <View style={[styles.corner, styles.cornerBR]} />
                              <ScanLine size={32} color="#818CF8" style={{ opacity: 0.8 }} />
                            </View>
                            <Text style={styles.scanTargetHint}>
                              Hướng khung ngắm vào mã QR trên bill mua sắm
                            </Text>
                          </View>

                          {loading && (
                            <View style={styles.cameraLoadingOverlay}>
                              <ActivityIndicator size="large" color="#FFFFFF" />
                              <Text style={styles.cameraLoadingText}>Đang đọc hoá đơn điện tử...</Text>
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
                            Cho phép ShareMoney sử dụng camera để quét mã QR hoá đơn thanh toán.
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

                    {/* Quick Link Toggle */}
                    <TouchableOpacity
                      style={styles.toggleManualLink}
                      onPress={() => setShowManualUrl(true)}
                      activeOpacity={0.7}
                    >
                      <LinkIcon size={14} color="#4F46E5" />
                      <Text style={styles.toggleManualLinkText}>Hoặc dán đường dẫn link E-Bill</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* Manual URL Input Fallback */
                  <View style={styles.urlInputBox}>
                    <View style={styles.qrInfoBanner}>
                      <QrCode size={18} color="#4F46E5" style={{ marginTop: 2 }} />
                      <Text style={styles.qrInfoText}>
                        Dán đường dẫn Hóa Đơn Điện Tử từ mã QR trên bill mua sắm (WinMart, Co.opmart, Shopee, VNPT...).
                      </Text>
                    </View>

                    <Input
                      label="Đường dẫn Hoá Đơn Điện Tử (URL) *"
                      placeholder="https://hoadon.winmart.vn/..."
                      value={qrUrl}
                      onChangeText={setQrUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        style={styles.pasteButton}
                        onPress={handlePasteClipboard}
                        activeOpacity={0.7}
                      >
                        <ClipboardPaste size={15} color="#4F46E5" />
                        <Text style={styles.pasteButtonText}>Dán từ Clipboard</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.backToCameraBtn}
                        onPress={() => setShowManualUrl(false)}
                        activeOpacity={0.7}
                      >
                        <Camera size={15} color="#334155" />
                        <Text style={styles.backToCameraText}>Mở lại Camera</Text>
                      </TouchableOpacity>
                    </View>

                    <Button
                      title={loading ? "Đang xử lý..." : "Bóc tách hoá đơn từ link"}
                      variant="primary"
                      onPress={handleScanQrUrl}
                      style={{ marginTop: 10 }}
                      disabled={loading || !qrUrl.trim()}
                      loading={loading}
                      icon={!loading ? <Sparkles size={16} color={colors.white} /> : undefined}
                    />
                  </View>
                )}
              </View>
            ) : (
              /* 3. TAB 2: ẢNH TỪ ĐIỆN THOẠI (OCR) */
              <View style={styles.modeBody}>
                {imageUri ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.clearImgBtn} onPress={() => setImageUri(null)}>
                      <Text style={styles.clearImgText}>✕ Chọn ảnh khác</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pickerGrid}>
                    <TouchableOpacity
                      style={styles.pickerCard}
                      onPress={() => pickImage(true)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pickerIconBg, { backgroundColor: "#EEF2FF" }]}>
                        <Camera size={28} color="#4F46E5" />
                      </View>
                      <Text style={styles.pickerTitle}>Chụp ảnh hoá đơn</Text>
                      <Text style={styles.pickerSub}>Chụp bill giấy thanh toán</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pickerCard}
                      onPress={() => pickImage(false)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pickerIconBg, { backgroundColor: "#ECFDF5" }]}>
                        <ImageIcon size={28} color="#10B981" />
                      </View>
                      <Text style={styles.pickerTitle}>Chọn từ thư viện</Text>
                      <Text style={styles.pickerSub}>Ảnh bill đã lưu trong máy</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {scannedResult ? (
              <>
                <Button
                  title="Quét lại"
                  variant="secondary"
                  onPress={() => {
                    setScannedResult(null);
                    setScannedQrCode(false);
                  }}
                  style={styles.flexBtn}
                  icon={<RotateCcw size={16} color="#334155" />}
                />
                <Button
                  title="Áp dụng vào hoá đơn"
                  variant="primary"
                  onPress={handleApplyResult}
                  style={styles.flexBtn}
                  icon={<CheckCircle2 size={16} color={colors.white} />}
                />
              </>
            ) : scanMode === "qr" && !showManualUrl ? (
              <Button
                title="Hủy bỏ"
                variant="cancel"
                onPress={handleClose}
                style={{ flex: 1 }}
                disabled={loading}
              />
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
                    title={loading ? "Đang xử lý..." : "Quét & Bóc tách"}
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
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxHeight: "90%",
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
    marginBottom: 16,
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
    fontSize: 18,
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
    marginBottom: 16,
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
    maxHeight: 380,
  },
  cameraBoxContainer: {
    width: "100%",
    height: 270,
    borderRadius: 20,
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
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  scanTargetBox: {
    width: 180,
    height: 180,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#4F46E5",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanTargetHint: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 14,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  toggleManualLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
  },
  toggleManualLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
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
  pickerGrid: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 6,
  },
  pickerCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate800,
    textAlign: "center",
  },
  pickerSub: {
    fontSize: 11,
    color: colors.slate400,
    textAlign: "center",
    marginTop: 2,
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
  qrInfoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  qrInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#3730A3",
    lineHeight: 18,
    fontWeight: "600",
  },
  urlInputBox: {
    gap: 8,
  },
  pasteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  pasteButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  backToCameraBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  backToCameraText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
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
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  flexBtn: {
    flex: 1,
  },
});
