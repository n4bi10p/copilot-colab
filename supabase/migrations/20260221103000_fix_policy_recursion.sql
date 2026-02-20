-- Fix: avoid recursive RLS evaluation between projects and project_members.
-- Approach: use SECURITY DEFINER helper functions for membership/ownership checks.

CREATE OR REPLACE FUNCTION public.is_project_owner(project_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_uuid
      AND p.created_by = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = project_uuid
      AND pm.user_id = user_uuid
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;

-- Recreate project_members policies without direct recursive subqueries.
DROP POLICY IF EXISTS project_members_select_visible ON public.project_members;
DROP POLICY IF EXISTS project_members_insert_owner_only ON public.project_members;
DROP POLICY IF EXISTS project_members_update_owner_only ON public.project_members;
DROP POLICY IF EXISTS project_members_delete_owner_or_self ON public.project_members;

CREATE POLICY project_members_select_visible
ON public.project_members
FOR SELECT
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY project_members_insert_owner_only
ON public.project_members
FOR INSERT
WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY project_members_update_owner_only
ON public.project_members
FOR UPDATE
USING (public.is_project_owner(project_id))
WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY project_members_delete_owner_or_self
ON public.project_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.is_project_owner(project_id)
);

-- Recreate projects SELECT policy using helper checks.
DROP POLICY IF EXISTS projects_select_owner_or_member ON public.projects;
CREATE POLICY projects_select_owner_or_member
ON public.projects
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_project_member(id)
);

-- Recreate tasks policies using helper checks.
DROP POLICY IF EXISTS tasks_select_project_members ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_project_members ON public.tasks;
DROP POLICY IF EXISTS tasks_update_project_members ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_project_members ON public.tasks;

CREATE POLICY tasks_select_project_members
ON public.tasks
FOR SELECT
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY tasks_insert_project_members
ON public.tasks
FOR INSERT
WITH CHECK (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY tasks_update_project_members
ON public.tasks
FOR UPDATE
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
)
WITH CHECK (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY tasks_delete_project_members
ON public.tasks
FOR DELETE
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

-- Recreate messages policies using helper checks.
DROP POLICY IF EXISTS messages_select_project_members ON public.messages;
DROP POLICY IF EXISTS messages_insert_project_members ON public.messages;
DROP POLICY IF EXISTS messages_update_project_members ON public.messages;
DROP POLICY IF EXISTS messages_delete_project_members ON public.messages;

CREATE POLICY messages_select_project_members
ON public.messages
FOR SELECT
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY messages_insert_project_members
ON public.messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  )
);

CREATE POLICY messages_update_project_members
ON public.messages
FOR UPDATE
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
)
WITH CHECK (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY messages_delete_project_members
ON public.messages
FOR DELETE
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

-- Recreate presence policies using helper checks.
DROP POLICY IF EXISTS presence_select_project_members ON public.presence;
DROP POLICY IF EXISTS presence_insert_project_members ON public.presence;
DROP POLICY IF EXISTS presence_update_project_members ON public.presence;
DROP POLICY IF EXISTS presence_delete_project_members ON public.presence;

CREATE POLICY presence_select_project_members
ON public.presence
FOR SELECT
USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY presence_insert_project_members
ON public.presence
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  )
);

CREATE POLICY presence_update_project_members
ON public.presence
FOR UPDATE
USING (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  )
);

CREATE POLICY presence_delete_project_members
ON public.presence
FOR DELETE
USING (user_id = auth.uid());
