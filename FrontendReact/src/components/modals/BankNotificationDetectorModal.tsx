import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import {
  Zap,
  X,
  Clipboard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react-native";
import { parseBankNotificationText, ParsedBankNotification } from "../../utils/bankNotificationParser";

interface BankNotificationDetectorModalProps {
  visible: boolean;
  onClose: () => void;
  onParsedResult: (result: ParsedBankNotification) => void;
}

const SAMPLE_NOTIFICATIONS = [
  {
    label: "MBBank - Quần áo Uniqlo (-350k)",
    text: "GD: -350,000VND 26/08/26 14:30 TK: 6617052004888 tai MB. ND: Uniqlo Vincom mua ao so mi",
  },
  {
    label: "Techcombank - Tiền phòng trọ (-1.85tr)",
    text: "Tai khoan: 6617052004. So tien: -1,850,000 VND. Noi dung: Chuyen tien phong tro thang 8",
  },
  {
    label: "Vietcombank - Tiền điện EVN (-650k)",
    text: "SD TK 0011004123456 -650,000VND luc 26-08-2026 14:00:00. Ref EVNHCMC123 ND: Thanh toan tien dien EVN T8",
  },
  {
    label: "Sawaco - Tiền nước (-165k)",
    text: "TK 6617052004888 tai MB: -165,000 VND. ND: Thanh toan tien nuoc sinh hoat Sawaco T8",
  },
  {
    label: "MoMo - Ăn uống Phở Thìn (-45k)",
    text: "Giao dịch thành công -45.000đ cho Phở Thìn Lò Đúc. Mã GD 99882233",
  },
  {
    label: "Lương Công Ty (+18tr)",
    text: "+18,000,000 VND tai MBBank luc 05/08/2026. ND: Cong ty ABC chuyen luong thang 08/2026",
  },
];

export const BankNotificationDetectorModal: React.FC<BankNotificationDetectorModalProps> = ({
  visible,
  onClose,
  onParsedResult,
}) => {
  const [inputText, setInputText] = useState("");

  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập hoặc dán nội dung thông báo ngân hàng.");
      return;
    }

    const result = parseBankNotificationText(textToParse);
    if (!result.isValid || result.amount <= 0) {
      Alert.alert(
        "Không nhận diện được số tiền",
        "Nội dung chưa chứa định dạng số tiền chuyển khoản hợp lệ (ví dụ: -50,000 VND hoặc -50.000đ)."
      );
      return;
    }

    onClose();
    onParsedResult(result);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Zap size={22} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Bắt biến động ngân hàng</Text>
                <Text style={styles.headerSubtitle}>Phân loại tức thì 0ms (Zero Latency - Offline)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Value Proposition Box */}
            <View style={styles.infoBanner}>
              <ShieldCheck size={18} color="#16A34A" />
              <Text style={styles.infoBannerText}>
                Khi bạn chuyển khoản trên App ngân hàng, hệ thống tự động bóc tách số tiền và phân loại danh mục mà không cần qua AI.
              </Text>
            </View>

            {/* Input Box */}
            <Text style={styles.inputLabel}>Dán nội dung thông báo / SMS ngân hàng:</Text>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ví dụ: GD: -350,000VND TK: 6617052004888 tai MB. ND: Mua ao so mi Uniqlo..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.parseBtn}
              onPress={() => handleParse(inputText)}
              activeOpacity={0.8}
            >
              <Zap size={18} color="#FFFFFF" />
              <Text style={styles.parseBtnText}>Bóc Tách & Phân Loại Ngay (0ms)</Text>
            </TouchableOpacity>

            {/* Sample Notifications to Test 1-Tap */}
            <View style={styles.sampleSection}>
              <View style={styles.sampleHeaderRow}>
                <Sparkles size={14} color="#D97706" />
                <Text style={styles.sampleTitle}>Thử nhanh với thông báo mẫu:</Text>
              </View>

              {SAMPLE_NOTIFICATIONS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.sampleItem}
                  onPress={() => {
                    setInputText(sample.text);
                    handleParse(sample.text);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sampleItemLeft}>
                    <CheckCircle2 size={16} color="#2563EB" />
                    <Text style={styles.sampleItemText}>{sample.label}</Text>
                  </View>
                  <ArrowRight size={14} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    lineHeight: 18,
    fontWeight: "500",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 13,
    color: "#1E293B",
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  parseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  parseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sampleSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sampleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sampleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  sampleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 6,
  },
  sampleItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sampleItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
});
