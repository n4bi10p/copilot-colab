-- RLS behavior checks without app code.
-- Prerequisite: run supabase/rls_smoke_test.sql once to create rls-smoke-project data.
-- This script simulates authenticated users by setting JWT claims.
-- It runs in a transaction and rolls back at the end.

BEGIN;

DO $$
DECLARE
  v_project_id uuid;
  v_owner_user_id uuid;
  v_member_user_id uuid;
BEGIN
  SELECT p.id, p.created_by
    INTO v_project_id, v_owner_user_id
  FROM public.projects p
  WHERE p.name = 'rls-smoke-project'
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Missing rls-smoke-project context. Run supabase/rls_smoke_test.sql first.';
  END IF;

  SELECT pm.user_id
    INTO v_member_user_id
  FROM public.project_members pm
  WHERE pm.project_id = v_project_id
    AND pm.role = 'member'
  ORDER BY pm.created_at ASC
  LIMIT 1;

  IF v_member_user_id IS NULL THEN
    RAISE EXCEPTION 'No member found for rls-smoke-project. Re-run smoke setup.';
  END IF;

  PERFORM set_config('app.project_id', v_project_id::text, true);
  PERFORM set_config('app.owner_user_id', v_owner_user_id::text, true);
  PERFORM set_config('app.member_user_id', v_member_user_id::text, true);
END;
$$;

-- Owner context: should be able to update project metadata.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', current_setting('app.owner_user_id'), true);

DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.projects
  SET name = 'rls-smoke-project'
  WHERE id = current_setting('app.project_id')::uuid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Owner should be able to update project metadata.';
  END IF;
END;
$$;

-- Member context.
SELECT set_config('request.jwt.claim.sub', current_setting('app.member_user_id'), true);

-- Member should read tasks in shared project.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.tasks
  WHERE project_id = current_setting('app.project_id')::uuid;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Member expected to read at least one task in shared project.';
  END IF;
END;
$$;

-- Member should insert a task.
DO $$
DECLARE
  v_rows integer;
BEGIN
  INSERT INTO public.tasks (project_id, title, status)
  VALUES (current_setting('app.project_id')::uuid, 'member-created-task', 'backlog');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Member should be able to insert task in shared project.';
  END IF;
END;
$$;

-- Member should NOT update project metadata.
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.projects
  SET name = 'member-should-not-update'
  WHERE id = current_setting('app.project_id')::uuid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE NOTICE 'PASS: member project metadata update denied (0 rows affected).';
    RETURN;
  END IF;

  RAISE EXCEPTION 'Expected member project metadata update to be denied by RLS, but % row(s) were updated.', v_rows;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: member project metadata update denied.';
END;
$$;

-- Member should NOT update owner presence row.
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.presence
  SET status = 'idle', last_active_at = now()
  WHERE user_id = current_setting('app.owner_user_id')::uuid
    AND project_id = current_setting('app.project_id')::uuid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE NOTICE 'PASS: member cannot update owner presence (0 rows affected).';
    RETURN;
  END IF;

  RAISE EXCEPTION 'Expected member update of owner presence to be denied by RLS, but % row(s) were updated.', v_rows;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: member cannot update owner presence.';
END;
$$;

ROLLBACK;
