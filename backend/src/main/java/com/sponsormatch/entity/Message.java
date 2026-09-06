package com.sponsormatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "conversation_id")
  private Conversation conversation;

  @ManyToOne(optional = false)
  @JoinColumn(name = "sender_id")
  private User sender;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String message;

  @Column(nullable = false)
  private boolean isRead;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }
}
