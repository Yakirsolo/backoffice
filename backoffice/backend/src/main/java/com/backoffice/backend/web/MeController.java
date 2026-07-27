package com.backoffice.backend.web;

import com.backoffice.backend.dto.user.UserSettingsResponse;
import com.backoffice.backend.dto.user.UserSettingsUpdateRequest;
import com.backoffice.backend.security.UserPrincipal;
import com.backoffice.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;

    @GetMapping
    public UserSettingsResponse getSettings(@AuthenticationPrincipal UserPrincipal principal) {
        return userService.getSettings(principal.getId());
    }

    @PatchMapping
    public UserSettingsResponse updateSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UserSettingsUpdateRequest request
    ) {
        return userService.updateSettings(principal.getId(), request);
    }
}
