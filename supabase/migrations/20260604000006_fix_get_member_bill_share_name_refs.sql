-- get_member_bill_share: remove COALESCE(p.name, m.name) -> p.name only
-- Also clean up paymentTarget subqueries to use profiles only
CREATE OR REPLACE FUNCTION public.get_member_bill_share(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share record;
BEGIN
  WITH share_candidates AS (
    SELECT
      mal.id,
      mal.group_id,
      mal.member_id,
      mal.expires_at,
      g.name AS group_name,
      p.name AS member_name,
      true   AS can_open_app,
      1      AS priority
    FROM public.member_access_links mal
    JOIN public.groups g ON g.id = mal.group_id
    JOIN public.members m ON m.id = mal.member_id
    LEFT JOIN public.profiles p ON p.id = m.profile_id
    WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND mal.purpose = 'member_bill'
      AND mal.member_id IS NOT NULL
      AND mal.expires_at > now()
      AND g.deleted_at IS NULL
      AND m.is_active IS DISTINCT FROM false

    UNION ALL

    SELECT
      mbst.id,
      mbst.group_id,
      mbst.member_id,
      mbst.expires_at,
      g.name  AS group_name,
      p.name  AS member_name,
      false   AS can_open_app,
      2       AS priority
    FROM public.member_bill_share_tokens mbst
    JOIN public.groups g ON g.id = mbst.group_id
    JOIN public.members m ON m.id = mbst.member_id
    LEFT JOIN public.profiles p ON p.id = m.profile_id
    WHERE mbst.token = p_token
      AND mbst.expires_at > now()
      AND g.deleted_at IS NULL
  )
  SELECT * INTO v_share
  FROM share_candidates
  ORDER BY priority
  LIMIT 1;

  IF v_share.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  RETURN jsonb_build_object(
    'groupId',    v_share.group_id,
    'groupName',  v_share.group_name,
    'memberId',   v_share.member_id,
    'memberName', v_share.member_name,
    'expiresAt',  v_share.expires_at,
    'canOpenApp', v_share.can_open_app,
    'paymentTarget', jsonb_build_object(
      'bankName', (
        SELECT tp.bank_name
        FROM public.members treasurer
        LEFT JOIN public.profiles tp ON tp.id = treasurer.profile_id
        WHERE treasurer.group_id = v_share.group_id
          AND treasurer.role = 'treasurer'
          AND treasurer.is_active IS DISTINCT FROM false
        ORDER BY treasurer.created_at ASC LIMIT 1
      ),
      'bankAccount', (
        SELECT tp.bank_account
        FROM public.members treasurer
        LEFT JOIN public.profiles tp ON tp.id = treasurer.profile_id
        WHERE treasurer.group_id = v_share.group_id
          AND treasurer.role = 'treasurer'
          AND treasurer.is_active IS DISTINCT FROM false
        ORDER BY treasurer.created_at ASC LIMIT 1
      ),
      'bankAccountName', (
        SELECT tp.bank_account_name
        FROM public.members treasurer
        LEFT JOIN public.profiles tp ON tp.id = treasurer.profile_id
        WHERE treasurer.group_id = v_share.group_id
          AND treasurer.role = 'treasurer'
          AND treasurer.is_active IS DISTINCT FROM false
        ORDER BY treasurer.created_at ASC LIMIT 1
      )
    ),
    'summary', COALESCE((
      SELECT jsonb_build_object(
        'owes',     SUM(GREATEST(0, ep.share_amount - CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END)),
        'advanced', SUM(GREATEST(0, CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END - ep.share_amount)),
        'net',      SUM(CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END - ep.share_amount)
      )
      FROM public.expenses e
      JOIN public.expense_participants ep ON ep.expense_id = e.id
      WHERE e.group_id = v_share.group_id
        AND ep.member_id = v_share.member_id
        AND date_trunc('month', e.expense_date) = date_trunc('month', now())
    ), jsonb_build_object('owes', 0, 'advanced', 0, 'net', 0)),
    'transactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',          e.id,
        'date',        to_char(e.expense_date, 'DD/MM'),
        'rawDate',     e.expense_date,
        'title',       e.title,
        'category',    e.category,
        'status',      e.status,
        'paidBy',      e.paid_by_member_id,
        'paidByName',  pp.name,
        'role',        CASE WHEN e.paid_by_member_id = v_share.member_id THEN 'payer' ELSE 'participant' END,
        'paidAmount',  CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END,
        'shareAmount', ep.share_amount,
        'netAmount',   CASE WHEN e.paid_by_member_id = v_share.member_id THEN e.amount ELSE 0 END - ep.share_amount
      ) ORDER BY e.expense_date DESC)
      FROM public.expenses e
      JOIN public.expense_participants ep ON ep.expense_id = e.id
      LEFT JOIN public.members payer ON payer.id = e.paid_by_member_id
      LEFT JOIN public.profiles pp ON pp.id = payer.profile_id
      WHERE e.group_id = v_share.group_id
        AND ep.member_id = v_share.member_id
        AND date_trunc('month', e.expense_date) = date_trunc('month', now())
    ), '[]'::jsonb)
  );
END;
$$;
