# Alfred - Personal AI Assistant

A J.A.R.V.I.S.-style web application that helps with conversations, to-dos, habits, and more.

---

## Features

- **Conversational AI Chat** — Remembers everything, cloud-first with local fallback
- **To-Do Management** — Track tasks across all devices
- **Habit Tracking** — Build streaks and monitor progress
- **Email Integration** — Auto-extract tasks from Gmail/Outlook (planned)
- **Calendar Sync** — Google + Outlook calendar integration (planned)
- **Notion Sync** — Push tasks to Notion (planned)

---

## Architecture

| Component | Technology |
|-----------|------------|
| **Platform** | PWA (Progressive Web App) |
| **Hosting** | GitHub Pages |
| **Database** | Supabase (syncs across devices) |
| **AI (Laptop)** | Ollama Cloud → Phi-3 Local |
| **AI (iPhone)** | Groq API → Cloudflare Workers AI |

### Principles

- **100% Free** — No paid services or subscriptions
- **Client-Side Only** — No backend server required
- **Single User** — Built for personal use
- **Privacy-First** — API keys stored locally, no data sharing
- **Offline Support** — Local AI works without internet; data syncs when back online

---

## Getting Started

### Prerequisites

- [ ] GitHub account
- [ ] Supabase account (free tier)
- [ ] Groq API key (free)
- [ ] Ollama installed locally (for Phi-3 fallback)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/rainbowmole/ALFRED.git
   cd ALFRED
   ```

2. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Run SQL migrations from `supabase/migrations/`

3. **Get Groq API key**
   - Go to [console.groq.com](https://console.groq.com)
   - Create API key
   - Add to Settings in Alfred

4. **Install Ollama (for local fallback)**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull phi3
   ```

5. **Deploy to GitHub Pages**
   - Go to repo Settings → Pages
   - Enable Pages on `main` branch
   - Your app will be live at `https://rainbowmole.github.io/ALFRED`

---

## Project Structure

```
ALFRED/
├── index.html              # Main app shell
├── css/
│   └── styles.css          # App styling
├── js/
│   ├── app.js              # Main entry point
│   ├── state.js            # State management
│   ├── storage.js          # localStorage wrapper
│   ├── supabase.js         # Database connection
│   ├── ai/
│   │   ├── provider.js     # AI routing logic
│   │   ├── ollama.js       # Ollama (cloud + local)
│   │   └── groq.js         # Groq API
│   ├── features/
│   │   ├── chat.js         # Chat interface
│   │   ├── todos.js        # To-do CRUD
│   │   ├── habits.js       # Habit tracking
│   │   └── settings.js     # Settings panel
│   └── integrations/
│       ├── gmail.js        # Gmail OAuth
│       ├── outlook.js      # Outlook OAuth
│       ├── google-cal.js   # Google Calendar
│       └── notion.js       # Notion API
├── SPEC.md                 # Full specification document
└── README.md               # This file
```

---

## AI Provider Strategy

### Laptop/Desktop

| Priority | Provider | Models | When |
|----------|----------|--------|------|
| 1st | Ollama Cloud | qwen3.5:cloud, glm-5:cloud | Default |
| 2nd | Local Ollama | phi3:latest | Auto-fallback on rate limit |
| 3rd | Local Ollama | phi3:latest | Manual "Local Mode" toggle |

### iPhone/iPad

| Priority | Provider | Models | When |
|----------|----------|--------|------|
| 1st | Groq API | llama-3-70b | Default |
| 2nd | Cloudflare Workers AI | llama-3, mistral | Fallback |
| 3rd | Cache only | — | Offline |

---

## License

MIT — Personal use project
