# =============================================================================
# SMART STUDY PORTAL — PRODUCTION SPRING BOOT DOCKERFILE
# Multi-stage build: Eclipse Temurin JDK 21 -> JRE 21 Alpine
# =============================================================================

# Stage 1: Build JAR using Maven
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Install Maven
RUN apk add --no-cache maven

# Cache dependencies
COPY pom.xml .
RUN mvn -B dependency:go-offline || true

# Copy source code and build production JAR
COPY src ./src
RUN mvn -B clean package -DskipTests

# Stage 2: Lightweight Production Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install curl and wget for health checks
RUN apk add --no-cache curl wget

# Create non-root system user and group
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Copy compiled JAR
COPY --from=builder /app/target/smart-study-api-*.jar app.jar

# Setup persistent uploads directory
RUN mkdir -p /data/uploads /data/uploads/cache && \
    chown -R appuser:appgroup /data

# Switch to non-root execution
USER appuser

# Defaults for Railway / Cloud deployment
ENV PORT=8080
ENV UPLOAD_DIR=/data/uploads
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

# Health check using the unauthenticated health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/v1/health || exit 1

# Execute Spring Boot with dynamic port binding and container memory awareness
ENTRYPOINT ["sh", "-c", "exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Dserver.port=${PORT} -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
