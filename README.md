

<div align="center">
   <!-- LOGO: Replace with your project logo -->
   <img src="https://placehold.co/120x120?text=Logo" alt="Copilot CoLab Logo" width="120" />

   # 🚀 Copilot CoLab

   *"Real-time team collaboration for VS Code: tasks, chat, presence, AI."*

   <!-- Status Badges -->
   <p>
      <img src="https://img.shields.io/github/actions/workflow/status/n4bi10p/copilot-colab/ci.yml?branch=main&style=flat-square" alt="Build Status" />
      <img src="https://img.shields.io/codecov/c/github/n4bi10p/copilot-colab?style=flat-square" alt="Coverage" />
      <img src="https://img.shields.io/github/v/release/n4bi10p/copilot-colab?style=flat-square" alt="Version" />
   </p>
   <!-- Meta Badges -->
   <p>
      <img src="https://img.shields.io/github/license/n4bi10p/copilot-colab?style=flat-square" alt="License" />
      <img src="https://img.shields.io/github/stars/n4bi10p/copilot-colab?style=flat-square" alt="Stars" />
      <img src="https://img.shields.io/github/last-commit/n4bi10p/copilot-colab?style=flat-square" alt="Last Commit" />
      <img src="https://img.shields.io/github/issues/n4bi10p/copilot-colab?style=flat-square" alt="Open Issues" />
   </p>

   ⚡ <a href="https://demo-url.com">Live Demo</a> · 📖 <a href="https://docs-url.com">Documentation</a> 
   <br/><br/>
</div>

<!-- Replace with your demo GIF or screenshot — aim for 800px wide, 60fps GIF or MP4 poster -->
<div align="center">
   <img src="https://placehold.co/800x450?text=Demo+Preview" alt="Demo Preview" width="800" />
   <br/>
  
</div>

<details><summary>📋 Table of Contents</summary>

