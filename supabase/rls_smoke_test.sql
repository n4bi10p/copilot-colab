-- RLS smoke test for project membership collaboration policies.
-- Run this in Supabase SQL editor or via psql after `supabase db reset`.
--
-- Uses existing users from auth.users:
-- - owner_user_id: first user by created_at
-- - member_user_id: second user by created_at
-- If you have fewer than 2 users, script raises a clear error.

BEGIN;

CREATE TEMP TABLE tmp_rls_users (
  owner_user_id UUID NOT NULL,
  member_user_id UUID NOT NULL
);

INSERT INTO tmp_rls_users (owner_user_id, member_user_id)
SELECT u1.id, u2.id
FROM (
  SELECT id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
) u1
CROSS JOIN (
  SELECT id
  FROM auth.users
  ORDER BY created_at ASC
  OFFSET 1
  LIMIT 1
) u2;

DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count < 2 THEN
    RAISE EXCEPTION
      'Need at least 2 auth.users for smoke test, found %. Create/sign in two users first.',
      user_count;
  END IF;
END;
$$;

DO $$
DECLARE
  missing_tables text[];
BEGIN
  SELECT array_agg(t.name)
  INTO missing_tables
  FROM (
    VALUES
      ('projects'),
      ('project_members'),
      ('tasks'),
      ('messages'),
      ('presence')
  ) AS t(name)
  WHERE to_regclass('public.' || t.name) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'Missing required tables in public schema: %. Run migrations first (supabase db reset on the intended DB).',
      array_to_string(missing_tables, ', ');
  END IF;
END;
$$;

-- Clean scratch rows if script is re-run.
DELETE FROM public.presence WHERE project_id IN (
  SELECT id FROM public.projects WHERE name = 'rls-smoke-project'
);
DELETE FROM public.messages WHERE project_id IN (
  SELECT id FROM public.projects WHERE name = 'rls-smoke-project'
);
DELETE FROM public.tasks WHERE project_id IN (
  SELECT id FROM public.projects WHERE name = 'rls-smoke-project'
);
DELETE FROM public.project_members WHERE project_id IN (
  SELECT id FROM public.projects WHERE name = 'rls-smoke-project'
);
DELETE FROM public.projects WHERE name = 'rls-smoke-project';

-- 1) Owner creates project (as service role in SQL editor for setup).
INSERT INTO public.projects (name, created_by)
SELECT 'rls-smoke-project', t.owner_user_id
FROM tmp_rls_users t;

-- 2) Owner membership backfill check (inserted by migration for existing rows;
-- for new rows we insert explicitly to guarantee role).
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, t.owner_user_id, 'owner'
FROM public.projects p
CROSS JOIN tmp_rls_users t
WHERE p.name = 'rls-smoke-project'
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 3) Add member.
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, t.member_user_id, 'member'
FROM public.projects p
CROSS JOIN tmp_rls_users t
WHERE p.name = 'rls-smoke-project'
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 4) Seed one task/message/presence row.
INSERT INTO public.tasks (project_id, title, status, assignee_id)
SELECT p.id, 'smoke task', 'backlog', t.member_user_id
FROM public.projects p
CROSS JOIN tmp_rls_users t
WHERE p.name = 'rls-smoke-project';

INSERT INTO public.messages (project_id, text, author_id)
SELECT p.id, 'smoke message', t.owner_user_id
FROM public.projects p
CROSS JOIN tmp_rls_users t
WHERE p.name = 'rls-smoke-project';

INSERT INTO public.presence (user_id, project_id, status)
SELECT t.owner_user_id, p.id, 'online'
FROM public.projects p
CROSS JOIN tmp_rls_users t
WHERE p.name = 'rls-smoke-project'
ON CONFLICT (user_id) DO UPDATE
SET project_id = EXCLUDED.project_id,
    status = EXCLUDED.status,
    last_active_at = now();

DROP TABLE tmp_rls_users;

COMMIT;

-- Expected manual checks (using client sessions):
-- A) Owner session:
--    - can read/write projects/tasks/messages/presence/project_members for this project
-- B) Member session:
--    - can SELECT project/tasks/messages/presence/project_members for this project
--    - can INSERT/UPDATE/DELETE tasks and messages in this project
--    - cannot UPDATE/DELETE project metadata (owner-only)
--    - can only write own presence row, not another user's
