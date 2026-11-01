package edu.smartstudy.tutor;

import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface TutorConversationRepository extends JpaRepository<TutorConversation, Long> {
    Page<TutorConversation> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);
    List<TutorConversation> findByOwnerId(Long ownerId);
    Optional<TutorConversation> findByIdAndOwnerId(Long id, Long ownerId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TutorConversation c WHERE c.ownerId = :ownerId")
    void deleteByOwnerId(Long ownerId);
}
