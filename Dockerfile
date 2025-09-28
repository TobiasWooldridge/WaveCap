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
FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    WAVECAP_PROJECT_ROOT=/app \
    PYTHONPATH=/usr/lib/python3/dist-packages:$PYTHONPATH

WORKDIR /app

# System dependencies required for audio processing
ARG DEBIAN_FRONTEND=noninteractive
ARG SDRPLAY_API_DEB_URL=""
ARG SOAPY_SDRPLAY3_DEB_URL=""

# System dependencies required for audio processing + SoapySDR
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        # Soapy core + tools and headers
        soapysdr-tools \
        libsoapysdr-dev \
        python3-soapysdr \
        # Optional vendor/device modules are installed separately as needed
        # Build prerequisites to compile the Python binding for the runtime Python
        build-essential \
        cmake \
        git \
        pkg-config \
        libusb-1.0-0 \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

## SoapySDR Python bindings provided by python3-soapysdr (Debian dist-packages).

# Optional: Install SDRplay API and SoapySDRPlay3 plugin if URLs are provided.
# Supply build args SDRPLAY_API_DEB_URL and SOAPY_SDRPLAY3_DEB_URL to enable.
RUN set -eux; \
    mkdir -p /tmp/sdrplay; \
    if [ -n "$SDRPLAY_API_DEB_URL" ]; then \
      curl -fsSL "$SDRPLAY_API_DEB_URL" -o /tmp/sdrplay/api.deb; \
      apt-get update; \
      apt-get install -y --no-install-recommends /tmp/sdrplay/api.deb || apt-get -f install -y; \
    fi; \
    if [ -n "$SOAPY_SDRPLAY3_DEB_URL" ]; then \
      curl -fsSL "$SOAPY_SDRPLAY3_DEB_URL" -o /tmp/sdrplay/soapy.deb; \
      apt-get update; \
      apt-get install -y --no-install-recommends /tmp/sdrplay/soapy.deb || apt-get -f install -y; \
    fi; \
    rm -rf /var/lib/apt/lists/* /tmp/sdrplay

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
