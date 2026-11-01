package edu.smartstudy.security;

import edu.smartstudy.user.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TokenServiceTest {
    @Test void issuedTokenContainsTheAccountAndStudentRole() {
        var service = new TokenService("a-local-test-secret-with-more-than-32-bytes-long");
        var user = new User("Ada Student", "ada@example.test", "hashed-password");
        var claims = service.parse(service.issue(user));
        assertEquals("ada@example.test", claims.getSubject());
        assertEquals("STUDENT", claims.get("role", String.class));
        assertNotNull(claims.getExpiration());
    }

    @Test void expiredOrTamperedTokensAreRejected() {
        var service = new TokenService("a-local-test-secret-with-more-than-32-bytes-long");
        assertThrows(Exception.class, () -> service.parse("not-a-signed-token"));
    }

    @Test void parseClaimsForRefreshAcceptsValidToken() {
        var service = new TokenService("a-local-test-secret-with-more-than-32-bytes-long");
        var user = new User("Ada Student", "ada@example.test", "hashed-password");
        String token = service.issue(user);
        var claims = service.parseClaimsForRefresh(token);
        assertEquals("ada@example.test", claims.getSubject());
        assertEquals("STUDENT", claims.get("role", String.class));
    }

    @Test void parseClaimsForRefreshRejectsTamperedToken() {
        var service = new TokenService("a-local-test-secret-with-more-than-32-bytes-long");
        assertThrows(Exception.class, () -> service.parseClaimsForRefresh("tampered.token.value"));
    }
}
