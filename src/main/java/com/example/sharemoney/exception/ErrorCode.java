package com.example.sharemoney.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // --- Generic ---
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, vui lòng thử lại sau."),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ."),

    // --- User ---
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "Email đã được sử dụng."),
    PHONE_ALREADY_EXISTS(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng."),

    // --- Group ---
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy nhóm."),
    NOT_GROUP_MEMBER(HttpStatus.FORBIDDEN, "Bạn không phải thành viên nhóm này."),
    ALREADY_GROUP_MEMBER(HttpStatus.CONFLICT, "Người dùng đã là thành viên của nhóm này."),

    // --- Expense ---
    EXPENSE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khoản chi tiêu."),
    EXPENSE_ALREADY_SETTLED(HttpStatus.BAD_REQUEST, "Không thể sửa hoặc xoá khoản chi đã được thanh toán."),
    CANNOT_MODIFY_SYSTEM_EXPENSE(HttpStatus.BAD_REQUEST, "Không thể sửa hoặc xoá khoản chi tự động của hệ thống."),
    TRANSACTION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch."),

    // --- PFM (Personal Financial Management) ---
    SPLIT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "Tổng số tiền chia nhỏ không khớp với tổng số tiền giao dịch."),
    INVALID_SPLIT_CATEGORY_TYPE(HttpStatus.BAD_REQUEST, "Danh mục chia nhỏ phải cùng loại (Thu/Chi) với danh mục gốc."),
    WALLET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ví cá nhân."),
    INSUFFICIENT_WALLET_BALANCE(HttpStatus.BAD_REQUEST, "Số dư ví không đủ để thực hiện giao dịch."),
    INSUFFICIENT_SAVINGS_BALANCE(HttpStatus.BAD_REQUEST, "Số dư trong mục tiêu tiết kiệm không đủ để rút."),
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục."),
    BUDGET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ngân sách."),
    LOAN_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khoản vay."),
    SAVINGS_GOAL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy mục tiêu tiết kiệm."),
    ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài sản."),
    ASSET_ACCESS_DENIED(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên tài sản này."),

    // --- Receipt OCR ---
    RECEIPT_SCAN_CONFIG_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Chưa cấu hình API Key cho dịch vụ quét hóa đơn."),
    RECEIPT_SCAN_FAILED(HttpStatus.BAD_REQUEST, "Không thể đọc hóa đơn. Vui lòng thử lại với ảnh rõ hơn."),
    CUSTOM_SPLIT_MISMATCH(HttpStatus.BAD_REQUEST, "Tổng số tiền chia tùy chỉnh không khớp với tổng tiền hóa đơn."),

    // --- Auth ---
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để thực hiện thao tác này."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
