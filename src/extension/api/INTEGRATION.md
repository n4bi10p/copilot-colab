# Extension API Integration Map

This file maps extension-side API wrappers to `supabase/contracts.md`.

## Setup

- Instantiate one typed Supabase client in extension runtime:
  - `SupabaseClient<Database>`
- Pass it to:
  - `new CopilotColabSupabaseApi(client)`
  - `new CopilotColabRealtimeApi(client)`

## CRUD wrappers (`src/extension/api/supabase.ts`)

- `createProject({ name, createdBy })`
  - table: `projects`
  - contract section: create project
- `addProjectMember({ projectId, userId, role })`
  - RPC: `invite_member`
  - contract section: membership RPC
- `listProjectMembers(projectId)`
  - RPC: `list_project_members`
  - contract section: membership RPC
- `removeProjectMember({ projectId, userId })`
  - RPC: `remove_member`
  - contract section: membership RPC
- `listTasksByProject(projectId)`
  - table: `tasks`
  - contract section: list tasks by project
- `upsertPresence({ user_id, project_id, status, last_active_at? })`
  - table: `presence`
  - contract section: upsert presence heartbeat
- `listMessagesByProject(projectId, limit?)`
  - table: `messages`
  - contract section: fetch recent messages

## Auth wrappers (`src/extension/api/auth.ts`)

- `getSession()`
- `getCurrentUser()`
- `signInWithPassword({ email, password })`
- `signUpWithPassword({ email, password })`
- `signOut()`

## Realtime wrappers (`src/extension/api/realtime.ts`)

- `subscribeTasksByProject(projectId, handler)`
  - channel: `tasks:project:{projectId}`
- `subscribeMessagesByProject(projectId, handler)`
  - channel: `messages:project:{projectId}`
- `subscribePresenceByProject(projectId, handler)`
  - channel: `presence:project:{projectId}`
- `subscribeMembersByProject(projectId, handler)`
  - channel: `members:project:{projectId}`

Each realtime wrapper subscribes to `postgres_changes` filtered by `project_id`.

## Notes

- RLS is enforced in DB. These wrappers surface DB errors as thrown `Error`.
- Keep auth session active so JWT claim `sub` is present for policies.

## VS Code Command Payload Examples

These are the registered command IDs from `src/extension/commands.ts`.

```ts
import * as vscode from "vscode";

// create project
await vscode.commands.executeCommand("copilotColab.project.create", {
  name: "Hackathon Project",
  createdBy: "<owner_user_uuid>",
});

// invite member (owner only)
await vscode.commands.executeCommand("copilotColab.member.invite", {
  projectId: "<project_uuid>",
  userId: "<member_user_uuid>",
  role: "member",
});

// remove member (owner or self)
await vscode.commands.executeCommand("copilotColab.member.remove", {
  projectId: "<project_uuid>",
  userId: "<member_user_uuid>",
});

// list project members
await vscode.commands.executeCommand("copilotColab.member.list", {
  projectId: "<project_uuid>",
});

// list tasks/messages
await vscode.commands.executeCommand("copilotColab.tasks.list", {
  projectId: "<project_uuid>",
});
await vscode.commands.executeCommand("copilotColab.messages.list", {
  projectId: "<project_uuid>",
});

// upsert own presence
await vscode.commands.executeCommand("copilotColab.presence.upsert", {
  userId: "<current_user_uuid>",
  projectId: "<project_uuid>",
  status: "online",
});

// subscribe/unsubscribe realtime streams
await vscode.commands.executeCommand("copilotColab.realtime.subscribeProject", {
  projectId: "<project_uuid>",
});
await vscode.commands.executeCommand("copilotColab.realtime.unsubscribeProject", {
  projectId: "<project_uuid>",
});

// auth get session/user
await vscode.commands.executeCommand("copilotColab.auth.getSession");
await vscode.commands.executeCommand("copilotColab.auth.getUser");

// auth password sign-in/sign-up/sign-out
await vscode.commands.executeCommand("copilotColab.auth.signInWithPassword", {
  email: "user@example.com",
  password: "strong-password",
});
await vscode.commands.executeCommand("copilotColab.auth.signUpWithPassword", {
  email: "user@example.com",
  password: "strong-password",
});
await vscode.commands.executeCommand("copilotColab.auth.signOut");
```

## Webview Bridge Contract

Webview can call extension commands through `window.acquireVsCodeApi().postMessage`.

Request:

```ts
vscode.postMessage({
  command: "backend.execute",
  requestId: crypto.randomUUID(),
  commandId: "copilotColab.auth.getSession",
  args: { /* optional */ },
});
```

Response message shape from extension:

```ts
{
  type: "backend.response",
  requestId: string,
  ok: boolean,
  data?: unknown,
  error?: string
}
```

Suggested frontend helper:

- Use `src/webview/utils/backendClient.ts`.
- It wraps `backend.execute` into `backendClient.execute(...)` and exposes auth helpers:
  - `backendClient.getSession()`
  - `backendClient.getUser()`
  - `backendClient.signInWithPassword(email, password)`
  - `backendClient.signUpWithPassword(email, password)`
  - `backendClient.signOut()`
