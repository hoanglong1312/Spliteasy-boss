import React, { useState, useMemo, useEffect } from 'react'
import { useApp } from './store.jsx'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth } from './lib/auth.js'
import { ME, getMemberMap, fmtVND, fmtVNDFull, fmtDate, pickleSummary } from './data.jsx'
import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, NavHeader, ListRow, SectionHeader, HScroll, EmptyState, CategoryIcon, displayMemberName } from './components.jsx'

// Pickleball tab — special sub-app for the company's CLB Pickleball
// Has 2 visual styles via Tweaks: 'sporty' (vibrant lime/orange) | 'consistent' (purple match)

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sameId(a, b) {
  return a != null && b != null && String(a) === String(b);
}

function rowGroupId(row) {
  return row?.groupId ?? row?.group_id;
}

function sameMemberName(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function getStateMembers(state) {
  const allMembers = safeArray(state?.allMembers);
  return allMembers.length > 0 ? allMembers : safeArray(state?.members);
}

function isPickleballGroupName(group) {
  return String(group?.name || '').toLowerCase().includes('pickleball');
}

function hasPickleballDataForGroup(state, groupId) {
  if (!groupId) return false;
  const hasGroupSession = safeArray(state?._allPickle?.sessions)
    .some(s => sameId(rowGroupId(s), groupId) && String(s.status || '').toLowerCase() === 'external');
  const hasExternalTicket = safeArray(state?._allPickle?.externalTickets)
    .some(t => sameId(rowGroupId(t), groupId));
  const group = safeArray(state?.groups).find(g => sameId(g.id, groupId));
  const hasPickleExpense = safeArray(group?.expenses).some(expense => (
    expense?.pickleSessionId
    || expense?.pickle_session_id
    || String(expense?.module || '').toLowerCase() === 'pickleball'
  ));
  return hasGroupSession || hasExternalTicket || hasPickleExpense;
}

function findPickleballGroup(state) {
  const groups = safeArray(state?.groups);
  const namedGroup = groups.find(isPickleballGroupName);
  if (namedGroup) return namedGroup;

  const dataGroup = groups.find(group => hasPickleballDataForGroup(state, group.id));
  if (dataGroup) return dataGroup;

  const fallbackId = state?.currentGroupId || state?.currentGroup?.id;
  return groups.find(group => sameId(group.id, fallbackId)) || state?.currentGroup || null;
}

function findCurrentMemberForGroup(state, groupId) {
  const members = getStateMembers(state);
  const groupMembers = members.filter(m => sameId(rowGroupId(m), groupId));
  const tokenMemberIds = new Set(
    safeArray(state?.memberTokens)
      .filter(token => !(token.revoked_at || token.revokedAt))
      .map(token => token.memberId ?? token.member_id)
      .filter(Boolean)
      .map(String)
  );
  const tokenMember = groupMembers.find(m => tokenMemberIds.has(String(m.id)));
  if (tokenMember) return tokenMember;

  const currentMember = groupMembers.find(m => sameId(m.id, state?.currentUserId));
  if (currentMember) return currentMember;

  const namedMember = groupMembers.find(m => sameMemberName(m.name, state?.currentUserName));
  if (namedMember) return namedMember;

  const previousMember = members.find(m => sameId(m.id, state?.currentUserId));
  if (previousMember?.name) {
    return groupMembers.find(m => sameMemberName(m.name, previousMember.name)) || null;
  }

  return null;
}

function memberOrFallback(M, id) {
  return M[id] || {
    id,
    name: id ? 'Không rõ' : 'Chưa chọn',
    short: '?',
    initials: '?',
    color: '#99A1AF',
    isMe: false,
  };
}

function normalizeSession(session = {}) {
  const attendees = safeArray(session.attendees);
  const attended = safeArray(session.attended);
  const going = safeArray(session.going);
  return {
    ...session,
    attendees: attendees.length > 0 ? attendees : (attended.length > 0 ? attended : going),
    attended,
    going,
    guests: safeArray(session.guests),
    expenses: safeArray(session.expenses),
  };
}

function normalizePickle(pickle = {}) {
  return {
    sessions: safeArray(pickle.sessions).map(normalizeSession),
    upcoming: safeArray(pickle.upcoming).map(normalizeSession),
    fixedMembers: safeArray(pickle.fixedMembers),
    external: safeArray(pickle.external),
    externalTickets: safeArray(pickle.externalTickets),
    monthlyCourtFee: Number(pickle.monthlyCourtFee) || 0,
    guestFeePerSession: Number(pickle.guestFeePerSession) || 0,
  };
}

function sessionMemberIds(session) {
  if (!session) return [];
  const going = safeArray(session.going);
  if (going.length > 0) return going;
  const attendees = safeArray(session.attendees);
  if (attendees.length > 0) return attendees;
  return safeArray(session.attended);
}

function dateDay(value) {
  const s = String(value || '');
  if (!s) return '--';
  if (s.includes('/')) return s.split('/')[0] || '--';
  if (s.includes('-')) return s.split('-').pop() || '--';
  return s;
}

function formatDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
}

function formatShortDate(dateStr) {
  const [, m, dd] = dateStr.split('-');
  return `${dd}/${m}`;
}

function todayInputValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function localDateFromInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateInputValueFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function generateSessionDates(startDate, weekdays, yearMonth) {
  if (!startDate || weekdays.length === 0 || !yearMonth) return [];
  const [year, month] = yearMonth.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return [];
  const start = new Date(startDate + 'T00:00:00');
  const endOfMonth = new Date(year, month, 0);
  const dates = [];
  const cur = new Date(Math.max(start.getTime(), new Date(year, month - 1, 1).getTime()));
  while (cur <= endOfMonth) {
    if (weekdays.includes(cur.getDay())) {
      dates.push(dateInputValueFromDate(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function monthDateRange(yearMonth) {
  const [year, month] = String(yearMonth || '').split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  const mm = String(month).padStart(2, '0');
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`,
  };
}

function getAuthedSupabaseClient() {
  const { token } = getStoredAuth();
  if (!token) throw new Error('Không tìm thấy phiên đăng nhập');
  return createSupabase(token);
}

function formatExternalDate(value) {
  const d = localDateFromInput(value);
  if (!d) return value || '--/--/----';
  const weekday = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  return `${weekday} ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

function guestName(guest) {
  if (typeof guest === 'string') return guest;
  return guest?.name || guest?.guest_name || guest?.displayName || 'Khách';
}

function initialsFromName(name) {
  return String(name || '?').split(' ').filter(Boolean).map(p => p[0]).join('').slice(-2).toUpperCase() || '?';
}

const SCHEDULE_WEEKDAYS = [
  { label: 'T2', value: 1 },
  { label: 'T3', value: 2 },
  { label: 'T4', value: 3 },
  { label: 'T5', value: 4 },
  { label: 'T6', value: 5 },
  { label: 'T7', value: 6 },
  { label: 'CN', value: 0 },
];

function ScreenPickleball({ tweaks = {}, push }) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState('overview'); // overview | sessions | members | external
  const pickle = useMemo(() => normalizePickle(state.pickle), [state.pickle]);
  const summary = useMemo(() => pickleSummary(pickle), [pickle]);
  const style = tweaks?.pickleballStyle || 'sporty';
  const accent = style === 'sporty' ? '#7AC74F' : 'var(--brand-1)';
  const accentBg = style === 'sporty' ? 'rgba(122,199,79,0.12)' : 'var(--brand-soft)';
  const heroGrad = style === 'sporty'
    ? 'linear-gradient(135deg, #0E1726 0%, #1F3A47 60%, #2F5347 100%)'
    : 'linear-gradient(135deg, var(--brand-1) 0%, var(--brand-2) 100%)';

  const meId = state.currentUserId || ME;
  const pickleballGroup = useMemo(() => safeArray(state.groups).find(g =>
    g.name?.toLowerCase().includes('pickleball')
  ), [state.groups]);
  const activeMemberId = state.currentMemberId || state.currentUserId;
  const currentMember = useMemo(() => (
    pickleballGroup
      ? safeArray(state.members).find(m =>
        sameId(rowGroupId(m), pickleballGroup.id) &&
        sameId(m.id, activeMemberId)
      )
      : null
  ), [activeMemberId, pickleballGroup, state.members]);
  const isTreasurer = currentMember?.role === 'treasurer';
  const groupMembers = useMemo(() => safeArray(state.members)
    .filter(m => sameId(rowGroupId(m), pickleballGroup?.id) && m.isActive !== false && m.is_active !== false),
  [pickleballGroup?.id, state.members]);
  const [pickSessions, setPickSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionAttendanceMap, setSessionAttendanceMap] = useState({});
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySession = pickSessions.find(s => s.date === todayStr);

  async function loadSessions(groupId) {
    if (!groupId) return;
    setSessionsLoading(true);
    try {
      const { token } = getStoredAuth();
      const sb = createSupabase(token);
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data, error } = await sb
        .from('pickleball_sessions')
        .select('id, date, notes, group_id')
        .eq('group_id', groupId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });
      if (error) throw error;
      setPickSessions(data || []);
    } catch (e) {
      console.error('loadSessions error', e);
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    loadSessions(pickleballGroup?.id);
  }, [pickleballGroup?.id]);

  async function toggleSessionExpand(sessionId) {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    if (sessionAttendanceMap[sessionId]) return;
    try {
      const client = getAuthedSupabaseClient();
      const { data, error } = await client
        .from('pickleball_attendance')
        .select('member_id, status')
        .eq('session_id', sessionId);
      if (error) throw error;
      const map = {};
      (data || []).forEach(a => { map[a.member_id] = a.status; });
      setSessionAttendanceMap(prev => ({ ...prev, [sessionId]: map }));
    } catch (e) {
      alert('Lỗi tải điểm danh: ' + e.message);
    }
  }

  async function markAttendance(sessionId, memberId, status) {
    try {
      const client = getAuthedSupabaseClient();
      const { error } = await client
        .from('pickleball_attendance')
        .upsert({
          session_id: sessionId,
          member_id: memberId,
          status,
          marked_by: currentMember?.id || activeMemberId,
          marked_at: new Date().toISOString(),
        }, { onConflict: 'session_id,member_id' });
      if (error) throw error;
      setSessionAttendanceMap(prev => ({
        ...prev,
        [sessionId]: { ...(prev[sessionId] || {}), [memberId]: status },
      }));
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Hero — different shape for sporty vs consistent */}
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: heroGrad,
          borderRadius: 'var(--vb-radius-2xl)',
          padding: '20px 20px 16px',
          color: '#fff',
          boxShadow: '0 8px 24px -8px rgba(15,23,43,0.4)',
        }}>
          {/* Decorative court lines */}
          {style === 'sporty' && (
            <svg viewBox="0 0 200 120" style={{ position: 'absolute', right: -30, bottom: -20, width: 220, height: 130, opacity: 0.18 }}>
              <rect x="20" y="20" width="160" height="80" fill="none" stroke="#7AC74F" strokeWidth="2"/>
              <line x1="100" y1="20" x2="100" y2="100" stroke="#7AC74F" strokeWidth="2"/>
              <line x1="20" y1="50" x2="180" y2="50" stroke="#7AC74F" strokeWidth="1.5" strokeDasharray="3 3"/>
              <line x1="20" y1="70" x2="180" y2="70" stroke="#7AC74F" strokeWidth="1.5" strokeDasharray="3 3"/>
              <circle cx="150" cy="35" r="6" fill="#FFB94D"/>
              <circle cx="150" cy="35" r="6" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 2"/>
            </svg>
          )}
          {style === 'consistent' && (
            <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 10,
                background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="pickle" size={18} color="#fff"/></div>
              <div style={{ fontFamily: 'var(--vb-font-meta)', fontSize: 12, fontWeight: 600, opacity: 0.85, letterSpacing: '0.04em' }}>
                CLB Pickleball Spliteasy
              </div>
            </div>
            <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>
              Tháng 5 / 2026
            </div>
            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2 }}>{pickle.sessions.length} buổi cố định • {pickle.fixedMembers.length} thành viên</div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <PickleHeroStat label="Tiền sân/người" value={summary.courtPerMember}/>
              <PickleHeroStat label="Vé vãng lai" value={summary.guestRevenue} positive accent={style === 'sporty' ? '#B6F092' : null}/>
            </div>
          </div>
        </div>
      </div>

      {/* Inline tabs */}
      <div style={{ display: 'flex', padding: '16px 16px 0', gap: 6 }}>
        {[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'sessions', label: 'Buổi đánh' },
          { id: 'external', label: 'Vé lẻ' },
          { id: 'members', label: 'Thành viên' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            appearance: 'none', flex: 1, height: 36, cursor: 'pointer',
            background: tab === t.id ? accent : 'transparent',
            color: tab === t.id ? (style === 'sporty' ? '#0E1726' : '#fff') : 'var(--text-1)',
            border: '1px solid ' + (tab === t.id ? accent : 'var(--border-1)'),
            borderRadius: 'var(--vb-radius-pill)',
            fontWeight: 700, fontSize: 12,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'overview' && <PickleOverview push={push} tweaks={tweaks} summary={summary} accent={accent} accentBg={accentBg} style={style} pickle={pickle} dispatch={dispatch} meId={meId} onShowSessions={() => setTab('sessions')} isTreasurer={isTreasurer} todaySession={todaySession} sessionAttendanceMap={sessionAttendanceMap} groupMembers={groupMembers} setActiveTab={setTab} toggleSessionExpand={toggleSessionExpand}/>}
        {tab === 'sessions' && <PickleSessions accent={accent} style={style} pickle={pickle} pickleballGroup={pickleballGroup} isTreasurer={isTreasurer} groupMembers={groupMembers} pickSessions={pickSessions} sessionsLoading={sessionsLoading} todayStr={todayStr} expandedSession={expandedSession} setExpandedSession={setExpandedSession} sessionAttendanceMap={sessionAttendanceMap} setSessionAttendanceMap={setSessionAttendanceMap} toggleSessionExpand={toggleSessionExpand} markAttendance={markAttendance} loadSessions={loadSessions}/>}
        {tab === 'external' && <PickleExternal push={push} tweaks={tweaks} accent={accent} accentBg={accentBg} style={style} pickle={pickle} meId={meId}/>}
        {tab === 'members' && <PickleMembers tweaks={tweaks} summary={summary} accent={accent} accentBg={accentBg} style={style} pickle={pickle}/>}
      </div>
    </div>
  );
}

function PickleHeroStat({ label, value, positive = false, accent }) {
  return (
    <div style={{
      flex: 1, padding: '12px 14px',
      background: 'rgba(255,255,255,0.14)', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--vb-font-num)', fontSize: 19, fontWeight: 700, marginTop: 4,
        color: accent || '#fff',
      }}>{positive ? '+' : ''}{fmtVNDFull(value)}</div>
    </div>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────
function SessionProgressBlock({ done, total, pct, upcoming, accent = 'var(--brand-1)' }) {
  return (
    <div style={{ padding: '0 16px 8px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
        Buổi {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: accent,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
          {done}/{total} buổi
        </span>
      </div>
      {upcoming.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Sắp tới:</div>
          {upcoming.map(s => (
            <div key={s.id} style={{
              fontSize: 13, color: 'var(--text-1)',
              padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: accent }}>•</span>
              {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              {s.notes ? <span style={{ color: 'var(--text-2)' }}> — {s.notes}</span> : null}
            </div>
          ))}
        </div>
      )}
      {total === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Chưa có buổi nào tháng này
        </div>
      )}
    </div>
  );
}

function PickleOverview({ push, tweaks = {}, summary, accent, accentBg, style, pickle, dispatch, meId, onShowSessions, isTreasurer, todaySession, sessionAttendanceMap, groupMembers, setActiveTab, toggleSessionExpand }) {
  const sessions = safeArray(pickle.sessions);
  const totalCourt = pickle.monthlyCourtFee;
  const guestCount = sessions.reduce((a,s)=>a+safeArray(s.guests).length,0);

  // Compute "what you contributed vs what you owe" for me
  const myNet = summary.memberOwes[meId] || 0;

  const next = pickle.upcoming[0];
  const nextGoing = sessionMemberIds(next);
  const isGoing = nextGoing.includes(meId);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const doneSessions     = monthSessions.filter(s => new Date(s.date) <= now);
  const upcomingSessions = monthSessions
    .filter(s => new Date(s.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);
  const sessionTotal = monthSessions.length;
  const sessionPct   = sessionTotal > 0
    ? Math.round((doneSessions.length / sessionTotal) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isTreasurer && todaySession && (() => {
        const att = sessionAttendanceMap[todaySession.id] || {};
        const members = groupMembers || [];
        const presentCount = members.filter(m => (att[m.id] || 'present') === 'present').length;
        const absentCount = members.length - presentCount;
        return (
          <div style={{
            background: 'linear-gradient(135deg, #3730a3, #4f46e5)',
            borderRadius: 16, padding: 16, marginBottom: 12,
          }}>
            <div style={{
              display: 'inline-block', background: 'rgba(255,255,255,0.15)',
              color: '#c7d2fe', fontSize: 10, padding: '2px 10px',
              borderRadius: 20, marginBottom: 8,
            }}>
              📅 Hôm nay · {formatDow(todaySession.date)} {formatShortDate(todaySession.date)}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>
              Buổi {formatShortDate(todaySession.date)}
            </div>
            <div style={{ fontSize: 11, color: '#c7d2fe', marginBottom: 10 }}>
              {presentCount} có mặt · {absentCount} vắng
            </div>
            <button
              onClick={() => {
                setActiveTab('sessions');
                setTimeout(() => toggleSessionExpand(todaySession.id), 50);
              }}
              style={{
                width: '100%', padding: '8px 0', background: '#fff',
                color: '#4f46e5', border: 'none', borderRadius: 8,
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              ✓ Điểm danh buổi này
            </button>
          </div>
        );
      })()}

      <SessionProgressBlock
        done={doneSessions.length}
        total={sessionTotal}
        pct={sessionPct}
        upcoming={upcomingSessions}
        accent={accent}
      />

      {/* My monthly settlement */}
      <Card>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--vb-gray-75)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Số dư của bạn tháng này</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <Money value={myNet} size={26} color={myNet >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
            <Pill bg={myNet >= 0 ? 'var(--vb-success-100)' : 'var(--vb-danger-50)'} color={myNet >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} icon={myNet >= 0 ? 'arrow-down' : 'arrow-up'}>
              {myNet >= 0 ? 'Bạn nhận lại' : 'Bạn còn nợ'}
            </Pill>
          </div>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BreakdownRow label="Tiền thuê sân tháng 5" sub={`${pickle.fixedMembers.length} người chia đều`} value={-summary.courtPerMember} icon="card"/>
          <BreakdownRow label={`Phí vé vãng lai (${guestCount} lượt)`} sub="Chia đều cho thành viên cố định" value={+summary.guestCreditPer} icon="users" positive accent={accent}/>
          <BreakdownRow label="Chi phí bóng / nước / ăn" sub="Đã trả - phần phải đóng" value={myNet + summary.courtPerMember - summary.guestCreditPer} icon="ball" positive={myNet + summary.courtPerMember - summary.guestCreditPer >= 0} accent={accent}/>
        </div>
      </Card>

      {/* Upcoming */}
      <div>
        <SectionHeader title="Buổi đánh sắp tới" action="Xem lịch →" onAction={onShowSessions}/>
        <Card>
          {next ? (
            <div style={{
              padding: 16, display: 'flex', alignItems: 'center', gap: 14,
              background: style === 'sporty' ? 'linear-gradient(90deg, rgba(122,199,79,0.06), transparent)' : 'transparent',
            }}>
              <div style={{
                width: 52, height: 56, borderRadius: 12, flexShrink: 0,
                background: accentBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.05em' }}>{next.day}</div>
                <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 18, fontWeight: 700, color: accent }}>{dateDay(next.date)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{next.time} • {next.court}</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AvatarStack ids={nextGoing} size={22} overlap={7} avatarStyle={tweaks?.avatarStyle} max={5}/>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{nextGoing.length} người tham gia</span>
                </div>
              </div>
              <button onClick={() => dispatch({ type: 'CONFIRM_ATTENDANCE', sessionId: next.id, memberId: meId, attending: !isGoing })} style={{
                appearance: 'none', cursor: 'pointer', height: 36, padding: '0 14px',
                background: accent, color: style === 'sporty' ? '#0E1726' : '#fff', border: 0, borderRadius: 10, fontWeight: 700, fontSize: 13,
              }}>{isGoing ? 'Huỷ' : 'Tham gia'}</button>
            </div>
          ) : (
            <div style={{ padding: 16, color: 'var(--text-2)', fontSize: 13, textAlign: 'center' }}>Không có buổi đánh sắp tới</div>
          )}
        </Card>
      </div>

      {/* Guest fee explainer */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: accentBg, border: '1px dashed ' + accent,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Icon name="sparkle" size={22} color={accent}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Quy định vé vãng lai</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
            Người ngoài đánh cùng đóng <b style={{ color: 'var(--text-1)' }}>{fmtVNDFull(pickle.guestFeePerSession)}</b>/buổi.
            Tổng phí thu được chia đều cho <b style={{ color: 'var(--text-1)' }}>{pickle.fixedMembers.length}</b> thành viên cố định để trừ vào tiền sân.
          </div>
        </div>
      </div>

      {/* Add expense FAB-like row */}
      <Button variant="secondary" full size="lg" icon="plus" onClick={() => push('add-session-expense')}>Thêm chi phí buổi đánh</Button>
    </div>
  );
}

function BreakdownRow({ label, sub, value, icon, positive = false, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: positive ? 'var(--vb-success-100)' : 'var(--vb-danger-50)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color={positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, fontWeight: 500 }}>{sub}</div>
      </div>
      <Money value={value} size={14} color={value >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
    </div>
  );
}

// ── Sessions tab — list of all sessions this month ──────────────────────────
function PickleSessions({ accent, style, pickle, pickleballGroup, isTreasurer, groupMembers = [], pickSessions = [], sessionsLoading, todayStr, expandedSession, setExpandedSession, sessionAttendanceMap, setSessionAttendanceMap, toggleSessionExpand, markAttendance, loadSessions }) {
  const { state, dispatch } = useApp();
  const groupId = pickleballGroup?.id || state.currentGroupId || state.currentGroup?.id || pickle.sessions[0]?.groupId || pickle.sessions[0]?.group_id;
  const [scheduleForm, setScheduleForm] = useState({
    startDate: '',
    weekdays: [1, 3, 5],
    month: monthInputValue(),
  });
  const [schedulePreview, setSchedulePreview] = useState([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const canCreateSchedule = !!groupId && !!scheduleForm.startDate && scheduleForm.weekdays.length > 0 && schedulePreview.length > 0 && !scheduleSaving;

  useEffect(() => {
    setSchedulePreview(generateSessionDates(scheduleForm.startDate, scheduleForm.weekdays, scheduleForm.month));
  }, [scheduleForm.startDate, scheduleForm.weekdays, scheduleForm.month]);

  const toggleScheduleWeekday = (value) => {
    setScheduleForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(value)
        ? f.weekdays.filter(w => w !== value)
        : [...f.weekdays, value],
    }));
  };

  async function saveSessionSchedule() {
    const dates = schedulePreview;
    if (!dates.length || !groupId) return;
    setScheduleSaving(true);
    try {
      const client = getAuthedSupabaseClient();
      const rows = dates.map(date => ({ group_id: groupId, date }));
      const { data: newSessions, error } = await client
        .from('pickleball_sessions')
        .upsert(rows, { onConflict: 'group_id,date', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;

      const { data: members, error: membersError } = await client
        .from('members')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_active', true);
      if (membersError) throw membersError;

      let sessionsForAttendance = newSessions || [];
      if (sessionsForAttendance.length < dates.length) {
        const { data: existingSessions, error: sessionsError } = await client
          .from('pickleball_sessions')
          .select('id')
          .eq('group_id', groupId)
          .in('date', dates);
        if (sessionsError) throw sessionsError;
        sessionsForAttendance = existingSessions || [];
      }

      if (members?.length && sessionsForAttendance.length) {
        const attRows = sessionsForAttendance.flatMap(s =>
          members.map(m => ({ session_id: s.id, member_id: m.id, status: 'present' }))
        );
        if (attRows.length) {
          const { error: attendanceError } = await client
            .from('pickleball_attendance')
            .upsert(attRows, { onConflict: 'session_id,member_id', ignoreDuplicates: true });
          if (attendanceError) throw attendanceError;
        }
      }

      await dispatch({ type: 'REFRESH' });
      await loadSessions(pickleballGroup?.id);
      setScheduleForm(f => ({ ...f, startDate: '' }));
      setSchedulePreview([]);
      setExpandedSession(null);
      setSessionAttendanceMap({});
    } catch (e) {
      alert('Lỗi tạo lịch: ' + e.message);
    } finally {
      setScheduleSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isTreasurer && (
        <>
          <div>
            <SectionHeader title="Quản lý CLB"/>
            <Card>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <FormRow label="Tháng" icon="calendar">
                    <input
                      type="month"
                      value={scheduleForm.month}
                      onChange={(e) => setScheduleForm(f => ({ ...f, month: e.target.value }))}
                      style={inputStyle()}
                    />
                  </FormRow>
                  <FormRow label="Bắt đầu" icon="clock">
                    <input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm(f => ({ ...f, startDate: e.target.value }))}
                      style={inputStyle()}
                    />
                  </FormRow>
                </div>

                <FormRow label="Ngày trong tuần" icon="calendar">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SCHEDULE_WEEKDAYS.map(day => {
                      const selected = scheduleForm.weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleScheduleWeekday(day.value)}
                          style={{
                            appearance: 'none', cursor: 'pointer',
                            minWidth: 42, height: 34, padding: '0 12px',
                            background: selected ? accent : 'var(--surface-2)',
                            color: selected ? (style === 'sporty' ? '#0E1726' : '#fff') : 'var(--text-1)',
                            border: '1px solid ' + (selected ? accent : 'var(--border-1)'),
                            borderRadius: 'var(--vb-radius-pill)',
                            fontSize: 12, fontWeight: 800,
                          }}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </FormRow>

                {scheduleForm.startDate && (
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, lineHeight: 1.5 }}>
                    {schedulePreview.length} buổi{schedulePreview.length > 0 ? ` — ${schedulePreview.map(d => Number(d.split('-')[2])).join(', ')}` : ''}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canCreateSchedule}
                  onClick={saveSessionSchedule}
                  style={{
                    appearance: 'none', height: 44, cursor: canCreateSchedule ? 'pointer' : 'not-allowed',
                    background: canCreateSchedule ? accent : 'var(--surface-2)',
                    color: canCreateSchedule ? (style === 'sporty' ? '#0E1726' : '#fff') : 'var(--text-3)',
                    border: '1px solid ' + (canCreateSchedule ? accent : 'var(--border-1)'),
                    borderRadius: 12, fontSize: 14, fontWeight: 800,
                    fontFamily: 'var(--vb-font-body)',
                  }}
                >
                  {scheduleSaving ? 'Đang tạo lịch' : 'Tạo lịch'}
                </button>
              </div>
            </Card>
          </div>

        </>
      )}

      <div>
        {sessionsLoading && (
          <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>Đang tải...</div>
        )}
        {!sessionsLoading && pickSessions.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>
            Chưa có buổi nào tháng này
          </div>
        )}
        {pickSessions.map((session, i) => {
          const isToday = session.date === todayStr;
          const isFuture = session.date > todayStr;
          const isExpanded = expandedSession === session.id;
          const attendance = sessionAttendanceMap[session.id] || {};
          const members = groupMembers || [];
          const presentCount = members.filter(m => (attendance[m.id] || 'present') === 'present').length;
          const absentCount = members.length - presentCount;

          return (
            <div key={session.id} style={{
              background: '#1e2235', borderRadius: 12, marginBottom: 8, overflow: 'hidden',
              opacity: isFuture ? 0.55 : 1,
              border: isToday ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
            }}>
              <div
                onClick={() => !isFuture && isTreasurer && toggleSessionExpand(session.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  cursor: !isFuture && isTreasurer ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: isToday ? '#3730a3' : '#2a2d45',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: '#fff' }}>
                    {session.date.slice(8)}
                  </span>
                  <span style={{ fontSize: 8, color: isToday ? '#c7d2fe' : '#888' }}>
                    {formatDow(session.date)}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                    Buổi #{i + 1}
                    {isToday && (
                      <span style={{ color: '#fbbf24', fontSize: 10, marginLeft: 6 }}>· Hôm nay</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                    {isFuture
                      ? 'Chưa đến · Chưa điểm danh'
                      : `${presentCount} có mặt · ${absentCount} vắng`}
                  </div>
                </div>
                {!isFuture && isTreasurer && (
                  <span style={{ color: isExpanded ? '#6366f1' : '#444', fontSize: 16 }}>
                    {isExpanded ? '⌄' : '›'}
                  </span>
                )}
              </div>

              {isExpanded && isTreasurer && (
                <div style={{ borderTop: '1px solid #2a2d3a', padding: '8px 12px 12px' }}>
                  <div style={{
                    fontSize: 9, color: '#6c6f80', textTransform: 'uppercase',
                    letterSpacing: '0.8px', paddingBottom: 8,
                  }}>
                    Tap để đánh dấu vắng
                  </div>
                  {members.map(member => {
                    const status = attendance[member.id] || 'present';
                    const isPresent = status === 'present';
                    const initials = member.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
                    return (
                      <div
                        key={member.id}
                        onClick={() => markAttendance(session.id, member.id, isPresent ? 'absent' : 'present')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                          background: isPresent ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
                          border: `1px solid ${isPresent ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.3)'}`,
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                          background: isPresent ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)',
                          color: isPresent ? '#34d399' : '#fb7185',
                        }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#fff' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: isPresent ? '#34d399' : '#fb7185' }}>
                          {isPresent ? '✓ Có mặt' : '✗ Vắng'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── External tab — vé lẻ outside the club ───────────────────────────────────
function PickleExternal({ tweaks = {}, accent, accentBg, style, pickle, meId }) {
  const { state, dispatch } = useApp();
  const M = getMemberMap(state.members);
  const externalSessions = safeArray(pickle.sessions).filter(s => s.status === 'external')
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const memberIds = pickle.fixedMembers.length > 0
    ? pickle.fixedMembers
    : safeArray(state.members).map(m => m.id);
  const defaultAttendeeIds = memberIds.includes(meId)
    ? [meId]
    : (memberIds[0] ? [memberIds[0]] : []);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayInputValue);
  const [notes, setNotes] = useState('');
  const [attendeeIds, setAttendeeIds] = useState(defaultAttendeeIds);
  const [saving, setSaving] = useState(false);

  const canSave = !!date && attendeeIds.length > 0 && !saving;

  const toggleAttendee = (id) => {
    setAttendeeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setDate(todayInputValue());
    setNotes('');
    setAttendeeIds(defaultAttendeeIds);
  };

  const saveExternalSession = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await dispatch({
        type: 'ADD_PICKLE_SESSION',
        date,
        notes: notes.trim(),
        attendeeIds,
        status: 'external',
      });
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Button
        variant={showForm ? 'secondary' : 'primary'}
        full
        size="lg"
        icon={showForm ? 'x' : 'plus'}
        onClick={() => {
          setShowForm(prev => !prev);
          if (attendeeIds.length === 0) setAttendeeIds(defaultAttendeeIds);
        }}
      >
        {showForm ? 'Đóng' : 'Thêm vé lẻ'}
      </Button>

      {showForm && (
        <Card>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormRow label="Ngày đánh" icon="calendar">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle()}
              />
            </FormRow>

            <FormRow label="Tên sân / ghi chú" icon="edit">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Sân TPHCM Quận 3"
                style={inputStyle()}
              />
            </FormRow>

            <FormRow label="Thành viên tham gia" icon="users">
              {memberIds.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {memberIds.map(id => {
                    const member = memberOrFallback(M, id);
                    const selected = attendeeIds.includes(id);
                    return (
                      <button key={id} onClick={() => toggleAttendee(id)} style={{
                        appearance: 'none', cursor: 'pointer',
                        padding: '6px 10px 6px 6px', borderRadius: 24,
                        background: selected ? accentBg : 'var(--surface-2)',
                        border: '1px solid ' + (selected ? accent : 'var(--border-1)'),
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                      }}>
                        <Avatar member={member} size={24} style={tweaks?.avatarStyle}/>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: selected ? accent : 'var(--text-1)',
                        }}>{displayMemberName(member, member.short || '?')}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Chưa có thành viên để chọn</div>
              )}
            </FormRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Button variant="secondary" full onClick={resetForm}>Xoá form</Button>
              <Button variant="primary" full disabled={!canSave} onClick={saveExternalSession}>{saving ? 'Đang lưu' : 'Lưu'}</Button>
            </div>
          </div>
        </Card>
      )}

      {externalSessions.length === 0 ? (
        <EmptyState icon="sparkle" title="Chưa có buổi nào tự phát" subtitle="Thêm vé lẻ để ghi lại buổi đánh ngoài lịch cố định"/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {externalSessions.map(s => {
            const attendees = sessionMemberIds(s);
            const expenses = safeArray(s.expenses);
            const totalExpense = expenses.reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);
            const isGoing = attendees.includes(meId);
            return (
              <Card key={s.id}>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 52, height: 56, borderRadius: 12, flexShrink: 0,
                      background: accentBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="calendar" size={16} color={accent}/>
                      <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 12, fontWeight: 800, color: accent, marginTop: 4 }}>
                        {dateDay(s.date)}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{formatExternalDate(s.date)}</div>
                      <div style={{
                        fontSize: 13, color: 'var(--text-2)', marginTop: 3, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {s.notes || s.court || 'Buổi tự phát'}
                      </div>
                      <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <AvatarStack ids={attendees} size={22} overlap={7} avatarStyle={tweaks?.avatarStyle} max={5}/>
                        <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>
                          {attendees.length} người • {totalExpense === 0 ? '0k' : fmtVND(totalExpense)} chi tiêu
                        </span>
                      </div>
                    </div>
                    <button onClick={() => dispatch({ type: 'CONFIRM_ATTENDANCE', sessionId: s.id, memberId: meId, attending: !isGoing })} style={{
                      appearance: 'none', cursor: 'pointer', height: 34, padding: '0 12px',
                      background: isGoing ? 'var(--surface-2)' : accent,
                      color: isGoing ? 'var(--text-1)' : (style === 'sporty' ? '#0E1726' : '#fff'),
                      border: '1px solid ' + (isGoing ? 'var(--border-1)' : accent),
                      borderRadius: 10, fontWeight: 800, fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}>
                      {isGoing ? 'Huỷ' : 'Tham gia'}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Members tab ────────────────────────────────────────────────────────────
function PickleMembers({ tweaks = {}, summary, accent, accentBg, style, pickle }) {
  const { state } = useApp();
  const M = getMemberMap(state.members);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionHeader title={`Thành viên cố định (${pickle.fixedMembers.length})`}/>
        <Card>
          {pickle.fixedMembers.map((id, i) => {
            const member = memberOrFallback(M, id);
            const attendedCount = pickle.sessions.filter(s => sessionMemberIds(s).includes(id)).length;
            const sessionCount = pickle.sessions.length;
            const net = summary.memberOwes[id] || 0;
            return (
              <div key={id} style={{
                padding: 14, borderBottom: i < pickle.fixedMembers.length - 1 ? '1px solid var(--border-1)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={member} size={40} style={tweaks?.avatarStyle}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{displayMemberName(member, '?')}{member.isMe ? ' (bạn)' : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
                      Đi {attendedCount}/{sessionCount} buổi
                    </div>
                  </div>
                  <Money value={net} size={14} color={net >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} compact/>
                </div>
                <div style={{ marginTop: 8, height: 5, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${sessionCount > 0 ? (attendedCount / sessionCount) * 100 : 0}%`,
                    background: accent,
                    transition: 'width .6s cubic-bezier(.2,.7,.2,1)',
                  }}/>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <div>
        <SectionHeader title="Người chơi vãng lai"/>
        <Card>
          {(() => {
            const guestMap = {};
            for (const s of pickle.sessions) for (const g of safeArray(s.guests)) {
              const name = guestName(g);
              guestMap[name] = (guestMap[name] || 0) + 1;
            }
            const entries = Object.entries(guestMap);
            return entries.map(([name, count], i) => (
              <ListRow key={name}
                left={<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--vb-warn-100)', color: '#A05C0C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{initialsFromName(name)}</div>}
                title={name}
                subtitle={`${count} buổi • ${fmtVNDFull(count * pickle.guestFeePerSession)}`}
                right={<Pill bg="var(--vb-warn-100)" color="#A05C0C" size="xs">Vãng lai</Pill>}
                divider={i < entries.length - 1}
              />
            ));
          })()}
        </Card>
      </div>
    </div>
  );
}

// ── Pickleball session detail ───────────────────────────────────────────────
function ScreenSessionDetail({ params = {}, pop, tweaks = {} }) {
  const { state } = useApp();
  const M = getMemberMap(state.members);
  const pickle = normalizePickle(state.pickle);
  const allSessions = [...(pickle.sessions || []), ...(pickle.upcoming || [])];
  const s = allSessions.find(x => x.id === params?.sessionId);
  if (!s) return null;
  const attended = sessionMemberIds(s);
  const expenses = s.expenses || [];
  const total = expenses.reduce((a,e)=>a+(Number(e.amount) || 0), 0);
  const per = attended.length > 0 ? Math.round(total / attended.length) : 0;
  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader title={`Buổi ${s.date}`} subtitle={`${s.day} • ${s.time} • ${s.court}`} onBack={pop}/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-1)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tổng chi</span>
            <Money value={total} size={18}/>
          </div>
          {expenses.map((ex, i) => {
            const cat = ex.category || ex.kind;
            const lbl = ex.title || ex.label;
            const payer = memberOrFallback(M, ex.payerId || ex.paidBy);
            return (
              <ListRow key={i}
                left={<div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={cat === 'ball' ? 'ball' : cat === 'food' ? 'food' : 'drink'} size={18} color="var(--brand-1)"/></div>}
                title={lbl || 'Chi phí'}
                subtitle={`${displayMemberName(payer, '?')} đã trả`}
                right={<Money value={Number(ex.amount) || 0} size={14}/>}
                divider={i < expenses.length - 1}
              />
            );
          })}
        </Card>

        <Card>
          <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
            Có mặt — chia {fmtVND(per)} mỗi người
          </div>
          {attended.map((id, i) => {
            const member = memberOrFallback(M, id);
            return (
            <ListRow key={id}
              left={<Avatar member={member} size={36} style={tweaks?.avatarStyle}/>}
              title={displayMemberName(member, '?')}
              right={<Pill bg="var(--vb-success-100)" color="var(--vb-success-700)" size="xs" icon="check">Có mặt</Pill>}
              divider={i < attended.length - 1}
            />
            );
          })}
        </Card>

        {safeArray(s.guests).length > 0 && (
          <Card>
            <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
              Vãng lai ({safeArray(s.guests).length})
            </div>
            {safeArray(s.guests).map((guest, i) => {
              const name = guestName(guest);
              return (
              <ListRow key={name}
                left={<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--vb-warn-100)', color: '#A05C0C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{initialsFromName(name)}</div>}
                title={name}
                right={<Money value={pickle.guestFeePerSession} size={13}/>}
                divider={i < safeArray(s.guests).length - 1}
              />
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

function FormRow({ label, icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon && <Icon name={icon} size={14} color="var(--text-2)"/>}{label}
      </div>
      {children}
    </div>
  );
}

function inputStyle() {
  return {
    appearance: 'none', width: '100%', height: 44, padding: '0 14px',
    background: 'var(--surface-1)', border: '1px solid var(--border-1)',
    borderRadius: 10, fontFamily: 'var(--vb-font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-1)',
    boxSizing: 'border-box', outline: 'none',
  };
}

function ScreenAddSessionExpense({ params = {}, pop, tweaks = {} }) {
  const { state, dispatch, genId } = useApp();
  const M = getMemberMap(state.members);
  const pickle = normalizePickle(state.pickle);
  const meId = state.currentUserId || ME;
  const fixedMembers = pickle.fixedMembers;
  const [kind, setKind] = useState('ball');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(() => fixedMembers.includes(meId) ? meId : (fixedMembers[0] || meId));
  const [sessionId, setSessionId] = useState(() => (pickle.sessions[0] || {}).id || '');
  const num = Number((amount || '0').replace(/[^0-9]/g, ''));
  const canSave = num > 0 && !!sessionId && !!paidBy;
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Thêm chi phí" subtitle="Buổi đánh Pickleball" onBack={pop} right={
        <button onClick={() => {
          if (!canSave) return;
            dispatch({
              type: 'ADD_PICKLE_EXPENSE',
              sessionId,
              expense: {
                id: genId(),
                category: kind,
                title: label || kind,
                amount: num,
                payerId: paidBy,
                paidBy,
                createdAt: Date.now(),
              }
            });
          pop();
        }} style={{
          appearance: 'none', height: 32, padding: '0 12px', cursor: canSave ? 'pointer' : 'not-allowed',
          background: canSave ? 'var(--brand-1)' : 'var(--surface-2)',
          color: canSave ? '#fff' : 'var(--text-3)',
          border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
        }}>Lưu</button>
      }/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>Số tiền</div>
          <input type="text" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^0-9]/g,''))}
            placeholder="0"
            style={{
              appearance: 'none', width: '100%', textAlign: 'center', border: 0, background: 'transparent',
              outline: 'none', fontFamily: 'var(--vb-font-num)', fontSize: 44, fontWeight: 700, color: 'var(--text-1)',
              letterSpacing: '-0.02em',
            }}/>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{num > 0 ? fmtVNDFull(num) : 'VND'}</div>
        </div>

        <FormRow label="Loại" icon="tag">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { id: 'ball', label: 'Bóng / vợt', icon: 'ball' },
              { id: 'drink', label: 'Nước uống', icon: 'drink' },
              { id: 'food', label: 'Ăn uống', icon: 'food' },
            ].map(k => (
              <button key={k.id} onClick={() => setKind(k.id)} style={{
                appearance: 'none', cursor: 'pointer', height: 64, padding: 8,
                background: kind === k.id ? 'var(--brand-soft)' : 'var(--surface-1)',
                border: '1px solid ' + (kind === k.id ? 'var(--brand-1)' : 'var(--border-1)'),
                borderRadius: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Icon name={k.icon} size={20} color={kind === k.id ? 'var(--brand-1)' : 'var(--text-1)'}/>
                <span style={{ fontSize: 11, fontWeight: 700, color: kind === k.id ? 'var(--brand-1)' : 'var(--text-1)' }}>{k.label}</span>
              </button>
            ))}
          </div>
        </FormRow>

        <FormRow label="Mô tả" icon="edit">
          <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="VD: Bóng Joola mới"
            style={inputStyle()}/>
        </FormRow>

        <FormRow label="Người trả" icon="user">
          <select value={paidBy} onChange={(e)=>setPaidBy(e.target.value)} style={inputStyle()}>
            {fixedMembers.map(id => <option key={id} value={id}>{displayMemberName(memberOrFallback(M, id), '?')}</option>)}
          </select>
        </FormRow>

        <FormRow label="Buổi đánh" icon="calendar">
          <select value={sessionId} onChange={(e)=>setSessionId(e.target.value)} style={inputStyle()}>
            {pickle.sessions.map(s => <option key={s.id} value={s.id}>{s.date} • {s.time} • {s.court}</option>)}
          </select>
        </FormRow>
      </div>
    </div>
  );
}

function ScreenAddExternalTicket({ pop, tweaks = {} }) {
  const { state, dispatch, genId } = useApp();
  const M = getMemberMap(state.members);
  const pickle = normalizePickle(state.pickle);
  const meId = state.currentUserId || ME;
  const fixedMembers = pickle.fixedMembers;
  const defaultParticipants = fixedMembers.includes(meId)
    ? [meId]
    : (fixedMembers[0] ? [fixedMembers[0]] : (meId ? [meId] : []));
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(defaultParticipants[0] || meId);
  const [participants, setParticipants] = useState(defaultParticipants);
  const num = Number((amount || '0').replace(/[^0-9]/g, ''));
  const canSave = num > 0 && !!label.trim() && participants.length > 0;

  const toggleParticipant = (id) => {
    setParticipants(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Thêm vé lẻ" subtitle="Ngoài lịch cố định" onBack={pop} right={
        <button onClick={() => {
          if (canSave) {
            dispatch({
              type: 'ADD_EXTERNAL_TICKET',
              ticket: {
                id: genId(),
                date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                label: label.trim(),
                amount: num,
                paidBy,
                participants,
                createdAt: Date.now(),
              }
            });
            pop();
          }
        }} style={{
          appearance: 'none', height: 32, padding: '0 12px', cursor: canSave ? 'pointer' : 'not-allowed',
          background: canSave ? 'var(--brand-1)' : 'var(--surface-2)',
          color: canSave ? '#fff' : 'var(--text-3)',
          border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
        }}>Lưu</button>
      }/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>Số tiền</div>
          <input type="text" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^0-9]/g,''))}
            placeholder="0"
            style={{
              appearance: 'none', width: '100%', textAlign: 'center', border: 0, background: 'transparent',
              outline: 'none', fontFamily: 'var(--vb-font-num)', fontSize: 44, fontWeight: 700, color: 'var(--text-1)',
              letterSpacing: '-0.02em',
            }}/>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{num > 0 ? fmtVNDFull(num) : 'VND'}</div>
        </div>

        <FormRow label="Tên sân / địa điểm" icon="edit">
          <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="VD: Sân Nguyễn Khoái"
            style={inputStyle()}/>
        </FormRow>

        <FormRow label="Người trả" icon="user">
          <select value={paidBy} onChange={(e)=>setPaidBy(e.target.value)} style={inputStyle()}>
            {fixedMembers.map(id => <option key={id} value={id}>{displayMemberName(memberOrFallback(M, id), '?')}</option>)}
          </select>
        </FormRow>

        <FormRow label="Người tham gia" icon="users">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fixedMembers.map(id => {
              const member = memberOrFallback(M, id);
              return (
              <button key={id} onClick={() => toggleParticipant(id)} style={{
                appearance: 'none', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 20,
                background: participants.includes(id) ? 'var(--brand-soft)' : 'var(--surface-2)',
                border: '1px solid ' + (participants.includes(id) ? 'var(--brand-1)' : 'var(--border-1)'),
                color: participants.includes(id) ? 'var(--brand-1)' : 'var(--text-1)',
                fontSize: 13, fontWeight: 600,
              }}>{displayMemberName(member, member.short || '?')}</button>
              );
            })}
          </div>
        </FormRow>
      </div>
    </div>
  );
}

export default ScreenPickleball
export { ScreenSessionDetail, ScreenAddSessionExpense, ScreenAddExternalTicket }
