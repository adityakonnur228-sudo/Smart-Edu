# =============================================================================
# SMART STUDY PORTAL — PRODUCTION FASTAPI ML ENGINE DOCKERFILE
# Multi-stage build: Python 3.12-slim
# =============================================================================

# Stage 1: Build & install Python packages
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies and system libraries for PyMuPDF and OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Install Python wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Minimal Runtime
FROM python:3.12-slim
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user
RUN addgroup --gid 1000 --system appgroup && \
    adduser --uid 1000 --system --ingroup appgroup appuser

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Ensure path includes user-installed packages
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV CHROMA_PERSIST_DIR=/data/chroma

# Copy application source code
COPY app ./app

# Create persistent storage directories with appropriate permissions
RUN mkdir -p /data/chroma /app/data && \
    chown -R appuser:appgroup /app /data /home/appuser

# Switch to non-root execution
USER appuser

EXPOSE 8000

# Health check using the lightweight /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-8000}/health || exit 1

# Start Uvicorn with dynamic port binding and exec for proper signal propagation
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
