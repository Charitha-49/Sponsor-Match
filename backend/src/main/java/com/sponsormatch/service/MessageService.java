package com.sponsormatch.service;

import com.sponsormatch.dto.MessageDtos.*;
import com.sponsormatch.entity.*;
import com.sponsormatch.exception.ApiException;
import com.sponsormatch.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MessageService {
  private final ConversationRepository conversations;
  private final MessageRepository messages;
  private final UserRepository users;
  private final CreatorProfileRepository profiles;
  private final CampaignRepository campaigns;
  private final NotificationRepository notifications;

  @Transactional
  public MessageResponse initiate(Long userId, InitiateMessageRequest req) {
    User sender = users.findById(userId)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

    final User brandUser = sender.getRole() == Role.BRAND ? sender : users.findById(req.creatorId())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Recipient brand not found"));
    final User creatorUser = sender.getRole() == Role.BRAND ? resolveCreator(req.creatorId()) : sender;
    final Campaign campaign = req.campaignId() != null ? campaigns.findById(req.campaignId()).orElse(null) : null;

    Conversation conversation;
    if (campaign != null) {
      conversation = conversations.findByBrandIdAndCreatorIdAndCampaignId(brandUser.getId(), creatorUser.getId(), campaign.getId())
          .orElseGet(() -> conversations.save(Conversation.builder()
              .brand(brandUser)
              .creator(creatorUser)
              .campaign(campaign)
              .createdAt(Instant.now())
              .updatedAt(Instant.now())
              .build()));
    } else {
      conversation = conversations.findByBrandIdAndCreatorIdAndCampaignIsNull(brandUser.getId(), creatorUser.getId())
          .orElseGet(() -> conversations.save(Conversation.builder()
              .brand(brandUser)
              .creator(creatorUser)
              .campaign(null)
              .createdAt(Instant.now())
              .updatedAt(Instant.now())
              .build()));
    }

    Message msg = messages.save(Message.builder()
        .conversation(conversation)
        .sender(sender)
        .message(req.message().trim())
        .isRead(false)
        .createdAt(Instant.now())
        .build());

    conversation.setUpdatedAt(Instant.now());
    conversations.save(conversation);

    User recipient = sender.getId().equals(brandUser.getId()) ? creatorUser : brandUser;
    notifications.save(Notification.builder()
        .user(recipient)
        .message("New message from " + sender.getName() + ": \"" + truncate(req.message(), 40) + "\"")
        .build());

    return map(msg);
  }

  public List<ConversationResponse> listConversations(Long userId) {
    return conversations.findByUserOrderByUpdatedAtDesc(userId).stream()
        .map(c -> {
          Optional<Message> lastMsg = messages.findTopByConversationIdOrderByCreatedAtDesc(c.getId());
          long unread = messages.countByConversationIdAndSenderIdNotAndIsReadFalse(c.getId(), userId);
          return new ConversationResponse(
              c.getId(),
              c.getBrand().getId(),
              c.getBrand().getName(),
              c.getCreator().getId(),
              c.getCreator().getName(),
              c.getCampaign() != null ? c.getCampaign().getId() : null,
              c.getCampaign() != null ? c.getCampaign().getTitle() : null,
              lastMsg.map(Message::getMessage).orElse(""),
              c.getUpdatedAt(),
              unread
          );
        })
        .toList();
  }

  @Transactional
  public List<MessageResponse> getMessages(Long userId, Long conversationId) {
    Conversation conv = conversations.findById(conversationId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));

    if (!conv.getBrand().getId().equals(userId) && !conv.getCreator().getId().equals(userId)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "You are not authorized to view this conversation");
    }

    List<Message> list = messages.findByConversationIdOrderByCreatedAtAsc(conversationId);
    list.stream()
        .filter(m -> !m.getSender().getId().equals(userId) && !m.isRead())
        .forEach(m -> {
          m.setRead(true);
          messages.save(m);
        });

    return list.stream().map(this::map).toList();
  }

  @Transactional
  public MessageResponse sendMessage(Long userId, Long conversationId, SendMessageRequest req) {
    User sender = users.findById(userId)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

    Conversation conv = conversations.findById(conversationId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));

    if (!conv.getBrand().getId().equals(userId) && !conv.getCreator().getId().equals(userId)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "You are not authorized to send messages in this conversation");
    }

    Message msg = messages.save(Message.builder()
        .conversation(conv)
        .sender(sender)
        .message(req.message().trim())
        .isRead(false)
        .createdAt(Instant.now())
        .build());

    conv.setUpdatedAt(Instant.now());
    conversations.save(conv);

    User recipient = sender.getId().equals(conv.getBrand().getId()) ? conv.getCreator() : conv.getBrand();
    notifications.save(Notification.builder()
        .user(recipient)
        .message("New message from " + sender.getName() + ": \"" + truncate(req.message(), 40) + "\"")
        .build());

    return map(msg);
  }

  private User resolveCreator(Long creatorId) {
    return profiles.findById(creatorId).map(CreatorProfile::getUser)
        .or(() -> users.findById(creatorId).filter(u -> u.getRole() == Role.CREATOR))
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Creator not found"));
  }

  private MessageResponse map(Message m) {
    return new MessageResponse(
        m.getId(),
        m.getConversation().getId(),
        m.getSender().getId(),
        m.getSender().getName(),
        m.getMessage(),
        m.isRead(),
        m.getCreatedAt()
    );
  }

  private String truncate(String text, int max) {
    if (text == null) return "";
    return text.length() <= max ? text : text.substring(0, max) + "...";
  }
}
