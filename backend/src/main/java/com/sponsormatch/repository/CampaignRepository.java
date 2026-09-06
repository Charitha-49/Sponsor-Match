package com.sponsormatch.repository;
import com.sponsormatch.entity.Campaign; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface CampaignRepository extends JpaRepository<Campaign, Long> { List<Campaign> findByBrandId(Long brandId); }
