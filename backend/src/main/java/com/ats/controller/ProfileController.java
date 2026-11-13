package com.ats.controller;

import com.ats.dto.UserDtos.*;
import com.ats.model.User;
import com.ats.service.UserService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserService userService;

    public ProfileController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping
    public UserDto update(@AuthenticationPrincipal User me, @Valid @RequestBody ProfileUpdateRequest req) {
        return userService.updateProfile(me, req);
    }

    @PutMapping("/password")
    public void changePassword(@AuthenticationPrincipal User me, @Valid @RequestBody ChangePasswordRequest req) {
        userService.changePassword(me, req);
    }

    @PostMapping(value = "/resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CANDIDATE')")
    public UserDto uploadResume(@AuthenticationPrincipal User me, @RequestParam("file") MultipartFile file) {
        return userService.uploadResume(me, file);
    }

    @GetMapping("/resume/{candidateId}")
    public ResponseEntity<Resource> downloadResume(@AuthenticationPrincipal User me, @PathVariable Long candidateId) {
        UserService.ResumeFile file = userService.loadResume(me, candidateId);
        String name = file.originalName() == null ? "resume" : file.originalName();
        MediaType type = MediaTypeFactory.getMediaType(name).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(name, StandardCharsets.UTF_8).build().toString())
                .body(file.resource());
    }
}
