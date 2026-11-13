package com.ats.repository;

import com.ats.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop30ByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    long countByRecipientIdAndReadFalse(Long recipientId);

    @Modifying
    @Query("update Notification n set n.read = true where n.recipient.id = :uid and n.read = false")
    int markAllRead(@Param("uid") Long userId);

    @Modifying
    @Query("delete from Notification n where n.recipient.id = :uid")
    void deleteByRecipientId(@Param("uid") Long userId);
}
