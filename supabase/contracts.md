# Copilot CoLab Backend Contract (Supabase)

This document defines the backend contract for frontend integration.

## Scope

- Database: Supabase Postgres (`public` schema)
- Auth: Supabase Auth (JWT user id available via `auth.uid()`)
- Core tables: `projects`, `project_members`, `tasks`, `messages`, `presence`

## Data model

### `public.projects`

- `id: uuid` (PK, generated)
- `name: text` (required)
- `created_at: timestamptz` (default `now()`)
- `created_by: uuid` (required, must equal `auth.uid()` under RLS)

Insert payload:

```json
{
  "name": "Hackathon Sprint",
  "created_by": "<current_user_id>"
}
```

### `public.tasks`

- `id: uuid` (PK, generated)
- `project_id: uuid` (required, FK -> `projects.id`)
- `title: text` (required)
- `status: text` (required, one of `backlog | in_progress | done`)
- `assignee_id: uuid | null` (FK -> `auth.users.id`)
- `created_at: timestamptz` (default `now()`)
- `updated_at: timestamptz` (default `now()`, auto-updated by trigger)

Insert payload:

```json
{
  "project_id": "<project_id>",
  "title": "Implement Supabase auth flow",
  "status": "backlog",
  "assignee_id": "<optional_user_id>"
}
```

### `public.project_members`

- `id: uuid` (PK, generated)
- `project_id: uuid` (required, FK -> `projects.id`)
- `user_id: uuid` (required, FK -> `auth.users.id`)
- `role: text` (required, one of `owner | member`)
- `created_at: timestamptz` (default `now()`)
- unique constraint: `(project_id, user_id)`

Insert payload (owner invites member):

```json
{
  "project_id": "<project_id>",
  "user_id": "<invitee_user_id>",
  "role": "member"
}
```

### `public.messages`

- `id: uuid` (PK, generated)
- `project_id: uuid` (required, FK -> `projects.id`)
- `text: text` (required)
- `author_id: uuid` (required, must equal `auth.uid()` on insert)
- `created_at: timestamptz` (default `now()`)

Insert payload:

```json
{
  "project_id": "<project_id>",
  "text": "Task moved to in_progress",
  "author_id": "<current_user_id>"
}
```

### `public.presence`

- `user_id: uuid` (PK, FK -> `auth.users.id`, must equal `auth.uid()`)
- `project_id: uuid` (required, FK -> `projects.id`)
- `status: text` (required, one of `online | idle`)
- `last_active_at: timestamptz` (default `now()`)

Upsert payload:

```json
{
  "user_id": "<current_user_id>",
  "project_id": "<project_id>",
  "status": "online",
  "last_active_at": "2026-02-20T12:00:00Z"
}
```

## RLS permissions (current behavior)

All table access requires authenticated users and ownership conditions enforced by policies.

- `projects`
  - `SELECT` allowed to project owner or project members.
  - `INSERT/UPDATE/DELETE` remain owner-only (`created_by = auth.uid()`).
- `project_members`
  - `SELECT` allowed to owner and all members of that project.
  - `INSERT/UPDATE` allowed only by project owner.
  - `DELETE` allowed by project owner or by the member removing their own membership row.
- `tasks`
  - CRUD allowed to project owner and project members.
- `messages`
  - `SELECT/UPDATE/DELETE` allowed to project owner and project members.
  - `INSERT` requires `author_id = auth.uid()` plus project membership/ownership.
- `presence`
  - `SELECT` allowed to project owner and project members (for online roster).
  - `INSERT/UPDATE/DELETE` allowed only for own row (`user_id = auth.uid()`), and only within projects user belongs to.

## Query contract for frontend

Use Supabase JS with authenticated session token.

### Create project

```ts
supabase.from("projects").insert({
  name,
  created_by: user.id,
});
```

### List my projects

```ts
supabase.from("projects").select("*").order("created_at", { ascending: false });
```

### Invite/add member to a project (owner only, RPC)

Preferred:

```ts
supabase.rpc("invite_member", {
  p_project_id: projectId,
  p_user_id: invitedUserId,
  p_role: "member",
});
```

### Remove member from project (owner, or self-leave, RPC)

```ts
supabase.rpc("remove_member", {
  p_project_id: projectId,
  p_user_id: targetUserId,
});
```

### List project members (owner/member, RPC)

```ts
supabase.rpc("list_project_members", {
  p_project_id: projectId,
});
```

### Create task

```ts
supabase.from("tasks").insert({
  project_id,
  title,
  status: "backlog",
  assignee_id: null,
});
```

### List tasks by project and status

```ts
supabase
  .from("tasks")
  .select("*")
  .eq("project_id", projectId)
  .order("updated_at", { ascending: false });
```

For client-side columns: group returned tasks by `status`.

### Update task status

```ts
supabase
  .from("tasks")
  .update({ status: "in_progress" })
  .eq("id", taskId)
  .eq("project_id", projectId);
```

### Send message

```ts
supabase.from("messages").insert({
  project_id,
  text,
  author_id: user.id,
});
```

### Fetch recent messages for project room

```ts
supabase
  .from("messages")
  .select("*")
  .eq("project_id", projectId)
  .order("created_at", { ascending: false })
  .limit(100);
```

### Upsert presence heartbeat

```ts
supabase.from("presence").upsert(
  {
    user_id: user.id,
    project_id: projectId,
    status: "online",
    last_active_at: new Date().toISOString(),
  },
  { onConflict: "user_id" }
);
```

### List online users (current project)

```ts
supabase
  .from("presence")
  .select("*")
  .eq("project_id", projectId)
  .eq("status", "online")
  .order("last_active_at", { ascending: false });
```

## Realtime contract

Subscribe per table and project filter:

- Tasks channel: `tasks:project:{projectId}`
  - events: `INSERT`, `UPDATE`, `DELETE` on `public.tasks`
  - filter: `project_id=eq.{projectId}`
- Messages channel: `messages:project:{projectId}`
  - events: `INSERT` on `public.messages` (and optional `UPDATE/DELETE`)
  - filter: `project_id=eq.{projectId}`
- Members channel: `members:project:{projectId}`
  - events: `INSERT`, `UPDATE`, `DELETE` on `public.project_members`
  - filter: `project_id=eq.{projectId}`
- Presence channel: `presence:project:{projectId}`
  - events: `INSERT`, `UPDATE`, `DELETE` on `public.presence`
  - filter: `project_id=eq.{projectId}`

Recommended frontend behavior:

- Tasks: optimistic local update, reconcile on realtime payload.
- Messages: append on realtime insert, dedupe by `id`.
- Presence: upsert by `user_id`, mark idle when `last_active_at` is stale.

## Error contract

Frontend should map common Postgres/Supabase errors:

- `42501` (insufficient_privilege / RLS denial): show "You do not have access to this resource."
- `23503` (foreign key violation): show "Invalid project/user reference."
- `23514` (check violation): show "Invalid status value."
- `23505` (unique violation on `presence.user_id` without upsert): retry with `upsert`.

## Membership RPC contract

- `invite_member(p_project_id uuid, p_user_id uuid, p_role text default 'member')`
  - returns: `project_members` row
  - allowed: project owner only
- `remove_member(p_project_id uuid, p_user_id uuid)`
  - returns: `boolean`
  - allowed: project owner for removals, or member removing self
  - disallows removing project creator from membership
- `list_project_members(p_project_id uuid)`
  - returns: set of `project_members`
  - allowed: project owner and project members

## Versioning

- Contract version: `v1`
- Source of truth: migration files in `supabase/migrations/`
