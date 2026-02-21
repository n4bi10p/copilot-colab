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
