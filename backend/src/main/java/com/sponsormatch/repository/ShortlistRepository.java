package com.sponsormatch.repository;
import com.sponsormatch.entity.Shortlist; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface ShortlistRepository extends JpaRepository<Shortlist, Long> { List<Shortlist> findByBrandId(Long brandId); boolean existsByBrandIdAndCampaignIdAndCreatorId(Long brandId, Long campaignId, Long creatorId); }
