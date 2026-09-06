package com.sponsormatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "collaboration_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollaborationRequest {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional = false) @JoinColumn(name = "campaign_id") private Campaign campaign;
  @ManyToOne(optional = false) @JoinColumn(name = "brand_id") private User brand;
  @ManyToOne(optional = false) @JoinColumn(name = "creator_id") private User creator;
  @Column(columnDefinition = "TEXT") private String message;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RequestStatus status;
  @Column(nullable = false, updatable = false) private Instant createdAt;
  @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); if (status == null) status = RequestStatus.PENDING; }
}
