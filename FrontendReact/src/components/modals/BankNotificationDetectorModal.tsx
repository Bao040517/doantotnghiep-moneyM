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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Send,
  CheckCircle2,
} from "lucide-react-native";
import { parseBankNotificationText, ParsedBankNotification } from "../../utils/bankNotificationParser";

interface BankNotificationDetectorModalProps {
  visible: boolean;
  onClose: () => void;
  onParsedResult: (result: ParsedBankNotification) => void;
}

const BANKS = ["MBBank", "Vietcombank", "Techcombank", "TPBank", "MoMo"];

const PRESET_SCENARIOS = [
  {
    icon: "🍲",
    title: "Ăn phở Thìn Lò Đúc",
    amount: "-50,000",
    bank: "MBBank",
    note: "Pho Thin Lo Duc bat tai nam",
    text: "GD: -50,000VND 01/09/26 12:30 TK: 6617052004 tai MB. ND: Pho Thin Lo Duc bat tai nam",
  },
  {
    icon: "☕",
    title: "Highlands Coffee Phin Sữa Đá",
    amount: "-39,000",
    bank: "Vietcombank",
    note: "Highlands Coffee Phin sua da size Vua",
    text: "SD TK 0011004123456 -39,000VND luc 01-09-2026 09:15. ND: Highlands Coffee Phin sua da",
  },
  {
    icon: "🏠",
    title: "Tiền phòng trọ tháng 9",
    amount: "-1,850,000",
    bank: "Techcombank",
    note: "Chuyen tien phong tro thang 9",
    text: "Tai khoan: 6617052004. So tien: -1,850,000 VND. Noi dung: Chuyen tien phong tro thang 9",
  },
  {
    icon: "⚡",
    title: "Hóa đơn tiền điện EVN",
    amount: "-650,000",
    bank: "Vietcombank",
    note: "Thanh toan tien dien EVN",
    text: "SD TK 0011004123456 -650,000VND luc 01-09-2026 14:00. Ref EVNHCMC123 ND: Thanh toan tien dien EVN",
  },
  {
    icon: "👕",
    title: "Uniqlo Vincom Mua áo",
    amount: "-350,000",
    bank: "MBBank",
    note: "Uniqlo Vincom mua ao so mi",
    text: "GD: -350,000VND 01/09/26 15:45 TK: 6617052004 tai MB. ND: Uniqlo Vincom mua ao so mi",
  },
  {
    icon: "💰",
    title: "Nhận Lương Công Ty",
    amount: "+18,000,000",
    bank: "Techcombank",
    note: "Cong ty chuyen luong thang 9",
    text: "+18,000,000 VND tai Techcombank luc 01/09/2026. ND: Cong ty ABC chuyen luong thang 09/2026",
  },
];

