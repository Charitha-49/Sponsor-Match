package com.sponsormatch.repository;
import com.sponsormatch.entity.CreatorProfile; import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface CreatorProfileRepository extends JpaRepository<CreatorProfile, Long> { Optional<CreatorProfile> findByUserId(Long userId); }
