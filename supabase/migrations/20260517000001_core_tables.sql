-- ─── GROUPS (Nhóm chi tiêu) ───────────────────────────────────────────────────
CREATE TABLE groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  emoji           text,
  color           text DEFAULT '#574EFA',
  invite_code     text UNIQUE NOT NULL,
  invite_code_revoked_at timestamptz,
  created_by      uuid,          -- sẽ add FK sau khi tạo bảng members
  deleted_at      timestamptz,   -- soft delete
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── MEMBERS (Thành viên) ─────────────────────────────────────────────────────
CREATE TABLE members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name            text NOT NULL,
  short           text,          -- tên ngắn hiển thị
  initials        text,          -- chữ viết tắt tối đa 2 ký tự
  color           text DEFAULT '#574EFA',
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('treasurer','member','viewer')),
  is_active       boolean DEFAULT true,  -- false = đã rời nhóm (soft delete)
  display_order   int DEFAULT 0,
  joined_at       timestamptz DEFAULT now(),
  left_at         timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Thêm FK từ groups.created_by về members
ALTER TABLE groups
  ADD CONSTRAINT fk_groups_created_by
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- ─── MEMBER_TOKENS (Token cá nhân — lưu hash, không lưu plaintext) ───────────
CREATE TABLE member_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash    text UNIQUE NOT NULL,  -- SHA-256 của token gốc
  created_at    timestamptz DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz            -- thu hồi token
);

-- ─── Trigger tự động cập nhật updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
