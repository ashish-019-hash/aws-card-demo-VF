package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aws.carddemo.dto.UserDto;
import com.aws.carddemo.dto.UserRequest;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.ApplicationUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class UserDataServiceTest {
    @Autowired UserDataService service;
    @Autowired ApplicationUserRepository repository;

    private UserRequest request(String firstName) {
        return new UserRequest(firstName, "Tester", "password123", "U");
    }

    @Test
    void createNormalizesUserIdToUppercase() {
        UserDto created = service.create("mixUser1", request("Case"));
        assertThat(created.id()).isEqualTo("MIXUSER1");
        assertThat(repository.existsById("MIXUSER1")).isTrue();
        assertThat(repository.existsById("mixUser1")).isFalse();
    }

    @Test
    void duplicateCheckIsCaseInsensitive() {
        service.create("dupuser1", request("Case"));
        assertThatThrownBy(() -> service.create("DUPUSER1", request("Case")))
                .isInstanceOf(ResourceConflictException.class);
        assertThatThrownBy(() -> service.create("DupUser1", request("Case")))
                .isInstanceOf(ResourceConflictException.class);
    }

    @Test
    void findUpdateAndDeleteAcceptAnyCase() {
        service.create("CASEUSR1", request("Case"));
        assertThat(service.find("caseusr1").id()).isEqualTo("CASEUSR1");
        UserDto updated = service.update("caseUsr1", request("Changed"));
        assertThat(updated.firstName()).isEqualTo("Changed");
        service.delete("caseusr1");
        assertThatThrownBy(() -> service.find("CASEUSR1")).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void namesAcceptPunctuationButNotBlank() {
        assertThatCode(() -> service.create("PUNCUSR1", new UserRequest("Mary-Jane", "O'Brien Jr.", "password123", "U")))
                .doesNotThrowAnyException();
        assertThat(service.find("PUNCUSR1").lastName()).isEqualTo("O'Brien Jr.");
        assertThatThrownBy(() -> service.create("PUNCUSR2", new UserRequest(" ", "Tester", "password123", "U")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
