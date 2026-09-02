package com.example.sharemoney.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    /**
     * Gửi email chứa mã OTP khôi phục mật khẩu.
     * Tự động fallback sang logging an toàn nếu SMTP chưa được cấu hình hoặc lỗi mạng.
     */
    public void sendOtpEmail(String toEmail, String otpCode) {
        log.info(
                "\n============================================================\n"
                        + "🔑 [SHAREMONEY OTP] Gửi mã OTP tới email: {}\n"
                        + "💎 Mã xác thực 6 chữ số: >>> {} <<<\n"
                        + "⏳ Thời hạn sử dụng: 5 phút\n"
                        + "============================================================",
                toEmail,
                otpCode);

        if (mailSender == null || fromEmail == null || fromEmail.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.info("[EmailService] SMTP chưa được cấu hình tài khoản gửi (MAIL_USERNAME/MAIL_PASSWORD), mã OTP đã ghi an toàn vào Server Console.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "ShareMoney App");
            helper.setTo(toEmail);
            helper.setSubject("💎 [" + otpCode + "] Mã xác thực đặt lại mật khẩu ShareMoney");

            String htmlContent = buildOtpHtmlTemplate(toEmail, otpCode);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("[EmailService] Gửi email OTP thành công tới: {}", toEmail);
        } catch (Exception e) {
            log.warn(
                    "[EmailService] Không thể gửi email qua SMTP ({}), người dùng vẫn có thể dùng mã từ Server Console: {}",
                    e.getMessage(),
                    otpCode);
        }
    }

    private String buildOtpHtmlTemplate(String email, String otpCode) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'></head>"
                + "<body style='font-family: Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px;'>"
                + "  <div style='max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;'>"
                + "    <div style='text-align: center; margin-bottom: 24px;'>"
                + "      <div style='display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 16px; background-color: #4F46E5; color: #FFFFFF; font-size: 28px;'>💎</div>"
                + "      <h2 style='color: #1E293B; margin: 12px 0 4px 0; font-size: 22px;'>ShareMoney</h2>"
                + "      <p style='color: #64748B; font-size: 14px; margin: 0;'>Quản lý tài chính cá nhân & nhóm thông minh</p>"
                + "    </div>"
                + "    <hr style='border: none; border-top: 1px solid #F1F5F9; margin: 20px 0;'/>"
                + "    <p style='color: #334155; font-size: 15px; line-height: 1.6;'>Xin chào,</p>"
                + "    <p style='color: #334155; font-size: 15px; line-height: 1.6;'>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản ShareMoney (<strong>" + email + "</strong>). Vui lòng sử dụng mã OTP bên dưới để hoàn tất:</p>"
                + "    <div style='background-color: #EEF2FF; border: 2px dashed #6366F1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;'>"
                + "      <span style='font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4F46E5; display: block;'>" + otpCode + "</span>"
                + "      <span style='font-size: 13px; color: #6366F1; display: block; margin-top: 6px;'>Mã xác thực có hiệu lực trong vòng 5 phút</span>"
                + "    </div>"
                + "    <p style='color: #64748B; font-size: 13px; line-height: 1.5;'>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu của bạn sẽ không bị thay đổi.</p>"
                + "    <hr style='border: none; border-top: 1px solid #F1F5F9; margin: 24px 0 16px 0;'/>"
                + "    <p style='text-align: center; color: #94A3B8; font-size: 12px; margin: 0;'>© 2026 ShareMoney Team. All rights reserved.</p>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }
}
