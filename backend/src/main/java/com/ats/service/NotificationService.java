package com.ats.service;

import com.ats.dto.NotificationDto;
import com.ats.exception.ApiException;
import com.ats.model.Notification;
import com.ats.model.User;
import com.ats.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    public void notify(User recipient, String message, String link) {
        repo.save(new Notification(recipient, message, link));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> forUser(User me) {
        List<NotificationDto> items = repo.findTop30ByRecipientIdOrderByCreatedAtDesc(me.getId())
                .stream().map(NotificationDto::from).toList();
        return Map.of("items", items, "unread", repo.countByRecipientIdAndReadFalse(me.getId()));
    }

    @Transactional
    public void markRead(User me, Long id) {
        Notification n = repo.findById(id).orElseThrow(() -> ApiException.notFound("Notification"));
        if (!n.getRecipient().getId().equals(me.getId())) throw ApiException.forbidden("Not your notification");
        n.setRead(true);
    }

    @Transactional
    public void markAllRead(User me) {
        repo.markAllRead(me.getId());
    }
}
