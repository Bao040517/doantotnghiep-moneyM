export interface VerifiedBankAccount {
  bin: string;
  accountNumber: string;
  accountName?: string;
}

/** Xác thực định dạng số tài khoản (6-19 số) và mã BIN (6 số). Không gọi API bên ngoài để tránh phát sinh chi phí. */
export async function verifyBankAccount(
  bin: string | undefined,
  accountNumber: string | undefined,
  accountName?: string
): Promise<VerifiedBankAccount> {
  const cleanBin = (bin || "").trim();
  const cleanAccountNumber = (accountNumber || "").replace(/\s/g, "");

  if (!/^\d{6}$/.test(cleanBin) || !/^\d{6,19}$/.test(cleanAccountNumber)) {
    throw new Error("Mã ngân hàng hoặc số tài khoản không đúng định dạng (yêu cầu từ 6 đến 19 chữ số).");
  }

  return {
    bin: cleanBin,
    accountNumber: cleanAccountNumber,
    accountName: accountName?.trim() || "",
  };
}
