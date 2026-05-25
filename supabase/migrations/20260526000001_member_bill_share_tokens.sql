CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.member_bill_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_bill_share_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.member_bill_share_tokens FROM anon;
REVOKE ALL ON public.member_bill_share_tokens FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_member_bill_share_tokens_token
  ON public.member_bill_share_tokens (token);

CREATE INDEX IF NOT EXISTS idx_member_bill_share_tokens_scope
  ON public.member_bill_share_tokens (group_id, member_id, expires_at);

CREATE OR REPLACE FUNCTION public.create_member_bill_share_token(
  p_group_id uuid,
  p_member_id uuid,
  p_expires_in interval DEFAULT interval '14 days'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_member uuid;
  v_token text;
BEGIN
  v_current_member := public.get_current_member_id();

  IF v_current_member IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.members creator
    JOIN public.groups g ON g.id = p_group_id
    WHERE creator.id = v_current_member
      AND creator.group_id = p_group_id
      AND creator.expense_active IS DISTINCT FROM false
      AND (creator.role = 'treasurer' OR g.created_by = creator.id OR g.created_by = creator.profile_id)
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = p_member_id
      AND m.group_id = p_group_id
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_member');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.member_bill_share_tokens (token, group_id, member_id, expires_at, created_by)
  VALUES (v_token, p_group_id, p_member_id, now() + COALESCE(p_expires_in, interval '14 days'), v_current_member);

  RETURN jsonb_build_object('token', v_token, 'expiresAt', now() + COALESCE(p_expires_in, interval '14 days'));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_bill_share(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share record;
BEGIN
  SELECT mbst.*, g.name AS group_name, m.name AS member_name
  INTO v_share
  FROM public.member_bill_share_tokens mbst
  JOIN public.groups g ON g.id = mbst.group_id
  JOIN public.members m ON m.id = mbst.member_id
  WHERE mbst.token = p_token
    AND mbst.expires_at > now()
    AND g.deleted_at IS NULL;

  IF v_share.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  RETURN jsonb_build_object(
    'groupId', v_share.group_id,
    'groupName', v_share.group_name,
    'memberId', v_share.member_id,
    'memberName', v_share.member_name,
    'expiresAt', v_share.expires_at,
    'summary', COALESCE((
      SELECT jsonb_build_object(
        'owes', SUM(GREATEST(0, ep.share_amount - CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END)),
        'advanced', SUM(GREATEST(0, CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END - ep.share_amount)),
        'net', SUM(CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END - ep.share_amount)
      )
      FROM public.expenses e
      JOIN public.expense_participants ep ON ep.expense_id = e.id
      WHERE e.group_id = v_share.group_id
        AND ep.member_id = v_share.member_id
        AND date_trunc('month', e.expense_date) = date_trunc('month', now())
    ), jsonb_build_object('owes', 0, 'advanced', 0, 'net', 0)),
    'transactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'date', to_char(e.expense_date, 'DD/MM'),
        'rawDate', e.expense_date,
        'title', e.title,
        'category', e.category,
        'status', e.status,
        'paidBy', e.paid_by_member_id,
        'paidByName', payer.name,
        'role', CASE WHEN e.paid_by_member_id = v_share.member_id THEN 'payer' ELSE 'participant' END,
        'paidAmount', CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END,
        'shareAmount', ep.share_amount,
        'netAmount', CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END - ep.share_amount
      ) ORDER BY e.expense_date DESC)
      FROM public.expenses e
      JOIN public.expense_participants ep ON ep.expense_id = e.id
      LEFT JOIN public.members payer ON payer.id = e.paid_by_member_id
      WHERE e.group_id = v_share.group_id
        AND ep.member_id = v_share.member_id
        AND date_trunc('month', e.expense_date) = date_trunc('month', now())
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_member_bill_share_token(uuid, uuid, interval) TO anon;
GRANT EXECUTE ON FUNCTION public.get_member_bill_share(text) TO anon;
