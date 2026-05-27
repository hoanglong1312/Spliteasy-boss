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
  assert.match(authSource, /export function rememberRecentSession\(member, token = ''\)/)
  assert.match(authSource, /export function clearAuth\(\{ keepRecent = true \} = \{\}\)/)
  assert.match(authSource, /if \(!keepRecent\) localStorage\.removeItem\(RECENT_SESSIONS_KEY\)/)
  assert.match(authSource, /rememberRecentSession\(member, token\)/)
})

test('recent member sessions keep resumable tokens and collapse duplicate identities', () => {
  assert.match(authSource, /export function rememberRecentSession\(member, token = ''\)/)
  assert.match(authSource, /authToken: token \|\| member\.authToken \|\| ''/)
  assert.match(authSource, /sessionIdentityKey\(session\)/)
  assert.match(authSource, /member\.profileId \|\| member\.profile_id/)
  assert.match(authSource, /if \(name\) return `name:\$\{name\}`/)
  assert.match(authSource, /dedupeRecentSessions\(parsed\)/)
  assert.match(authSource, /localStorage\.setItem\(RECENT_SESSIONS_KEY, JSON\.stringify\(deduped\)\)/)
  assert.match(authSource, /\.filter\(session => sessionIdentityKey\(session\) !== nextKey\)/)
  assert.match(authSource, /\.filter\(session => session\?\.memberId && session\?\.memberName\)/)
})

