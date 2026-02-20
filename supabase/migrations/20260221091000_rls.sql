-- Migration: enforce row-level access for authenticated users.

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_own ON public.projects;
DROP POLICY IF EXISTS projects_insert_own ON public.projects;
DROP POLICY IF EXISTS projects_update_own ON public.projects;
DROP POLICY IF EXISTS projects_delete_own ON public.projects;

CREATE POLICY projects_select_own
ON public.projects
FOR SELECT
USING (created_by = auth.uid());

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

DROP POLICY IF EXISTS tasks_select_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own_projects ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own_projects ON public.tasks;

CREATE POLICY tasks_select_own_projects
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY tasks_insert_own_projects
ON public.tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY tasks_update_own_projects
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY tasks_delete_own_projects
ON public.tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS messages_select_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_insert_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_update_own_projects ON public.messages;
DROP POLICY IF EXISTS messages_delete_own_projects ON public.messages;

CREATE POLICY messages_select_own_projects
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY messages_insert_own_projects
ON public.messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY messages_update_own_projects
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY messages_delete_own_projects
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS presence_select_own ON public.presence;
DROP POLICY IF EXISTS presence_insert_own ON public.presence;
DROP POLICY IF EXISTS presence_update_own ON public.presence;
DROP POLICY IF EXISTS presence_delete_own ON public.presence;

CREATE POLICY presence_select_own
ON public.presence
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY presence_insert_own
ON public.presence
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY presence_update_own
ON public.presence
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY presence_delete_own
ON public.presence
FOR DELETE
USING (user_id = auth.uid());
