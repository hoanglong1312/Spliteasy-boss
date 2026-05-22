-- Track venue owner bank details and monthly owner transfer history.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS venue_owner_name text,
  ADD COLUMN IF NOT EXISTS venue_bank_name text,
  ADD COLUMN IF NOT EXISTS venue_bank_account text;

CREATE TABLE IF NOT EXISTS public.pickleball_owner_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  total_amount integer NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  bank_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_by uuid REFERENCES public.members(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pickleball_owner_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY pickleball_owner_payments_select
  ON public.pickleball_owner_payments FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY pickleball_owner_payments_insert
  ON public.pickleball_owner_payments FOR INSERT
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY pickleball_owner_payments_update
  ON public.pickleball_owner_payments FOR UPDATE
  USING (group_id IN (SELECT get_my_group_ids()))
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));
