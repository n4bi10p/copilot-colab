# Copilot CoLab — Project Structure

---

## **Root Directory Layout**

```plaintext
copilot-colab/
│
├── .vscode/                     # VS Code extension config/settings
│
├── src/                         # Main source code for extension/plugin
│   ├── extension/               # VS Code extension activation logic & command registration
│   │   ├── index.ts             # Extension entry (activate/deactivate)
│   │   ├── commands.ts          # Register all commands (init, sync, etc.)
│   │   └── api/                 # Supabase, LLM agent, GitHub integration
│   │       ├── supabase.ts      # Supabase CRUD, realtime listeners, RLS-aware queries
│   │       ├── auth.ts          # Supabase/GitHub authentication
│   │       ├── agent.ts         # AI agent logic (OpenAI/Copilot SDK integration)
│   │       └── presence.ts      # Real-time presence/session tracking
│   ├── webview/                 # React sidebar panels (UI)
│   │   ├── App.tsx              # Root webview component
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Main sidebar layout (Codex-style UI)
│   │   │   ├── TaskBoard.tsx    # Kanban/task board panel
│   │   │   ├── ChatPanel.tsx    # Team/agent chat area
│   │   │   ├── PresencePanel.tsx# Team presence/activity
│   │   │   ├── AgentPanel.tsx   # AI agent/assistant chat
│   │   │   ├── LeaderPanel.tsx  # (Leader/spectator view)
│   │   │   ├── Onboarding.tsx   # User onboarding/progress panel
│   │   │   └── VibeLog.tsx      # Hackathon journey/vibe log UI
│   │   ├── hooks/               # Custom React hooks (state, queries, etc.)
│   │   └── utils/               # UI helpers, formatting, etc.
│   ├── state/                   # Zustand/Redux store, actions, selectors
│   ├── types/                   # TypeScript interfaces/types (tasks, users, chat, etc.)
│   └── assets/                  # Icons, avatars, logos, animations
│
├── supabase/                    # Supabase local project setup (migrations, config, seed)
│   ├── config.toml              # Supabase local stack configuration
│   ├── migrations/              # SQL schema + RLS policies
│   ├── seed.sql                 # Local seed data
│   └── README.md                # Backend setup/test notes
│
├── scripts/                     # Dev scripts, build, deployment, etc.
│   └── build.sh
│
├── test/                        # Unit/integration tests (Jest/Puppeteer)
│   ├── extension.test.ts
│   ├── webview.test.tsx
│   ├── agent.test.ts
│   └── ...
│
├── .gitignore
├── package.json                 # Dependency and scripts management (extension & UI)
├── tsconfig.json                # TypeScript config
├── README.md                    # Project info, setup, hackathon submission details
├── VIBELOG.md                   # AI usage log/journey for hackathon rules
├── CONTRIBUTING.md              # Guidelines for team onboarding/contribution

```

---

## **Directory Details**

- **src/extension/**  
  - Core VS Code activation, command handling, main backend logic, API wrappers for Supabase, presence, agent (LLM) integration.
- **src/webview/**  
  - All frontend React code for VS Code sidebar panels (task board, chat, presence, agent help, onboarding, vibe log).  
  - Modular components, hooks, and UI utilities.
- **supabase/**  
  - Supabase migrations, row-level-security policy definitions, local stack config/seed setup.
- **state/**  
  - Client-side state store (Zustand/Redux), shared by extension/webview.
- **types/**  
  - Type definitions for tasks, presence, chat, comments, badges, etc.

---

## **Quick Start (For Teammates/Aman/Bhumi/Nabil)**

- **Frontend (Aman):**
  - Focus on `src/webview/components/` for UI panels, `Sidebar.tsx`, `TaskBoard.tsx`, etc.
- **Backend (Nabil/Bhumi):**
  - Build extension logic in `src/extension/`, Supabase integration in `api/`, and backend SQL/functions in `supabase/`
  - Handle presence/session, agent logic (`agent.ts`, `presence.ts`)
- **All:**
  - Update `README.md`, `VIBELOG.md` as you build!
  - Test frequently in VS Code Dev Mode.

---

**This structure ensures separation of backend VS Code logic and frontend UI panels, aligned for rapid hackathon development and clear team roles.**
