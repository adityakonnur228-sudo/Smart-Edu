package edu.smartstudy.security;

import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.web-origin:http://localhost:3000}") String webOrigin) {
        var c = new CorsConfiguration();
        List<String> origins = new ArrayList<>();
        if (webOrigin != null && !webOrigin.isBlank()) {
            origins.addAll(Arrays.stream(webOrigin.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList()));
        }
        origins.add("http://localhost");
        origins.add("http://127.0.0.1");
        origins.add("https://localhost");
        origins.add("https://127.0.0.1");
        origins.add("http://localhost:[*]");
        origins.add("http://127.0.0.1:[*]");
        origins.add("https://localhost:[*]");
        origins.add("https://127.0.0.1:[*]");
        c.setAllowedOriginPatterns(origins);
        c.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS", "PUT"));
        c.setAllowedHeaders(List.of("*", "Content-Type", "Authorization", "X-CSRF-TOKEN", "X-OpenRouter-Api-Key", "X-LLM-Api-Key", "X-LLM-Model", "Accept", "Origin", "X-Requested-With"));
        c.setExposedHeaders(List.of("*", "Set-Cookie", "Authorization"));
        c.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityFilterChain chain(HttpSecurity http, JwtFilter jwt, CorsConfigurationSource corsConfigurationSource) throws Exception {
        return http
            .csrf(c -> c.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"Authentication required. Please log in.\",\"code\":\"UNAUTHORIZED\"}");
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"Access denied. Insufficient permissions.\",\"code\":\"FORBIDDEN\"}");
                })
            )
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET,
                    "/api/v1/health",
                    "/api/v1/quizzes/config"
                ).permitAll()
                .requestMatchers(HttpMethod.POST,
                    "/api/v1/auth/register",
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/forgot-password",
                    "/api/v1/auth/reset-password",
                    "/api/v1/auth/verify-email",
                    "/api/v1/quizzes/test-key"
                ).permitAll()
                .requestMatchers(
                    "/actuator/health",
                    "/actuator/health/**",
                    "/actuator/info"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
