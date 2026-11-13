package com.ats.service;

import com.ats.exception.ApiException;
import com.ats.model.ResumeFile;
import com.ats.repository.ResumeFileRepository;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Stores resumes in the database (table resume_files) and returns an opaque key. */
@Service
public class FileStorageService {

    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "pdf", "application/pdf",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    private final ResumeFileRepository repo;

    public FileStorageService(ResumeFileRepository repo) {
        this.repo = repo;
    }

    /** Validates and saves an uploaded resume; returns its storage key. */
    @Transactional
    public String storeResume(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Please choose a file to upload");
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        int dot = original.lastIndexOf('.');
        String ext = dot >= 0 ? original.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        if (!CONTENT_TYPES.containsKey(ext)) {
            throw ApiException.badRequest("Resume must be a PDF, DOC or DOCX file");
        }
        try {
            return store(file.getBytes(), ext);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read uploaded file", e);
        }
    }

    @Transactional
    public String store(byte[] data, String ext) {
        String id = UUID.randomUUID().toString();
        repo.save(new ResumeFile(id, CONTENT_TYPES.getOrDefault(ext, "application/octet-stream"), data));
        return id;
    }

    @Transactional(readOnly = true)
    public Resource loadResume(String key) {
        ResumeFile f = repo.findById(key).orElseThrow(() -> ApiException.notFound("Resume file"));
        return new ByteArrayResource(f.getData());
    }

    @Transactional
    public void deleteResume(String key) {
        if (key != null && repo.existsById(key)) repo.deleteById(key);
    }
}
