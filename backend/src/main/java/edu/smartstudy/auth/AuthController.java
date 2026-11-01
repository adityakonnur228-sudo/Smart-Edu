package edu.smartstudy.auth;
import edu.smartstudy.user.*;
import edu.smartstudy.security.TokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import io.jsonwebtoken.Claims;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final String cookieDomain;
    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final boolean requireEmailVerification;
    private final SecureRandom random = new SecureRandom();

    public AuthController(UserRepository users, PasswordEncoder passwords, TokenService tokens,
                          @Value("${app.cookie-secure:false}") boolean cookieSecure,
                          @Value("${app.cookie-same-site:}") String cookieSameSite,
                          @Value("${app.cookie-domain:}") String cookieDomain,
                          JavaMailSender mailSender,
                          @Value("${spring.mail.username:noreply@localhost}") String mailFrom,
                          @Value("${app.require-email-verification:false}") boolean requireEmailVerification) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
        this.cookieDomain = cookieDomain;
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.requireEmailVerification = requireEmailVerification;
    }

    public record Register(@NotBlank @Size(max = 120) String name,
                           @Email @NotBlank String email,
                           @NotBlank @Size(min = 10, max = 72) String password,
                           @jakarta.validation.constraints.Pattern(regexp = "STUDENT|PARENT") String role) {}

    public record Login(@Email @NotBlank String email, @NotBlank String password) {}

    public record ForgotPassword(@Email @NotBlank String email) {}

    public record ResetPassword(@NotBlank String token, @NotBlank @Size(min = 10, max = 72) String password) {}

    public record ChangePassword(@NotBlank String currentPassword, @NotBlank @Size(min = 10, max = 72) String newPassword) {}

    public record VerifyEmail(@NotBlank String token) {}

    public record ResendVerification(@Email @NotBlank String email) {}

    public record DeleteAccount(@NotBlank String password) {}

    private ResponseCookie buildSessionCookie(String token, long maxAge) {
        var builder = ResponseCookie.from("study_session", token)
                .httpOnly(true)
                .path("/")
                .maxAge(maxAge);

        if (cookieSameSite != null && !cookieSameSite.isBlank()) {
            builder.sameSite(cookieSameSite.trim());
        } else {
            builder.sameSite(cookieSecure ? "None" : "Lax");
        }

        builder.secure(cookieSecure);

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain.trim());
        }
        return builder.build();
    }

    private ResponseEntity<?> session(User user) {
        String token = tokens.issue(user);
        var cookie = buildSessionCookie(token, 3600);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("id", user.getId(), "name", user.getName(), "email", user.getEmail(),
                        "role", user.getRole(), "timezone", user.getTimezone(),
                        "emailVerified", user.isEmailVerified(),
                        "token", token));
    }

    private String hashToken(byte[] token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token);
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash token", e);
        }
    }

    private byte[] generateToken() {
        byte[] token = new byte[32];
        random.nextBytes(token);
        return token;
    }

    private void sendEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody @jakarta.validation.Valid Register input) {
        String email = input.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user = new User(input.name().trim(), email, passwords.encode(input.password()),
                input.role() == null ? "STUDENT" : input.role());
        user.setEmailVerified(!requireEmailVerification);
        User saved = users.save(user);

        if (requireEmailVerification) {
            sendEmail(saved.getEmail(), "Verify your Smart Study account",
                    "Your verification token: " + Base64.getEncoder().encodeToString(generateToken()) +
                    "\n\nUse POST /api/v1/auth/verify-email with this token.");
        }
        return session(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @jakarta.validation.Valid Login input) {
        User u = users.findEnabledByEmailIgnoreCase(input.email().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect"));
        if (!passwords.matches(input.password(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect");
        }
        return session(u);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest req) {
        String rawToken = null;
        Cookie[] cs = req.getCookies();
        if (cs != null) {
            for (Cookie c : cs) {
                if ("study_session".equals(c.getName())) {
                    rawToken = c.getValue();
                    break;
                }
            }
        }
        if (rawToken == null) {
            String authHeader = req.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                rawToken = authHeader.substring(7).trim();
            }
        }
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No session token provided for refresh");
        }
        try {
            Claims claims = tokens.parseClaimsForRefresh(rawToken);
            String email = claims.getSubject();
            Integer tokenVersion = claims.get("token_version", Integer.class);
            var userOpt = users.findEnabledByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found or disabled");
            }
            User user = userOpt.get();
            if (tokenVersion == null || !tokenVersion.equals(user.getTokenVersion())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session has been invalidated. Please log in again.");
            }
            return session(user);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired session token");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(org.springframework.security.core.Authentication auth, HttpServletRequest req) {
        String email = auth != null ? auth.getName() : null;
        if (email == null) {
            String rawToken = null;
            Cookie[] cs = req.getCookies();
            if (cs != null) {
                for (Cookie c : cs) {
                    if ("study_session".equals(c.getName())) {
                        rawToken = c.getValue();
                        break;
                    }
                }
            }
            if (rawToken == null) {
                String authHeader = req.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    rawToken = authHeader.substring(7).trim();
                }
            }
            if (rawToken != null) {
                try {
                    Claims claims = tokens.parseClaimsForRefresh(rawToken);
                    email = claims.getSubject();
                } catch (Exception ignored) {}
            }
        }

        if (email != null) {
            User u = users.findByEmailIgnoreCase(email).orElse(null);
            if (u != null) {
                u.incrementTokenVersion();
                users.save(u);
            }
        }
        var cookie = buildSessionCookie("", 0);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(Map.of("ok", true));
    }

    @GetMapping("/me")
    public Map<String, Object> me(org.springframework.security.core.Authentication a) {
        User u = users.findByEmailIgnoreCase(a.getName()).orElseThrow();
        return Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail(),
                "role", u.getRole(), "timezone", u.getTimezone(),
                "emailVerified", u.isEmailVerified());
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody @jakarta.validation.Valid ForgotPassword input) {
        String email = input.email().trim().toLowerCase();
        Optional<User> userOpt = users.findByEmailIgnoreCase(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            byte[] token = generateToken();
            user.setPasswordResetTokenHash(hashToken(token));
            user.setPasswordResetExpires(Instant.now().plusSeconds(30 * 60)); // 30 minutes
            users.save(user);
            String tokenStr = Base64.getUrlEncoder().withoutPadding().encodeToString(token);
            sendEmail(email, "Reset your Smart Study password",
                    "Your password reset token: " + tokenStr +
                    "\n\nUse POST /api/v1/auth/reset-password with this token.\n" +
                    "This token expires in 30 minutes and can only be used once.");
        }
        return ResponseEntity.ok(Map.of("message", "If an account exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody @jakarta.validation.Valid ResetPassword input) {
        String tokenHash = hashToken(Base64.getUrlDecoder().decode(input.token()));
        User u = users.findByValidPasswordResetToken(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token"));
        u.setPasswordHash(passwords.encode(input.password()));
        u.setPasswordResetTokenHash(null);
        u.setPasswordResetExpires(null);
        u.incrementTokenVersion(); // Invalidate all sessions
        users.save(u);
        return ResponseEntity.ok(Map.of("message", "Password reset successful. Please log in."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody @jakarta.validation.Valid ChangePassword input,
                                            org.springframework.security.core.Authentication auth) {
        User u = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if (!passwords.matches(input.currentPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        u.setPasswordHash(passwords.encode(input.newPassword()));
        u.incrementTokenVersion(); // Invalidate all sessions
        users.save(u);
        var cookie = buildSessionCookie(tokens.issue(u), 3600);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("message", "Password changed. You are now logged in with the new password."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody @jakarta.validation.Valid VerifyEmail input) {
        String tokenHash = hashToken(Base64.getUrlDecoder().decode(input.token()));
        User u = users.findByValidPasswordResetToken(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification token"));
        u.setEmailVerified(true);
        u.setPasswordResetTokenHash(null);
        u.setPasswordResetExpires(null);
        users.save(u);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody @jakarta.validation.Valid ResendVerification input,
                                                org.springframework.security.core.Authentication auth) {
        User u = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if (u.isEmailVerified()) {
            return ResponseEntity.ok(Map.of("message", "Email already verified"));
        }
        byte[] token = generateToken();
        u.setPasswordResetTokenHash(hashToken(token));
        u.setPasswordResetExpires(Instant.now().plusSeconds(24 * 3600));
        users.save(u);
        String tokenStr = Base64.getUrlEncoder().withoutPadding().encodeToString(token);
        sendEmail(u.getEmail(), "Verify your Smart Study account",
                "Your verification token: " + tokenStr +
                "\n\nUse POST /api/v1/auth/verify-email with this token.");
        return ResponseEntity.ok(Map.of("message", "If an account exists, a verification link has been sent"));
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@RequestBody @jakarta.validation.Valid DeleteAccount input,
                                           org.springframework.security.core.Authentication auth) {
        User u = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if (!passwords.matches(input.password(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is incorrect");
        }
        users.delete(u);
        var cookie = buildSessionCookie("", 0);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("message", "Account deleted"));
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportData(org.springframework.security.core.Authentication auth) {
        User u = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "user", Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail(), "role", u.getRole()),
                "exportedAt", Instant.now()
        ));
    }
}
