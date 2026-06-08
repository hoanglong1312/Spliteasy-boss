ALTER TABLE pickleball_monthly_config
ADD COLUMN IF NOT EXISTS fixed_member_ids uuid[] NOT NULL DEFAULT '{}';
