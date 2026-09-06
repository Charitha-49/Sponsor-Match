package com.sponsormatch.controller;

import com.sponsormatch.dto.MessageDtos.*;
import com.sponsormatch.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {
  private final MessageService messageService;

  @PostMapping
  public MessageResponse initiate(
      @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InitiateMessageRequest req
  ) {
    return messageService.initiate(userId, req);
  }

  @GetMapping("/conversations")
  public List<ConversationResponse> listConversations(@AuthenticationPrincipal Long userId) {
    return messageService.listConversations(userId);
  }

  @GetMapping("/conversations/{conversationId}")
  public List<MessageResponse> getMessages(
      @AuthenticationPrincipal Long userId,
      @PathVariable Long conversationId
  ) {
    return messageService.getMessages(userId, conversationId);
  }

  @PostMapping("/conversations/{conversationId}")
  public MessageResponse sendMessage(
      @AuthenticationPrincipal Long userId,
      @PathVariable Long conversationId,
      @Valid @RequestBody SendMessageRequest req
  ) {
    return messageService.sendMessage(userId, conversationId, req);
  }
}
