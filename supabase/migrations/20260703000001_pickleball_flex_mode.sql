ALTER TABLE pickleball_monthly_config
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'fixed'
    CHECK (billing_mode IN ('fixed', 'flex')),
  ADD COLUMN IF NOT EXISTS monthly_ticket_price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_session_ticket_price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_ticket_member_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS per_session_ticket_member_ids uuid[] NOT NULL DEFAULT '{}';
