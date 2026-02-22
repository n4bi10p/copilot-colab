# 🔥 Copilot CoLab — Vibe Log

> *"We didn't just build a VS Code extension. We survived one."*

**Team:** Aman (Frontend) · Nabil (Backend) · Bhumi (QA + Chat UI)  
**Timeline:** 36-hour sprint  
**Stack:** TypeScript · React · Tailwind · Supabase · Gemini · VS Code API  
**Status:** Shipped ✅

---

## The Big Picture

We set out to build something genuinely useful — a VS Code extension that brings your entire team workspace *into the editor*. No more alt-tabbing between Slack, Notion, and GitHub. Kanban board, live chat, presence tracking, AI task generation — all inside VS Code, backed by a real Supabase database with row-level security.

Simple premise. Wild execution.

This is the log of what actually happened.

---

## Hour 0 — "How Hard Can It Be?"

We split up like a heist crew:

- **Nabil** disappears into the backend. PostgreSQL migrations, RLS policies, Supabase Realtime subscriptions, Gemini AI wiring. He emerges only to push commits and say cryptic things like *"the RPC is idempotent now."*
- **Aman** starts building every UI panel in existence. Dashboard, task board, agent view, terminal view, settings panel, chat panel. All of them. At once.
- **Bhumi** takes on QA + reporting *and* ends up owning the entire chat/presence UI when the workload shuffle happens. Quietly ships a full `ChatPanel.tsx` while nobody is watching.

Three people. Three branches. One repo. What could go wrong?

---

## The Merge That Tried to Kill Us (It Didn't)

When it was time to put everything together, `git rebase` had opinions.

**6 merge conflicts.**

Not 1. Not 2. Six. All in files that mattered:

```
CONFLICT: src/extension/supabase.ts
CONFLICT: src/extension/backendClient.ts
CONFLICT: src/webview/App.tsx
CONFLICT: src/webview/components/AICommandPanel.tsx
CONFLICT: src/extension/commands.ts
CONFLICT: README.md
```

The wildest one: both Nabil and Aman had written an `aiAssignTasks` function — completely independently, in different files — and they both worked, just differently. Nabil had a robust fallback round-robin assignment. Aman had the simple version. We kept Nabil's because it actually handled the edge cases.

Then we found duplicate property keys in `BACKEND_COMMANDS`. TypeScript was quietly ignoring the second definition and we had no idea until we audited manually.

> **Lesson:** When three people own the same backend command table, someone *will* write it twice.

Commit `cb887e7`. Branch merged. Build passed. Exhale.

---

## The SVG That Refused to Show Up

We had a logo. We wanted it in the VS Code activity bar — you know, that icon strip on the left side. Simple.

First attempt: dropped in the SVG. Built. Ran the extension.

**Nothing.** The icon slot was blank.

Turns out VS Code's activity bar doesn't render full-color images. It takes your SVG and applies its own theme color as a mask. If your SVG has backgrounds, fills, or colors hardcoded, VS Code just... ignores it. You get a ghost icon.

The fix: rewrite the entire SVG from scratch. 24×24. No background. No fill. Stroke only. Single path forming the `<CC>` shape in `#C5C5C5`. Pure monochrome.

**Take 2:** icon shows up perfectly.

> **Lesson:** VS Code activity bar icons are not images. They are silhouettes. Design accordingly.

---

## Bhumi Pushed Something

Mid-sprint, a notification: `origin/feat/gemini-chat-panel` updated.

Bhumi had quietly built an entire `ChatPanel.tsx` — `@gemini` mention autocomplete, message threading, real-time display, the full thing. We fast-forward merged it into main.

Then we actually read the code.

Two problems, back to back:

**Problem 1:** The Gemini chat was calling `backendClient.ai.generateWbs` to process messages. That's the *work breakdown structure* generator. For every. single. chat. message.

```tsx
// what it was doing:
const result = await backendClient.execute("copilotColab.ai.generateWbs", { text });

// what it should do:
const freshList = await backendClient.sendMessageAndList(project.id, text, user.uid);
```

The backend's `sendMessageAndList` already handles `@gemini` auto-reply internally. ChatPanel was doing it manually *and* calling the wrong command. Fixed.

**Problem 2:** Inside `AgentPanel.tsx`, the `@gemini` path had `model: "gpt-4.1"` hardcoded. In a Gemini call. We are not using GPT-4. We have never used GPT-4 in this project. Nobody knows how that got there.

Removed. No questions asked.

---

## The Great Mock Data Purge

Before we could push to main, we had to do something uncomfortable: actually *read* all the components we'd written.

What we found was a graveyard of fake data that had been living in production code for god knows how long.

### `AgentView.tsx` — The Time Capsule
```tsx
// this was a real function in our codebase:
function getAgentResponse(text: string): string {
  if (/wbs/i.test(text)) {
    return `Generated WBS for payment-api.ts:\n1. Setup Firebase\n2. Create TransactionType\n3. Deploy to Firestore`;
  }
  return "I'll help you with that!";
}
```

Firebase. In a Supabase project. `payment-api.ts` — a file that does not exist in our repo. `TransactionType` — we have no such schema. This was a placeholder from week one that somehow survived every PR review.

It was replaced with actual calls to `backendClient.generateWbs()`, `backendClient.aiAssignTasks()`, and `backendClient.suggestFromSelection()`.

