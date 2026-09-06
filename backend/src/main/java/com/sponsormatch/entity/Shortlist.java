package com.sponsormatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "shortlists", uniqueConstraints = @UniqueConstraint(columnNames = {"brand_id", "creator_id", "campaign_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Shortlist {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional = false) @JoinColumn(name = "brand_id") private User brand;
  @ManyToOne(optional = false) @JoinColumn(name = "creator_id") private User creator;
  @ManyToOne(optional = false) @JoinColumn(name = "campaign_id") private Campaign campaign;
  @Column(nullable = false, updatable = false) private Instant createdAt;
  @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
