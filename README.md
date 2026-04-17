---
title: IGOTU
emoji: "\U0001F33F"
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">

# IGOTU

### I Got You — A Depression Coping Companion

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Claude API](https://img.shields.io/badge/Claude-Sonnet_4-CC785C?logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*Track micro-achievements. Chat with an AI companion. Monitor your mood.*
*Access CBT-based tools. All in one place.*

**[Getting Started](#-getting-started) · [Features](#-features) · [API Docs](#-api-reference) · [Deploy](#-deployment)**

</div>

---

## Why IGOTU?

> *"Like a plant, grow slowly."*

Depression makes everything harder. IGOTU is built for the worst days — when even opening an app feels like too much. Every interaction is designed to be **one tap**, **zero guilt**, and **always warm**.

<table>
<tr>
<td width="25%" align="center"><strong>Ultra-low barrier</strong><br><sub>One-tap interactions, usable on low-energy days</sub></td>
<td width="25%" align="center"><strong>Never guilt-trip</strong><br><sub>No "streak broken" — only positive reinforcement</sub></td>
<td width="25%" align="center"><strong>Clinically informed</strong><br><sub>CBT-based tools & PHQ-9, wrapped in warm language</sub></td>
<td width="25%" align="center"><strong>Privacy first</strong><br><sub>Local SQLite database — your data stays with you</sub></td>
</tr>
</table>

## Core Features

### Achievement Tracking
Log daily micro-wins with one tap. Heatmap calendar shows your journey. Personalized encouragement adapts to your pace.

### AI Chat Companion
Powered by Claude API with a carefully crafted therapeutic system prompt. Falls back to an offline rule-based engine when no API key is configured — so the app always works.

### Toolbox
- **PHQ-9 Screening** — Validated depression questionnaire with severity tracking over time
- **Guided Breathing** — Box breathing and 4-7-8 techniques with visual guides
- **Grounding Exercises** — 5-4-3-2-1 sensory grounding for anxiety moments
- **Cognitive Restructuring** — Step-by-step CBT thought challenging

### Mood Tracking
Emoji-based mood logging with trend charts. See how your mood changes over days, weeks, and months.

### Analytics
Weekly and monthly summaries with pattern detection — most active days, top categories, growth trends.

## Tech Stack

```
Frontend    Vue 3 · TypeScript · Vite · Tailwind CSS · Pinia · Chart.js
Backend     Node.js · Express · TypeScript · Zod
AI          Anthropic Claude API (server-side proxy)
Database    SQLite via better-sqlite3 (zero-config)
Deploy      Docker · Hugging Face Spaces
```

## Getting Started

### Prerequisites

- **Node.js 20+** — that's it. No database to install.

### Quick Start

```bash
# Clone
git clone https://github.com/1anthanum/igotu.git
cd igotu

# Install everything
npm run install:all

# Configure
cp .env.example backend/.env
# Edit backend/.env — optionally add your ANTHROPIC_API_KEY

# Launch
npm run dev
```

Open http://localhost:5173 — backend runs on port 3000 with auto-proxy.

> SQLite creates `igotu.db` automatically on first run. Zero config.

## Deployment

### Docker

```bash
cp .env.example .env    # edit secrets
docker-compose up -d    # http://localhost
```

### Hugging Face Spaces

1. Fork as HF Space (SDK: Docker)
2. Set secrets: `JWT_SECRET` (required), `ANTHROPIC_API_KEY` (optional)
3. Auto-builds on push — data persists in `/data` volume

### Production Checklist

- [ ] Set a strong `JWT_SECRET` (app refuses to start with defaults)
- [ ] Set `ENCRYPTION_KEY` (64-char hex string)
- [ ] Optionally add `ANTHROPIC_API_KEY` for AI chat

## API Reference

All endpoints require `Authorization: Bearer <token>` except auth routes.

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login — returns JWT pair |
| `POST` | `/api/auth/refresh` | Refresh access token |

</details>

<details>
<summary><strong>Achievements</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/achievements` | Log an achievement |
| `GET` | `/api/achievements` | List (paginated) |
| `GET` | `/api/achievements/today` | Today's entries |
| `GET` | `/api/achievements/calendar` | Heatmap data |

</details>

<details>
<summary><strong>Chat (AI Companion)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/sessions` | Create session |
| `GET` | `/api/chat/sessions` | List sessions |
| `POST` | `/api/chat/sessions/:id/messages` | Send message |
| `GET` | `/api/chat/sessions/:id/messages` | Message history |
| `DELETE` | `/api/chat/sessions/:id` | Delete session |

</details>

<details>
<summary><strong>Mood Tracking</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/mood` | Log mood |
| `GET` | `/api/mood` | History (paginated) |
| `GET` | `/api/mood/today` | Today's entries |
| `GET` | `/api/mood/trend` | Trend (default 30d) |

</details>

<details>
<summary><strong>Toolbox</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/phq9` | Submit PHQ-9 |
| `GET` | `/api/phq9` | Assessment history |
| `GET` | `/api/phq9/latest` | Latest result |
| `POST` | `/api/exercises` | Log exercise |
| `GET` | `/api/exercises/stats` | Statistics |
| `POST` | `/api/cognitive` | Save CBT record |
| `GET` | `/api/cognitive` | CBT history |

</details>

<details>
<summary><strong>Analytics & Data</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/weekly` | Weekly summary |
| `GET` | `/api/analytics/monthly` | Monthly summary |
| `GET` | `/api/analytics/patterns` | Pattern insights |
| `GET` | `/api/encouragement/current` | Daily encouragement |
| `GET` | `/api/user/export` | Export user data |
| `POST` | `/api/user/import` | Import user data |

</details>

## Project Structure

```
igotu/
├── backend/src/
│   ├── config/              # Database · JWT · Environment
│   ├── middleware/           # Auth · Validation · Error handling
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic
│   ├── migrations/          # SQL schema (auto-run)
│   ├── utils/               # Constants · Dates · AI prompt
│   ├── scripts/             # Seed · Export CLI
│   └── tests/               # Vitest integration tests
│
├── frontend/src/
│   ├── views/               # Page components (7 views)
│   ├── components/          # UI components (15+)
│   ├── stores/              # Pinia state (5 stores)
│   ├── api/                 # Typed API client
│   ├── composables/         # Mood-driven theme system
│   ├── router/              # Vue Router
│   └── types/               # TypeScript definitions
│
├── Dockerfile               # Multi-stage build (HF Spaces)
└── docker-compose.yml       # Local deployment
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Prod | dev default | Token signing key |
| `ENCRYPTION_KEY` | Prod | dev default | 64-char hex key |
| `DB_PATH` | — | `./igotu.db` | Database location |
| `PORT` | — | `3000` | API port |
| `CORS_ORIGIN` | — | `http://localhost:5173` | Allowed origin |
| `ANTHROPIC_API_KEY` | — | *empty* | AI chat (empty = offline) |
| `ANTHROPIC_MODEL` | — | `claude-sonnet-4-20250514` | Model ID |

## Scripts

```bash
npm run dev            # Start both servers (concurrently)
npm run build          # Production build
npm run install:all    # Install all dependencies
npm run seed           # Generate test data
npm run test           # Run integration tests
npm run export         # Export data (JSON/CSV)
npm run reset          # Reset database
```

## Important

> This is a **self-help tool**, not a substitute for professional care.
> PHQ-9 is a screening instrument, not a diagnosis.

If you need help now:
- **US** — Crisis Hotline [988](tel:988)
- **China** — Mental Health Line [400-161-9995](tel:400-161-9995)
- **International** — [findahelpline.com](https://findahelpline.com)

## License

[MIT](LICENSE)
