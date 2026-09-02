import { test, describe } from "node:test";
import assert from "node:assert";
import { extractErrorMessage, extractErrorCode } from "../utils/errorHandler";

describe("Frontend Error Handler Tests", () => {
  test("1. Trích xuất message khi mất mạng (ERR_NETWORK)", () => {
    const error = { code: "ERR_NETWORK", message: "Network Error" };
    const msg = extractErrorMessage(error);
    assert.strictEqual(
      msg,
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền Internet hoặc thử lại sau."
    );
  });

  test("2. Trích xuất message khi timeout (ECONNABORTED)", () => {
    const error = { code: "ECONNABORTED", message: "timeout of 30000ms exceeded" };
    const msg = extractErrorMessage(error);
    assert.strictEqual(msg, "Yêu cầu xử lý quá thời gian chờ (Timeout). Vui lòng thử lại sau.");
  });

  test("3. Trích xuất message từ Spring Boot ErrorResponse", () => {
    const error = {
      response: {
        status: 400,
        data: {
          status: 400,
          errorCode: "INSUFFICIENT_WALLET_BALANCE",
          message: "Số dư ví không đủ để thực hiện giao dịch.",
        },
      },
    };
    const msg = extractErrorMessage(error);
    const code = extractErrorCode(error);

    assert.strictEqual(msg, "Số dư ví không đủ để thực hiện giao dịch.");
    assert.strictEqual(code, "INSUFFICIENT_WALLET_BALANCE");
  });

  test("4. Trích xuất validation field errors từ backend", () => {
    const error = {
      response: {
        status: 400,
        data: {
          status: 400,
          errorCode: "VALIDATION_ERROR",
          message: "Dữ liệu không hợp lệ.",
          errors: {
            amount: "Số tiền phải lớn hơn 0",
            categoryId: "Danh mục không được để trống",
          },
        },
      },
    };
    const msg = extractErrorMessage(error);
    assert.ok(msg.includes("Số tiền phải lớn hơn 0"));
    assert.ok(msg.includes("Danh mục không được để trống"));
  });

  test("5. Xử lý HTTP status code khi không có message cụ thể", () => {
    const err401 = { response: { status: 401 } };
    assert.strictEqual(
      extractErrorMessage(err401),
      "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại."
    );

    const err403 = { response: { status: 403 } };
    assert.strictEqual(
      extractErrorMessage(err403),
      "Bạn không có quyền thực hiện thao tác này."
    );

    const err404 = { response: { status: 404 } };
    assert.strictEqual(
      extractErrorMessage(err404),
      "Không tìm thấy dữ liệu yêu cầu trên máy chủ."
    );

    const err500 = { response: { status: 500 } };
    assert.strictEqual(
      extractErrorMessage(err500),
      "Máy chủ đang gặp sự cố gián đoạn. Vui lòng thử lại sau ít phút."
    );
  });

  test("6. Fallback khi truyền null/undefined hoặc chuỗi rỗng", () => {
    assert.strictEqual(
      extractErrorMessage(null, "Lỗi mặc định"),
      "Lỗi mặc định"
    );
    assert.strictEqual(
      extractErrorMessage(undefined, "Lỗi mặc định"),
      "Lỗi mặc định"
    );
  });

  test("7. Xử lý khi lỗi là chuỗi thô", () => {
    assert.strictEqual(
      extractErrorMessage("Lỗi kết nối từ bên thứ ba"),
      "Lỗi kết nối từ bên thứ ba"
    );
  });

  test("8. Xử lý khi lỗi là Error instance", () => {
    const error = new Error("Custom JS Exception");
    assert.strictEqual(extractErrorMessage(error), "Custom JS Exception");
  });
});
