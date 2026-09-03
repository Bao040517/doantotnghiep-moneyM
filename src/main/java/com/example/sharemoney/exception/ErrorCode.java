package com.example.sharemoney.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // --- Generic ---
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, vui lòng thử lại sau."),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ."),

    // --- User ---
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại trên hệ thống."),
    EMAIL_ALREADY_EXISTS(
            HttpStatus.CONFLICT,
            "Địa chỉ email này đã được đăng ký. Mỗi tài khoản chỉ được dùng 1 email duy nhất."),
    PHONE_ALREADY_EXISTS(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng."),
    BANK_ACCOUNT_NOT_VERIFIED(
            HttpStatus.BAD_REQUEST,
            "Không thể sử dụng tài khoản ngân hàng khi chưa xác thực được STK và chủ tài khoản."),

    // --- Group ---
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy nhóm."),
    NOT_GROUP_MEMBER(HttpStatus.FORBIDDEN, "Bạn không phải thành viên nhóm này."),
    ALREADY_GROUP_MEMBER(HttpStatus.CONFLICT, "Người dùng đã là thành viên của nhóm này."),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong nhóm."),
    DEBT_NOT_SETTLED(
            HttpStatus.BAD_REQUEST,
            "Không thể xóa hoặc rời nhóm khi chưa tất toán công nợ (số dư nợ phải bằng 0)."),
    OWNER_CANNOT_LEAVE(
            HttpStatus.BAD_REQUEST,
            "Chủ nhóm không thể tự rời nhóm. Vui lòng chuyển quyền chủ nhóm trước."),
    CANNOT_REMOVE_OWNER(
            HttpStatus.BAD_REQUEST, "Không thể xóa chủ nhóm ra khỏi nhóm."),

    // --- Expense ---
    EXPENSE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khoản chi tiêu."),
    EXPENSE_ALREADY_SETTLED(
            HttpStatus.BAD_REQUEST, "Không thể sửa hoặc xoá khoản chi đã được thanh toán."),
    CANNOT_MODIFY_SYSTEM_EXPENSE(
            HttpStatus.BAD_REQUEST, "Không thể sửa hoặc xoá khoản chi tự động của hệ thống."),
    TRANSACTION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch."),

    // --- PFM (Personal Financial Management) ---
    SPLIT_AMOUNT_MISMATCH(
            HttpStatus.BAD_REQUEST, "Tổng số tiền chia nhỏ không khớp với tổng số tiền giao dịch."),
    INVALID_SPLIT_CATEGORY_TYPE(
            HttpStatus.BAD_REQUEST, "Danh mục chia nhỏ phải cùng loại (Thu/Chi) với danh mục gốc."),
    WALLET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ví cá nhân."),
    WALLET_HAS_TRANSACTIONS(HttpStatus.BAD_REQUEST, "Không thể xóa ví đã có giao dịch."),
    INSUFFICIENT_WALLET_BALANCE(
            HttpStatus.BAD_REQUEST, "Số dư ví không đủ để thực hiện giao dịch."),
    INSUFFICIENT_SAVINGS_BALANCE(
            HttpStatus.BAD_REQUEST, "Số dư trong mục tiêu tiết kiệm không đủ để rút."),
    SAFETY_RESERVE_VIOLATION(
            HttpStatus.BAD_REQUEST,
            "Số dư ví không đủ để đảm bảo quỹ dự trữ an toàn cho ngân sách và nợ phải trả."),
    SAVINGS_ALREADY_ALLOCATED_THIS_MONTH(
            HttpStatus.BAD_REQUEST,
            "Mỗi tháng chỉ được thực hiện phân bổ tiết kiệm tự động 1 lần duy nhất."),
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục."),
    BUDGET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ngân sách."),
    LOAN_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khoản vay."),
    SAVINGS_GOAL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy mục tiêu tiết kiệm."),
    PAYEE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy người thụ hưởng."),
    ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài sản."),
    ASSET_ACCESS_DENIED(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên tài sản này."),

    CUSTOM_SPLIT_MISMATCH(
            HttpStatus.BAD_REQUEST,
            "Tổng số tiền chia tùy chỉnh không khớp với tổng tiền chi tiêu."),

    // --- Auth ---
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để thực hiện thao tác này."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không đúng."),
    REFRESH_TOKEN_EXPIRED(
            HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."),
    INVALID_REFRESH_TOKEN(
            HttpStatus.UNAUTHORIZED, "Mã làm mới (Refresh Token) không hợp lệ hoặc đã bị thu hồi."),
    OTP_INVALID(HttpStatus.BAD_REQUEST, "Mã xác thực OTP không chính xác."),
    OTP_EXPIRED(HttpStatus.BAD_REQUEST, "Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu mã mới."),
    OTP_MAX_ATTEMPTS_EXCEEDED(
            HttpStatus.BAD_REQUEST,
            "Bạn đã nhập sai mã OTP quá số lần quy định. Vui lòng yêu cầu mã mới.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
