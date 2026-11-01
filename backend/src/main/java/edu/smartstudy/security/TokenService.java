package edu.smartstudy.security;

import edu.smartstudy.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class TokenService {
    private final SecretKey key;
    private static final long ACCESS_TOKEN_TTL_SECONDS = 3600; // 1 hour
    private static final long REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600; // 7 days

    public TokenService(@Value("${app.jwt-secret}") String secret) {
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Issues a short-lived access token strictly for API authentication.
     */
    public String issueAccessToken(User u) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(u.getEmail())
                .claim("role", u.getRole())
                .claim("token_version", u.getTokenVersion())
                .claim("token_type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ACCESS_TOKEN_TTL_SECONDS)))
                .signWith(key)
                .compact();
    }

    /**
     * Legacy/default issue alias for backward compatibility.
     */
    public String issue(User u) {
        return issueAccessToken(u);
    }

    /**
     * Issues a distinct, long-lived refresh token strictly for session renewal.
     */
    public String issueRefreshToken(User u) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(u.getEmail())
                .claim("token_version", u.getTokenVersion())
                .claim("token_type", "refresh")
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(REFRESH_TOKEN_TTL_SECONDS)))
                .signWith(key)
                .compact();
    }

    /**
     * Parses and cryptographically validates any signed JWT token.
     */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    /**
     * Parses and strictly validates that the token is an unexpired REFRESH token.
     * Rejects access tokens and tampered tokens.
     */
    public Claims parseRefreshToken(String token) {
        Claims claims = parse(token);
        String tokenType = claims.get("token_type", String.class);
        if (!"refresh".equalsIgnoreCase(tokenType)) {
            throw new IllegalArgumentException("Invalid token type: expected 'refresh' but found '" + tokenType + "'");
        }
        return claims;
    }
}
