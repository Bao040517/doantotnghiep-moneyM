package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.VietQrRequest;
import com.example.sharemoney.dto.response.VietQrResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VietQrService {

    private final UserRepository userRepository;
    private final BankLookupService bankLookupService;

    // URL base của Quick Link VietQR.io
    // Format: https://img.vietqr.io/image/{bank_bin}-{bank_account}-{template}.png
    private static final String VIETQR_BASE_URL = "https://img.vietqr.io/image";
    private static final String TEMPLATE = "compact2"; // compact, compact2, qr_only

    @Transactional(readOnly = true)
    public VietQrResponse generateQrLink(VietQrRequest request) {
        User receiver =
                userRepository
                        .findById(request.getReceiverId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (receiver.getBankBin() == null || receiver.getBankAccountNo() == null) {
            return VietQrResponse.builder()
                    .message("Người nhận chưa thiết lập thông tin ngân hàng. Không thể tạo mã QR.")
                    .build();
        }

        var lookup =
                bankLookupService.lookupAccount(receiver.getBankBin(), receiver.getBankAccountNo());
        if (!lookup.isVerified()
                || lookup.getAccountName() == null
                || lookup.getAccountName().isBlank()) {
            return VietQrResponse.builder()
                    .message(
                            "STK hoặc chủ tài khoản chưa được ngân hàng xác thực. Không thể tạo mã QR.")
                    .build();
        }

        // Tên tài khoản thường viết hoa, không dấu (ngân hàng quy định)
        String accountName = removeDiacritics(lookup.getAccountName()).toUpperCase();

        // Nội dung mặc định nếu null
        String description =
                request.getDescription() != null ? request.getDescription() : "Thanh toan tien";

        // URL encode các param để gắn vào query string
        String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
        String encodedDescription =
                URLEncoder.encode(removeDiacritics(description), StandardCharsets.UTF_8);

        // Làm tròn số tiền (VND không có số thập phân)
        BigDecimal roundedAmount = request.getAmount().setScale(0, java.math.RoundingMode.HALF_UP);

        // Ghép chuỗi URL
        String qrUrl =
                String.format(
                        "%s/%s-%s-%s.png?amount=%s&addInfo=%s&accountName=%s",
                        VIETQR_BASE_URL,
                        receiver.getBankBin(),
                        receiver.getBankAccountNo(),
                        TEMPLATE,
                        roundedAmount.toPlainString(),
                        encodedDescription,
                        encodedAccountName);

        return VietQrResponse.builder().qrUrl(qrUrl).message("Tạo mã QR thành công.").build();
    }

    /**
     * Bỏ dấu tiếng Việt (VD: "Nguyễn Văn A" -> "Nguyen Van A") vì VietQR/Ngân hàng thường không hỗ
     * trợ tốt dấu tiếng Việt trong addInfo.
     */
    private String removeDiacritics(String str) {
        if (str == null) return "";
        String nfdNormalizedString = Normalizer.normalize(str, Normalizer.Form.NFD);
        java.util.regex.Pattern pattern =
                java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(nfdNormalizedString)
                .replaceAll("")
                .replace("đ", "d")
                .replace("Đ", "D");
    }
}
