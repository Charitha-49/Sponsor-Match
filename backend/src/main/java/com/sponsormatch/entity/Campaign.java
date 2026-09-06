package com.sponsormatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Campaign {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional = false) @JoinColumn(name = "brand_id", nullable = false) private User brand;
  @Column(nullable = false) private String title;
  @Column(columnDefinition = "TEXT") private String description;
  private String category; private String platform; private String targetLocation;
  private Long minFollowers; private Long maxFollowers; private BigDecimal minEngagement; private BigDecimal maxBudget;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private CampaignStatus status;
  @Column(nullable = false, updatable = false) private Instant createdAt;
  @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); if (status == null) status = CampaignStatus.ACTIVE; }
}
