---
name: Alfred Says Hello World
description: Personal J.A.R.V.I.S.-style assistant web app concept
type: project
---
**Concept:** Build a personal-use web app where "Alfred" (Claude) helps with day-to-day tasks, habits, reminders — like J.A.R.V.I.S.

**Architecture (client-side only, completely free):**
- **Hosting:** GitHub Pages (free)
- **Storage:** localStorage / IndexedDB (todos, habits, preferences)
- **Brain:** Groq or OpenRouter API (free tier) — runs Llama 3 / Mistral / other open models on their servers
- **API key:** Stored in localStorage, not hardcoded (personal use only)

**Why not local Ollama:**
- User's laptop can't handle running models (crash risk)
- Cloud inference APIs run models on THEIR servers, not user's laptop

**Free API options:**
| Provider | Free tier | Models |
|----------|-----------|--------|
| Groq | Generous free tier, very fast | Llama 3, Mixtral |
| OpenRouter | Free credits, many models | Llama, Mistral, Gemma, etc. |
| Cloudflare Workers AI | Good free tier | Llama, various |

**Features to consider:**
- To-do list management
- Habit tracking
- Daily reminders/alerts (browser notifications)
- Conversational interface with Alfred
- Voice interface (future: Whisper + TTS)

**Why this approach:**
- No backend needed
- No database costs
- Free hosting + free AI inference
- Accessible from any device with browser
- Private/personal use only
- No heavy compute on user's laptop

**Trigger phrase:** "alfred say hello to the world" — start the project with this

---

## Phase 2: Alfred Gets a Body

**Concept:** Give Alfred a physical presence — a robot that can see, hear, speak, and move.

**Hardware options (starting simple):**
| Level | Components | Complexity |
|-------|-----------|------------|
| **Desk companion** | Raspberry Pi, camera, mic, speaker, small screen | Low |
| **Room-aware bot** | Above + motors, can pan/tilt or follow you | Medium |
| **Mobile rover** | Above + wheels, navigates your space | Medium-high |
| **Manipulator** | Above + arm/gripper, can interact with objects | High |

**Starter hardware stack:**
- **Brain:** Raspberry Pi or ESP32
- **Eyes:** Camera module
- **Ears:** USB mic or mic HAT
- **Voice:** Speaker / audio HAT
- **Face:** Small OLED or LCD screen (emotions, expressions)
- **Connection:** Wi-Fi → calls Groq/OpenRouter API → Alfred responds

**Capabilities:**
- See and recognize you
- Respond to voice commands
- Display emotions / expressions on screen
- Control smart home devices
- Follow you (if mobile)
- Physical interaction (future: arm/gripper)

**Status:** Phase 2 — after web app is built