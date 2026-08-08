import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { colors } from "../../constants/colors";
import { ExternalLoan, CreateExternalLoanPayload } from "../../types";
import { loanService } from "../../services/loanService";

interface ExternalLoanManagerBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ExternalLoanManagerBottomSheet: React.FC<ExternalLoanManagerBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  const [loans, setLoans] = useState<ExternalLoan[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"LEND" | "BORROW">("BORROW");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLoans = async () => {
    try {
      const data = await loanService.getUserLoans();
      setLoans(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (visible) fetchLoans();
  }, [visible]);

  const handleAmountChange = (text: string) => {
    const cleanDigits = text.replace(/\D/g, "");
    if (!cleanDigits) {
      setAmount("");
      return;
    }
    const formatted = parseInt(cleanDigits, 10).toLocaleString("vi-VN");
    setAmount(formatted);
  };

  const handleSave = async () => {
    const rawNumber = parseFloat(amount.replace(/\./g, "")) || 0;
    if (!name.trim() || rawNumber <= 0) return;
    setLoading(true);
    try {
      await loanService.createLoan({
        borrowerOrLenderName: name.trim(),
        amount: rawNumber,
        type,
        note: note.trim(),
      });
      setName("");
      setAmount("");
      setNote("");
      setIsAdding(false);
      fetchLoans();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể tạo khoản nợ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={isAdding ? "Ghi chép nợ cá nhân mới" : "Sổ tay Quản lý Nợ Cá Nhân"}>
      {isAdding ? (
        <View style={styles.form}>
          <View style={styles.tabRow}>
            <Button
              title="Đi Vay (Bạn nợ)"
              variant={type === "BORROW" ? "danger" : "secondary"}
              onPress={() => setType("BORROW")}
              style={styles.flexTab}
            />
            <Button
              title="Cho Vay (Họ nợ)"
              variant={type === "LEND" ? "primary" : "secondary"}
              onPress={() => setType("LEND")}
              style={styles.flexTab}
            />
          </View>
          <Input label="Tên người vay / người cho vay" placeholder="VD: Anh Nam, Chị Hoa" value={name} onChangeText={setName} />
          <Input label="Số tiền (VND)" placeholder="VD: 2.000.000" keyboardType="numeric" value={amount} onChangeText={handleAmountChange} />
          <Input label="Ghi chú" placeholder="VD: Tiền vay mua xe, mượn tiêu dùng" value={note} onChangeText={setNote} />

          <View style={styles.btnRow}>
            <Button title="Hủy" variant="secondary" onPress={() => setIsAdding(false)} style={styles.flexTab} />
            <Button title="Lưu khoản nợ" variant="primary" onPress={handleSave} loading={loading} style={styles.flexTab} />
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          {loans.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Chưa có ghi chép khoản nợ cá nhân nào</Text>
            </Card>
          ) : (
            <FlatList
              data={loans}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.loanItem}>
                  <View style={styles.loanDetails}>
                    <Text style={styles.personName}>{item.borrowerOrLenderName}</Text>
                    <Text style={styles.loanType}>
                      {item.type === "BORROW" ? "🔴 Bạn nợ người này" : "🟢 Người này nợ bạn"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.loanAmount, { color: item.type === "BORROW" ? colors.rose600 : colors.emerald600 }]}>
                      {(item.amount ?? 0).toLocaleString("vi-VN")} ₫
                    </Text>
                    <Button 
                      title="Xóa" 
                      variant="danger" 
                      style={{ paddingVertical: 4, paddingHorizontal: 12, marginTop: 4 }} 
                      onPress={() => {
                        Alert.alert("Xác nhận", "Bạn có chắc muốn xoá khoản nợ này?", [
                          { text: "Hủy", style: "cancel" },
                          { text: "Xóa", style: "destructive", onPress: async () => {
                            try {
                              await loanService.deleteLoan(item.id);
                              fetchLoans();
                            } catch (e: any) {
                              Alert.alert("Lỗi", "Không thể xoá khoản nợ");
                            }
                          }}
                        ]);
                      }}
                    />
                  </View>
                </View>
              )}
              style={styles.list}
            />
          )}
          <Button title="+ Ghi khoản nợ mới" variant="outline" onPress={() => setIsAdding(true)} style={styles.addBtn} />
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  form: {
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  flexTab: {
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  list: {
    marginBottom: 16,
  },
  loanItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  loanDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900,
  },
  loanType: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  loanAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyCard: {
    alignItems: "center",
    padding: 20,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
  },
  addBtn: {
    marginTop: 8,
  },
});
