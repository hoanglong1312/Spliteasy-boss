-- Add water_amount to existing sessions table
ALTER TABLE pickleball_sessions
  ADD COLUMN IF NOT EXISTS water_amount integer DEFAULT 0;

-- Per-session free-form cost items (bóng, phụ kiện, etc.)
CREATE TABLE IF NOT EXISTS pickleball_session_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES pickleball_sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  amount      integer NOT NULL,
  member_ids  uuid[] NOT NULL DEFAULT '{}',
  created_by  uuid REFERENCES members(id),
  created_at  timestamptz DEFAULT now()
);

-- Monthly config: court fee total + auto-schedule weekday pattern
CREATE TABLE IF NOT EXISTS pickleball_monthly_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  year_month          text NOT NULL,
  court_fee           integer NOT NULL DEFAULT 0,
  schedule_start_day  text,
  schedule_weekdays   integer[] NOT NULL DEFAULT '{}',
  UNIQUE(group_id, year_month)
);

-- RLS: session_items
ALTER TABLE pickleball_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read session items"
  ON pickleball_session_items FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM pickleball_sessions
      WHERE group_id IN (SELECT get_my_group_ids())
    )
  );

CREATE POLICY "treasurer can write session items"
  ON pickleball_session_items FOR ALL
  USING (
    session_id IN (
      SELECT id FROM pickleball_sessions
      WHERE group_id IN (SELECT get_my_group_ids())
    )
  );

-- RLS: monthly_config
ALTER TABLE pickleball_monthly_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read monthly config"
  ON pickleball_monthly_config FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "treasurer can write monthly config"
  ON pickleball_monthly_config FOR ALL
  USING (group_id IN (SELECT get_my_group_ids()));
