package com.sponsormatch.dto;
import java.math.BigDecimal;
import java.util.List;

public record CreatorMatchResponse(
    Long creatorId,
    String name,
    String bio,
    String category,
    String platform,
    Long followers,
    BigDecimal engagementRate,
    String location,
    BigDecimal priceMin,
    BigDecimal priceMax,
    String profileImage,
    int matchScore,
    List<String> matchReasons,
    Integer ruleBasedScore,
    Integer aiSemanticScore,
    String aiCompatibility,
    String aiInsight,
    List<String> aiReasons,
    List<String> aiConcerns
) {
    public CreatorMatchResponse(
        Long creatorId,
        String name,
        String bio,
        String category,
        String platform,
        Long followers,
        BigDecimal engagementRate,
        String location,
        BigDecimal priceMin,
        BigDecimal priceMax,
        String profileImage,
        int matchScore,
        List<String> matchReasons
    ) {
        this(creatorId, name, bio, category, platform, followers, engagementRate, location, priceMin, priceMax, profileImage, matchScore, matchReasons, matchScore, null, null, null, null, null);
    }
}

