# Supabase Backend Setup Notes

This folder contains local database migrations for Copilot CoLab.

## Migration order

1. `20260221090000_init_schema.sql`
2. `20260221091000_rls.sql`
3. `20260221092000_presence_policy_fix.sql` (legacy no-op)
4. `20260221093000_presence_policy_fix_2.sql` (legacy no-op)
5. `20260221100000_project_members_rls.sql`
6. `20260221103000_fix_policy_recursion.sql`
7. `20260221110000_membership_rpc.sql`

## Local apply/reset

Run from project root:

```bash
supabase start
supabase db reset
```

The reset command applies all migrations in timestamp order and then executes `supabase/seed.sql`.

Smoke-test setup SQL:

```bash
supabase db query < supabase/rls_smoke_test.sql
```

If your CLI version does not support stdin for `db query`, run `supabase/rls_smoke_test.sql` in Supabase Studio SQL Editor.

RLS behavior assertions (no app needed):

- Run `supabase/rls_behavior_checks.sql` in Supabase Studio SQL Editor.
- You should see `NOTICE` lines for expected denies and no final errors.

## Quick RLS validation checklist

1. Sign up/login with user A and user B.
2. As user A, insert a project with `created_by = auth.uid()`.
3. As user A, add user B into `project_members` for that project.
4. As user B, verify `SELECT` works for project/tasks/messages/presence in that project.
5. As user B, verify project metadata `UPDATE/DELETE` is still denied (owner-only).
6. As user B, verify own presence row writes are allowed; writes to another user's presence row are denied.
7. As user A, verify membership management (`project_members`) succeeds.

## Notes

- Presence policies are split by action (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) and now support team visibility with self-only writes.
- `seed.sql` is intentionally minimal because `auth.users` rows should come from Supabase Auth flows.
