# IGOTU — Unified Dockerfile for Hugging Face Spaces
# Builds both frontend (Vue 3) and backend (Express + SQLite) in a single container.

# ── Stage 1: Build frontend ──────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# API calls go to /api on the same origin
ENV VITE_API_URL=/api
RUN npm run build

# ── Stage 2: Build backend ───────────────────────────────────────────
FROM node:20-slim AS backend-build

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ── Stage 3: Production runtime ──────────────────────────────────────
FROM node:20-slim

# Install build tools for better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY --from=backend-build /app/backend/package*.json ./
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/src/migrations ./dist/migrations

# Install production dependencies (includes native build of better-sqlite3)
RUN npm ci --omit=dev

# Copy frontend build output into a public directory that Express will serve
COPY --from=frontend-build /app/frontend/dist ./public

# Create persistent data directory (HF Spaces mounts /data as persistent storage)
RUN mkdir -p /data

# Environment
ENV NODE_ENV=production
ENV PORT=7860
ENV DB_PATH=/data/igotu.db
ENV CORS_ORIGIN=*

# HF Spaces exposes port 7860
EXPOSE 7860

CMD ["node", "dist/server.js"]
