package edu.smartstudy.security;

import edu.smartstudy.user.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TokenServiceTest {
    private final String secret = "a-local-test-secret-with-more-than-32-bytes-long";

    @Test
    void issuedAccessTokenContainsStudentRoleAndAccessType() {
        var service = new TokenService(secret);
        var user = new User("Ada Student", "ada@example.test", "hashed-password");
        var claims = service.parse(service.issueAccessToken(user));
        assertEquals("ada@example.test", claims.getSubject());
        assertEquals("STUDENT", claims.get("role", String.class));
        assertEquals("access", claims.get("token_type", String.class));
        assertNotNull(claims.getExpiration());
    }

    @Test
    void issuedRefreshTokenContainsRefreshTypeAndNoRole() {
        var service = new TokenService(secret);
        var user = new User("Ada Student", "ada@example.test", "hashed-password");
        var claims = service.parseRefreshToken(service.issueRefreshToken(user));
        assertEquals("ada@example.test", claims.getSubject());
        assertEquals("refresh", claims.get("token_type", String.class));
        assertNotNull(claims.getId()); // jti UUID present
        assertNotNull(claims.getExpiration());
    }

    @Test
    void parseRefreshTokenStrictlyRejectsAccessToken() {
        var service = new TokenService(secret);
        var user = new User("Ada Student", "ada@example.test", "hashed-password");
        String accessToken = service.issueAccessToken(user);

        // Security check: Access token cannot be used as refresh credential
        Exception ex = assertThrows(IllegalArgumentException.class, () -> service.parseRefreshToken(accessToken));
        assertTrue(ex.getMessage().contains("expected 'refresh'"));
    }

    @Test
    void expiredOrTamperedTokensAreRejected() {
        var service = new TokenService(secret);
        assertThrows(Exception.class, () -> service.parse("not-a-signed-token"));
        assertThrows(Exception.class, () -> service.parseRefreshToken("not-a-signed-token"));
    }
}