### `TerminalView.tsx` — The Fiction Department
The terminal view had three tabs showing live-looking logs. They were completely fake:

```tsx
const TAB_LOGS = {
  Backend: [
    { level: "INFO",  text: "Connected to Firestore" },         // we use Supabase
    { level: "DEBUG", text: "feat/backend-firestore loaded" },  // that branch doesn't exist
    { level: "INFO",  text: "GPT-4 model loaded" },             // we use Gemini
  ],
  Realtime: [
    { level: "INFO", text: "payment-api.ts watching..." },      // again, this file
  ],
};
```

Also: the online member count was hardcoded as `"3 ONLINE"`. Always 3. Even if nobody was there.

And: `"Firestore Sync"` as a status label — in a project that migrated to Supabase weeks ago.

All of it replaced with real `useEffect` hooks calling `backendClient.execute()` for live backend data, a `Reload` button, loading states, and `${members.length} ONLINE` from actual presence data.

### `AgentPanel.tsx` — The Echo Chamber
The AI assistant sidebar was responding with:

```tsx
setTimeout(() => {
  addMessage({ role: "assistant", content: `Echo: ${text}` });
}, 800);
```

An 800ms fake delay. Then it echoed whatever you said back at you. AI, it was not.

Also hardcoded: `payment-api.ts` as the "currently open file" for every session. That file haunted us across three components.

---

## The Last Build Error (5 Minutes Before Push)

Everything was fixed. Mocks purged. Code cleaned up. We ran the build.

```
ERROR in AgentView.tsx(124,26)
TS2554: Expected 1 arguments, but got 2.
```

The `backendClient.generateWbs` method takes an options object:

```ts
generateWbs<T>(args: { projectId: string; goal: string }): Promise<T>
```

We were calling it as:

```ts
backendClient.generateWbs(project.id, goal)  // ❌ two positional args
```

One line fix:

```ts
backendClient.generateWbs({ projectId: project.id, goal })  // ✅
```

Build passed. No more errors. Only the expected `webview.js 288 KiB` bundle size warning (which we've made peace with).

---

## Push Day

```bash
git add -A
git commit -m "fix: dehardcode all mocks — wire AgentView/AgentPanel/TerminalView to real backend"
git push origin main --force-with-lease

# output:
! [rejected] main -> main (stale info)
```

Of course. Someone had merged two README updates directly to remote while we were working. Classic.

```bash
git fetch origin
git rebase origin/main
# Successfully rebased and updated refs/heads/main.

git push origin main
# main -> main ✅
```

Commit `2a6fb83`. Done.

---

## What We Shipped

| Feature | Status |
|---|---|
| Supabase auth (Google / GitHub / Email) | ✅ |
| Real-time Kanban task board | ✅ |
| Team chat with `@gemini` auto-reply | ✅ |
| Presence tracking (online / idle) | ✅ |
| AI Work Breakdown Structure via Gemini | ✅ |
| AI bulk task assignment with fallback | ✅ |
| VS Code activity bar + marketplace icon | ✅ |
| All backend commands wired end-to-end | ✅ |
| Zero hardcoded mock data in shipped code | ✅ |
| Row-level security on all Supabase tables | ✅ |

---

## By the Numbers

- **Merge conflicts resolved:** 6
- **Branches merged:** 3 (`feat/frontend-ui`, `feat/backend-supabase-rls`, `feat/gemini-chat-panel`)
- **Hardcoded mock data instances removed:** ~20
- **Times `payment-api.ts` appeared in our codebase:** 4 (file never existed)
- **Times "Firestore" appeared after we switched to Supabase:** 3
- **Wrong AI model names found:** 1 (`gpt-4.1` in a Gemini function)
- **SVG rewrites:** 2 (first one was invisible)
- **Times the build failed at the last moment:** 2
- **Final bundle size warnings ignored with dignity:** 3

---

## What We'd Do Differently

**Start integration earlier.** Three separate branches working in isolation for too long meant the merge was a bigger event than it needed to be. Small, frequent cross-branch syncs would have caught the duplicate `aiAssignTasks` implementations before they both got deep.

**Never commit placeholder data with real-looking strings.** `"Connected to Firestore"`, `"3 ONLINE"`, `"payment-api.ts"` — these looked real enough that they survived multiple reviews. If you're faking it, make it obviously fake. `TODO_REPLACE_ME` is harder to miss than a realistic-looking log line.

**Read the function signature before calling it.** The `generateWbs({ projectId, goal })` issue was 30 seconds of TypeScript reading away from never happening.

**Test the icon on dark AND light themes.** VS Code theme-masks SVG icons. What looks fine in a browser will be invisible in the activity bar if you don't design for it from day one.

---

## Final Thought

The thing about shipping a real VS Code extension with a real Supabase backend and real Gemini AI integration in a hackathon-style sprint is that *everything is harder than you think it'll be*, and also somehow *it gets done anyway*.

We had bad merges. We had phantom files. We had an SVG that refused to render. We had an AI panel that just echoed messages back. We had Firebase in a Supabase project.

But the final commit has 0 hardcoded responses. Every button calls a real endpoint. Every log line is live data. Every AI response comes from Gemini.

That's the vibe.

---

*Built by Aman, Nabil, and Bhumi — February 2026*  
*[github.com/n4bi10p/copilot-colab](https://github.com/n4bi10p/copilot-colab)*
