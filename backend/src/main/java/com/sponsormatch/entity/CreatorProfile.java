package com.sponsormatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "creator_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreatorProfile {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @OneToOne(optional = false) @JoinColumn(name = "user_id", nullable = false, unique = true) private User user;
  @Column(columnDefinition = "TEXT") private String bio;
  private String category; private String platform; private Long followers;
  private BigDecimal engagementRate; private String location;
  private BigDecimal priceMin; private BigDecimal priceMax; private String profileImage;
}
