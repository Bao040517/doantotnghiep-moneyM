import { test, describe } from "node:test";
import assert from "node:assert";
import { parseBankNotificationText } from "../utils/bankNotificationParser";

describe("Frontend Bank Notification Parser Tests", () => {
  test("1. Parse thông báo trừ tiền Vietcombank (Ăn uống)", () => {
    const text = "VCB: 123456789 -55,000 VND luc 12:30. ND: Pho bo tai nam Ha Noi. So du: 2,500,000 VND.";
    const result = parseBankNotificationText(text);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.amount, 55000);
    assert.strictEqual(result.type, "EXPENSE");
    assert.strictEqual(result.bankName, "Vietcombank");
    assert.strictEqual(result.suggestedCategoryName, "Ăn uống");
  });

  test("2. Parse thông báo cộng lương Techcombank (Tiền lương)", () => {
    const text = "Techcombank: TK 19033333333333 +25,000,000 VND. ND: CTY ABC TRA LUONG THANG 8. So du: 30,000,000 VND.";
    const result = parseBankNotificationText(text);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.amount, 25000000);
    assert.strictEqual(result.type, "INCOME");
    assert.strictEqual(result.bankName, "Techcombank");
    assert.strictEqual(result.suggestedCategoryName, "Tiền lương");
  });

  test("3. Parse thông báo tiền điện EVN MBBank", () => {
    const text = "MBBank: TK 88888888 GD: -1,250,000 VND. ND: Thanh toan tien dien EVN thang 8.";
    const result = parseBankNotificationText(text);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.amount, 1250000);
    assert.strictEqual(result.type, "EXPENSE");
    assert.strictEqual(result.bankName, "MBBank");
    assert.strictEqual(result.suggestedCategoryName, "Tiền điện");
  });

  test("4. Parse thông báo đi lại Grab / Xăng xe VPBank", () => {
    const text = "VPBank: The 4567 GD: -85,000 VND. ND: Grab Car di lam.";
    const result = parseBankNotificationText(text);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.amount, 85000);
    assert.strictEqual(result.type, "EXPENSE");
    assert.strictEqual(result.bankName, "VPBank");
    assert.strictEqual(result.suggestedCategoryName, "Đi lại");
  });

  test("5. Parse thông báo siêu thị WinMart / Bách Hóa Xanh", () => {
    const text = "ACB: TK 12345 GD: -320.000d. ND: WinMart mua do gia dinh.";
    const result = parseBankNotificationText(text);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.amount, 320000);
    assert.strictEqual(result.type, "EXPENSE");
    assert.strictEqual(result.bankName, "ACB");
    assert.strictEqual(result.suggestedCategoryName, "Chi tiêu hàng ngày");
  });

  test("6. Parse tin nhắn rác hoặc không có số tiền -> isValid = false", () => {
    const text = "Chuc quy khach mot ngay tot lanh. Vui long lien he hotline 1900xxxx de duoc ho tro.";
    const result = parseBankNotificationText(text);

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.amount, 0);
  });

  test("7. Parse chuỗi rỗng hoặc null", () => {
    const result = parseBankNotificationText("");
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.amount, 0);
  });
});