test('AppV2 consumes member access links and passes recent sessions to JoinGroup', () => {
  assert.match(appSource, /accessTokenFromLocation\(\)/)
  assert.match(appSource, /inviteTokenFromLocation\(\)/)
  assert.match(appSource, /joinCodeFromLocation\(\)/)
  assert.match(appSource, /\.rpc\('consume_member_access_link'/)
  assert.match(appSource, /dispatch\(\{[\s\S]*type: 'LOGIN'[\s\S]*token: data\.authToken/)
  assert.match(appSource, /window\.history\.replaceState\(null, '', window\.location\.pathname\)/)
  assert.match(appSource, /getRecentSessions\(\)/)
  assert.match(appSource, /recentSessions: getRecentSessions\(\)/)
  assert.match(appSource, /inviteToken: groupInviteToken/)
  assert.match(appSource, /joinCode: groupJoinCode/)
  assert.match(appSource, /if \(groupJoinCode\)/)
  assert.match(appSource, /accessLinkError/)
})

test('AppV2 resumes recent sessions with a saved token instead of showing a dead card', () => {
  assert.match(appSource, /if \(type === 'resumeRecentSession'\)/)
  assert.match(appSource, /resolveRecentSessionToken\(payload\)/)
  assert.match(appSource, /\.rpc\('resume_recent_member_session'/)
  assert.match(appSource, /type: 'LOGIN'[\s\S]*token: authToken/)
  assert.match(appSource, /memberId: payload\.memberId/)
  assert.match(appSource, /groupId: payload\.groupId/)
  assert.doesNotMatch(appSource, /Mở lại link cá nhân hoặc nhờ thủ quỹ gửi link mới để vào tài khoản này\./)
})

test('recent-session RPC can recreate auth from saved local profile metadata', () => {
  const resumeMigration = readFileSync(new URL('../supabase/migrations/20260527000006_resume_recent_member_session.sql', import.meta.url), 'utf8')

  assert.match(resumeMigration, /CREATE OR REPLACE FUNCTION public\.resume_recent_member_session/)
  assert.match(resumeMigration, /p_member_id uuid/)
  assert.match(resumeMigration, /p_member_name text DEFAULT NULL/)
  assert.match(resumeMigration, /lower\(m\.name\) = lower\(trim\(p_member_name\)\)/)
  assert.match(resumeMigration, /INSERT INTO public\.member_tokens \(member_id, token_hash\)/)
  assert.match(resumeMigration, /'authToken', v_auth_token/)
})

test('JoinGroup supports invite-token links, recent sessions, and pending join requests', () => {
  assert.match(joinGroupSource, /lookupGroupInviteLink/)
  assert.match(joinGroupSource, /requestJoinByInviteLink/)
  assert.match(joinGroupSource, /const recentSessions = d\.recentSessions \|\| \[\]/)
  assert.match(joinGroupSource, /const inviteToken = d\.inviteToken \|\| ''/)
  assert.match(joinGroupSource, /useState\(d\.joinCode \|\| d\.code \|\| ''\)/)
  assert.match(joinGroupSource, /Vào lại tài khoản gần đây/)
  assert.match(joinGroupSource, /onAction\?\.\('resumeRecentSession'/)
  assert.match(joinGroupSource, /Có mã mời\? Nhập tại đây/)
  assert.match(joinGroupSource, /Tên đã có cần link cá nhân hoặc PIN/)
  assert.match(joinGroupSource, /session\.groupName \|\| 'Bấm để vào lại'/)
  assert.match(joinGroupSource, /!\(recentSessions\.length > 0\) && !hasGroupPreview && !looking/)
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

test('member detail and group surface expose personal and group invite links', () => {
  assert.match(groupDetailSource, /ensureMemberBillShare/)
  assert.match(groupDetailSource, /LINK CÁ NHÂN/)
  assert.match(groupDetailSource, /Sao chép/)
  assert.doesNotMatch(groupDetailSource, /Tạo link vào app/)
  assert.doesNotMatch(groupDetailSource, /Gửi bill cá nhân/)
  assert.match(groupDetailSource, /Tùy chọn khác/)
  assert.match(groupDetailSource, /createGroupInviteShare/)
  assert.match(groupDetailSource, /Chia sẻ link mời/)
  assert.match(groupDetailSource, /<GroupManagementPanel/)
  assert.match(groupDetailSource, /Mã mời thủ công/)
  assert.doesNotMatch(groupDetailSource, /setMenuOpen/)
})

test('member bill link opens the member home first and keeps bill as fallback', () => {
  const billShareSource = readFileSync(new URL('./screens/MemberBillShare.jsx', import.meta.url), 'utf8')

  assert.match(appSource, /p_purpose: 'member_bill'/)
  assert.match(appSource, /async function openPersonalLinkHome\(token\)/)
  assert.match(appSource, /\.rpc\('consume_member_access_link', \{ p_token: token \}\)/)
  assert.match(appSource, /purpose: data\.purpose/)
  assert.match(appSource, /setActiveTab\('home'\)/)
  assert.match(appSource, /setStack\(\[\]\)/)
  assert.match(appSource, /setPublicBillToken\(''\)/)
  assert.match(appSource, /await openPersonalLinkHome\(publicBillToken\)/)
  assert.match(appSource, /\.rpc\('get_member_bill_share'/)
  assert.match(billShareSource, /export default function MemberBillShare\(\{ data, loading = false, onOpenApp \}\)/)
  assert.match(billShareSource, /Mở trang chính/)
  assert.match(billShareSource, /Thanh toán về quỹ nhóm/)
  assert.match(billShareSource, /bill\.groupName/)
  assert.match(billShareSource, /bill\.memberName/)
  assert.doesNotMatch(appSource, /p_purpose: 'member_login'[\s\S]*createMemberAccessLink/)
})

test('group share link opens JoinGroup with the manual invite code filled', () => {
  assert.match(appSource, /function joinCodeFromLocation\(\)/)
  assert.match(appSource, /params\.get\('join'\)/)
  assert.match(appSource, /const url = `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}\?join=\$\{encodeURIComponent\(inviteCode\)\}`/)
  assert.match(appSource, /joinCode: groupJoinCode/)
  assert.doesNotMatch(appSource, /create_group_invite_link[\s\S]*if \(type === 'createGroupInviteShare'\)/)
  assert.match(joinGroupSource, /useState\(d\.joinCode \|\| d\.code \|\| ''\)/)
})

test('member bill share rpc can read member access link bill tokens', () => {
  const billAccessMigration = readFileSync(new URL('../supabase/migrations/20260527000003_member_bill_access_links.sql', import.meta.url), 'utf8')

  assert.match(billAccessMigration, /CREATE OR REPLACE FUNCTION public\.get_member_bill_share\(p_token text\)/)
  assert.match(billAccessMigration, /public\.member_access_links/)
  assert.match(billAccessMigration, /mal\.purpose = 'member_bill'/)
  assert.match(billAccessMigration, /encode\(digest\(p_token, 'sha256'\), 'hex'\)/)
  assert.match(billAccessMigration, /'canOpenApp', v_share\.can_open_app/)
  assert.match(billAccessMigration, /UNION ALL/)
  assert.match(billAccessMigration, /public\.member_bill_share_tokens/)
})

test('member access link creator helper is profile-aware across duplicate memberships', () => {
  const profileAwareMigration = readFileSync(new URL('../supabase/migrations/20260527000004_profile_aware_access_link_creator.sql', import.meta.url), 'utf8')

  assert.match(profileAwareMigration, /CREATE OR REPLACE FUNCTION public\.is_access_link_creator/)
  assert.match(profileAwareMigration, /WITH current_actor AS/)
  assert.match(profileAwareMigration, /creator\.id = actor\.id/)
  assert.match(profileAwareMigration, /creator\.profile_id = actor\.profile_id/)
  assert.match(profileAwareMigration, /lower\(creator\.name\) = lower\(actor\.name\)/)
  assert.match(profileAwareMigration, /creator\.role = 'treasurer' OR g\.created_by = creator\.id OR g\.created_by = creator\.profile_id/)
})

test('member bill link card is scoped to managers or the current member', () => {
  const memberDetailSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberDetailPanel'),
    groupDetailSource.indexOf('function MiniBillStat')
  )

  assert.match(memberDetailSource, /const canCreatePersonalLink = Boolean\(isTreasurer \|\| member\.isCurrentUser\)/)
  assert.match(memberDetailSource, /if \(!canCreatePersonalLink\) return/)
  assert.match(memberDetailSource, /\{canCreatePersonalLink && \(\s*<Card style=\{\{ marginTop: 14 \}\}>/)
  assert.match(memberDetailSource, /groupName=\{groupName\}/)
})

test('member access links allow members to create their own bill link only', () => {
  const selfLinkMigration = readFileSync(new URL('../supabase/migrations/20260527000005_member_self_bill_links.sql', import.meta.url), 'utf8')
  const avatarAndBillMigration = readFileSync(new URL('../supabase/migrations/20260527000006_profile_avatar_and_expense_bill_links.sql', import.meta.url), 'utf8')

  assert.match(selfLinkMigration, /CREATE OR REPLACE FUNCTION public\.is_member_access_link_allowed/)
  assert.match(selfLinkMigration, /p_purpose = 'member_bill'/)
  assert.match(selfLinkMigration, /target\.id = actor\.id/)
  assert.match(selfLinkMigration, /target\.profile_id = actor\.profile_id/)
  assert.match(selfLinkMigration, /CREATE OR REPLACE FUNCTION public\.create_member_access_link/)
  assert.match(selfLinkMigration, /public\.is_member_access_link_allowed\(p_group_id, p_member_id, p_purpose, v_actor\)/)
  assert.match(avatarAndBillMigration, /AND target\.expense_active IS DISTINCT FROM false/)
  assert.match(avatarAndBillMigration, /AND actor\.expense_active IS DISTINCT FROM false/)
  assert.match(avatarAndBillMigration, /AND m\.expense_active IS DISTINCT FROM false/)
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

test('member access link migration creates helper functions before policies use them', () => {
  const helperIndex = accessLinkMigration.indexOf('CREATE OR REPLACE FUNCTION public.is_access_link_creator')
  const policyIndex = accessLinkMigration.indexOf('CREATE POLICY join_requests_select')
  assert.notEqual(helperIndex, -1)
  assert.notEqual(policyIndex, -1)
  assert.ok(helperIndex < policyIndex)
})

test('member access link migration can replace legacy join request review functions', () => {
  const approveDropIndex = accessLinkMigration.indexOf('DROP FUNCTION IF EXISTS public.approve_join_request(uuid)')
  const approveCreateIndex = accessLinkMigration.indexOf('CREATE OR REPLACE FUNCTION public.approve_join_request')
  const rejectDropIndex = accessLinkMigration.indexOf('DROP FUNCTION IF EXISTS public.reject_join_request(uuid)')
  const rejectCreateIndex = accessLinkMigration.indexOf('CREATE OR REPLACE FUNCTION public.reject_join_request')
  assert.notEqual(approveDropIndex, -1)
  assert.notEqual(approveCreateIndex, -1)
  assert.notEqual(rejectDropIndex, -1)
  assert.notEqual(rejectCreateIndex, -1)
  assert.ok(approveDropIndex < approveCreateIndex)
  assert.ok(rejectDropIndex < rejectCreateIndex)
})
