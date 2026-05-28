CREATE OR REPLACE FUNCTION public.submit_payment_notification(
  p_target_member_id uuid,
  p_group_id uuid,
  p_amount numeric,
  p_member_name text,
  p_covered_members jsonb DEFAULT '[]'::jsonb,
  p_transfer_description text DEFAULT '',
  p_payment_target jsonb DEFAULT '{}'::jsonb,
  p_month_label text DEFAULT '',
  p_covered_sources jsonb DEFAULT '[]'::jsonb
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
    'coveredSources', COALESCE(p_covered_sources, '[]'::jsonb),
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

GRANT EXECUTE ON FUNCTION public.submit_payment_notification(uuid, uuid, numeric, text, jsonb, text, jsonb, text, jsonb) TO authenticated;
