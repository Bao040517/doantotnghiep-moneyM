package com.example.sharemoney.exception;

import static org.junit.jupiter.api.Assertions.*;

import com.example.sharemoney.dto.response.ErrorResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("Xử lý AppException (400): Trả về status, errorCode và message tương ứng")
    void testHandleAppException_BadRequest() {
        AppException ex = new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAppException(ex);

        assertNotNull(response.getBody());
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("INSUFFICIENT_WALLET_BALANCE", response.getBody().getErrorCode());
        assertEquals(ErrorCode.INSUFFICIENT_WALLET_BALANCE.getMessage(), response.getBody().getMessage());
        assertNotNull(response.getBody().getTimestamp());
    }

    @Test
    @DisplayName("Xử lý AppException (500 INTERNAL_ERROR)")
    void testHandleAppException_InternalError() {
        AppException ex = new AppException(ErrorCode.INTERNAL_ERROR);

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAppException(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("INTERNAL_ERROR", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý NoResourceFoundException (404)")
    void testHandleNotFound() {
        NoResourceFoundException ex = Mockito.mock(NoResourceFoundException.class);
        Mockito.when(ex.getResourcePath()).thenReturn("/api/unknown");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("RESOURCE_NOT_FOUND", response.getBody().getErrorCode());
        assertTrue(response.getBody().getMessage().contains("/api/unknown"));
    }

    @Test
    @DisplayName("Xử lý MethodArgumentNotValidException (Validation error)")
    void testHandleValidation() {
        MethodArgumentNotValidException ex = Mockito.mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = Mockito.mock(BindingResult.class);
        FieldError fieldError = new FieldError("userDto", "email", "Email không được để trống");

        Mockito.when(ex.getBindingResult()).thenReturn(bindingResult);
        Mockito.when(bindingResult.getFieldErrors()).thenReturn(java.util.List.of(fieldError));

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleValidation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("VALIDATION_ERROR", response.getBody().getErrorCode());
        assertNotNull(response.getBody().getErrors());
        assertEquals("Email không được để trống", response.getBody().getErrors().get("email"));
    }

    @Test
    @DisplayName("Xử lý HttpMessageNotReadableException (JSON sai định dạng)")
    void testHandleUnreadableJson() {
        HttpMessageNotReadableException ex = Mockito.mock(HttpMessageNotReadableException.class);
        Mockito.when(ex.getMessage()).thenReturn("Invalid JSON syntax");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleUnreadableJson(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("MALFORMED_JSON", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý ConstraintViolationException")
    void testHandleConstraintViolation() {
        ConstraintViolation<?> violation = Mockito.mock(ConstraintViolation.class);
        Path path = Mockito.mock(Path.class);
        Mockito.when(path.toString()).thenReturn("amount");
        Mockito.when(violation.getPropertyPath()).thenReturn(path);
        Mockito.when(violation.getMessage()).thenReturn("phải lớn hơn 0");

        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleConstraintViolation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("CONSTRAINT_VIOLATION", response.getBody().getErrorCode());
        assertTrue(response.getBody().getMessage().contains("amount: phải lớn hơn 0"));
    }

    @Test
    @DisplayName("Xử lý MethodArgumentTypeMismatchException (Sai kiểu dữ liệu tham số)")
    void testHandleTypeMismatch() {
        MethodArgumentTypeMismatchException ex = Mockito.mock(MethodArgumentTypeMismatchException.class);
        Mockito.when(ex.getName()).thenReturn("id");
        Mockito.doReturn(java.util.UUID.class).when(ex).getRequiredType();

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTypeMismatch(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("TYPE_MISMATCH", response.getBody().getErrorCode());
        assertTrue(response.getBody().getMessage().contains("UUID"));
    }

    @Test
    @DisplayName("Xử lý MissingServletRequestParameterException (Thiếu tham số bắt buộc)")
    void testHandleMissingParam() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("month", "int");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMissingParam(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("MISSING_PARAMETER", response.getBody().getErrorCode());
        assertTrue(response.getBody().getMessage().contains("month"));
    }

    @Test
    @DisplayName("Xử lý DataIntegrityViolationException (409 Conflict)")
    void testHandleDataIntegrity() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Unique index violation", new RuntimeException("duplicate key"));

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleDataIntegrity(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("DATA_INTEGRITY_VIOLATION", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý AccessDeniedException (403 Forbidden)")
    void testHandleAccessDenied() {
        AccessDeniedException ex = new AccessDeniedException("Access is denied");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAccessDenied(ex);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("ACCESS_DENIED", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý AuthenticationException (401 Unauthorized)")
    void testHandleAuthentication() {
        AuthenticationException ex = Mockito.mock(AuthenticationException.class);
        Mockito.when(ex.getMessage()).thenReturn("Bad credentials");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAuthentication(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("UNAUTHORIZED", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý MaxUploadSizeExceededException (413 Payload Too Large)")
    void testHandleMaxUploadSize() {
        MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(5242880);

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMaxUploadSize(ex);

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
        assertEquals("FILE_TOO_LARGE", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý HttpRequestMethodNotSupportedException (405 Method Not Allowed)")
    void testHandleMethodNotSupported() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMethodNotSupported(ex);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertEquals("METHOD_NOT_ALLOWED", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý HttpMediaTypeNotSupportedException (415 Unsupported Media Type)")
    void testHandleMediaTypeNotSupported() {
        HttpMediaTypeNotSupportedException ex = new HttpMediaTypeNotSupportedException("application/xml");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMediaTypeNotSupported(ex);

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertEquals("UNSUPPORTED_MEDIA_TYPE", response.getBody().getErrorCode());
    }

    @Test
    @DisplayName("Xử lý Exception chung (500 Internal Server Error)")
    void testHandleGeneric() {
        NullPointerException ex = new NullPointerException("Null reference encountered");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGeneric(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("INTERNAL_ERROR", response.getBody().getErrorCode());
        assertEquals("Lỗi hệ thống, vui lòng thử lại sau.", response.getBody().getMessage());
    }
}
