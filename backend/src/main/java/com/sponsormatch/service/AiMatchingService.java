package com.sponsormatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sponsormatch.entity.Campaign;
import com.sponsormatch.entity.CreatorProfile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class AiMatchingService {

    @Value("${openrouter.api-key:}")
    private String apiKey;

    @Value("${openrouter.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${openrouter.model:liquid/lfm-2.5-2.6b:free}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache to prevent duplicate calls on page refresh: cacheKey -> Map<Long, AiEvaluation>
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

    private record CacheEntry(Map<Long, AiEvaluation> evaluations, long timestamp) {}

    public record AiEvaluation(
        Long creatorId,
        Integer semanticScore,
        String compatibility,
        List<String> reasons,
        List<String> concerns,
        String insight
    ) {}

    public Map<Long, AiEvaluation> evaluateCandidates(Campaign campaign, List<CreatorProfile> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return Collections.emptyMap();
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("OPENROUTER_API_KEY is not configured. Falling back to deterministic rule-based matching.");
            return Collections.emptyMap();
        }

        // Check cache
        String cacheKey = buildCacheKey(campaign, candidates);
        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp) < CACHE_TTL_MS) {
            log.info("Returning cached AI evaluations for campaign ID: {}", campaign.getId());
            return cached.evaluations;
        }

        long aiStartTime = System.nanoTime();
        try {
            log.info("[SMART_MATCH_TIMING] Invoking OpenRouter AI matching (SINGLE request for {} candidates) with model: {} for campaign ID: {}",
                candidates.size(), model, campaign.getId());

            String systemPrompt = buildSystemPrompt();
            String userPrompt = buildUserPrompt(campaign, candidates);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("temperature", 0.2);
            requestBody.put("max_tokens", 1500);

            Map<String, String> responseFormat = new HashMap<>();
            responseFormat.put("type", "json_object");
            requestBody.put("response_format", responseFormat);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", userPrompt));
            requestBody.put("messages", messages);

            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(Duration.ofSeconds(2));
            requestFactory.setReadTimeout(Duration.ofSeconds(8));

            RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("Authorization", "Bearer " + apiKey.trim())
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("HTTP-Referer", "http://localhost:8080")
                .defaultHeader("X-Title", "Sponsor Match")
                .build();

            log.info("[SMART_MATCH_TIMING] OpenRouter request dispatched...");
            long httpStart = System.nanoTime();
            String responseJson = client.post()
                .uri("/chat/completions")
                .body(requestBody)
                .retrieve()
                .body(String.class);
            long httpDuration = elapsedMs(httpStart);
            log.info("[SMART_MATCH_TIMING] OpenRouter request: {} ms (response size: {} chars)",
                httpDuration, (responseJson != null ? responseJson.length() : 0));
            log.info("[OPENROUTER_DIAGNOSTIC] model={}, httpStatus=200, duration={} ms, responseBody={}",
                model, httpDuration, sanitize(responseJson));

            long parseStart = System.nanoTime();
            Map<Long, AiEvaluation> results = parseAiResponse(responseJson);
            long parseDuration = elapsedMs(parseStart);
            log.info("[SMART_MATCH_TIMING] AI parsing: {} ms (evaluated {}/{} candidates)",
                parseDuration, results.size(), candidates.size());

            if (!results.isEmpty()) {
                cache.put(cacheKey, new CacheEntry(results, System.currentTimeMillis()));
            }
            long totalAiDuration = elapsedMs(aiStartTime);
            log.info("[SMART_MATCH_TIMING] Total AI evaluation round-trip: {} ms", totalAiDuration);
            return results;

        } catch (RestClientResponseException e) {
            long totalAiDuration = elapsedMs(aiStartTime);
            log.warn("[OPENROUTER_DIAGNOSTIC] model={}, httpStatus={}, duration={} ms, responseBody={}",
                model, e.getStatusCode().value(), totalAiDuration, sanitize(e.getResponseBodyAsString()));
            log.error("[SMART_MATCH_TIMING] AI Matching with OpenRouter returned HTTP {} after {} ms. Falling back to deterministic matching.",
                e.getStatusCode().value(), totalAiDuration);
            return Collections.emptyMap();
        } catch (Exception e) {
            long totalAiDuration = elapsedMs(aiStartTime);
            log.error("[SMART_MATCH_TIMING] AI Matching with OpenRouter failed/timed out after {} ms ({}). Falling back to deterministic matching.",
                totalAiDuration, e.getClass().getSimpleName());
            return Collections.emptyMap();
        }
    }

    private long elapsedMs(long startedAt) { return (System.nanoTime() - startedAt) / 1_000_000; }

    private String sanitize(String value) {
        if (value == null) return "";
        return value
            .replaceAll("(?i)(authorization\\s*[:=]\\s*)([^\\s,\\\"]+)", "$1[REDACTED]")
            .replaceAll("(?i)(bearer\\s+)([^\\s,\\\"]+)", "$1[REDACTED]")
            .replaceAll("(?i)(\\\"?(?:api[_-]?key|token|secret)\\\"?\\s*[:=]\\s*\\\")[^\\\"]+(\\\")", "$1[REDACTED]$2")
            .replaceAll("sk-[A-Za-z0-9_-]+", "[REDACTED]");
    }

    private String buildSystemPrompt() {
        return """
            You are an expert AI creator-brand matching engine for Sponsor Match.
            Evaluate candidates against campaign requirements for semantic synergy and audience alignment.
            Return ONLY a valid JSON object matching this schema:
            {
              "evaluations": [
                {
                  "creatorId": <number matching candidate creatorId>,
                  "semanticScore": <integer 0 to 100>,
                  "compatibility": <"Exceptional" | "Excellent" | "Strong" | "Moderate" | "Weak">,
                  "reasons": [<2 to 3 concise positive reasons>],
                  "concerns": [<0 to 2 potential concerns>],
                  "insight": <1-2 sentence executive summary>
                }
              ]
            }
            Pure JSON only, no markdown backticks.
            """;
    }

    private String buildUserPrompt(Campaign c, List<CreatorProfile> candidates) {
        StringBuilder sb = new StringBuilder();
        sb.append("Campaign:\n");
        sb.append("- Title: ").append(nz(c.getTitle())).append("\n");
        if (c.getDescription() != null && !c.getDescription().isBlank()) {
            String desc = c.getDescription().trim();
            sb.append("- Description: ").append(desc.length() > 200 ? desc.substring(0, 200) + "..." : desc).append("\n");
        }
        sb.append("- Category: ").append(nz(c.getCategory())).append("\n");
        sb.append("- Platform: ").append(nz(c.getPlatform())).append("\n");
        if (c.getTargetLocation() != null && !c.getTargetLocation().isBlank()) {
            sb.append("- Target Location: ").append(c.getTargetLocation().trim()).append("\n");
        }
        sb.append("- Target Followers: ").append(c.getMinFollowers() != null ? c.getMinFollowers() : 0)
          .append(" to ").append(c.getMaxFollowers() != null ? c.getMaxFollowers() : "any").append("\n");
        sb.append("- Min Engagement: ").append(c.getMinEngagement() != null ? c.getMinEngagement() : 0).append("%\n");
        sb.append("- Max Budget: ₹").append(c.getMaxBudget() != null ? c.getMaxBudget() : "flexible").append("\n\n");

        sb.append("Candidates:\n");
        for (CreatorProfile p : candidates) {
            sb.append("ID ").append(p.getId()).append(": ");
            sb.append(p.getUser() != null ? p.getUser().getName() : "Creator").append(" | ");
            sb.append("Category: ").append(nz(p.getCategory())).append(" | ");
            sb.append("Platform: ").append(nz(p.getPlatform())).append(" | ");
            sb.append("Followers: ").append(p.getFollowers() != null ? p.getFollowers() : 0).append(" | ");
            sb.append("Engagement: ").append(p.getEngagementRate() != null ? p.getEngagementRate() : 0).append("% | ");
            sb.append("Location: ").append(nz(p.getLocation())).append(" | ");
            sb.append("Price: ₹").append(p.getPriceMin() != null ? p.getPriceMin() : 0)
              .append("-₹").append(p.getPriceMax() != null ? p.getPriceMax() : 0).append("\n");
            if (p.getBio() != null && !p.getBio().isBlank()) {
                String bio = p.getBio().trim();
                sb.append("  Bio: ").append(bio.length() > 160 ? bio.substring(0, 160) + "..." : bio).append("\n");
            }
        }

        return sb.toString();
    }

    private Map<Long, AiEvaluation> parseAiResponse(String jsonResponse) {
        Map<Long, AiEvaluation> map = new HashMap<>();
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                log.warn("OpenRouter response did not contain choices");
                return map;
            }

            String content = choices.get(0).path("message").path("content").asText();
            if (content == null || content.isBlank()) {
                log.warn("OpenRouter response choice message content was empty");
                return map;
            }

            // Strip any accidental markdown formatting (e.g. ```json ... ```)
            String cleanJson = cleanMarkdownJson(content);

            JsonNode contentRoot = objectMapper.readTree(cleanJson);
            // Support both "evaluations" and "matches" keys seamlessly
            JsonNode evaluations = contentRoot.path("evaluations");
            if (!evaluations.isArray() || evaluations.isEmpty()) {
                evaluations = contentRoot.path("matches");
            }

            if (evaluations.isArray()) {
                for (JsonNode eval : evaluations) {
                    Long creatorId = eval.path("creatorId").asLong(0);
                    if (creatorId > 0) {
                        int score = Math.max(0, Math.min(100, eval.path("semanticScore").asInt(70)));
                        String compatibility = eval.path("compatibility").asText("Strong");
                        String insight = eval.path("insight").asText("");

                        List<String> reasons = new ArrayList<>();
                        JsonNode reasonsNode = eval.path("reasons");
                        if (reasonsNode.isArray()) {
                            for (JsonNode r : reasonsNode) {
                                if (!r.asText().isBlank()) reasons.add(r.asText());
                            }
                        }

                        List<String> concerns = new ArrayList<>();
                        JsonNode concernsNode = eval.path("concerns");
                        if (concernsNode.isArray()) {
                            for (JsonNode c : concernsNode) {
                                if (!c.asText().isBlank()) concerns.add(c.asText());
                            }
                        }

                        map.put(creatorId, new AiEvaluation(creatorId, score, compatibility, reasons, concerns, insight));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse OpenRouter JSON response: {}", e.getMessage());
        }
        return map;
    }

    private String cleanMarkdownJson(String raw) {
        String s = raw.trim();
        if (s.startsWith("```json")) {
            s = s.substring(7);
        } else if (s.startsWith("```")) {
            s = s.substring(3);
        }
        if (s.endsWith("```")) {
            s = s.substring(0, s.length() - 3);
        }
        return s.trim();
    }

    private String buildCacheKey(Campaign c, List<CreatorProfile> candidates) {
        StringBuilder sb = new StringBuilder();
        sb.append(c.getId()).append(":").append(c.getTitle()).append(":");
        for (CreatorProfile p : candidates) {
            sb.append(p.getId()).append("-");
        }
        return sb.toString();
    }

    private String nz(String val) {
        return val == null ? "" : val.trim();
    }
}
