import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import {
  aiAssistantService,
  AiAssistantResponse,
  AiChatMessage,
  GoalPlanData,
} from "../../services/aiAssistantService";
import { financialServices } from "../../services/financialServices";
import { X, Send, Sparkles, Target, Receipt, TrendingUp, Bot, User, Zap, CheckCircle2 } from "lucide-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ── Chat Bubble Types ──
interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  goalPlanData?: GoalPlanData;
  transactionData?: AiAssistantResponse["transactionData"];
  quickReplies?: string[];
}

interface AiChatbotModalProps {
  visible: boolean;
  onClose: () => void;
}

// ── Utility ──
const formatVND = (n: number) => {
  if (!n && n !== 0) return "0đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
};

const genId = () => Math.random().toString(36).substr(2, 12) + Date.now().toString(36);

// ── Feasibility Gauge ──
const FeasibilityGauge: React.FC<{ score: number }> = ({ score }) => {
  const gaugeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(gaugeAnim, {
      toValue: score / 100,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const gaugeColor =
    score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";

  const gaugeWidth = gaugeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.labelRow}>
        <Text style={gaugeStyles.label}>🏆 Độ khả thi</Text>
        <Text style={[gaugeStyles.score, { color: gaugeColor }]}>{score}%</Text>
      </View>
      <View style={gaugeStyles.track}>
        <Animated.View style={[gaugeStyles.fill, { width: gaugeWidth, backgroundColor: gaugeColor }]} />
      </View>
      <Text style={gaugeStyles.hint}>
        {score >= 80
          ? "Rất khả thi! Cố lên! 💪🔥"
          : score >= 60
          ? "Khả thi nếu giữ kỷ luật! 💪"
          : score >= 40
          ? "Thử thách đấy! 🚀"
          : "Nên cân nhắc kéo dài thời gian 📅"}
      </Text>
    </View>
  );
};

