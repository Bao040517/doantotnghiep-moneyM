import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../constants/colors";
import { aiService } from "../../services/aiService";
import { Button } from "../ui/Button";

interface ScanReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: any) => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean = false) => {
    let result;
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Lỗi", "Cần cấp quyền camera để chụp ảnh");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Lỗi", "Cần cấp quyền thư viện ảnh");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Lỗi", "Không thể lấy ảnh");
    }
  };

  const handleScan = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const filename = imageUri.split("/").pop() || "receipt.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      const data = await aiService.scanReceipt(imageUri, type, filename);
      onScanSuccess(data);
      handleClose();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể phân tích hoá đơn");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImageUri(null);
    setLoading(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Quét hoá đơn bằng AI</Text>
          <Text style={styles.subtitle}>Tự động điền số tiền, tên người bán từ hoá đơn</Text>

          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <TouchableOpacity style={styles.clearBtn} onPress={() => setImageUri(null)}>
                <Text style={styles.clearBtnText}>✕ Xóa ảnh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
                <Text style={styles.actionIcon}>📷</Text>
                <Text style={styles.actionText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(false)}>
                <Text style={styles.actionIcon}>🖼️</Text>
                <Text style={styles.actionText}>Thư viện</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={handleClose} style={styles.flexBtn} disabled={loading} />
            <Button 
              title={loading ? "Đang xử lý..." : "Quét ngay"} 
              variant="primary" 
              onPress={handleScan} 
              style={styles.flexBtn} 
              disabled={!imageUri || loading}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.slate900,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  preview: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    resizeMode: "cover",
  },
  clearBtn: {
    marginTop: 10,
    padding: 8,
    backgroundColor: colors.rose50,
    borderRadius: 8,
  },
  clearBtnText: {
    color: colors.rose600,
    fontWeight: "600",
    fontSize: 13,
  },
  pickerActions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.slate200,
    borderStyle: "dashed",
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate700,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  flexBtn: {
    flex: 1,
  },
});
