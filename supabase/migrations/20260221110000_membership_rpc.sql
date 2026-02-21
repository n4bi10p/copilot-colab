-- Membership RPC helpers for frontend/backend integration.
-- These functions enforce authorization checks and provide stable APIs.

CREATE OR REPLACE FUNCTION public.invite_member(
  p_project_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS public.project_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_member public.project_members;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_project_owner(p_project_id, v_actor) THEN
    RAISE EXCEPTION 'Only project owner can invite members.'
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('owner', 'member') THEN
    RAISE EXCEPTION 'Invalid role value: %', p_role
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (p_project_id, p_user_id, p_role)
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = EXCLUDED.role
  RETURNING * INTO v_member;

  RETURN v_member;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_member(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_project_owner UUID;
  v_rows INTEGER := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  -- Owner can remove anyone except project creator; member can remove self.
  IF NOT (public.is_project_owner(p_project_id, v_actor) OR v_actor = p_user_id) THEN
    RAISE EXCEPTION 'Not allowed to remove this member.'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.created_by
    INTO v_project_owner
  FROM public.projects p
  WHERE p.id = p_project_id;

  IF v_project_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found.'
      USING ERRCODE = '23503';
  END IF;

  IF p_user_id = v_project_owner THEN
    RAISE EXCEPTION 'Cannot remove project creator from membership.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.project_members pm
  WHERE pm.project_id = p_project_id
    AND pm.user_id = p_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_project_members(
  p_project_id UUID
)
RETURNS SETOF public.project_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (public.is_project_owner(p_project_id, v_actor) OR public.is_project_member(p_project_id, v_actor)) THEN
    RAISE EXCEPTION 'Not allowed to view project members.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT pm.*
  FROM public.project_members pm
  WHERE pm.project_id = p_project_id
  ORDER BY CASE WHEN pm.role = 'owner' THEN 0 ELSE 1 END, pm.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_member(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_project_members(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.invite_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_members(UUID) TO authenticated;
