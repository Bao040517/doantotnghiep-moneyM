import { describe, it } from "node:test";
import assert from "node:assert";

describe("Frontend Auth & Registration Validation Tests", () => {
  const isGmailValid = (email: string): boolean => {
    return /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(email.trim());
  };

  const isPasswordValid = (password: string): boolean => {
    const isLengthValid = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return isLengthValid && hasLetter && hasNumber;
  };

  describe("1. Gmail Format Validation", () => {
    it("Chấp nhận các email Gmail hợp lệ", () => {
      assert.strictEqual(isGmailValid("user@gmail.com"), true);
      assert.strictEqual(isGmailValid("user.name+tag@gmail.com"), true);
      assert.strictEqual(isGmailValid("USER@GMAIL.COM"), true);
      assert.strictEqual(isGmailValid("user123_456@gmail.com"), true);
      assert.strictEqual(isGmailValid("  myname@gmail.com  "), true);
    });

    it("Từ chối các email không phải đuôi @gmail.com", () => {
      assert.strictEqual(isGmailValid("user@yahoo.com"), false);
      assert.strictEqual(isGmailValid("user@outlook.com"), false);
      assert.strictEqual(isGmailValid("user@gmail.vn"), false);
      assert.strictEqual(isGmailValid("user@gmail.com.vn"), false);
      assert.strictEqual(isGmailValid("user@company.org"), false);
    });

    it("Từ chối các chuỗi email sai cú pháp hoặc rỗng", () => {
      assert.strictEqual(isGmailValid(""), false);
      assert.strictEqual(isGmailValid("invalid-email"), false);
      assert.strictEqual(isGmailValid("@gmail.com"), false);
      assert.strictEqual(isGmailValid("user@"), false);
    });
  });

  describe("2. Password Format Validation (Ít nhất 6 ký tự, cả chữ & số)", () => {
    it("Chấp nhận mật khẩu hợp lệ (có cả chữ và số, >= 6 ký tự)", () => {
      assert.strictEqual(isPasswordValid("Pass123"), true);
      assert.strictEqual(isPasswordValid("Password2026"), true);
      assert.strictEqual(isPasswordValid("12345a"), true);
      assert.strictEqual(isPasswordValid("a1b2c3"), true);
      assert.strictEqual(isPasswordValid("P@ssw0rd!"), true);
    });

    it("Từ chối mật khẩu dưới 6 ký tự dù có cả chữ và số", () => {
      assert.strictEqual(isPasswordValid("Ab1"), false);
      assert.strictEqual(isPasswordValid("P1234"), false);
      assert.strictEqual(isPasswordValid("a1"), false);
    });

    it("Từ chối mật khẩu chỉ có chữ cái (không có số)", () => {
      assert.strictEqual(isPasswordValid("PasswordOnly"), false);
      assert.strictEqual(isPasswordValid("abcdefgh"), false);
    });

    it("Từ chối mật khẩu chỉ có số (không có chữ cái)", () => {
      assert.strictEqual(isPasswordValid("12345678"), false);
      assert.strictEqual(isPasswordValid("999999"), false);
    });

    it("Từ chối mật khẩu rỗng", () => {
      assert.strictEqual(isPasswordValid(""), false);
    });
  });
});
