package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
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

    public ScanReceiptResponse scanReceiptFromUrl(String url) {
        try {
            // 1. Fetch HTML content from the URL
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                    .timeout(10000)
                    .get();
            
            // Extract text from HTML to reduce payload size
            String textContent = doc.text();

            // 2. Send the text content to Gemini for extraction
            return geminiService.extractReceiptFromHtml(textContent);

        } catch (Exception e) {
            log.error("Error scraping receipt from URL: {}", url, e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }
}
