package com.sponsormatch.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/** Logs only safe metadata to confirm the environment-supplied OpenRouter key is loaded. */
@Component
@Slf4j
public class OpenRouterDiagnostics {
    @Value("${openrouter.api-key:}")
    private String apiKey;

    @PostConstruct
    void logKeyConfiguration() {
        boolean present = apiKey != null && !apiKey.isBlank();
        int length = present ? apiKey.trim().length() : 0;
        log.info("[OPENROUTER_DIAGNOSTIC] API key present={}, length={}, fingerprint={}",
            present, length, present ? fingerprint(apiKey.trim()) : "n/a");
    }

    private String fingerprint(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 8);
        } catch (Exception ignored) {
            return "unavailable";
        }
    }
}
