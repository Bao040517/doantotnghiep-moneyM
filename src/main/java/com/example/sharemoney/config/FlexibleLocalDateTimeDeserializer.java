package com.example.sharemoney.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt)
            throws IOException {
        String text = p.getText();
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        text = text.trim();

        // 1. Chỉ có ngày: YYYY-MM-DD (e.g. "2026-09-03")
        if (text.length() == 10 && text.charAt(4) == '-' && text.charAt(7) == '-') {
            return LocalDate.parse(text).atStartOfDay();
        }

        // 2. ISO Local Date Time: YYYY-MM-DDTHH:mm:ss
        try {
            return LocalDateTime.parse(text);
        } catch (Exception ignored) {
        }

        // 3. Offset Date Time: YYYY-MM-DDTHH:mm:ss+07:00
        try {
            return OffsetDateTime.parse(text).toLocalDateTime();
        } catch (Exception ignored) {
        }

        // 4. Instant format: YYYY-MM-DDTHH:mm:ss.SSSZ
        try {
            return Instant.parse(text).atZone(ZoneId.systemDefault()).toLocalDateTime();
        } catch (Exception ignored) {
        }

        return null;
    }
}
