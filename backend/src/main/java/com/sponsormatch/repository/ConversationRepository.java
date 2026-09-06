package com.sponsormatch.repository;

import com.sponsormatch.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
  @Query("SELECT c FROM Conversation c WHERE c.brand.id = :userId OR c.creator.id = :userId ORDER BY c.updatedAt DESC")
  List<Conversation> findByUserOrderByUpdatedAtDesc(@Param("userId") Long userId);

  Optional<Conversation> findByBrandIdAndCreatorIdAndCampaignId(Long brandId, Long creatorId, Long campaignId);

  Optional<Conversation> findByBrandIdAndCreatorIdAndCampaignIsNull(Long brandId, Long creatorId);
}
