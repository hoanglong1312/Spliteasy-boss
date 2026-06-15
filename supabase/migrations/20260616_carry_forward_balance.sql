-- Bảng theo dõi settlement per member/tháng/nhóm
CREATE TABLE IF NOT EXISTS public.member_month_settlements (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id            uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  group_id             uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  month                text NOT NULL,  -- 'YYYY-MM'
  expense_id           uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  settled_by_member_id uuid REFERENCES public.members(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, group_id)
);

ALTER TABLE public.member_month_settlements ENABLE ROW LEVEL SECURITY;

-- SELECT: mọi member trong group (simple policy)
CREATE POLICY "member_month_settlements_select" ON public.member_month_settlements
  FOR SELECT TO authenticated USING (true);

-- INSERT/DELETE: chỉ treasurer
CREATE POLICY "member_month_settlements_insert" ON public.member_month_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE group_id = member_month_settlements.group_id
        AND role = 'treasurer'
        AND (
          id = auth.uid()::uuid
          OR id IN (SELECT member_id FROM public.member_tokens WHERE revoked_at IS NULL)
        )
    )
  );

CREATE POLICY "member_month_settlements_delete" ON public.member_month_settlements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE group_id = member_month_settlements.group_id
        AND role = 'treasurer'
        AND (
          id = auth.uid()::uuid
          OR id IN (SELECT member_id FROM public.member_tokens WHERE revoked_at IS NULL)
        )
    )
  );

-- RPC: tạo carry-forward expense + ghi settlement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.defer_member_month_balance(
  p_member_id            uuid,
  p_group_id             uuid,
  p_month                text,      -- 'YYYY-MM' của tháng cũ
  p_amount               numeric,   -- absolute value, số tiền chuyển sang
  p_next_month_date      date,      -- ngày đầu tháng sau (expense_date)
  p_member_name          text,
  p_treasurer_member_id  uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_settlement_id uuid;
  v_title text;
BEGIN
  -- Kiểm tra treasurer
  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_treasurer_member_id
      AND group_id = p_group_id
      AND role = 'treasurer'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not treasurer of this group';
  END IF;

  -- Không cho defer 2 lần cùng member+month
  IF EXISTS (
    SELECT 1 FROM public.member_month_settlements
    WHERE member_id = p_member_id AND group_id = p_group_id AND month = p_month
  ) THEN
    RAISE EXCEPTION 'Already settled for this member and month';
  END IF;

  v_title := 'Nợ chuyển từ tháng ' || SUBSTRING(p_month FROM 6 FOR 2) || ' · ' || p_member_name;

  -- Tạo expense
  INSERT INTO public.expenses (
    group_id, title, amount, expense_date,
    paid_by_member_id, split_method, status, created_at
  ) VALUES (
    p_group_id, v_title, p_amount, p_next_month_date,
    p_treasurer_member_id, 'custom', 'approved', now()
  )
  RETURNING id INTO v_expense_id;

  -- Participant: chỉ member đó
  INSERT INTO public.expense_participants (expense_id, member_id, share_amount)
  VALUES (v_expense_id, p_member_id, p_amount);

  -- Ghi settlement
  INSERT INTO public.member_month_settlements (
    member_id, group_id, month, expense_id, settled_by_member_id
  ) VALUES (
    p_member_id, p_group_id, p_month, v_expense_id, p_treasurer_member_id
  )
  RETURNING id INTO v_settlement_id;

  RETURN v_settlement_id;
END;
$$;

-- RPC: undo (xóa expense + settlement)
CREATE OR REPLACE FUNCTION public.undo_defer_member_month_balance(
  p_settlement_id        uuid,
  p_treasurer_member_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_group_id   uuid;
BEGIN
  SELECT expense_id, group_id INTO v_expense_id, v_group_id
  FROM public.member_month_settlements
  WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_treasurer_member_id AND group_id = v_group_id AND role = 'treasurer'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not treasurer of this group';
  END IF;

  -- Xóa participants trước (FK)
  DELETE FROM public.expense_participants WHERE expense_id = v_expense_id;
  -- Xóa expense
  DELETE FROM public.expenses WHERE id = v_expense_id;
  -- Xóa settlement
  DELETE FROM public.member_month_settlements WHERE id = p_settlement_id;
END;
$$;
