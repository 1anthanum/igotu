---
title: IGOTU
emoji: "\U0001F33F"
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# IGOTU — I Got You

A comprehensive depression coping platform designed with empathy. Track micro-achievements, chat with an AI companion, monitor mood trends, and access CBT-based therapeutic tools — all in one place.

> "Like a plant, grow slowly."

## Features

| Module | Description |
|--------|-------------|
| **Home** | Log micro-achievements with one tap, heatmap calendar, daily encouragement |
| **Chat** | AI companion powered by Claude API (with offline fallback) |
| **Toolbox** | PHQ-9 screening, guided breathing, grounding exercises, cognitive restructuring |
| **Mood** | Emoji-based mood tracking with trend visualization |
| **Analytics** | Weekly/monthly summaries, streak detection, pattern insights |

## Design Principles

- **Ultra-low barrier** — One-tap interactions, usable even on low-energy days
- **Never guilt-trip** — No "streak broken" messages, only positive reinforcement
- **Clinically informed** — Based on CBT and validated tools (PHQ-9), wrapped in warm language
- **Privacy first** — SQLite file database, your data stays with you

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia + Chart.js |
| Backend | Node.js + Express + TypeScript + Zod validation |
| AI | Anthropic Claude API (server-side proxy) |
| Database | SQLite via better-sqlite3 (zero-config) |
| Deployment | Docker / Hugging Face Spaces |

## Quick Start

### Prerequisites

- Node.js 20+

### Option 1: Local Development

```bash
# Clone and install
git clone https://github.com/Futaosen/igotu.git
cd igotu
npm run install:all

# Configure backend
cp .env.example backend/.env
# Edit backend/.env — set JWT_SECRET, optionally add ANTHROPIC_API_KEY

# Start both servers
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

> No database setup needed — SQLite creates `igotu.db` automatically on first run.

### Option 2: Docker

```bash
cp .env.example .env
# Edit .env with your secrets
docker-compose up -d
```

Access at http://localhost

### Option 3: Hugging Face Spaces

1. Fork this repo as an HF Space (SDK: Docker)
2. Add secrets in Space Settings:
   - `JWT_SECRET` — random string (required)
   - `ANTHROPIC_API_KEY` — enables AI chat (optional)
3. The Space builds and deploys automatically

> Data persists in HF's `/data` volume across restarts.

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh access token |

### Achievements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/achievements` | Log an achievement |
| GET | `/api/achievements` | List achievements (paginated) |
| GET | `/api/achievements/today` | Today's achievements |
| GET | `/api/achievements/calendar` | Heatmap calendar data |

### Chat (AI Companion)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/sessions` | Create conversation |
| GET | `/api/chat/sessions` | List sessions |
| POST | `/api/chat/sessions/:id/messages` | Send message |
| GET | `/api/chat/sessions/:id/messages` | Get message history |
| DELETE | `/api/chat/sessions/:id` | Delete session |

### Mood Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mood` | Log mood entry |
| GET | `/api/mood` | Mood history (paginated) |
| GET | `/api/mood/today` | Today's entries |
| GET | `/api/mood/trend` | Trend data (default 30 days) |

### Toolbox

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/phq9` | Submit PHQ-9 assessment |
| GET | `/api/phq9` | Assessment history |
| GET | `/api/phq9/latest` | Latest assessment |
| POST | `/api/exercises` | Log breathing/grounding exercise |
| GET | `/api/exercises/stats` | Exercise statistics |
| POST | `/api/cognitive` | Save cognitive restructuring record |
| GET | `/api/cognitive` | Cognitive history |

### Analytics & Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/weekly` | Weekly summary |
| GET | `/api/analytics/monthly` | Monthly summary |
| GET | `/api/analytics/patterns` | Pattern insights |
| GET | `/api/encouragement/current` | Daily encouragement |
| GET | `/api/user/export` | Export all user data (JSON) |
| POST | `/api/user/import` | Import user data |

## Project Structure

```
igotu/
├── backend/
│   └── src/
│       ├── config/          # Database, JWT, environment
│       ├── middleware/       # Auth guard, validation, error handler
│       ├── routes/           # Express route handlers
│       ├── services/         # Business logic layer
│       ├── migrations/       # SQL schema migrations
│       ├── utils/            # Constants, date helpers, AI system prompt
│       ├── scripts/          # Seed data, CLI export
│       └── tests/            # Integration tests (Vitest)
│
├── frontend/
│   └── src/
│       ├── views/            # Page components
│       ├── components/       # Reusable UI components
│       ├── stores/           # Pinia state management
│       ├── api/              # Axios API client layer
│       ├── composables/      # Vue composables (mood theme)
│       ├── router/           # Vue Router config
│       ├── types/            # TypeScript type definitions
│       └── styles/           # Tailwind CSS entry
│
├── Dockerfile                # Unified build (Hugging Face Spaces)
├── docker-compose.yml        # Local multi-container setup
└── start.sh / start.bat      # One-click dev launcher
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PATH` | No | `./igotu.db` | SQLite database file path |
| `JWT_SECRET` | Production | dev default | Token signing secret |
| `ENCRYPTION_KEY` | Production | dev default | Data encryption key |
| `PORT` | No | `3000` | API server port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `ANTHROPIC_API_KEY` | No | — | Enables AI chat (empty = offline mode) |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-20250514` | Claude model ID |
| `ANTHROPIC_MAX_TOKENS` | No | `4096` | Max tokens per AI response |

## Available Scripts

```bash
npm run dev              # Start frontend + backend concurrently
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run build            # Build both for production
npm run install:all      # Install all dependencies
npm run seed             # Generate test data
npm run test             # Run backend integration tests
npm run export           # CLI data export (JSON/CSV)
npm run reset            # Delete database (auto-rebuilds on restart)
```

## Important Notice

- This app is a **self-help tool**, not a substitute for professional medical care
- PHQ-9 is a screening instrument, not a clinical diagnosis
- If you need immediate help:
  - **US**: National Crisis Hotline **988**
  - **China**: Mental Health Hotline **400-161-9995**

## License

MIT