export const BankNotificationDetectorModal: React.FC<BankNotificationDetectorModalProps> = ({
  visible,
  onClose,
  onParsedResult,
}) => {
  const [selectedBank, setSelectedBank] = useState("MBBank");
  const [customAmount, setCustomAmount] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [isExpense, setIsExpense] = useState(true);

  const handleSimulateCustom = () => {
    if (!customAmount.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập số tiền muốn giả lập chuyển khoản.");
      return;
    }

    let clean = customAmount.toLowerCase().trim().replace(/,/g, ".");
    let num = 0;
    if (clean.endsWith("k") || clean.endsWith(" cành")) {
      const val = parseFloat(clean.replace(/[^0-9.]/g, ""));
      num = isNaN(val) ? 0 : Math.round(val * 1000);
    } else if (clean.endsWith("tr") || clean.endsWith(" củ") || clean.endsWith(" triệu") || clean.endsWith("m")) {
      const val = parseFloat(clean.replace(/[^0-9.]/g, ""));
      num = isNaN(val) ? 0 : Math.round(val * 1000000);
    } else {
      const numOnly = parseInt(clean.replace(/[^0-9]/g, ""), 10);
      num = isNaN(numOnly) ? 0 : numOnly;
    }

    if (!num || num <= 0) {
      Alert.alert("Lỗi", "Số tiền không hợp lệ.");
      return;
    }

    const sign = isExpense ? "-" : "+";
    const formattedNum = num.toLocaleString("vi-VN");
    const noteText = customNote.trim() || (isExpense ? "Chi tieu ca nhan" : "Thu nhap");

    // Tạo thông báo chuẩn định dạng ngân hàng
    const fakeRawText = `GD: ${sign}${formattedNum}VND 01/09/26 12:30 TK: 6617052004 tai ${selectedBank}. ND: ${noteText}`;

    const result = parseBankNotificationText(fakeRawText);
    onClose();
    onParsedResult(result);
  };

  const handleSimulatePreset = (rawText: string) => {
    const result = parseBankNotificationText(rawText);
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
                <Building2 size={22} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Giả Lập Chuyển Khoản Ngân Hàng</Text>
                <Text style={styles.headerSubtitle}>Mô phỏng biến động số dư & bóc tách 0ms</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <ShieldCheck size={18} color="#16A34A" />
              <Text style={styles.infoBannerText}>
                Chọn kịch bản có sẵn hoặc tự nhập số tiền để xem Pop-up tự động bóc tách & phân loại danh mục trong 0ms.
              </Text>
            </View>

            {/* Quick 1-Tap Presets */}
            <View style={styles.sectionHeaderRow}>
              <Sparkles size={15} color="#D97706" />
              <Text style={styles.sectionTitle}>Chạm 1-chạm để giả lập ngay:</Text>
            </View>

            <View style={styles.presetGrid}>
              {PRESET_SCENARIOS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetCard}
                  onPress={() => handleSimulatePreset(preset.text)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetCardTop}>
                    <Text style={styles.presetEmoji}>{preset.icon}</Text>
                    <View style={styles.presetBankBadge}>
                      <Text style={styles.presetBankText}>{preset.bank}</Text>
                    </View>
                  </View>
                  <Text style={styles.presetTitle} numberOfLines={1}>
                    {preset.title}
                  </Text>
                  <Text
                    style={[
                      styles.presetAmount,
                      { color: preset.amount.startsWith("-") ? "#DC2626" : "#16A34A" },
                    ]}
                  >
                    {preset.amount} ₫
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Simulation Form */}
            <View style={styles.customSection}>
              <Text style={styles.sectionTitle}>Tùy chỉnh số tiền & nội dung:</Text>

              {/* Bank Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankScroll}>
                {BANKS.map((b) => {
                  const isSelected = b === selectedBank;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.bankChip, isSelected && styles.bankChipSelected]}
                      onPress={() => setSelectedBank(b)}
                    >
                      <Text style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Type Switcher */}
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[styles.typeBtn, isExpense && styles.typeBtnExpenseActive]}
                  onPress={() => setIsExpense(true)}
                >
                  <Text style={[styles.typeBtnText, isExpense && styles.typeBtnTextActive]}>
                    🔴 Chi Tiền (-)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, !isExpense && styles.typeBtnIncomeActive]}
                  onPress={() => setIsExpense(false)}
                >
                  <Text style={[styles.typeBtnText, !isExpense && styles.typeBtnTextActive]}>
                    🟢 Nhận Tiền (+)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <TextInput
                style={styles.textInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Nhập số tiền (ví dụ: 75000)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              {/* Note Input */}
              <TextInput
                style={styles.textInput}
                value={customNote}
                onChangeText={setCustomNote}
                placeholder="Nội dung chuyển khoản (ví dụ: Bún chả Hương Liên)"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={styles.simulateBtn}
                onPress={handleSimulateCustom}
                activeOpacity={0.8}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.simulateBtnText}>Bắn Thông Báo Chuyển Khoản Giả Lập</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxHeight: "88%",
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    lineHeight: 16,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  presetCard: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  presetEmoji: {
    fontSize: 20,
  },
  presetBankBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  presetBankText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  presetAmount: {
    fontSize: 13,
    fontWeight: "800",
  },
  customSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bankScroll: {
    flexDirection: "row",
    marginVertical: 10,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginRight: 6,
  },
  bankChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  bankChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  bankChipTextSelected: {
    color: "#FFFFFF",
  },
  typeSwitcher: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  typeBtnExpenseActive: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },
  typeBtnIncomeActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  typeBtnTextActive: {
    fontWeight: "700",
    color: "#0F172A",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 13,
    color: "#1E293B",
    marginBottom: 8,
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  simulateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
