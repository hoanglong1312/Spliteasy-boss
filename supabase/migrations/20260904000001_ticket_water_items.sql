-- Persist per-drink water quantities for pickleball tickets.
-- water_amount remains the computed total for settlement/balance.
ALTER TABLE public.pickleball_tickets
  ADD COLUMN IF NOT EXISTS water_items jsonb NOT NULL DEFAULT '{}'::jsonb;
