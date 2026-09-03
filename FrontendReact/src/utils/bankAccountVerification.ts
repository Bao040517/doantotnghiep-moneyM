export interface VerifiedBankAccount {
  bin: string;
  accountNumber: string;
  accountName?: string;
}

/** Xác thực và chuẩn hóa thông tin số tài khoản / mã BIN VietQR */
export async function verifyBankAccount(
  bin: string | undefined,
  accountNumber: string | undefined,
  accountName?: string
): Promise<VerifiedBankAccount> {
  const cleanBin = (bin || "").trim().replace(/\D/g, "");
  let cleanAccountNumber = (accountNumber || "").trim().replace(/\s/g, "");

  // Nếu có suffix dạng _username trong seed data (vd: 1012345678_ducbaoddb1705), làm sạch để lấy đúng STK
  if (cleanAccountNumber.includes("_")) {
    const parts = cleanAccountNumber.split("_");
    if (parts[0] && parts[0].length >= 4) {
      cleanAccountNumber = parts[0];
    }
  }

  // BIN ngân hàng chuẩn 6 số (mặc định MBBank 970422 nếu rỗng)
  const validBin = cleanBin.length === 6 ? cleanBin : (cleanBin || "970422");

  if (!cleanAccountNumber || cleanAccountNumber.length < 4) {
    throw new Error("Số tài khoản ngân hàng không hợp lệ (yêu cầu từ 4 ký tự).");
  }

  return {
    bin: validBin,
    accountNumber: cleanAccountNumber,
    accountName: accountName?.trim() || "",
  };
}
