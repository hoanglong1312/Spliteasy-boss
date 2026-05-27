import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const authSource = readFileSync(new URL('./lib/auth.js', import.meta.url), 'utf8')
const joinGroupSource = readFileSync(new URL('./screens/JoinGroup.jsx', import.meta.url), 'utf8')
const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const accessLinkMigration = readFileSync(new URL('../supabase/migrations/20260527000002_member_access_links.sql', import.meta.url), 'utf8')

test('local auth keeps recent member sessions after logout', () => {
  assert.match(authSource, /const RECENT_SESSIONS_KEY\s*=\s*'spliteasy_recent_sessions'/)
  assert.match(authSource, /export function getRecentSessions\(\)/)
  assert.match(authSource, /export function rememberRecentSession\(member\)/)
  assert.match(authSource, /export function clearAuth\(\{ keepRecent = true \} = \{\}\)/)
  assert.match(authSource, /if \(!keepRecent\) localStorage\.removeItem\(RECENT_SESSIONS_KEY\)/)
  assert.match(authSource, /rememberRecentSession\(member\)/)
})

test('AppV2 consumes member access links and passes recent sessions to JoinGroup', () => {
  assert.match(appSource, /accessTokenFromLocation\(\)/)
  assert.match(appSource, /inviteTokenFromLocation\(\)/)
  assert.match(appSource, /\.rpc\('consume_member_access_link'/)
  assert.match(appSource, /dispatch\(\{[\s\S]*type: 'LOGIN'[\s\S]*token: data\.authToken/)
  assert.match(appSource, /window\.history\.replaceState\(null, '', window\.location\.pathname\)/)
  assert.match(appSource, /getRecentSessions\(\)/)
  assert.match(appSource, /recentSessions: getRecentSessions\(\)/)
  assert.match(appSource, /inviteToken: groupInviteToken/)
  assert.match(appSource, /accessLinkError/)
})

test('JoinGroup supports invite-token links, recent sessions, and pending join requests', () => {
  assert.match(joinGroupSource, /lookupGroupInviteLink/)
  assert.match(joinGroupSource, /requestJoinByInviteLink/)
  assert.match(joinGroupSource, /const recentSessions = d\.recentSessions \|\| \[\]/)
  assert.match(joinGroupSource, /const inviteToken = d\.inviteToken \|\| ''/)
  assert.match(joinGroupSource, /Vào lại tài khoản gần đây/)
  assert.match(joinGroupSource, /onAction\?\.\('resumeRecentSession'/)
  assert.match(joinGroupSource, /Có mã mời\? Nhập tại đây/)
  assert.match(joinGroupSource, /Tên đã có cần link cá nhân hoặc PIN/)
  assert.match(joinGroupSource, /await requestJoinByInviteLink\(inviteToken, memberName\)/)
  assert.match(joinGroupSource, /setJoinSent\(true\)/)
})

test('JoinGroup empty state does not show a fake Spliteasy group before link or code lookup', () => {
  assert.match(joinGroupSource, /const hasGroupPreview = Boolean\(foundGroup \|\| d\.group\?\.id\)/)
  assert.match(joinGroupSource, /Chưa xác định nhóm/)
  assert.match(joinGroupSource, /Mở link cá nhân/)
  assert.match(joinGroupSource, /Có mã mời\? Nhập tại đây/)
  assert.match(joinGroupSource, /\{hasGroupPreview \? \(/)
  assert.doesNotMatch(joinGroupSource, /const displayGroup = foundGroup[\s\S]*: d\.group/)
  assert.doesNotMatch(screenDataSource, /name: group\.name \|\| 'Nhóm Spliteasy'/)
})

test('JoinGroup allows existing members with a manual invite code but blocks invite-link impersonation', () => {
  assert.match(joinGroupSource, /const isInviteLinkFlow = Boolean\(inviteToken\)/)
  assert.match(joinGroupSource, /if \(isInviteLinkFlow && selected && !newName\)/)
  assert.match(joinGroupSource, /await onAction\?\.\('joinGroup', \{ code: code\.trim\(\), memberName \}\)/)
  assert.doesNotMatch(joinGroupSource, /if \(selected && !newName\)/)
})

test('member detail and group menu expose app-login and group-invite share links', () => {
  assert.match(groupDetailSource, /createMemberAccessLink/)
  assert.match(groupDetailSource, /Chia sẻ link vào app/)
  assert.match(groupDetailSource, /createGroupInviteShare/)
  assert.match(groupDetailSource, /Chia sẻ link mời/)
})

test('member access link migration stores hashed scoped tokens and pending invite requests', () => {
  assert.match(accessLinkMigration, /CREATE TABLE IF NOT EXISTS public\.member_access_links/)
  assert.match(accessLinkMigration, /token_hash text NOT NULL UNIQUE/)
  assert.match(accessLinkMigration, /purpose text NOT NULL CHECK \(purpose IN \('member_login', 'member_bill', 'group_invite'\)\)/)
  assert.match(accessLinkMigration, /CREATE TABLE IF NOT EXISTS public\.join_requests/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.create_member_access_link/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.consume_member_access_link/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.create_group_invite_link/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.lookup_group_invite_link/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.request_join_by_invite_link/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.approve_join_request/)
  assert.match(accessLinkMigration, /CREATE OR REPLACE FUNCTION public\.reject_join_request/)
  assert.match(accessLinkMigration, /CREATE POLICY join_requests_select/)
  assert.match(accessLinkMigration, /GRANT SELECT ON public\.join_requests TO anon/)
  assert.match(accessLinkMigration, /digest\(p_token, 'sha256'\)/)
  assert.match(accessLinkMigration, /expires_at > now\(\)/)
  assert.match(accessLinkMigration, /INSERT INTO public\.member_tokens/)
  assert.match(accessLinkMigration, /INSERT INTO public\.members \(group_id, name, short, initials, color, role, member_type, expense_active, is_active\)/)
  assert.match(accessLinkMigration, /SET status = 'approved'/)
  assert.match(accessLinkMigration, /SET status = 'rejected'/)
  assert.match(accessLinkMigration, /RETURN jsonb_build_object\('authToken'/)
  assert.doesNotMatch(accessLinkMigration, /token text NOT NULL UNIQUE/)
})
