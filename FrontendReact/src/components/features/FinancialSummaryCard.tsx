import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui/Card";
import { colors } from "../../constants/colors";

interface FinancialSummaryCardProps {
  title: string;
  amount: number;
  type: "income" | "expense" | "receivable" | "payable" | "net";
  icon?: string;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ title, amount, type, icon }) => {
  const getColor = () => {
    switch (type) {
      case "income": return colors.emerald600;
      case "expense": return colors.rose600;
      case "receivable": return colors.emerald500;
      case "payable": return colors.rose500;
      case "net": return amount >= 0 ? colors.indigo600 : colors.rose600;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "income": return colors.emerald50;
      case "expense": return colors.rose50;
      case "receivable": return colors.emerald50;
      case "payable": return colors.rose50;
      case "net": return colors.indigo50;
    }
  };

  const formatVND = (val: number) => {
    const safeVal = val ?? 0;
    return (safeVal < 0 ? "-" : "") + Math.abs(safeVal).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <Card style={[styles.card, { backgroundColor: getBgColor() }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon || (type === "income" ? "📈" : type === "expense" ? "📉" : "💼")}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.amount, { color: getColor() }]}>{formatVND(amount)}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 0,
    flex: 1,
    minWidth: 140,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate600,
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
  },
});
