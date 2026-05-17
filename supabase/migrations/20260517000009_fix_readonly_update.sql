-- Fix: bỏ UPDATE last_used_at khỏi get_current_member_id()
-- Lý do: REST API GET request dùng read-only transaction, không cho phép UPDATE
-- last_used_at sẽ được cập nhật riêng qua một RPC call khi cần

CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS uuid AS $$
DECLARE
  raw_token text;
  hashed    text;
  mid       uuid;
BEGIN
  raw_token := current_setting('request.headers', true)::json->>'x-member-token';
  IF raw_token IS NULL THEN RETURN NULL; END IF;

  hashed := encode(digest(raw_token, 'sha256'), 'hex');

  SELECT mt.member_id INTO mid
  FROM member_tokens mt
  WHERE mt.token_hash = hashed AND mt.revoked_at IS NULL;

  RETURN mid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
