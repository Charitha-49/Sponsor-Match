package com.sponsormatch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public final class MessageDtos {
  private MessageDtos() {}

  public record InitiateMessageRequest(
      @NotNull Long creatorId,
      Long campaignId,
      @NotBlank String message
  ) {}

  public record SendMessageRequest(
      @NotBlank String message
  ) {}

  public record MessageResponse(
      Long id,
      Long conversationId,
      Long senderId,
      String senderName,
      String message,
      boolean isRead,
      Instant createdAt
  ) {}

  public record ConversationResponse(
      Long id,
      Long brandId,
      String brandName,
      Long creatorId,
      String creatorName,
      Long campaignId,
      String campaignTitle,
      String lastMessage,
      Instant updatedAt,
      long unreadCount
  ) {}
}
