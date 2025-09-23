# syntax=docker/dockerfile:1

#############################
# Frontend build stage
#############################
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend \
    && npm ci

# Copy the remaining frontend sources
COPY frontend ./frontend
COPY tsconfig.base.json ./
RUN cd frontend \
    && npm run build

#############################
# Runtime image
#############################
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    WAVECAP_PROJECT_ROOT=/app

WORKDIR /app

# System dependencies required for audio processing
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install the backend package
COPY backend/pyproject.toml backend/README.md backend/default-config.yaml ./backend/
COPY backend/src ./backend/src
RUN pip install --upgrade pip \
    && pip install ./backend

# Copy application assets and default state
COPY state ./state
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
RUN mkdir -p state/recordings state/logs

EXPOSE 8000
VOLUME ["/app/state"]

CMD ["uvicorn", "wavecap_backend.server:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
