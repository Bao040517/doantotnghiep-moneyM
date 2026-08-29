package com.example.sharemoney.exception;

import com.example.sharemoney.dto.response.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Bắt AppException từ Service layer */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex) {
        HttpStatus status = ex.getErrorCode().getStatus();
        if (status.is5xxServerError()) {
            log.error("Lỗi nghiệp vụ hệ thống (5xx) [{}]: {}", ex.getErrorCode(), ex.getMessage(), ex);
        } else {
            log.warn("Ngoại lệ nghiệp vụ [{}]: {}", ex.getErrorCode(), ex.getMessage());
        }
        return ResponseEntity.status(status)
                .body(buildError(status.value(), ex.getErrorCode().name(), ex.getMessage()));
    }

    /** Bắt lỗi 404 để không bị bắt bởi Exception.class (trả về 500) */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tài nguyên: " + ex.getResourcePath()));
    }

    /** Bắt lỗi @Valid — trả về field-level errors */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        ErrorResponse body = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .errorCode("VALIDATION_ERROR")
                .message("Dữ liệu gửi lên không hợp lệ.")
                .errors(fieldErrors)
                .timestamp(LocalDateTime.now().toString())
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    /** Bắt lỗi JSON không đọc được (body rỗng, sai format, sai kiểu dữ liệu) */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableJson(HttpMessageNotReadableException ex) {
        log.warn("Request body không đọc được: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(buildError(400, "MALFORMED_JSON", "Dữ liệu gửi lên không đúng định dạng JSON."));
    }

    /** Bắt lỗi validate trên @PathVariable / @RequestParam (ví dụ UUID sai format) */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String details = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest()
                .body(buildError(400, "CONSTRAINT_VIOLATION", "Tham số không hợp lệ: " + details));
    }

    /** Bắt lỗi kiểu dữ liệu tham số (ví dụ gửi chuỗi 'abc' thay vì UUID / Long) */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String paramName = ex.getName();
        String expectedType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String message = String.format("Tham số '%s' phải có kiểu '%s'.", paramName, expectedType);
        return ResponseEntity.badRequest()
                .body(buildError(400, "TYPE_MISMATCH", message));
    }

    /** Bắt lỗi thiếu tham số bắt buộc trên URL */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        String message = String.format(
                "Thiếu tham số bắt buộc: '%s' (kiểu %s).",
                ex.getParameterName(), ex.getParameterType());
        return ResponseEntity.badRequest()
                .body(buildError(400, "MISSING_PARAMETER", message));
    }

    /** Bắt lỗi vi phạm ràng buộc DB (duplicate key, FK, not null...) */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("Lỗi ràng buộc dữ liệu: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildError(409, "DATA_INTEGRITY_VIOLATION", "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc cơ sở dữ liệu."));
    }

    /** Bắt lỗi quyền truy cập Security (403 Forbidden) */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Truy cập bị từ chối: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildError(403, "ACCESS_DENIED", "Bạn không có quyền thực hiện thao tác này."));
    }

    /** Bắt lỗi xác thực Security (401 Unauthorized) */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex) {
        log.warn("Xác thực thất bại: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(buildError(401, "UNAUTHORIZED", "Xác thực không thành công. Vui lòng đăng nhập lại."));
    }

    /** Bắt lỗi tải file dung lượng quá lớn (413 Payload Too Large) */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.warn("File tải lên vượt quá dung lượng cho phép: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(buildError(413, "FILE_TOO_LARGE", "Kích thước tập tin tải lên vượt quá giới hạn tối đa cho phép."));
    }

    /** Bắt lỗi phương thức HTTP không được hỗ trợ (405 Method Not Allowed) */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(buildError(405, "METHOD_NOT_ALLOWED", "Phương thức " + ex.getMethod() + " không được hỗ trợ cho endpoint này."));
    }

    /** Bắt lỗi định dạng phương tiện không được hỗ trợ (415 Unsupported Media Type) */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(buildError(415, "UNSUPPORTED_MEDIA_TYPE", "Định dạng dữ liệu gửi lên (Content-Type) không được hỗ trợ."));
    }

    /** Bắt exception chưa xử lý — log server-side kèm stack trace, trả generic message cho client */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled Exception [{}]: {}", ex.getClass().getName(), ex.getMessage(), ex);
        return ResponseEntity.internalServerError()
                .body(buildError(500, "INTERNAL_ERROR", "Lỗi hệ thống, vui lòng thử lại sau."));
    }

    private ErrorResponse buildError(int status, String errorCode, String message) {
        return ErrorResponse.builder()
                .status(status)
                .errorCode(errorCode)
                .message(message)
                .timestamp(LocalDateTime.now().toString())
                .build();
    }
}
