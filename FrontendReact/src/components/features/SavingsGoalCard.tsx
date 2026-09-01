import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Target } from "lucide-react-native";
import { Card } from "../ui/Card";
import { Badge, BadgeVariant } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { SavingsGoal, SavingsPriority } from "../../types";

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onDeposit?: (goalId: string) => void;
}

export const SavingsGoalCard: React.FC<SavingsGoalCardProps> = ({ goal, onDeposit }) => {
  const percentage = (goal.targetAmount || 0) > 0 ? Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0;

  const rawDate = goal.deadlineDate || goal.targetDate;
  const formattedDate = rawDate
    ? (() => {
        try {
          const d = new Date(rawDate);
          return isNaN(d.getTime()) ? String(rawDate) : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        } catch (e) {
          return String(rawDate);
        }
      })()
    : "";

  const isCompleted = goal.status === "COMPLETED" || percentage >= 100;
  const statusLabel = isCompleted ? "Hoàn thành" : "Đang thực hiện";
  const statusVariant: BadgeVariant = isCompleted ? "urgent" : goal.priority ? (goal.priority.toLowerCase() as any) : "medium";

  const formatVND = (amount: number) => {
    return (amount ?? 0).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          <Target size={24} color="#10B981" strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName} numberOfLines={2} ellipsizeMode="tail">
              {goal.name}
            </Text>
            {formattedDate ? (
              <Text style={styles.targetDate}>Hạn mục tiêu: {formattedDate}</Text>
            ) : (
              <Text style={styles.targetDate}>Quỹ tiết kiệm tích lũy</Text>
            )}
          </View>
        </View>
        <Badge label={statusLabel} variant={statusVariant} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.currentAmount}>{formatVND(goal.currentAmount)}</Text>
        <Text style={styles.targetAmount}>/ {formatVND(goal.targetAmount)}</Text>
      </View>

      <ProgressBar
        progress={percentage}
        color={percentage >= 100 ? colors.emerald500 : colors.indigo600}
        style={styles.progressBar}
      />

      <View style={styles.footer}>
        <Text style={styles.percentageText}>{percentage}% Hoàn thành</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  icon: {
    fontSize: 24,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
    flexShrink: 1,
  },
  targetDate: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
  },
  currentAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900,
  },
  targetAmount: {
    fontSize: 14,
    color: colors.slate500,
  },
  progressBar: {
    marginVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.indigo600,
  },
});
