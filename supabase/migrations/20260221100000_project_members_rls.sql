-- Migration: add project membership model and collaborative RLS policies.

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- Ensure existing project creators are represented as owners in membership table.
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, p.created_by, 'owner'
FROM public.projects p
LEFT JOIN public.project_members pm
  ON pm.project_id = p.id
 AND pm.user_id = p.created_by
WHERE pm.id IS NULL;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select_visible ON public.project_members;
DROP POLICY IF EXISTS project_members_insert_owner_only ON public.project_members;
DROP POLICY IF EXISTS project_members_update_owner_only ON public.project_members;
DROP POLICY IF EXISTS project_members_delete_owner_or_self ON public.project_members;

CREATE POLICY project_members_select_visible
ON public.project_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members me
    WHERE me.project_id = project_members.project_id
      AND me.user_id = auth.uid()
  )
);

CREATE POLICY project_members_insert_owner_only
ON public.project_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY project_members_update_owner_only
ON public.project_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY project_members_delete_owner_or_self
ON public.project_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND p.created_by = auth.uid()
  )
);

-- Replace project access policy: visible to owner or project members.
DROP POLICY IF EXISTS projects_select_own ON public.projects;
DROP POLICY IF EXISTS projects_select_owner_or_member ON public.projects;

CREATE POLICY projects_select_owner_or_member
ON public.projects
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
  )
);

-- Keep owner-only write policies for project metadata.
DROP POLICY IF EXISTS projects_insert_own ON public.projects;
DROP POLICY IF EXISTS projects_update_own ON public.projects;
DROP POLICY IF EXISTS projects_delete_own ON public.projects;

CREATE POLICY projects_insert_own
ON public.projects
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY projects_update_own
ON public.projects
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY projects_delete_own
ON public.projects
FOR DELETE
USING (created_by = auth.uid());

-- Replace task policies: allow project owner or any project member.
DROP POLICY IF EXISTS tasks_select_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_select_project_members ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_project_members ON public.tasks;
DROP POLICY IF EXISTS tasks_update_project_members ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_project_members ON public.tasks;

CREATE POLICY tasks_select_project_members
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY tasks_insert_project_members
ON public.tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY tasks_update_project_members
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY tasks_delete_project_members
ON public.tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
  )
);

-- Replace message policies: allow project owner/member reads and writes;
-- inserts still require author_id = auth.uid().
DROP POLICY IF EXISTS messages_select_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_insert_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_update_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_delete_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_select_project_members ON public.messages;
DROP POLICY IF EXISTS messages_insert_project_members ON public.messages;
DROP POLICY IF EXISTS messages_update_project_members ON public.messages;
DROP POLICY IF EXISTS messages_delete_project_members ON public.messages;

CREATE POLICY messages_select_project_members
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = messages.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY messages_insert_project_members
ON public.messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = messages.project_id
        AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = messages.project_id
        AND pm.user_id = auth.uid()
    )
  )
);

CREATE POLICY messages_update_project_members
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = messages.project_id
      AND pm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = messages.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY messages_delete_project_members
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = messages.project_id
      AND pm.user_id = auth.uid()
  )
);

-- Replace presence policies:
-- users can only write their own row, but project owner/members can read project presence.
DROP POLICY IF EXISTS presence_select_own ON public.presence;
DROP POLICY IF EXISTS presence_insert_own ON public.presence;
DROP POLICY IF EXISTS presence_update_own ON public.presence;
DROP POLICY IF EXISTS presence_delete_own ON public.presence;
DROP POLICY IF EXISTS presence_select_project_members ON public.presence;
DROP POLICY IF EXISTS presence_insert_project_members ON public.presence;
DROP POLICY IF EXISTS presence_update_project_members ON public.presence;
DROP POLICY IF EXISTS presence_delete_project_members ON public.presence;

CREATE POLICY presence_select_project_members
ON public.presence
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = presence.project_id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = presence.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY presence_insert_project_members
ON public.presence
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = presence.project_id
        AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = presence.project_id
        AND pm.user_id = auth.uid()
    )
  )
);

CREATE POLICY presence_update_project_members
ON public.presence
FOR UPDATE
USING (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = presence.project_id
        AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = presence.project_id
        AND pm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = presence.project_id
        AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = presence.project_id
        AND pm.user_id = auth.uid()
    )
  )
);

CREATE POLICY presence_delete_project_members
ON public.presence
FOR DELETE
USING (user_id = auth.uid());
