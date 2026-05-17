-- ⚠️ CHỈ CHẠY TRÊN MÔI TRƯỜNG TEST — không chạy trên production

-- Tạo nhóm mẫu
INSERT INTO groups (id, name, emoji, color, invite_code)
VALUES ('11111111-1111-1111-1111-111111111111', 'Nhóm Pickleball Quận 7', '🏸', '#574EFA', 'PICKLE-TEST');

-- Tạo thành viên: 1 thủ quỹ + 2 thành viên thường
INSERT INTO members (id, group_id, name, short, initials, color, role) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Nguyễn An', 'An', 'NA', '#574EFA', 'treasurer'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Trần Bình', 'Bình', 'TB', '#10B981', 'member'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Lê Chi', 'Chi', 'LC', '#F59E0B', 'member');

-- Token mẫu cho An (treasurer)
-- Token gốc: "test-token-an-treasurer"
INSERT INTO member_tokens (member_id, token_hash)
VALUES ('22222222-2222-2222-2222-222222222222',
        encode(digest('test-token-an-treasurer', 'sha256'), 'hex'));

-- Cập nhật created_by của nhóm
UPDATE groups SET created_by = '22222222-2222-2222-2222-222222222222'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Tạo cấu hình pickleball
INSERT INTO pickle_configs (group_id, monthly_court_fee, guest_fee_per_session)
VALUES ('11111111-1111-1111-1111-111111111111', 2000000, 50000);

-- Xác nhận seed thành công
SELECT g.name, m.name, m.role
FROM groups g JOIN members m ON m.group_id = g.id
WHERE g.id = '11111111-1111-1111-1111-111111111111'
ORDER BY m.role DESC, m.name;
