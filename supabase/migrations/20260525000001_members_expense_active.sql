ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS expense_active boolean DEFAULT true;

UPDATE public.members
SET expense_active = false
WHERE member_type IN ('casual', 'guest', 'vanglai', 'vãng lai')
  AND expense_active IS DISTINCT FROM false;
