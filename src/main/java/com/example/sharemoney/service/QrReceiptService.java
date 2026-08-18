package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.net.InetAddress;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class QrReceiptService {

    private final GeminiService geminiService;

    private static final int MAX_TEXT_LENGTH = 20000;
    private static final int MAX_BODY_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

    public ScanReceiptResponse scanReceiptFromUrl(String url) {
        validateUrlSafety(url);

        try {
            // 1. Fetch HTML content from the URL safely
            Document doc =
                    Jsoup.connect(url)
                            .userAgent(
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                                            + " (KHTML, like Gecko) Chrome/120.0.0.0"
                                            + " Safari/537.36")
                            .timeout(10000)
                            .maxBodySize(MAX_BODY_SIZE_BYTES)
                            .followRedirects(true)
                            .get();

            // Extract text from HTML to reduce payload size
            String textContent = doc.text();
            if (textContent == null || textContent.isBlank()) {
                log.warn("[QrReceipt] Scraped HTML text is empty from url: {}", url);
                throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
            }

            // Truncate if too long to prevent LLM prompt overflow
            if (textContent.length() > MAX_TEXT_LENGTH) {
                textContent = textContent.substring(0, MAX_TEXT_LENGTH);
            }

            // 2. Send the text content to Gemini for extraction
            return geminiService.extractReceiptFromHtml(textContent);

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error scraping receipt from URL: {}", url, e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    /**
     * Xác thực URL nhằm ngăn chặn lỗ hổng SSRF (Server-Side Request Forgery).
     * Chỉ cho phép giao thức http/https và cấm toàn bộ địa chỉ IP nội bộ, loopback, private networks.
     */
    private void validateUrlSafety(String urlString) {
        if (urlString == null || urlString.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }

        try {
            URI uri = URI.create(urlString.trim());
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                log.warn("[SSRF Defense] Blocked non-http(s) scheme: {}", scheme);
                throw new AppException(ErrorCode.VALIDATION_ERROR);
            }

            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR);
            }

            // Chặn các tên miền cục bộ phổ biến
            String lowerHost = host.toLowerCase();
            if (lowerHost.equals("localhost")
                    || lowerHost.endsWith(".local")
                    || lowerHost.endsWith(".internal")
                    || lowerHost.endsWith(".lan")) {
                log.warn("[SSRF Defense] Blocked internal host: {}", host);
                throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
            }

            // Phân giải DNS và kiểm tra các IP tương ứng
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress addr : addresses) {
                if (addr.isLoopbackAddress()
                        || addr.isAnyLocalAddress()
                        || addr.isLinkLocalAddress()
                        || addr.isSiteLocalAddress()
                        || addr.isMulticastAddress()) {
                    log.warn("[SSRF Defense] Blocked private/internal IP address: {} for host: {}", addr.getHostAddress(), host);
                    throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
                }
            }

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[SSRF Defense] Invalid or unresolvable URL: {}", urlString, e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }
}

