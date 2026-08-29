import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseScannedQr } from "../utils/qrParser";

describe("Frontend Universal QR Parser Tests", () => {
  const sampleGroupId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const sampleUserId = "f9e8d7c6-b5a4-3210-9876-543210fedcba";

  it("1. Parse Group Invite qua ShareMoney Web URL", () => {
    const raw = `https://sharemoney.app/groups/${sampleGroupId}`;
    const result = parseScannedQr(raw);
    assert.equal(result.type, "GROUP_INVITE");
    assert.equal(result.groupId, sampleGroupId);
  });

  it("2. Parse Group Invite qua Join Link tham số query", () => {
    const raw = `https://sharemoney.app/join-group?groupId=${sampleGroupId}`;
    const result = parseScannedQr(raw);
    assert.equal(result.type, "GROUP_INVITE");
    assert.equal(result.groupId, sampleGroupId);
  });

  it("3. Parse Group Invite qua Custom Scheme Deep Link", () => {
    const raw = `sharemoney://group/${sampleGroupId}/join`;
    const result = parseScannedQr(raw);
    assert.equal(result.type, "GROUP_INVITE");
    assert.equal(result.groupId, sampleGroupId);
  });

  it("4. Parse Group Invite qua JSON payload", () => {
    const raw = JSON.stringify({
      type: "GROUP_INVITE",
      groupId: sampleGroupId,
      groupName: "Hội Bạn Thân",
    });
    const result = parseScannedQr(raw);
    assert.equal(result.type, "GROUP_INVITE");
    assert.equal(result.groupId, sampleGroupId);
    assert.equal(result.payload?.groupName, "Hội Bạn Thân");
  });

  it("5. Parse User Profile QR qua Web URL", () => {
    const raw = `https://sharemoney.app/user/${sampleUserId}`;
    const result = parseScannedQr(raw);
    assert.equal(result.type, "USER_PROFILE");
    assert.equal(result.userId, sampleUserId);
  });

  it("6. Parse User Profile QR qua Custom Scheme", () => {
    const raw = `sharemoney://user/${sampleUserId}`;
    const result = parseScannedQr(raw);
    assert.equal(result.type, "USER_PROFILE");
    assert.equal(result.userId, sampleUserId);
  });

  it("7. Parse User Profile QR qua JSON payload", () => {
    const raw = JSON.stringify({
      type: "USER_PROFILE",
      userId: sampleUserId,
      name: "Nguyen Van B",
      phone: "0912345678",
    });
    const result = parseScannedQr(raw);
    assert.equal(result.type, "USER_PROFILE");
    assert.equal(result.userId, sampleUserId);
    assert.equal(result.payload?.name, "Nguyen Van B");
  });

  it("8. Parse Hoá đơn điện tử E-Invoice (WinMart, Circle K, Sawaco...)", () => {
    const raw = "https://hoadon.winmart.vn/tra-cuu?code=HD123456";
    const result = parseScannedQr(raw);
    assert.equal(result.type, "RECEIPT_URL");
    assert.equal(result.url, raw);
  });

  it("9. Parse VietQR chuyển khoản ngân hàng", () => {
    const raw = "00020101021238540010A0000007270124000697042201101090888899953037045802VN5913NGUYEN VAN A63041234";
    const result = parseScannedQr(raw);
    assert.equal(result.type, "VIETQR");
  });

  it("10. Parse chuỗi rỗng hoặc rác -> OTHER", () => {
    const resultEmpty = parseScannedQr("");
    assert.equal(resultEmpty.type, "OTHER");

    const resultRandom = parseScannedQr("Xin chao the gioi");
    assert.equal(resultRandom.type, "OTHER");
  });
});
