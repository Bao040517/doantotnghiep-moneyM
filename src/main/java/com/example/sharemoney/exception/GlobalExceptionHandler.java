package com.example.sharemoney.exception;

import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Bắt AppException từ Service layer */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, Object>> handleAppException(AppException ex) {
        return ResponseEntity.status(ex.getErrorCode().getStatus())
                .body(buildBody(ex.getErrorCode().getStatus().value(), ex.getMessage()));
    }

    /** Bắt lỗi 404 để không bị bắt bởi Exception.class (trả về 500) */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity.status(404).body(buildBody(404, "Không tìm thấy tài nguyên."));
    }

    /** Bắt lỗi @Valid — trả về field-level errors */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        Map<String, Object> body = buildBody(400, "Dữ liệu không hợp lệ.");
        body.put("errors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    /** Bắt lỗi JSON không đọc được (body rỗng, sai format, sai kiểu dữ liệu) */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableJson(
            HttpMessageNotReadableException ex) {
        log.warn("Request body không đọc được: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(buildBody(400, "Dữ liệu gửi lên không đúng định dạng JSON."));
    }

    /** Bắt lỗi validate trên @PathVariable / @RequestParam (ví dụ UUID sai format) */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(
            ConstraintViolationException ex) {
        String details =
                ex.getConstraintViolations().stream()
                        .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                        .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(buildBody(400, "Tham số không hợp lệ: " + details));
    }

    /** Bắt lỗi kiểu dữ liệu tham số (ví dụ gửi chuỗi "abc" thay vì UUID) */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {
        String paramName = ex.getName();
        String expectedType =
                ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String message = String.format("Tham số '%s' phải có kiểu '%s'.", paramName, expectedType);
        return ResponseEntity.badRequest().body(buildBody(400, message));
    }

    /** Bắt lỗi thiếu tham số bắt buộc trên URL */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(
            MissingServletRequestParameterException ex) {
        String message =
                String.format(
                        "Thiếu tham số bắt buộc: '%s' (kiểu %s).",
                        ex.getParameterName(), ex.getParameterType());
        return ResponseEntity.badRequest().body(buildBody(400, message));
    }

    /** Bắt lỗi vi phạm ràng buộc DB (duplicate key, FK, not null...) */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(
            DataIntegrityViolationException ex) {
        log.error("Lỗi ràng buộc dữ liệu: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(409)
                .body(buildBody(409, "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc."));
    }

    /** Bắt exception chưa xử lý — log server-side, trả generic message cho client */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getClass().getSimpleName(), ex);
        return ResponseEntity.internalServerError()
                .body(buildBody(500, "Lỗi hệ thống, vui lòng thử lại sau."));
    }

    private Map<String, Object> buildBody(int status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status);
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now().toString());
        return body;
    }
}