- [why-copilot-colab](#why-copilot-colab)
- [features](#features)
- [built-with](#built-with)
- [getting-started](#getting-started)
- [usage](#usage)
- [configuration](#configuration)
- [roadmap](#roadmap)
- [contributing](#contributing)
- [license](#license)
- [acknowledgements](#acknowledgements)
- [footer](#footer)

</details>

## Why Copilot CoLab?

**Juggling tasks, chat, and code context across apps kills developer flow.**

Most teams use separate tools for project management, chat, and code review. This fragments collaboration, slows feedback, and leaves context scattered. Copilot CoLab brings everything into VS Code, so your team stays focused and connected.

With real-time sync, AI-powered task generation, and secure Supabase backend, Copilot CoLab replaces the patchwork of apps with a single, developer-first workspace. No more lost context, no more switching tabs.

| Feature / Aspect         | Copilot CoLab | Slack/Asana | GitHub Projects |
| :---------------------- | :-----------: | :---------: | :-------------: |
| Real-time Kanban Board  |      ✅       |     ❌      |      ⚠️        |
| Team Chat in Editor     |      ✅       |     ✅      |      ❌        |
| Presence Tracking       |      ✅       |     ✅      |      ❌        |
| AI Task Generation      |      ✅       |     ❌      |      ❌        |
| Secure RLS Backend      |      ✅       |     ❌      |      ✅        |
| VS Code Integration     |      ✅       |     ❌      |      ⚠️        |

**Bottom line:** Copilot CoLab unifies collaboration, context, and AI—right where you code.

## ✨ Features

### 🔷 Kanban Task Board
Organize, assign, and update tasks in real time. Stay on top of work without leaving VS Code.

### 🔷 Team Chat
Chat with teammates directly in your editor. No more switching apps for quick feedback.

### 🔷 Presence Tracking
See who's online or idle. Know when your team is available for instant collaboration.

---

### 🔷 AI Assistance
Generate work breakdowns or digests using Gemini and GitHub context. Let AI handle the heavy lifting.

### 🔷 Secure Auth & RLS
Login with Google, GitHub, or email. All actions are protected by row-level security.

### 🔷 Realtime Sync
Tasks, chat, and presence update instantly for all users. No refresh needed.

## 🛠️ Built With

<div align="center">
   <img src="https://img.shields.io/badge/TypeScript-3178c6?for-the-badge&logo=typescript" />
   <img src="https://img.shields.io/badge/React-61dafb?for-the-badge&logo=react" />
   <img src="https://img.shields.io/badge/Tailwind-38b2ac?for-the-badge&logo=tailwindcss" />
   <img src="https://img.shields.io/badge/Supabase-3ecf8e?for-the-badge&logo=supabase" />
   <img src="https://img.shields.io/badge/Gemini-000000?for-the-badge&logo=google" />
   <img src="https://img.shields.io/badge/VS%20Code-007acc?for-the-badge&logo=visualstudiocode" />
</div>

- **TypeScript:** Strong typing and modern syntax for maintainable extension code.
- **React:** Fast, component-driven UI for the webview.
- **Tailwind CSS:** Utility-first styling for rapid, consistent design.
- **Supabase:** Auth, Postgres, and Realtime for secure backend and live updates.
- **Gemini API:** AI-powered task generation and digests.
- **VS Code API:** Deep integration for native extension experience.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- VS Code >= 1.90.0
- Supabase project (with URL and service key)

```bash
# Install Node.js
curl -fsSL https://nodejs.org/install.sh | bash
# Install VS Code
# https://code.visualstudio.com/download
```

### Installation
1. Clone the repo
      ```bash
      git clone https://github.com/n4bi10p/copilot-colab.git
      cd copilot-colab
      ```
2. Install dependencies
      ```bash
      npm install
      ```
3. Set up environment variables
      ```bash
      cp .env.example .env
      # Edit .env with your Supabase URL and Key
      ```
4. Build the extension and webview
      ```bash
      npm run build
      ```

### Quick Start
```bash
# Launch the extension in VS Code
npm run dev
# Press F5 to open Extension Development Host
```

> [!TIP] If you see a blank webview, check your .env and Supabase setup.

## 📖 Usage

### Basic: Open Dashboard
```bash
# In VS Code, open the command palette:
Copilot CoLab: Open Dashboard
```
See your team's tasks, chat, and presence in one place.

### Intermediate: Add a Task
```bash
# Use the task board UI or run:
Copilot CoLab: Create Task
```
Create, assign, and update tasks instantly.

### Advanced: AI WBS Generation
```bash
# Select "Generate WBS" in the AI panel
```
Let Gemini generate a work breakdown structure for your project.

> [!NOTE] For more examples, see [Documentation](https://docs-url.com).
<!-- Add a workflow GIF here showing the above in action -->

## ⚙️ Configuration

| Option           | Type    | Default | Description                                 |
| :--------------: | :-----: | :-----: | :------------------------------------------: |
| SUPABASE_URL     | string  | N/A     | Your Supabase project URL                    |
| SUPABASE_KEY     | string  | N/A     | Service role key for Supabase                |
| GEMINI_API_KEY   | string  | N/A     | API key for Gemini AI                        |
| RLS_ENABLED      | boolean | true    | Enable row-level security                    |
| DASHBOARD_THEME  | string  | dark    | Dashboard color theme                        |

```yaml
# .env example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
RLS_ENABLED=true
DASHBOARD_THEME=dark
```

> [!WARNING] Never commit your Supabase or Gemini keys to public repos.

## 🗺️ Roadmap
Here's what's done and what's coming next.

#### ✅ Completed
- Supabase auth/session
- Project/member management
- Real-time tasks/messages/presence
- Extension commands wired to backend

#### 🔄 In Progress
- AI flow (WBS generator or digest generator)
- Reviewer agent with GitHub PR context

#### 🔮 Planned
- Conflict-risk hints
- Gamification/vibe log polish

See [open issues](https://github.com/n4bi10p/copilot-colab/issues) for a full list of proposed features and known bugs.

## 🤝 Contributing

We welcome all contributors!

1. Fork the repo
2. Clone your fork
3. Create a branch (`feat/your-feature`)
4. Commit using Conventional Commits
5. Push and open a PR

> [!IMPORTANT] Read CONTRIBUTING.md before submitting a PR

```bash
# Dev setup
npm install
npm test
npm run lint
```

[![Good First Issues](https://img.shields.io/github/issues/n4bi10p/copilot-colab/good%20first%20issue?style=flat-square)](https://github.com/n4bi10p/copilot-colab/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

## 📄 License

Distributed under the MIT License. See LICENSE.txt for more information.

<img src="https://img.shields.io/github/license/n4bi10p/copilot-colab?style=flat-square" alt="License" />

## 🔮 Future Scope

### 📬 Notification Layer
- [ ] **Bot Notifications** — Integrate WhatsApp, Telegram, and Discord bots to send real-time alerts and updates directly to your messaging platform. Stay informed wherever you are, without opening the app.

### 🤖 Bot-as-Interface
- [ ] **Two-Way Bot Communication** — Interact with the extension through WhatsApp, Telegram, or Discord bots. Send commands, trigger actions, and receive responses from chat, without opening the extension UI.
- [ ] **OpenClaw-Style Bot Experience** — A dedicated bot will act as a conversational interface to the extension, letting you query data, manage tasks, and control features using natural chat commands.

> [!NOTE] Interested in building this? Check open issues tagged `bot-integration` and jump in.


<div align="center">
   <img src="https://img.shields.io/badge/Supabase-3ecf8e?for-the-badge&logo=supabase" />
   <img src="https://img.shields.io/badge/Gemini-000000?for-the-badge&logo=google" />
   <img src="https://img.shields.io/badge/VS%20Code-007acc?for-the-badge&logo=visualstudiocode" />
</div>

---

<div align="center">
   ⭐ Star this repo if you find it useful!
   <br/>
   Made with ❤️ by [Aman, Nabil, Bhumi] 
   <br/>

