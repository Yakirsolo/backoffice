package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.repository.UserRepository;
import com.backoffice.backend.dto.user.UserSettingsUpdateRequest;
import com.backoffice.backend.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;

    private UserService service;
    private UUID userId;
    private AppUser user;

    @BeforeEach
    void setUp() {
        service = new UserService(userRepository);
        userId = UUID.randomUUID();
        user = new AppUser();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    }

    @Test
    void updatesCadenceValueAndUnit() {
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        var request = new UserSettingsUpdateRequest(null, null, null, null, 2, BillingIntervalUnit.week, null, null);

        var response = service.updateSettings(userId, request);

        assertThat(response.meetingCadenceValue()).isEqualTo(2);
        assertThat(response.meetingCadenceUnit()).isEqualTo(BillingIntervalUnit.week);
    }

    @Test
    void rejectsNonPositiveCadenceValue() {
        var request = new UserSettingsUpdateRequest(null, null, null, null, 0, null, null, null);

        assertThatThrownBy(() -> service.updateSettings(userId, request))
                .isInstanceOf(ApiException.class);
        verify(userRepository, never()).save(any());
    }
}
