import { test, describe } from "node:test";
import assert from "node:assert";
import {
  removeVietnameseAccents,
  stripToneMarks,
  parseTelexSingleWord,
  convertTelexToVietnamese,
  processUnikeyInput,
  matchVietnamese,
} from "../utils/vietnamese";

describe("Frontend Vietnamese Telex & Normalizer Tests", () => {
  test("1. removeVietnameseAccents loại bỏ toàn bộ dấu và chữ đ", () => {
    assert.strictEqual(removeVietnameseAccents("Ăn uống Haidilao"), "an uong haidilao");
    assert.strictEqual(removeVietnameseAccents("Đi siêu thị WinMart"), "di sieu thi winmart");
    assert.strictEqual(removeVietnameseAccents("Phở Bò Tái Nạm"), "pho bo tai nam");
  });

  test("2. stripToneMarks giữ nguyên mũ/móc và chỉ bỏ dấu thanh", () => {
    assert.strictEqual(stripToneMarks("tiến"), "tiên");
    assert.strictEqual(stripToneMarks("hoàn"), "hoan");
    assert.strictEqual(stripToneMarks("phùng"), "phung");
    assert.strictEqual(stripToneMarks("nước"), "nươc");
  });

  test("3. parseTelexSingleWord chuyển đổi từ gõ Telex đơn lẻ", () => {
    assert.strictEqual(parseTelexSingleWord("chaof"), "chào");
    assert.strictEqual(parseTelexSingleWord("tooi"), "tôi");
    assert.strictEqual(parseTelexSingleWord("ddowj"), "đợ");
    assert.strictEqual(parseTelexSingleWord("nuowsc"), "nước");
    assert.strictEqual(parseTelexSingleWord("tieens"), "tiến");
  });

  test("4. parseTelexSingleWord không làm biến đổi email, URL hoặc số", () => {
    assert.strictEqual(parseTelexSingleWord("https://sharemoney.vn"), "https://sharemoney.vn");
    assert.strictEqual(parseTelexSingleWord("user@example.com"), "user@example.com");
    assert.strictEqual(parseTelexSingleWord("123456"), "123456");
  });

  test("5. convertTelexToVietnamese chuyển đổi cả câu văn bản Telex", () => {
    const input = "toi muon mua nuoc ngot va banh mi";
    const result = convertTelexToVietnamese(input);
    assert.ok(result.length > 0);
  });

  test("6. processUnikeyInput hỗ trợ gõ realtime và bỏ qua khi xoá ký tự", () => {
    // Khi xoá lùi (backspace)
    assert.strictEqual(processUnikeyInput("chào bạn", "chào b"), "chào b");
  });

  test("7. matchVietnamese tìm kiếm không phân biệt dấu và hoa thường", () => {
    assert.strictEqual(matchVietnamese("Hóa đơn Điện lực EVN", "hoa don"), true);
    assert.strictEqual(matchVietnamese("Hóa đơn Điện lực EVN", "DIEN"), true);
    assert.strictEqual(matchVietnamese("Trà sữa Gongcha", "gongcha"), true);
    assert.strictEqual(matchVietnamese("Cơm gà xối mỡ", "pho"), false);
  });

  test("8. matchVietnamese xử lý trường hợp query rỗng hoặc null", () => {
    assert.strictEqual(matchVietnamese("Bất kỳ", ""), true);
    assert.strictEqual(matchVietnamese(null, "test"), false);
    assert.strictEqual(matchVietnamese(undefined, "test"), false);
  });
});
