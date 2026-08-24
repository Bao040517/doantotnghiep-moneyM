import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { GroupDebtDetail } from "../../types";

interface GroupDebtCardProps {
  debt: GroupDebtDetail;
  onSettle: (debt: GroupDebtDetail) => void;
}

export const GroupDebtCard: React.FC<GroupDebtCardProps> = ({ debt, onSettle }) => {
  const memberName = debt?.otherMemberName || (debt as any)?.memberName || (debt as any)?.userName || "Thành viên";
  const avatarUrl = (debt as any)?.otherMemberAvatarUrl || (debt as any)?.avatarUrl || (debt as any)?.counterparty?.avatarUrl;
  const firstChar = memberName ? memberName.charAt(0).toUpperCase() : "U";
  const amountVal = debt?.amount ?? 0;
  const isOwedToMe = amountVal > 0;
  const absAmount = Math.abs(amountVal);

  return (
    <Card style={styles.card}>
      <View style={styles.infoRow}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{firstChar}</Text>
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.memberName}>{memberName}</Text>
          <Text style={[styles.statusText, { color: isOwedToMe ? colors.emerald600 : colors.rose600 }]}>
            {isOwedToMe ? "Nợ bạn" : "Bạn nợ"}
          </Text>
        </View>
        <Text style={[styles.amountText, { color: isOwedToMe ? colors.emerald600 : colors.rose600 }]}>
          {absAmount.toLocaleString("vi-VN")} ₫
        </Text>
      </View>

      <Button
        title={isOwedToMe ? "Tạo mã VietQR nhận tiền" : "Chuyển khoản VietQR ngay"}
        variant={isOwedToMe ? "secondary" : "primary"}
        onPress={() => onSettle(debt)}
        style={styles.settleBtn}
        textStyle={{ fontSize: 13 }}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.indigo100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.indigo700,
  },
  textContainer: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: "800",
  },
  settleBtn: {
    paddingVertical: 10,
    borderRadius: 14,
  },
});
