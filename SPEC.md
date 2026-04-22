# Alfred - Personal AI Assistant Specification

**Version:** 1.0  
**Last Updated:** April 21, 2026  

---

## Overview

**Alfred** is a personal J.A.R.V.I.S.-style web application that helps with:
- Conversational AI chat (remembers everything)
- To-do management
- Habit tracking
- Email task auto-capture (Gmail + Outlook)
- Calendar integration (Google + Outlook)
- Notion sync

### Core Principles
| Principle | Description |
|-----------|-------------|
| **100% Free** | No paid services, subscriptions, or APIs |
| **Client-Side Only** | No backend, no server (uses cloud services directly) |
| **Single User** | Built for one user (you) |
| **Privacy-First** | API keys stored locally, no data sharing |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Alfred Web App (PWA)                             │
│                       (GitHub Pages)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  UI Layer: Chat | To-Do | Habits | Settings                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Local Storage (localStorage): API keys, Supabase config, user ID,     │
│                     queued mutations (for offline sync)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Cloud Storage (Supabase PostgreSQL) — Syncs across all devices         │
│  - conversations | todos | habits | preferences | memories | email_tasks│
├─────────────────────────────────────────────────────────────────────────┤
│  AI Provider (Device-Aware Routing)                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Laptop/Desktop: Ollama Cloud → Phi-3 Local (auto/manual fallback)│   │
│  │ iPhone/iPad:    Groq API → Cloudflare Workers AI → Cache only   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  External APIs                                                          │
│  - Email: Gmail OAuth, Outlook/Microsoft Graph OAuth                   │
│  - Calendar: Google Calendar OAuth, Outlook Calendar                   │
│  - Notion: Integration token                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## AI Provider Strategy

### Hybrid Cloud + Local Architecture

**Principle:** Cloud-first for quality, local fallback for efficiency and offline support.

### Laptop/Desktop (Linux)

| Priority | Provider | Models | Trigger |
|----------|----------|--------|---------|
| **1st** | Ollama Cloud Gateway | `qwen3.5:cloud`, `glm-5:cloud` | Default — best quality |
| **2nd** | Local Ollama | `phi3:latest` (3.8B) | Auto: when cloud hits rate limit |
| **3rd** | Local Ollama (manual) | `phi3:latest` (3.8B) | User toggle "Local Mode" or offline |

### iPhone/iPad (iOS)

| Priority | Provider | Models | Trigger |
|----------|----------|--------|---------|
| **1st** | Groq API | `llama-3-70b`, `mixtral-8x7b` | Default — fast, no daily limit |
| **2nd** | Cloudflare Workers AI | `llama-3`, `mistral` | When Groq hits rate limits |
| **3rd** | Cache only | — | Offline (no AI, cached data accessible) |

### Free Tier Limits

| Provider | Limit | Behavior When Hit |
|----------|-------|-------------------|
| Ollama Cloud | Session-based (~5hr), rate limits | Auto-fallback to Phi-3 local |
| Groq | ~30 req/min, unlimited daily | Fallback to Cloudflare |
| Cloudflare Workers AI | ~10k tokens/day | Cache only until reset |
| Local Phi-3 | Unlimited | Always available |

---

## Database Schema (Supabase)

### Tables
- `conversations` - Chat history
- `todos` - Task management
- `habits` + `habit_checkins` - Habit tracking
- `preferences` - User settings
- `memories` - Structured knowledge about user
- `email_tasks` - Auto-extracted tasks from emails
- `calendar_events` - Cached calendar events

---

## Offline Support

### How It Works

| Scenario | Laptop Behavior | iPhone Behavior |
|----------|-----------------|-----------------|
| **No internet** | Phi-3 local handles chat; mutations queue in localStorage | Cached data readable; no AI; mutations queue |
| **Cloud rate-limited** | Auto-switch to Phi-3; user notified | Switch to Cloudflare; if exhausted, cache only |
| **Back online** | Queued mutations sync to Supabase; conversation history merges | Same — sync queued data |

### Data Sync Strategy

- **Optimistic UI:** Changes appear instantly, sync in background
- **Conflict Resolution:** Last-write-wins (single user, so conflicts rare)
- **Queue Storage:** `localStorage` holds pending mutations with timestamps

---

## Build Order (Phases)

### Phase 1: Foundation
1. GitHub repo + GitHub Pages
2. Basic app shell with navigation
3. Supabase setup + connection
4. Chat interface + AI integration
5. Conversation persistence

### Phase 2: Core Features
1. To-do CRUD
2. Habit tracker + streaks
3. Preferences panel

### Phase 3: Integrations
1. Gmail OAuth + email scanning
2. Outlook OAuth + email scanning
3. Google Calendar + Outlook Calendar
4. Notion integration

### Phase 4: Polish
1. Error handling + offline support
2. UI polish + testing

---

## File Structure

```
ALFRED/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── storage.js
│   ├── supabase.js
│   ├── ai/
│   │   ├── provider.js
│   │   ├── ollama.js
│   │   └── groq.js
│   ├── features/
│   │   ├── chat.js
│   │   ├── todos.js
│   │   ├── habits.js
│   │   └── settings.js
│   └── integrations/
│       ├── gmail.js
│       ├── outlook.js
│       ├── google-cal.js
│       └── notion.js
└── SPEC.md
```

---

## Getting Started

### Prerequisites
- [ ] GitHub account
- [ ] Supabase account (free)
- [ ] Google Cloud project (Gmail/Calendar API)
- [ ] Microsoft Azure app (Outlook API)
- [ ] Notion account (optional)

### First Steps
1. Create GitHub repo, enable Pages
2. Create Supabase project, run migrations
3. Set up OAuth credentials
4. Deploy `index.html` to GitHub Pages
