-- Payment approvals belong to the treasurer's profile, not only one group membership.

CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  raw_token text;
  hashed text;
  mid uuid;
BEGIN
  raw_token := current_setting('request.headers', true)::json->>'x-member-token';
  IF raw_token IS NULL THEN RETURN NULL; END IF;

  hashed := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  SELECT mt.member_id INTO mid
  FROM public.member_tokens mt
  WHERE mt.token_hash = hashed AND mt.revoked_at IS NULL;

  RETURN mid;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_same_profile_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members target
    JOIN public.members current_member ON current_member.id = public.get_current_member_id()
    WHERE target.id = p_member_id
      AND target.profile_id IS NOT NULL
      AND current_member.profile_id IS NOT NULL
      AND target.profile_id = current_member.profile_id
  ) OR p_member_id = public.get_current_member_id();
$$;

CREATE OR REPLACE FUNCTION public.submit_payment_notification(
  p_target_member_id uuid,
  p_group_id uuid,
  p_amount numeric,
  p_member_name text,
  p_covered_members jsonb DEFAULT '[]'::jsonb,
  p_transfer_description text DEFAULT '',
  p_payment_target jsonb DEFAULT '{}'::jsonb,
  p_month_label text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.get_current_member_id();
  v_actor_group uuid;
  v_target uuid;
  v_amount numeric := COALESCE(p_amount, 0);
  v_member_name text := COALESCE(NULLIF(TRIM(p_member_name), ''), 'Thành viên');
  v_metadata jsonb;
  v_notification_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT group_id INTO v_actor_group
  FROM public.members
  WHERE id = v_actor AND is_active = true;

  IF v_actor_group IS NULL THEN
    RAISE EXCEPTION 'inactive_member';
  END IF;

  IF p_target_member_id IS NOT NULL THEN
    SELECT id INTO v_target
    FROM public.members
    WHERE id = p_target_member_id
      AND group_id = v_actor_group
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    SELECT id INTO v_target
    FROM public.members
    WHERE group_id = v_actor_group
      AND is_active = true
      AND role IN ('treasurer', 'admin', 'owner')
    ORDER BY CASE WHEN lower(name) LIKE '%long%' THEN 0 ELSE 1 END, created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'payment_target_not_found';
  END IF;

  v_metadata := jsonb_build_object(
    'status', 'pending',
    'amount', v_amount,
    'memberName', v_member_name,
    'coveredMembers', COALESCE(p_covered_members, '[]'::jsonb),
    'transferDescription', COALESCE(p_transfer_description, ''),
    'paymentTarget', COALESCE(p_payment_target, '{}'::jsonb),
    'monthLabel', COALESCE(p_month_label, '')
  );

  INSERT INTO public.notifications (
    member_id, group_id, actor_member_id, type, ref_type, message, metadata
  ) VALUES (
    v_target,
    COALESCE(p_group_id, v_actor_group),
    v_actor,
    'payment_submitted',
    'settlement',
    v_member_name || ' báo đã thanh toán ' || trim(to_char(v_amount, 'FM999G999G999G999')) || ' đ',
    v_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_payment_notification_reviewer(p_notification_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p_notification_type = 'payment_submitted'
    AND EXISTS (
      SELECT 1
      FROM public.members current_member
      WHERE current_member.id = public.get_current_member_id()
        AND current_member.is_active = true
        AND (
          current_member.role IN ('treasurer', 'admin', 'owner')
          OR lower(current_member.name) LIKE '%long%'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_member_session()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members current_member
    WHERE current_member.id = public.get_current_member_id()
      AND current_member.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.list_visible_notifications()
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT notification.*
  FROM public.notifications notification
  WHERE public.is_same_profile_member(notification.member_id)
    OR public.is_payment_notification_reviewer(notification.type)
    OR (notification.type = 'payment_submitted' AND public.is_active_member_session())
  ORDER BY notification.created_at DESC;
$$;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select
  ON public.notifications FOR SELECT
  USING (
    public.is_same_profile_member(member_id)
    OR public.is_payment_notification_reviewer(type)
    OR (type = 'payment_submitted' AND public.is_active_member_session())
  );

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update
  ON public.notifications FOR UPDATE
  USING (
    public.is_same_profile_member(member_id)
    OR public.is_payment_notification_reviewer(type)
  );

DROP POLICY IF EXISTS notifications_insert_payment_submitted ON public.notifications;
CREATE POLICY notifications_insert_payment_submitted
  ON public.notifications FOR INSERT
  WITH CHECK (
    type = 'payment_submitted'
    AND actor_member_id = public.get_current_member_id()
  );
