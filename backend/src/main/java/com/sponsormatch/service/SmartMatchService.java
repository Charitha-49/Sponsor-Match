package com.sponsormatch.service;

import com.sponsormatch.dto.CreatorMatchResponse;
import com.sponsormatch.entity.*;
import com.sponsormatch.repository.CreatorProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.*;
import java.util.*;
import java.util.concurrent.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmartMatchService {

    private static final int THRESHOLD = 35;
    public static final double RULE_BASED_WEIGHT = 0.70;
    public static final double AI_SEMANTIC_WEIGHT = 0.30;
    private static final int MAX_AI_CANDIDATES = 6;

    private final CampaignService campaigns;
    private final CreatorProfileRepository profiles;
    private final AiMatchingService aiMatchingService;

    // Fast in-memory cache for repeated campaign matching (TTL = 5 minutes)
    private final Map<Long, CacheEntry> campaignMatchCache = new ConcurrentHashMap<>();
    private static final long MATCH_CACHE_TTL_MS = 5 * 60 * 1000;
    private record CacheEntry(List<CreatorMatchResponse> responses, long timestamp) {}

    public List<CreatorMatchResponse> matches(Long userId, Long campaignId) {
        long matchStartTime = System.nanoTime();
        long campaignStart = System.nanoTime();
        Campaign c = campaigns.owned(userId, campaignId);
        log.info("[SMART_MATCH_TIMING] Loading campaign: {} ms", elapsedMs(campaignStart));

        CacheEntry cached = campaignMatchCache.get(campaignId);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp) < MATCH_CACHE_TTL_MS) {
            log.info("[SMART_MATCH_TIMING] Returning cached Smart Match results for campaign ID: {} in {} ms",
                campaignId, elapsedMs(matchStartTime));
            return cached.responses;
        }

        long dbStart = System.nanoTime();
        List<CreatorProfile> allProfiles = profiles.findAll();
        log.info("[SMART_MATCH_TIMING] Creator DB query: {} ms", elapsedMs(dbStart));

        // Stage 1: Deterministic rule-based candidate filtering and scoring
        long ruleStart = System.nanoTime();
        List<RuleMatch> initialMatches = allProfiles.stream()
            .map(p -> calculateRuleScore(c, p))
            .filter(r -> r.score >= THRESHOLD)
            .sorted(Comparator.comparingInt((RuleMatch r) -> r.score).reversed())
            .toList();

        log.info("[SMART_MATCH_TIMING] Rule-based matching: {} ms", elapsedMs(ruleStart));
        log.info("[SMART_MATCH_TIMING] Candidates before filtering: {}", allProfiles.size());
        log.info("[SMART_MATCH_TIMING] Candidates after deterministic eligibility: {}", initialMatches.size());

        if (initialMatches.isEmpty()) {
            return Collections.emptyList();
        }

        // Limit candidates sent to AI to top candidates (MAX_AI_CANDIDATES = 6)
        List<RuleMatch> candidates = initialMatches.stream()
            .limit(MAX_AI_CANDIDATES)
            .toList();

        List<CreatorProfile> candidateProfiles = candidates.stream()
            .map(cm -> cm.profile)
            .toList();
        log.info("[SMART_MATCH_TIMING] Candidates passed into AiMatchingService: {}", candidateProfiles.size());

        // Stage 2: Concurrent AI evaluation with strict timeout & graceful fallback
        long stage2Start = System.nanoTime();
        log.info("[SMART_MATCH_TIMING] Stage 2: Initiating SINGLE OpenRouter request for top {} candidates...", candidateProfiles.size());
        Map<Long, AiMatchingService.AiEvaluation> aiResults;
        try {
            aiResults = CompletableFuture.supplyAsync(() -> aiMatchingService.evaluateCandidates(c, candidateProfiles))
                .orTimeout(7, TimeUnit.SECONDS)
                .exceptionally(ex -> {
                    log.warn("[SMART_MATCH_TIMING] AI matching timed out or failed ({}). Gracefully falling back to deterministic scores.", ex.getMessage());
                    return Collections.emptyMap();
                })
                .join();
        } catch (Exception e) {
            log.warn("[SMART_MATCH_TIMING] AI matching async execution error ({}). Falling back to deterministic scores.", e.getMessage());
            aiResults = Collections.emptyMap();
        }
        long stage2Duration = elapsedMs(stage2Start);
        log.info("[SMART_MATCH_TIMING] Stage 2 (AI Semantic matching) completed in {} ms with {} evaluated candidates",
            stage2Duration, aiResults.size());

        long rankingStart = System.nanoTime();
        List<CreatorMatchResponse> finalMatches = new ArrayList<>();
        for (RuleMatch candidate : initialMatches) {
            CreatorProfile p = candidate.profile;
            int ruleScore = candidate.score;
            List<String> ruleReasons = candidate.reasons;

            AiMatchingService.AiEvaluation aiEval = aiResults.get(p.getId());

            int finalScore;
            Integer aiScore = null;
            String compatibility = null;
            String insight = null;
            List<String> aiReasons = Collections.emptyList();
            List<String> aiConcerns = Collections.emptyList();

            if (aiEval != null && aiEval.semanticScore() != null) {
                aiScore = aiEval.semanticScore();
                compatibility = aiEval.compatibility();
                insight = aiEval.insight();
                aiReasons = aiEval.reasons() != null ? aiEval.reasons() : Collections.emptyList();
                aiConcerns = aiEval.concerns() != null ? aiEval.concerns() : Collections.emptyList();

                double combined = (ruleScore * RULE_BASED_WEIGHT) + (aiScore * AI_SEMANTIC_WEIGHT);
                finalScore = (int) Math.round(combined);
            } else {
                // Graceful fallback to deterministic rule score
                finalScore = ruleScore;
                compatibility = ruleScore >= 80 ? "Strong Fit" : (ruleScore >= 60 ? "Moderate Fit" : "Standard Fit");
                insight = "Ranked using structured campaign requirements and creator profile parameters.";
            }

            // Merge reasons
            List<String> combinedReasons = new ArrayList<>(ruleReasons);
            for (String ar : aiReasons) {
                if (!combinedReasons.contains(ar)) {
                    combinedReasons.add(ar);
                }
            }

            finalMatches.add(new CreatorMatchResponse(
                p.getId(),
                p.getUser().getName(),
                p.getBio(),
                p.getCategory(),
                p.getPlatform(),
                p.getFollowers(),
                p.getEngagementRate(),
                p.getLocation(),
                p.getPriceMin(),
                p.getPriceMax(),
                p.getProfileImage(),
                finalScore,
                combinedReasons,
                ruleScore,
                aiScore,
                compatibility,
                insight,
                aiReasons,
                aiConcerns
            ));
        }

        // Rank creators by final matchScore descending
        List<CreatorMatchResponse> sortedMatches = finalMatches.stream()
            .sorted(Comparator.comparingInt(CreatorMatchResponse::matchScore).reversed())
            .toList();

        long rankingDuration = elapsedMs(rankingStart);
        long totalMatchDuration = elapsedMs(matchStartTime);
        log.info("[SMART_MATCH_TIMING] Final ranking: {} ms", rankingDuration);
        log.info("[SMART_MATCH_TIMING] Service TOTAL: {} ms ({} creators returned)", totalMatchDuration, sortedMatches.size());

        campaignMatchCache.put(campaignId, new CacheEntry(sortedMatches, System.currentTimeMillis()));
        return sortedMatches;
    }

    private record RuleMatch(CreatorProfile profile, int score, List<String> reasons) {}

    private RuleMatch calculateRuleScore(Campaign c, CreatorProfile p) {
        List<String> why = new ArrayList<>();
        double points = 0;

        if (eq(c.getCategory(), p.getCategory())) {
            points += 30;
            why.add("Category matches campaign");
        }
        if (eq(c.getPlatform(), p.getPlatform())) {
            points += 15;
            why.add("Platform matches campaign");
        }
        double e = engagement(c.getMinEngagement(), p.getEngagementRate());
        points += e;
        if (e == 20) why.add("Engagement meets or exceeds requirement");
        else if (e > 0) why.add("Engagement is partially aligned with requirement");

        double f = followers(c.getMinFollowers(), c.getMaxFollowers(), p.getFollowers());
        points += f;
        if (f == 15) why.add("Followers are within target range");
        else if (f > 0) why.add("Followers are near the target range");

        if (eq(c.getTargetLocation(), p.getLocation())) {
            points += 10;
            why.add("Location matches campaign");
        }
        double b = budget(c.getMaxBudget(), p.getPriceMin(), p.getPriceMax());
        points += b;
        if (b == 10) why.add("Creator fits campaign budget");
        else if (b > 0) why.add("Creator may fit campaign budget with negotiation");

        return new RuleMatch(p, (int) Math.round(points), why);
    }

    private boolean eq(String a, String b) {
        return a != null && !a.isBlank() && b != null && a.equalsIgnoreCase(b);
    }

    private double engagement(BigDecimal need, BigDecimal have) {
        if (need == null || need.signum() <= 0) return 20;
        if (have == null || have.signum() <= 0) return 0;
        return Math.min(20, 20 * have.doubleValue() / need.doubleValue());
    }

    private double followers(Long min, Long max, Long val) {
        if ((min == null || min <= 0) && (max == null || max <= 0)) return 15;
        long v = val == null ? 0 : val;
        long lo = min == null ? 0 : min;
        long hi = max == null || max <= 0 ? Long.MAX_VALUE : max;
        if (v >= lo && v <= hi) return 15;
        if (v < lo) return lo == 0 ? 0 : 15 * Math.max(0d, (double) v / lo);
        return hi == Long.MAX_VALUE ? 15 : 15 * Math.max(0d, 1d - (double) (v - hi) / hi);
    }

    private double budget(BigDecimal budget, BigDecimal low, BigDecimal high) {
        if (budget == null || budget.signum() <= 0) return 10;
        if (low == null) return 0;
        if (high != null && high.compareTo(budget) <= 0) return 10;
        if (low.compareTo(budget) <= 0) return 5;
        return 0;
    }

    private long elapsedMs(long startedAt) { return (System.nanoTime() - startedAt) / 1_000_000; }
}
