package com.sponsormatch.controller;

import com.sponsormatch.dto.CreatorMatchResponse;
import com.sponsormatch.service.SmartMatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
@Slf4j
public class MatchingController {
    private final SmartMatchService service;

    @GetMapping("/campaign/{campaignId}")
    public List<CreatorMatchResponse> matches(@AuthenticationPrincipal Long userId, @PathVariable Long campaignId) {
        long endpointStart = System.nanoTime();
        log.info("[SMART_MATCH_TIMING] Endpoint started campaignId={} userId={}", campaignId, userId);
        try {
            return service.matches(userId, campaignId);
        } finally {
            log.info("[SMART_MATCH_TIMING] TOTAL: {} ms", elapsedMs(endpointStart));
        }
    }

    private long elapsedMs(long startedAt) { return (System.nanoTime() - startedAt) / 1_000_000; }
}
