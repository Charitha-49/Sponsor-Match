package com.sponsormatch.repository;
import com.sponsormatch.entity.CollaborationRequest; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface CollaborationRequestRepository extends JpaRepository<CollaborationRequest, Long> { List<CollaborationRequest> findByCreatorId(Long creatorId); List<CollaborationRequest> findByBrandId(Long brandId); }
