import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { colors } from "../../constants/colors";
import { VIETQR_BANKS } from "../../constants/banks";
import { financialServices, Category } from "../../services/financialServices";
import { groupService } from "../../services/groupService";
import { Wallet, BudgetSummary, Group } from "../../types";
import { Search, ChevronLeft, Building2 } from "lucide-react-native";
import { useAuth } from "../../hooks/useAuth";

interface TransferBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAmount?: number;
  initialNote?: string;
  initialCategoryId?: string;
  initialBankBin?: string;
  initialAccountNumber?: string;
  linkedBudgetId?: string;
}

export const TransferBottomSheet: React.FC<TransferBottomSheetProps> = ({
  visible,
  onClose,
  onSuccess,
  initialAmount,
  initialNote,
  initialCategoryId,
  initialBankBin,
  initialAccountNumber,
  linkedBudgetId,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const [searchBank, setSearchBank] = useState("");
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [accountNumber, setAccountNumber] = useState("");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [groupId, setGroupId] = useState("none");

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [matchingBudget, setMatchingBudget] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount(initialAmount ? initialAmount.toString() : "");
      setNote(initialNote || "");
      setCategoryId(initialCategoryId || "");
      setGroupId("none");
      setAccountNumber(initialAccountNumber || "");
      setMatchingBudget(null);
      setSearchBank("");

      if (initialBankBin) {
        const bank = VIETQR_BANKS.find((b) => b.bin === initialBankBin);
        if (bank) {
          setSelectedBank(bank);
          setStep(1);
        } else {
          setStep(0);
          setSelectedBank(null);
        }
      } else {
        setStep(0);
        setSelectedBank(null);
      }

      loadData();
    } else {
      setAmount("");
      setNote("");
      setCategoryId("");
      setGroupId("none");
      setAccountNumber("");
      setMatchingBudget(null);
      setSearchBank("");
      setSelectedBank(null);
      setStep(0);
    }
  }, [visible, initialAmount, initialNote, initialCategoryId, initialBankBin, initialAccountNumber]);

  const loadData = async () => {
    try {
      const [wRes, cRes, gRes] = await Promise.all([
        financialServices.getWallets(),
        financialServices.getCategories(),
        groupService.getGroups(),
      ]);

      setWallets(wRes);
      if (wRes.length > 0) setWalletId(wRes[0].id);

      const expCategories = cRes.filter((c) => c.type === "EXPENSE");
      setCategories(expCategories);
      if (!initialCategoryId) {
        const defaultCat = expCategories.find((c) => c.iconName === "Utensils" || c.name.toLowerCase().includes("ăn"));
        if (defaultCat) setCategoryId(defaultCat.id);
        else if (expCategories.length > 0) setCategoryId(expCategories[0].id);
      } else {
        setCategoryId(initialCategoryId);
      }

      setGroups(gRes);

      const now = new Date();
      const bRes = await financialServices.getBudgetSummary(now.getFullYear(), now.getMonth() + 1);
      setBudgets(bRes);
    } catch (e) {
      console.error("Failed to load data for TransferBottomSheet", e);
    }
  };

  const filteredBanks = VIETQR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      b.shortName.toLowerCase().includes(searchBank.toLowerCase())
  );

  const handleAmountChange = (text: string) => {
    const rawValue = text.replace(/\D/g, "");
    setAmount(rawValue);
  };

  const formattedAmount = amount ? new Intl.NumberFormat("vi-VN").format(Number(amount)) : "";

  const handleNextToConfirm = () => {
    const rawAmount = Number(amount);
    if (!rawAmount || rawAmount <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (!walletId) {
      Alert.alert("Lỗi", "Vui lòng chọn ví nguồn");
      return;
    }
    if (!categoryId) {
      Alert.alert("Lỗi", "Vui lòng chọn danh mục chi tiêu");
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số tài khoản");
      return;
    }

    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (selectedWallet && rawAmount > selectedWallet.balance) {
      Alert.alert(
        "SỐ DƯ KHÔNG ĐỦ!",
        `Số tiền bạn muốn chuyển (${formattedAmount}đ) vượt quá số dư trong ${
          selectedWallet.name
        } (hiện có ${new Intl.NumberFormat("vi-VN").format(selectedWallet.balance)}đ).`
      );
      return;
    }

    const budget = budgets.find((b) => b.categoryId === categoryId);
    if (budget) {
      setMatchingBudget(budget);
      setStep(2);
    } else {
      executeTransfer();
    }
  };

  const executeTransfer = async () => {
    setLoading(true);
    try {
      const rawAmount = Number(amount);
      const finalNote = `[${selectedBank?.shortName} - ${accountNumber}] ${note}`.trim();
      const finalLinkedBudgetId = linkedBudgetId || matchingBudget?.budgetId;

      const pad = (n: number) => String(n).padStart(2, "0");
      const nowDate = new Date();
      const localIsoDate = `${nowDate.getFullYear()}-${pad(nowDate.getMonth() + 1)}-${pad(nowDate.getDate())}T${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`;

      const txRes = await financialServices.createTransaction(walletId, {
        amount: rawAmount,
        type: "EXPENSE",
        categoryId: categoryId,
        note: finalNote,
        transactionDate: localIsoDate,
        isSplit: false,
        linkedBudgetId: finalLinkedBudgetId,
      });

      if (groupId && groupId !== "none" && txRes?.id) {
        await groupService.createGroupExpense(groupId, {
          paidBy: user?.id,
          title: finalNote || "Chuyển khoản",
          amount: rawAmount,
          category: categories.find((c) => c.id === categoryId)?.name || "Khác",
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra khi lưu giao dịch");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (step === 0) return "Chuyển tiền ngân hàng";
    if (step === 1) return "Đến ngân hàng";
    return "Xác nhận chuyển khoản";
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={getTitle()}>
      <View style={styles.container}>
        {step === 0 && (
          <View style={styles.step0}>
            <View style={styles.searchContainer}>
              <Search size={18} color={colors.slate400} />
              <Input
                placeholder="Tìm ngân hàng, số tài khoản..."
                value={searchBank}
                onChangeText={setSearchBank}
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.sectionTitle}>Ngân hàng phổ biến</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.bankGrid}>
              {filteredBanks.map((bank) => (
                <TouchableOpacity
                  key={bank.bin}
                  style={styles.bankItem}
                  onPress={() => {
                    setSelectedBank(bank);
                    setStep(1);
                  }}
                >
                  <View style={[styles.bankLogo, { backgroundColor: (bank as any).color || colors.slate100 }]}>
                    <Text style={[styles.bankShortName, { color: (bank as any).text || "#fff" }]}>
                      {bank.shortName}
                    </Text>
                  </View>
                  <Text style={styles.bankName} numberOfLines={1}>
                    {bank.shortName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {step === 1 && selectedBank && (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.step1}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => setStep(0)} style={styles.backBtn}>
                <ChevronLeft size={24} color={colors.slate600} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Đến ngân hàng</Text>
            </View>

            <View style={[styles.selectedBankCard, { backgroundColor: selectedBank.color || colors.indigo600 }]}>
              <View style={styles.selectedBankLogo}>
                <Text style={[styles.bankShortName, { color: selectedBank.color || colors.indigo600 }]}>
                  {selectedBank.shortName}
                </Text>
              </View>
              <View style={styles.selectedBankInfo}>
                <Text style={styles.selectedBankShortName}>{selectedBank.shortName}</Text>
                <Text style={styles.selectedBankFullName} numberOfLines={1}>
                  {selectedBank.name}
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Số thẻ/tài khoản <Text style={styles.required}>*</Text></Text>
              </View>
              <Input
                placeholder="Nhập số thẻ / tài khoản"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
                style={styles.inputBig}
              />

              <Text style={styles.label}>Số tiền chuyển <Text style={styles.required}>*</Text></Text>
              <View style={styles.amountInputContainer}>
                <Input
                  placeholder="0"
                  value={formattedAmount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  style={styles.amountInput}
                />
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>đ</Text>
                </View>
              </View>

              <Text style={styles.label}>Lời nhắn (Tùy chọn)</Text>
              <Input
                placeholder="VD: Trả tiền phở, Chuyển cho A..."
                value={note}
                onChangeText={setNote}
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitleSmall}>✨ THIẾT LẬP PHÂN BỔ</Text>
              
              <Text style={styles.label}>Trích từ Nguồn tiền <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerContainer}>
                {wallets.map(w => (
                  <TouchableOpacity 
                    key={w.id} 
                    style={[styles.pickerItem, walletId === w.id && styles.pickerItemSelected]}
                    onPress={() => setWalletId(w.id)}
                  >
                    <Text style={[styles.pickerItemText, walletId === w.id && styles.pickerItemTextSelected]}>
                      {w.name} ({new Intl.NumberFormat("vi-VN").format(w.balance)}đ)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Danh mục <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerContainer}>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.pickerItem, categoryId === c.id && styles.pickerItemSelected]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[styles.pickerItemText, categoryId === c.id && styles.pickerItemTextSelected]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Chia sẻ Nhóm</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity 
                  style={[styles.pickerItem, groupId === "none" && styles.pickerItemSelected]}
                  onPress={() => setGroupId("none")}
                >
                  <Text style={[styles.pickerItemText, groupId === "none" && styles.pickerItemTextSelected]}>
                    Không chia
                  </Text>
                </TouchableOpacity>
                {groups.map(g => (
                  <TouchableOpacity 
                    key={g.id} 
                    style={[styles.pickerItem, groupId === g.id && styles.pickerItemSelected]}
                    onPress={() => setGroupId(g.id)}
                  >
                    <Text style={[styles.pickerItemText, groupId === g.id && styles.pickerItemTextSelected]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {step === 2 && matchingBudget && (
          <View style={styles.step2}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <ChevronLeft size={24} color={colors.slate600} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Xác nhận chuyển khoản</Text>
            </View>

            <View style={styles.alertCard}>
              <Text style={styles.alertEmoji}>🤔</Text>
              <Text style={styles.alertText}>
                Có phải bạn vừa thanh toán <Text style={styles.alertHighlight}>{matchingBudget.categoryName}</Text> tháng này: <Text style={styles.alertAmount}>{formattedAmount}đ</Text> không?
              </Text>

              <View style={styles.budgetStatus}>
                {matchingBudget.limitAmount - matchingBudget.spentAmount - Number(amount) >= 0 ? (
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>Ngân sách còn thừa:</Text>
                    <Text style={styles.budgetGood}>
                      {new Intl.NumberFormat("vi-VN").format(matchingBudget.limitAmount - matchingBudget.spentAmount - Number(amount))}đ
                    </Text>
                  </View>
                ) : (
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>Bị vượt ngân sách:</Text>
                    <Text style={styles.budgetBad}>
                      {new Intl.NumberFormat("vi-VN").format(Math.abs(matchingBudget.limitAmount - matchingBudget.spentAmount - Number(amount)))}đ
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {step > 0 && (
          <View style={styles.footer}>
            <Button
              title={step === 1 ? "Tiếp tục" : "Xác nhận & Chuyển tiền"}
              onPress={step === 1 ? handleNextToConfirm : executeTransfer}
              loading={loading}
              style={{ backgroundColor: colors.rose600 }}
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  step0: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate100,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.slate600,
    marginBottom: 12,
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  bankItem: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bankShortName: {
    fontSize: 11,
    fontWeight: "900",
  },
  bankName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate700,
    textAlign: "center",
  },
  step1: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.slate800,
  },
  selectedBankCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: -16,
    zIndex: 1,
  },
  selectedBankLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedBankInfo: {
    flex: 1,
  },
  selectedBankShortName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  selectedBankFullName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    paddingTop: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.slate500,
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: colors.rose500,
  },
  inputBig: {
    backgroundColor: colors.slate50,
    borderWidth: 0,
    fontSize: 16,
    fontWeight: "bold",
  },
  amountInputContainer: {
    position: "relative",
  },
  amountInput: {
    borderWidth: 0,
    borderBottomWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: "transparent",
    fontSize: 24,
    fontWeight: "900",
    color: colors.slate800,
    paddingRight: 40,
    paddingLeft: 0,
    borderRadius: 0,
  },
  currencyBadge: {
    position: "absolute",
    right: 8,
    top: 12,
    width: 28,
    height: 28,
    backgroundColor: colors.slate100,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.slate500,
  },
  sectionTitleSmall: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.rose600,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.rose50,
    paddingBottom: 8,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  pickerItemSelected: {
    backgroundColor: colors.rose50,
    borderColor: colors.rose200,
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate600,
  },
  pickerItemTextSelected: {
    color: colors.rose600,
  },
  step2: {
    paddingHorizontal: 16,
  },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.emerald100,
  },
  alertEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  alertText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.slate800,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  alertHighlight: {
    color: colors.emerald600,
    fontWeight: "bold",
  },
  alertAmount: {
    color: colors.rose500,
    fontWeight: "900",
  },
  budgetStatus: {
    width: "100%",
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.slate600,
  },
  budgetGood: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.emerald600,
  },
  budgetBad: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.rose500,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: colors.slate100,
  },
});
