-- Add water_amount to pickleball_tickets
-- Stores water cost separately from ticket fee (total_amount)
ALTER TABLE pickleball_tickets
  ADD COLUMN IF NOT EXISTS water_amount integer NOT NULL DEFAULT 0;