const gaugeStyles = StyleSheet.create({
  container: { marginVertical: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#E2E8F0" },
  score: { fontSize: 15, fontWeight: "800" },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  hint: { fontSize: 11, color: "#94A3B8", marginTop: 4, textAlign: "center" },
});

// ── Goal Plan Action Card ──
const GoalPlanCard: React.FC<{
  data: GoalPlanData;
  onActivate: (data: GoalPlanData) => void;
  isActivating: boolean;
}> = ({ data, onActivate, isActivating }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[goalCardStyles.wrapper, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={goalCardStyles.card}>
        {/* Header */}
        <View style={goalCardStyles.header}>
          <View style={goalCardStyles.headerIcon}>
            <Target size={18} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={goalCardStyles.title}>🎯 {data.goalName}</Text>
            <Text style={goalCardStyles.subtitle}>
              {formatVND(data.targetAmount)} · {data.targetMonths} tháng
            </Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={goalCardStyles.breakdown}>
          <View style={goalCardStyles.breakdownItem}>
            <Text style={goalCardStyles.breakdownValue}>{formatVND(data.monthlySavingsNeeded)}</Text>
            <Text style={goalCardStyles.breakdownLabel}>/ tháng</Text>
          </View>
          <View style={goalCardStyles.breakdownDivider} />
          <View style={goalCardStyles.breakdownItem}>
            <Text style={goalCardStyles.breakdownValue}>{formatVND(data.dailySavingsNeeded)}</Text>
            <Text style={goalCardStyles.breakdownLabel}>/ ngày</Text>
          </View>
        </View>

        {/* Feasibility */}
        {data.feasibilityScore != null && <FeasibilityGauge score={data.feasibilityScore} />}

        {/* Cut-down Suggestions */}
        {data.cutDownSuggestions && data.cutDownSuggestions.length > 0 && (
          <View style={goalCardStyles.suggestions}>
            <Text style={goalCardStyles.suggestionsTitle}>✂️ Gợi ý cắt giảm:</Text>
            {data.cutDownSuggestions.map((s, i) => (
              <View key={i} style={goalCardStyles.suggestionRow}>
                <Text style={goalCardStyles.suggestionEmoji}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={goalCardStyles.suggestionText}>{s.description}</Text>
                  <Text style={goalCardStyles.suggestionSaving}>
                    Tiết kiệm +{formatVND(s.monthlySavings)}/tháng
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={goalCardStyles.ctaBtn}
          onPress={() => onActivate(data)}
          disabled={isActivating}
          activeOpacity={0.8}
        >
          <View style={goalCardStyles.ctaGradient}>
            {isActivating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Zap size={16} color="#FFF" />
                <Text style={goalCardStyles.ctaText}>Kích hoạt Hũ Tiết Kiệm ngay!</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const goalCardStyles = StyleSheet.create({
  wrapper: { marginTop: 8, marginBottom: 4 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "#1E293B",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#F8FAFC" },
  subtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  breakdown: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
    padding: 12, marginBottom: 10,
  },
  breakdownItem: { flex: 1, alignItems: "center" },
  breakdownDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 8 },
  breakdownValue: { fontSize: 16, fontWeight: "800", color: "#10B981" },
  breakdownLabel: { fontSize: 11, color: "#64748B", marginTop: 2 },
  suggestions: { marginVertical: 8 },
  suggestionsTitle: { fontSize: 12, fontWeight: "600", color: "#E2E8F0", marginBottom: 6 },
  suggestionRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  suggestionEmoji: { fontSize: 14, marginRight: 6, marginTop: 1 },
  suggestionText: { fontSize: 12, color: "#CBD5E1", lineHeight: 17 },
  suggestionSaving: { fontSize: 11, color: "#10B981", marginTop: 2 },
  ctaBtn: { marginTop: 10 },
  ctaGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12, gap: 6, backgroundColor: "#F59E0B",
  },
  ctaText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});

// ── Transaction Action Card ──
const TransactionCard: React.FC<{
  bubbleId: string;
  data: NonNullable<AiAssistantResponse["transactionData"]>;
  isSaving: boolean;
  isSaved: boolean;
  onSave: (bubbleId: string, data: NonNullable<AiAssistantResponse["transactionData"]>) => void;
}> = ({ bubbleId, data, isSaving, isSaved, onSave }) => {
  return (
    <View style={txCardStyles.card}>
      <View style={txCardStyles.row}>
        <Receipt size={16} color="#10B981" />
        <Text style={txCardStyles.label}>Giao dịch đã nhận diện</Text>
      </View>
      <View style={txCardStyles.details}>
        <View style={txCardStyles.detailRow}>
          <Text style={txCardStyles.detailLabel}>💰 Số tiền:</Text>
          <Text style={txCardStyles.detailValue}>{formatVND(data.amount)}</Text>
        </View>
        <View style={txCardStyles.detailRow}>
          <Text style={txCardStyles.detailLabel}>🏷️ Danh mục:</Text>
          <Text style={txCardStyles.detailValue}>{data.categoryName}</Text>
        </View>
        {data.note && (
          <View style={txCardStyles.detailRow}>
            <Text style={txCardStyles.detailLabel}>📝 Ghi chú:</Text>
            <Text style={txCardStyles.detailValue}>{data.note}</Text>
          </View>
        )}
        {data.paymentMethod && (
          <View style={txCardStyles.detailRow}>
            <Text style={txCardStyles.detailLabel}>💳 Thanh toán:</Text>
            <Text style={txCardStyles.detailValue}>{data.paymentMethod}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[txCardStyles.saveBtn, isSaved && txCardStyles.savedBtn]}
        disabled={isSaving || isSaved}
        onPress={() => onSave(bubbleId, data)}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isSaved ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={txCardStyles.savedBtnText}>Đã lưu vào sổ chi tiêu</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} color="#FFFFFF" />
            <Text style={txCardStyles.saveBtnText}>Lưu vào sổ chi tiêu (1-Chạm)</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const txCardStyles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(16,185,129,0.08)", borderRadius: 12, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#10B981" },
  details: { gap: 4 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 12, color: "#94A3B8" },
  detailValue: { fontSize: 12, fontWeight: "600", color: "#E2E8F0" },
  saveBtn: {
    marginTop: 10, backgroundColor: "#10B981", borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  savedBtn: { backgroundColor: "rgba(16,185,129,0.15)", borderWidth: 1, borderColor: "rgba(16,185,129,0.4)" },
  savedBtnText: { color: "#10B981", fontSize: 12, fontWeight: "600" },
});

// ── Typing Indicator ──
const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const dots = [dot1, dot2, dot3].map((dot, i) => (
    <Animated.View
      key={i}
      style={[
        typingStyles.dot,
        {
          transform: [
            { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          ],
        },
      ]}
    />
  ));

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.avatar}>
        <Bot size={14} color="#818CF8" />
      </View>
      <View style={typingStyles.bubble}>{dots}</View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8, paddingHorizontal: 16 },
  avatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(129,140,248,0.15)",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  bubble: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10, gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#818CF8" },
});

// ══════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT: AiChatbotModal
// ══════════════════════════════════════════════════════════════
export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({ visible, onClose }) => {
  const { colors: themeColors } = useTheme();
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Open/close animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
      // Welcome message
      if (messages.length === 0) {
        setMessages([
          {
            id: genId(),
            role: "assistant",
            content:
              "Xin chào! Mình là Trợ lý Tài chính AI của bạn 🤖✨\n\nMình có thể giúp bạn:\n🎯 Lập kế hoạch mua sắm mục tiêu\n📝 Ghi chép giao dịch siêu nhanh\n📊 Hỏi đáp thống kê chi tiêu\n\nThử nhắn cho mình nhé!",
            timestamp: new Date(),
            intent: "GENERAL_CHAT",
            quickReplies: [
              "Muốn mua iPhone 30tr trong 3 tháng",
              "Ăn bún bò 55k MoMo",
              "Tháng này tiêu bao nhiêu?",
            ],
          },
        ]);
      }
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Send message
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || inputText).trim();
      if (!msg || isLoading) return;

      const userBubble: ChatBubble = {
        id: genId(),
        role: "user",
        content: msg,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userBubble]);
      setInputText("");
      setIsLoading(true);

      try {
        // Build conversation history (last 10 messages)
        const history: AiChatMessage[] = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await aiAssistantService.chat({
          message: msg,
          conversationHistory: history,
        });

        const aiBubble: ChatBubble = {
          id: genId(),
          role: "assistant",
          content: response.reply,
          timestamp: new Date(),
          intent: response.intent,
          goalPlanData: response.goalPlanData,
          transactionData: response.transactionData,
          quickReplies: response.quickReplies,
        };

        setMessages((prev) => [...prev, aiBubble]);
      } catch (error: any) {
        const errBubble: ChatBubble = {
          id: genId(),
          role: "assistant",
          content: "Xin lỗi, mình gặp sự cố khi xử lý tin nhắn. Thử lại nhé! 😅",
          timestamp: new Date(),
          intent: "GENERAL_CHAT",
        };
        setMessages((prev) => [...prev, errBubble]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputText, isLoading, messages]
  );

  // Activate savings goal
  const handleActivateGoal = useCallback(async (goalData: GoalPlanData) => {
    setIsActivating(true);
    try {
      const result = await aiAssistantService.confirmGoal(goalData);
      const successBubble: ChatBubble = {
        id: genId(),
        role: "assistant",
        content: `🎉 Đã tạo Hũ Tiết Kiệm **"${result.name}"** thành công!\n\n🎯 Mục tiêu: ${formatVND(result.targetAmount)}\n📅 Hạn: ${result.deadlineDate}\n\nHãy kiểm tra tab Tiết Kiệm để theo dõi tiến độ nhé! 💰`,
        timestamp: new Date(),
        intent: "GENERAL_CHAT",
        quickReplies: ["Tháng này tiêu bao nhiêu rồi?", "Gợi ý tiết kiệm thêm"],
      };
      setMessages((prev) => [...prev, successBubble]);
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể tạo Hũ Tiết Kiệm. Vui lòng thử lại!");
    } finally {
      setIsActivating(false);
    }
  }, []);

  const [savingTxId, setSavingTxId] = useState<string | null>(null);
  const [savedTxIds, setSavedTxIds] = useState<Set<string>>(new Set());

  // Save detected transaction
  const handleSaveTransaction = useCallback(
    async (bubbleId: string, txData: NonNullable<AiAssistantResponse["transactionData"]>) => {
      setSavingTxId(bubbleId);
      try {
        const [wallets, categories] = await Promise.all([
          financialServices.getWallets(),
          financialServices.getCategories(),
        ]);

        if (!wallets || wallets.length === 0) {
          Alert.alert("Thông báo", "Bạn chưa có ví tiền nào để ghi nhận giao dịch. Hãy tạo ví ở tab Trang chủ nhé!");
          return;
        }

        const targetWallet = wallets[0];
        const isExpense = txData.transactionType !== "INCOME";
        const targetType = isExpense ? "EXPENSE" : "INCOME";
        
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === txData.categoryName.toLowerCase()
        ) || categories.find((c) => c.type === targetType) || categories[0];

        await financialServices.createTransaction(targetWallet.id, {
          amount: txData.amount,
          categoryId: matchedCat ? matchedCat.id : undefined,
          note: txData.note || `${isExpense ? "Chi tiêu" : "Thu nhập"}: ${txData.categoryName}`,
          type: isExpense ? "EXPENSE" : "INCOME",
          transactionDate: new Date().toISOString(),
        });

        setSavedTxIds((prev) => new Set([...prev, bubbleId]));

        const successBubble: ChatBubble = {
          id: genId(),
          role: "assistant",
          content: `✅ Đã lưu giao dịch **"${txData.note || txData.categoryName}"** (${formatVND(txData.amount)}) vào ví **${targetWallet.name}** thành công! 💰`,
          timestamp: new Date(),
          intent: "GENERAL_CHAT",
          quickReplies: ["Tháng này tiêu bao nhiêu rồi?", "Số dư hiện tại"],
        };
        setMessages((prev) => [...prev, successBubble]);
      } catch (err: any) {
        Alert.alert("Lỗi", "Không thể lưu giao dịch. Vui lòng thử lại!");
      } finally {
        setSavingTxId(null);
      }
    },
    []
  );

  // Render Chat Bubble
  const renderBubble = useCallback(
    ({ item }: { item: ChatBubble }) => {
      const isUser = item.role === "user";

      return (
        <View style={[bubbleStyles.row, isUser ? bubbleStyles.rowUser : bubbleStyles.rowAssistant]}>
          {/* Avatar */}
          {!isUser && (
            <View style={bubbleStyles.avatar}>
              <Bot size={14} color="#818CF8" />
            </View>
          )}

          <View style={[bubbleStyles.bubbleWrapper, isUser && { alignItems: "flex-end" }]}>
            {/* Bubble */}
            <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.userBubble : bubbleStyles.aiBubble]}>
              <Text style={[bubbleStyles.text, isUser ? bubbleStyles.userText : bubbleStyles.aiText]}>
                {item.content}
              </Text>
            </View>

            {/* Goal Plan Card */}
            {item.goalPlanData && (
              <GoalPlanCard
                data={item.goalPlanData}
                onActivate={handleActivateGoal}
                isActivating={isActivating}
              />
            )}

            {/* Transaction Card */}
            {item.transactionData && (
              <TransactionCard
                bubbleId={item.id}
                data={item.transactionData}
                isSaving={savingTxId === item.id}
                isSaved={savedTxIds.has(item.id)}
                onSave={handleSaveTransaction}
              />
            )}

            {/* Quick Replies */}
            {item.quickReplies && item.quickReplies.length > 0 && (
              <View style={bubbleStyles.quickReplies}>
                {item.quickReplies.map((qr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={bubbleStyles.quickReplyBtn}
                    onPress={() => handleSend(qr)}
                    activeOpacity={0.7}
                  >
                    <Text style={bubbleStyles.quickReplyText}>{qr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Timestamp */}
            <Text style={[bubbleStyles.time, isUser && { textAlign: "right" }]}>
              {item.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>

          {/* User Avatar */}
          {isUser && (
            <View style={[bubbleStyles.avatar, { backgroundColor: "rgba(99,102,241,0.15)" }]}>
              <User size={14} color="#6366F1" />
            </View>
          )}
        </View>
      );
    },
    [handleActivateGoal, handleSaveTransaction, handleSend, isActivating, savedTxIds, savingTxId]
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}>
                <Sparkles size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Trợ lý AI</Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.headerSubtitle}>Luôn sẵn sàng giúp bạn</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={22} color="#E2E8F0" />
            </TouchableOpacity>
          </View>

          {/* Chat Area */}
          <View style={styles.chatArea}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderBubble}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={isLoading ? <TypingIndicator /> : null}
            />
          </View>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Nhắn tin cho Trợ lý AI..."
                placeholderTextColor="#64748B"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                blurOnSubmit
              />
              <TouchableOpacity
                style={[styles.sendBtn, inputText.trim() ? styles.sendBtnActive : {}]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color={inputText.trim() ? "#FFF" : "#64748B"} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

// ── Bubble Styles ──
const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(129,140,248,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  bubbleWrapper: {
    maxWidth: "78%",
    marginHorizontal: 6,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#4F46E5",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#E2E8F0",
  },
  time: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  quickReplies: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  quickReplyBtn: {
    backgroundColor: "rgba(99,102,241,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
  },
  quickReplyText: {
    fontSize: 12,
    color: "#A5B4FC",
    fontWeight: "500",
  },
});

// ── Main Styles ──
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#1E1B4B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.3)",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#A5B4FC",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  chatContent: {
    paddingVertical: 16,
  },
  inputArea: {
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: "#E2E8F0",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: "#4F46E5",
  },
});
