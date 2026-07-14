package com.example.sharemoney.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rate Limiting Filter sử dụng thuật toán Fixed Window.
 * - API thông thường: 60 requests/phút mỗi IP
 * - Auth endpoints (/api/auth/**): 10 requests/phút mỗi IP (chống brute-force)
 * 
 * Dùng ConcurrentHashMap in-memory. Phù hợp cho single-instance deployment.
 * Nếu deploy multi-instance, cần chuyển sang Redis-based rate limiting.
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    @Value("${rate.limit.requests-per-minute:60}")
    private int generalLimit;

    @Value("${rate.limit.auth.requests-per-minute:10}")
    private int authLimit;

    // Map: clientKey → RateLimitBucket
    private final Map<String, RateLimitBucket> buckets = new ConcurrentHashMap<>();

    // Cleanup stale entries mỗi 10 phút
    private final AtomicLong lastCleanup = new AtomicLong(System.currentTimeMillis());
    private static final long CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 phút

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();
        boolean isAuthEndpoint = path.startsWith("/api/auth");

        // Tạo key riêng cho auth endpoints (rate limit riêng)
        String key = isAuthEndpoint ? clientIp + ":auth" : clientIp + ":general";
        int limit = isAuthEndpoint ? authLimit : generalLimit;

        RateLimitBucket bucket = buckets.computeIfAbsent(key, k -> new RateLimitBucket());

        if (!bucket.tryConsume(limit)) {
            log.warn("[RateLimit] Blocked {} from {} (limit: {} req/min)", path, clientIp, limit);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"status\":429,\"message\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.\"}");
            return;
        }

        // Cleanup stale entries định kỳ
        cleanupIfNeeded();

        filterChain.doFilter(request, response);
    }

    /**
     * Lấy IP thật của client (xử lý proxy/load balancer).
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }

    /**
     * Dọn dẹp các bucket đã hết hạn (> 2 phút không có request).
     */
    private void cleanupIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - lastCleanup.get() > CLEANUP_INTERVAL_MS) {
            if (lastCleanup.compareAndSet(lastCleanup.get(), now)) {
                long threshold = now - 2 * 60 * 1000; // 2 phút
                buckets.entrySet().removeIf(e -> e.getValue().getWindowStart() < threshold);
            }
        }
    }

    /**
     * Fixed Window Rate Limit Bucket.
     * Reset counter mỗi 60 giây.
     */
    private static class RateLimitBucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private final AtomicLong windowStart = new AtomicLong(System.currentTimeMillis());

        boolean tryConsume(int limit) {
            long now = System.currentTimeMillis();
            long currentWindow = windowStart.get();

            // Reset nếu đã qua 60 giây
            if (now - currentWindow > 60_000) {
                windowStart.set(now);
                count.set(1);
                return true;
            }

            // Tăng counter
            return count.incrementAndGet() <= limit;
        }

        long getWindowStart() {
            return windowStart.get();
        }
    }
}
