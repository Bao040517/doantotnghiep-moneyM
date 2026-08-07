import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { colors } from "../../constants/colors";
import { groupService } from "../../services/groupService";
import { api } from "../../services/api";
import { Send, Bot, Sparkles } from "lucide-react-native";

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

  useEffect(() => {
    if (visible) {
      setMessage(`Ê ${debtorName}, mầy còn nợ tao ${new Intl.NumberFormat("vi-VN").format(amount)}đ đó nha! Trả lẹ đi mậy!`);
    }
  }, [visible, debtorName, amount]);

  const handleGenerateAI = async () => {
    try {
      setIsGenerating(true);
      const res = await api.post("/ai/generate-message", {
        debtorName,
        amount,
        mood,
      });
      setMessage(res.data.message || res.data);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể tạo tin nhắn AI lúc này.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReminder = async () => {
    if (!message.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lời nhắn!");
      return;
    }

    try {
      setIsSending(true);
      await groupService.remindDebt(groupId, {
        debtorId,
        amount,
        message,
      });
      Alert.alert("Thành công", "Đã gửi thông báo nhắc nợ thành công!");
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
    { value: "FUNNY", label: "Hài hước, Gen Z 😂" },
    { value: "POLITE", label: "Lịch sự, nhẹ nhàng ☕" },
    { value: "AGGRESSIVE", label: "Gắt gỏng, đòi ngay 😡" },
    { value: "POETIC", label: "Thơ ca lãng mạn 🌸" },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Nhắc nợ ${debtorName}`}>
      <View style={styles.container}>
        <Text style={styles.description}>
          Gửi một lời nhắc nhẹ nhàng (hoặc mạnh mẽ) kèm mã QR thanh toán đến hòm thư của {debtorName}.
        </Text>

        <View style={styles.aiBox}>
          <View style={styles.aiHeader}>
            <Bot size={16} color={colors.slate500} />
            <Text style={styles.aiTitle}>Trợ lý AI (Gemini)</Text>
          </View>
          
          <View style={styles.moodSelector}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                onPress={() => setMood(m.value)}
              >
                <Text style={[styles.moodText, mood === m.value && styles.moodTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={isGenerating ? "Đang nghĩ..." : "Soạn văn ✨"}
            variant="primary"
            onPress={handleGenerateAI}
            loading={isGenerating}
            style={{ backgroundColor: colors.indigo500, height: 44 }}
          />
        </View>

        <Input
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập lời nhắc nợ của bạn..."
          multiline
          numberOfLines={4}
          style={styles.messageInput}
        />

        <View style={styles.actionBox}>
          <Button
            title={isSending ? "Đang gửi..." : "Gửi ngay 🚀"}
            variant="primary"
            onPress={handleSendReminder}
            loading={isSending}
            disabled={isSending || !message.trim()}
            style={{ backgroundColor: colors.emerald500 }}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  description: {
    fontSize: 14,
    color: colors.slate500,
    marginBottom: 16,
  },
  aiBox: {
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 16,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.slate600,
    marginLeft: 6,
  },
  moodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  moodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  moodBtnActive: {
    backgroundColor: colors.indigo50,
    borderColor: colors.indigo200,
  },
  moodText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate600,
  },
  moodTextActive: {
    color: colors.indigo600,
  },
  messageInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 12,
    marginBottom: 16,
  },
  actionBox: {
    marginTop: 8,
  },
});
