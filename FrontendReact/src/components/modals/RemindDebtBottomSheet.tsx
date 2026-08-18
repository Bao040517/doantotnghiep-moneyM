import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { colors } from "../../constants/colors";
import { groupService } from "../../services/groupService";
import { api } from "../../services/api";

interface RemindDebtBottomSheetProps {
  visible: boolean;
  groupId: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const RemindDebtBottomSheet: React.FC<RemindDebtBottomSheetProps> = ({
  visible,
  groupId,
  debtorId,
  debtorName,
  amount,
  onClose,
  onSuccess,
}) => {
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState("FUNNY");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const formattedAmount = new Intl.NumberFormat("vi-VN").format(amount) + " ₫";

  const getMoodSample = (selectedMood: string) => {
    const targetName = debtorName || "bạn hiền";
    switch (selectedMood) {
      case "FUNNY":
        return `Ê ${targetName}, ví tao đang thở oxy nè! Còn ${formattedAmount} tiền nhóm hôm bữa, bắn qua cứu bạn hiền với! 🚑💨`;
      case "POLITE":
        return `Chào ${targetName}, bạn kiểm tra giúp mình khoản chi tiêu nhóm ${formattedAmount} và chuyển khoản giùm mình khi thuận tiện nhé. Cảm ơn bạn rất nhiều! ☕`;
      case "AGGRESSIVE":
        return `Thông báo khẩn! ${targetName} chuyển ngay ${formattedAmount} tiền nhóm giúp mình để chốt sổ tài chính nhé! ⚠️⚡`;
      case "POETIC":
        return `Nắng chiều ngả bóng hoàng hôn, tiền nợ ${formattedAmount} xin đừng lãng quên hỡi ${targetName} 🌸📜`;
      default:
        return `Ê ${targetName}, còn ${formattedAmount} tiền nhóm đó nha! Chuyển giúp mình nha! ✨`;
    }
  };

  useEffect(() => {
    if (visible) {
      setMessage(getMoodSample(mood));
    }
  }, [visible, debtorName, amount]);

  const handleSelectMood = (newMood: string) => {
    setMood(newMood);
    setMessage(getMoodSample(newMood));
  };

  const handleGenerateAI = async () => {
    try {
      setIsGenerating(true);
      const res = await api.post("/ai/generate-message", {
        debtorName: debtorName || "bạn hiền",
        amount: Math.max(1, amount || 0),
        mood,
      });
      const generated = res.data?.message || res.data;
      if (generated && typeof generated === "string") {
        setMessage(generated.trim());
      } else {
        setMessage(getMoodSample(mood));
      }
    } catch (err: any) {
      console.warn("[RemindDebt] Error generating AI message:", err);
      setMessage(getMoodSample(mood));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReminder = async () => {
    if (!message.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập nội dung lời nhắn!");
      return;
    }

    try {
      setIsSending(true);
      await groupService.remindDebt(groupId, {
        debtorId,
        amount,
        message: message.trim(),
      });
      Alert.alert("Thành công 🎉", `Đã gửi thông báo nhắc nợ tới ${debtorName}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Lỗi", err.response?.data?.message || "Có lỗi xảy ra khi gửi nhắc nợ.");
    } finally {
      setIsSending(false);
    }
  };

  const MOODS = [
    { value: "FUNNY", label: "😂 Gen Z, Hài hước" },
    { value: "POLITE", label: "☕ Lịch sự, Nhẹ nhàng" },
    { value: "AGGRESSIVE", label: "😡 Đòi gấp, Nghiêm túc" },
    { value: "POETIC", label: "🌸 Thơ ca, Lãng mạn" },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Nhắc nợ: ${debtorName}`}>
      <View style={styles.modalBodyWrapper}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount info banner */}
          <View style={styles.debtInfoBanner}>
            <Text style={styles.debtInfoLabel}>Số tiền cần nhắc:</Text>
            <Text style={styles.debtInfoAmount}>{formattedAmount}</Text>
          </View>

          {/* AI Generator Box */}
          <View style={styles.aiBox}>
            <View style={styles.aiHeader}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
              <Text style={styles.aiTitle}>Trợ lý AI soạn văn nhắc khéo (Gemini)</Text>
            </View>

            <Text style={styles.subLabel}>Chọn phong cách nhắc:</Text>
            <View style={styles.moodSelector}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                  onPress={() => handleSelectMood(m.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moodText, mood === m.value && styles.moodTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={isGenerating ? "Đang sáng tác câu từ... ✨" : "Soạn câu nhắc khéo với AI ✨"}
              variant="primary"
              onPress={handleGenerateAI}
              loading={isGenerating}
              style={styles.aiGenBtn}
              textStyle={styles.aiGenBtnText}
            />
          </View>

          {/* Editable text message with pre-filled sample */}
          <Input
            label="Nội dung tin nhắn sẽ gửi (*)"
            value={message}
            onChangeText={setMessage}
            placeholder="Nhập lời nhắc nợ của bạn..."
            multiline
            numberOfLines={4}
            containerStyle={{ marginTop: 4, marginBottom: 4 }}
          />
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.stickyFooter}>
          <Button
            title={isSending ? "Đang gửi thông báo..." : "Gửi thông báo nhắc nợ ngay 🚀"}
            variant="primary"
            onPress={handleSendReminder}
            loading={isSending}
            disabled={isSending || !message.trim()}
            style={styles.sendBtn}
            textStyle={{ fontSize: 15, fontWeight: "800" }}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalBodyWrapper: {
    maxHeight: 560,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  debtInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 14,
  },
  debtInfoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  debtInfoAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#15803d",
  },
  aiBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginBottom: 14,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate800,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
    marginBottom: 8,
  },
  moodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  moodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  moodBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  moodText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
  },
  moodTextActive: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  aiGenBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  aiGenBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  stickyFooter: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: colors.white,
  },
  sendBtn: {
    backgroundColor: "#10b981",
    borderRadius: 16,
    paddingVertical: 14,
  },
});
