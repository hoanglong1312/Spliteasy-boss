DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
FOR UPDATE
USING (
  id IN (
    SELECT members.profile_id FROM members
    WHERE members.id = get_current_member_id()
    UNION
    SELECT m2.profile_id FROM members m2
    WHERE m2.group_id IN (
      SELECT m1.group_id FROM members m1
      WHERE m1.id = get_current_member_id()
        AND m1.role = 'treasurer'
    )
  )
)
WITH CHECK (
  id IN (
    SELECT members.profile_id FROM members
    WHERE members.id = get_current_member_id()
    UNION
    SELECT m2.profile_id FROM members m2
    WHERE m2.group_id IN (
      SELECT m1.group_id FROM members m1
      WHERE m1.id = get_current_member_id()
        AND m1.role = 'treasurer'
    )
  )
);
