# Pickleball Tab Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Pickleball tab with a full-month calendar grid, inline session detail panel, Settings ⚙️ CLB modal, batch cost entry form, and a simplified home card — plus DB tables for per-session water cost, free-form extras, and monthly config.

**Architecture:** DB migration adds `water_amount` column + 2 new tables (`pickleball_session_items`, `pickleball_monthly_config`); `loadSessions` in `screen-pickleball.jsx` fetches the new data; the Buổi đánh tab replaces the vertical list with a calendar grid + inline detail panel; Settings modal (treasurer-only) hosts CLB schedule config + court fee + link to batch entry form; home card is slimmed to 3 metrics + progress bar + CTA.

**Tech Stack:** React + Vite, Supabase PostgreSQL + RLS, CSS custom properties (vb-tokens.css), no unit test framework — verification via browser and Supabase MCP.

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/20260519000001_pickleball_costs.sql` | Create |
| `src/screen-pickleball.jsx` | Modify — calendar, detail panel, settings modal, batch entry |
| `src/screen-home.jsx` | Modify — simplify PickleballMonthCard |

---

### Task 1: DB Migration — Cost Tracking Schema

**Files:**
- Create: `supabase/migrations/20260519000001_pickleball_costs.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260519000001_pickleball_costs.sql

-- 1. Add water_amount to existing sessions table
ALTER TABLE pickleball_sessions
  ADD COLUMN IF NOT EXISTS water_amount integer DEFAULT 0;

-- 2. Per-session free-form cost items (bóng, phụ kiện, etc.)
CREATE TABLE IF NOT EXISTS pickleball_session_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES pickleball_sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  amount      integer NOT NULL,
  member_ids  uuid[] NOT NULL DEFAULT '{}',
  created_by  uuid REFERENCES members(id),
  created_at  timestamptz DEFAULT now()
);

-- 3. Monthly config: court fee total + auto-schedule weekday pattern
CREATE TABLE IF NOT EXISTS pickleball_monthly_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  year_month          text NOT NULL,                    -- "2026-05"
  court_fee           integer NOT NULL DEFAULT 0,       -- total court fee VND
  schedule_start_day  text,                             -- "2026-05-01" first session date
  schedule_weekdays   integer[] NOT NULL DEFAULT '{}',  -- [1,3,5] = Mon,Wed,Fri
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
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with the SQL content above.

- [ ] **Step 3: Verify tables and column exist**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pickleball_session_items', 'pickleball_monthly_config');
-- Expected: 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'pickleball_sessions' AND column_name = 'water_amount';
-- Expected: 1 row
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260519000001_pickleball_costs.sql
git commit -m "feat: add pickleball cost tracking schema (water_amount, session_items, monthly_config)"
```

---

### Task 2: Store Updates — viewMonth State + Enhanced loadSessions

**Files:**
- Modify: `src/screen-pickleball.jsx`

Add `viewMonth`, `monthlyConfig`, `sessionItemsMap` state, then update `loadSessions` to fetch `water_amount`, session items, and monthly config for the viewed month.

- [ ] **Step 1: Add three new state variables at top of `ScreenPickleball` (after existing `useState` declarations around line 185)**

```jsx
const [monthlyConfig, setMonthlyConfig] = useState(null);
const [sessionItemsMap, setSessionItemsMap] = useState({});
const [viewMonth, setViewMonth] = useState(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});
```

- [ ] **Step 2: Replace the existing `loadSessions` function with this version**

The key changes: uses `viewMonth` (not current month hardcoded), selects `water_amount`, fetches monthly config and session items in parallel.

```jsx
async function loadSessions(groupId) {
  if (!groupId) return;
  setSessionsLoading(true);
  try {
    const { token } = getStoredAuth();
    const sb = createSupabase(token);
    const [yearStr, monthStr] = viewMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

    const [sessionsRes, configRes] = await Promise.all([
      sb.from('pickleball_sessions')
        .select('id, date, notes, group_id, water_amount')
        .eq('group_id', groupId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true }),
      sb.from('pickleball_monthly_config')
        .select('*')
        .eq('group_id', groupId)
        .eq('year_month', viewMonth)
        .maybeSingle(),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    const sessions = sessionsRes.data || [];
    setPickSessions(sessions);
    setMonthlyConfig(configRes.data || null);

    if (sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: items, error: itemsError } = await sb
        .from('pickleball_session_items')
        .select('*')
        .in('session_id', sessionIds);
      if (itemsError) throw itemsError;
      const bySession = {};
      (items || []).forEach(item => {
        if (!bySession[item.session_id]) bySession[item.session_id] = [];
        bySession[item.session_id].push(item);
      });
      setSessionItemsMap(bySession);
    } else {
      setSessionItemsMap({});
    }
  } catch (e) {
    console.error('loadSessions error', e);
  } finally {
    setSessionsLoading(false);
  }
}
```

**Important:** `loadSessions` must be defined AFTER the `viewMonth` useState declaration so it captures it from the closure.

- [ ] **Step 3: Update the `useEffect` to re-run on `viewMonth` change**

Find the existing:
```jsx
useEffect(() => {
  loadSessions(pickleballGroup?.id);
}, [pickleballGroup?.id]);
```

Replace with:
```jsx
useEffect(() => {
  loadSessions(pickleballGroup?.id);
}, [pickleballGroup?.id, viewMonth]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: viewMonth state, load water_amount + session items + monthly config"
```

---

### Task 3: Calendar Grid for Buổi Đánh Tab

**Files:**
- Modify: `src/screen-pickleball.jsx` — add `PickleCalendar` component, replace `PickleSessions` render

Replace the vertical session list in the Buổi đánh tab with a full-month 7-column calendar. Tap a session day → expand detail panel below.

- [ ] **Step 1: Add `PickleCalendar` component to `src/screen-pickleball.jsx`**

Add this component before `ScreenPickleball`:

```jsx
function PickleCalendar({
  viewMonth, setViewMonth, pickSessions, todayStr,
  expandedSession, toggleSessionExpand, sessionAttendanceMap,
  groupMembers, isTreasurer, markAttendance,
  monthlyConfig, sessionItemsMap, accent,
}) {
  const [year, month] = viewMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  // Mon-first offset: Mon=0 … Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const sessionByDate = {};
  pickSessions.forEach(s => { sessionByDate[s.date] = s; });
  const mm = String(month).padStart(2, '0');
  const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ ...iconBtnStyle, width: 32, height: 32 }}>
          <Icon name="chevron-left" size={16}/>
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
          Tháng {month} / {year}
        </span>
        <button onClick={nextMonth} style={{ ...iconBtnStyle, width: 32, height: 32 }}>
          <Icon name="chevron-right" size={16}/>
        </button>
      </div>

      {/* DOW header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DOW_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', fontWeight: 600, paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>;
          const dateStr = `${year}-${mm}-${String(day).padStart(2, '0')}`;
          const session = sessionByDate[dateStr];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isExpanded = session && expandedSession === session.id;

          let bg = 'transparent';
          let border = '1px solid transparent';
          let textColor = session ? 'var(--text-1)' : 'var(--text-3)';

          if (session) {
            const attendance = sessionAttendanceMap[session.id] || {};
            const hasMarked = Object.keys(attendance).length > 0;
            if (isToday) {
              bg = '#4f46e5'; border = '1px solid #3730a3'; textColor = '#fff';
            } else if (isPast && hasMarked) {
              bg = 'rgba(52,211,153,0.12)'; border = '1px solid rgba(52,211,153,0.4)'; textColor = '#34d399';
            } else if (isPast) {
              bg = 'rgba(248,113,113,0.10)'; border = '1px solid rgba(248,113,113,0.3)'; textColor = '#f87171';
            } else {
              bg = 'rgba(99,102,241,0.08)'; border = '1px dashed rgba(99,102,241,0.4)'; textColor = '#a5b4fc';
            }
          }

          return (
            <div
              key={dateStr}
              onClick={() => session && toggleSessionExpand(session.id)}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                background: bg,
                border,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: session ? 'pointer' : 'default',
                transition: 'all 0.15s',
                outline: isExpanded ? `2px solid ${isToday ? '#818cf8' : '#34d399'}` : 'none',
                outlineOffset: 1,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: session ? 700 : 400, color: textColor, lineHeight: 1 }}>{day}</span>
              {session && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: textColor, marginTop: 2, opacity: 0.8, display: 'block' }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded detail panel */}
      {expandedSession && (() => {
        const session = pickSessions.find(s => s.id === expandedSession);
        if (!session) return null;
        return (
          <SessionDetailPanel
            session={session}
            attendance={sessionAttendanceMap[expandedSession] || {}}
            groupMembers={groupMembers}
            isTreasurer={isTreasurer}
            markAttendance={markAttendance}
            monthlyConfig={monthlyConfig}
            sessionItems={sessionItemsMap[expandedSession] || []}
            pickSessions={pickSessions}
            todayStr={todayStr}
          />
        );
      })()}
    </div>
  );
}
```

- [ ] **Step 2: Replace `PickleSessions` in the tab render inside `ScreenPickleball`**

Find the line:
```jsx
{tab === 'sessions' && <PickleSessions ... />}
```

Replace with:
```jsx
{tab === 'sessions' && (
  <PickleCalendar
    viewMonth={viewMonth}
    setViewMonth={setViewMonth}
    pickSessions={pickSessions}
    todayStr={todayStr}
    expandedSession={expandedSession}
    toggleSessionExpand={toggleSessionExpand}
    sessionAttendanceMap={sessionAttendanceMap}
    groupMembers={groupMembers}
    isTreasurer={isTreasurer}
    markAttendance={markAttendance}
    monthlyConfig={monthlyConfig}
    sessionItemsMap={sessionItemsMap}
    accent={accent}
  />
)}
```

- [ ] **Step 3: Verify in browser**

Navigate to Pickleball → Buổi đánh. Should see:
- 7-column grid with T2–CN header
- Month nav ‹ / ›
- Session days colored: indigo (today), rose (past no attendance), mint (past with attendance), dashed indigo (future)
- Tapping a session day expands the detail panel below

- [ ] **Step 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: calendar grid for Buổi đánh tab"
```

---

### Task 4: Session Detail Panel

**Files:**
- Modify: `src/screen-pickleball.jsx` — add `SessionDetailPanel` component (used by `PickleCalendar`)

- [ ] **Step 1: Add `SessionDetailPanel` component before `PickleCalendar`**

```jsx
function SessionDetailPanel({ session, attendance, groupMembers, isTreasurer, markAttendance, monthlyConfig, sessionItems, pickSessions, todayStr }) {
  const sessionIndex = pickSessions.findIndex(s => s.id === session.id);
  const sessionNum = sessionIndex + 1;
  const dateStr = session.date;
  const dow = formatDow(dateStr);
  const dd = dateStr.slice(8, 10);
  const mmm = dateStr.slice(5, 7);

  const hasAttendance = Object.keys(attendance).length > 0;
  const absentIds = groupMembers
    .map(m => m.id)
    .filter(id => attendance[id] === 'absent' || (hasAttendance && attendance[id] !== 'present'));
  const presentIds = groupMembers.map(m => m.id).filter(id => !absentIds.includes(id));
  const presentCount = presentIds.length || groupMembers.length;
  const allPresent = absentIds.length === 0 && hasAttendance;

  const sessionCount = pickSessions.length || 1;
  const courtFeePerSession = monthlyConfig?.court_fee
    ? Math.round(monthlyConfig.court_fee / sessionCount)
    : 0;
  const waterPerPerson = session.water_amount > 0 && presentCount > 0
    ? Math.round(session.water_amount / presentCount)
    : null;

  const isPast = dateStr < todayStr;
  const isToday = dateStr === todayStr;

  return (
    <div style={{ marginTop: 12, background: 'var(--surface-2, #1e2235)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border-1)' }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>
          Buổi #{sessionNum} · {dow}, {dd}/{mmm}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
          {isToday ? '🟢 Hôm nay' : isPast ? '✓ Đã đánh' : '📅 Sắp tới'}
        </div>
      </div>

      {/* Attendance */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Điểm danh</div>
        {!hasAttendance ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 6 }}>
            Chưa điểm danh — mặc định tất cả có mặt
          </div>
        ) : allPresent ? (
          <div style={{ fontSize: 12, color: '#34d399', marginBottom: 6 }}>✓ Tất cả thành viên có mặt</div>
        ) : (
          <div style={{ fontSize: 12, color: '#f87171', marginBottom: 6 }}>
            ✗ Vắng: {absentIds.map(id => groupMembers.find(m => m.id === id)?.name || id).join(', ')}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {groupMembers.map(m => {
            const status = attendance[m.id];
            const isPresent = status === 'present' || (!hasAttendance && status !== 'absent');
            return (
              <div
                key={m.id}
                onClick={() => isTreasurer && markAttendance(session.id, m.id, isPresent ? 'absent' : 'present')}
                style={{
                  padding: '4px 10px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                  background: isPresent ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.12)',
                  color: isPresent ? '#34d399' : '#f87171',
                  border: `1px solid ${isPresent ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.3)'}`,
                  cursor: isTreasurer ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {m.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost breakdown */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Chi phí</div>

        {courtFeePerSession > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 4 }}>
            <span style={{ color: 'var(--text-2)' }}>🏸 Tiền sân / người</span>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmtVND(courtFeePerSession)} đ</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 4 }}>
          <span style={{ color: 'var(--text-2)' }}>💧 Tiền nước / người</span>
          <span style={{
            color: waterPerPerson != null ? 'var(--text-1)' : 'var(--text-3)',
            fontWeight: waterPerPerson != null ? 600 : 400,
            fontStyle: waterPerPerson == null ? 'italic' : 'normal',
          }}>
            {waterPerPerson != null ? `${fmtVND(waterPerPerson)} đ` : 'Cuối tháng'}
          </span>
        </div>

        {sessionItems.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 4 }}>
            <span style={{ color: 'var(--text-2)' }}>📦 {item.name}</span>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
              {item.member_ids.length > 0
                ? `${fmtVND(Math.round(item.amount / item.member_ids.length))} đ/người`
                : `${fmtVND(item.amount)} đ`}
            </span>
          </div>
        ))}

        {courtFeePerSession === 0 && !session.water_amount && sessionItems.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Chưa nhập chi phí</div>
        )}

        {session.water_amount > 0 && presentCount > 1 && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
            💡 Tiền nước chia đều {presentCount} người có mặt
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Tap a session in the calendar. Panel shows below with:
- Header: "Buổi #N · T[X], DD/MM" + status badge
- Attendance chips (green/red, tap toggles for treasurer)
- Cost rows: sân (if config set), nước (or "Cuối tháng"), phụ kiện items

- [ ] **Step 3: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: session detail panel with attendance chips + cost breakdown"
```

---

### Task 5: Settings CLB Modal

**Files:**
- Modify: `src/screen-pickleball.jsx` — add ⚙️ button in hero header, add `ClubSettingsModal` component

- [ ] **Step 1: Add `showSettings` state to `ScreenPickleball`**

```jsx
const [showSettings, setShowSettings] = useState(false);
```

- [ ] **Step 2: Add ⚙️ button inside the hero header**

Inside the hero `<div style={{ position: 'relative', zIndex: 1 }}>` block, add after the subtitle line:

```jsx
{isTreasurer && (
  <button
    onClick={() => setShowSettings(true)}
    style={{
      position: 'absolute', top: 0, right: 0,
      background: 'rgba(255,255,255,0.12)', border: 'none',
      borderRadius: 10, width: 34, height: 34,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: '#fff', zIndex: 2,
    }}
  >
    <Icon name="settings" size={18} color="#fff"/>
  </button>
)}
```

- [ ] **Step 3: Add `ClubSettingsModal` component**

```jsx
function ClubSettingsModal({ show, onClose, pickleballGroup, viewMonth, monthlyConfig, pickSessions, onSaved, onOpenBatchEntry }) {
  const sessionCount = pickSessions.length;
  const [courtFee, setCourtFee] = useState('');
  const [scheduleWeekdays, setScheduleWeekdays] = useState([1, 3, 5]);
  const [scheduleStartDay, setScheduleStartDay] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setCourtFee(String(monthlyConfig?.court_fee || ''));
      setScheduleWeekdays(monthlyConfig?.schedule_weekdays || [1, 3, 5]);
      setScheduleStartDay(monthlyConfig?.schedule_start_day || '');
    }
  }, [show, monthlyConfig]);

  if (!show) return null;

  async function saveConfig() {
    setSaving(true);
    try {
      const client = getAuthedSupabaseClient();
      const payload = {
        group_id: pickleballGroup.id,
        year_month: viewMonth,
        court_fee: Number(String(courtFee).replace(/[^0-9]/g, '')) || 0,
        schedule_weekdays: scheduleWeekdays,
        schedule_start_day: scheduleStartDay || null,
      };
      const { error } = await client
        .from('pickleball_monthly_config')
        .upsert(payload, { onConflict: 'group_id,year_month' });
      if (error) throw error;
      onSaved(payload);
      onClose();
    } catch (e) {
      alert('Lỗi lưu cài đặt: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const courtFeeNum = Number(String(courtFee).replace(/[^0-9]/g, '')) || 0;
  const perSession = sessionCount > 0 && courtFeeNum > 0 ? Math.round(courtFeeNum / sessionCount) : 0;
  const [ymYear, ymMonth] = viewMonth.split('-').map(Number);
  const nextYm = ymMonth === 12 ? `${ymYear + 1}-01` : `${ymYear}-${String(ymMonth + 1).padStart(2, '0')}`;
  const previewDates = scheduleStartDay
    ? generateSessionDates(scheduleStartDay, scheduleWeekdays, nextYm)
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>
      <div style={{ position: 'relative', background: 'var(--surface-1, #1a1d27)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>⚙️ Cài đặt CLB</span>
          <button onClick={onClose} style={{ ...iconBtnStyle, width: 30, height: 30 }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        {/* Schedule */}
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Lịch tháng tự động</div>
        <div style={{ background: 'var(--surface-2, #1e2235)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Các thứ trong tuần</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SCHEDULE_WEEKDAYS.map(wd => {
              const active = scheduleWeekdays.includes(wd.value);
              return (
                <button
                  key={wd.value}
                  onClick={() => setScheduleWeekdays(prev =>
                    active ? prev.filter(d => d !== wd.value) : [...prev, wd.value].sort()
                  )}
                  style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: active ? '#6366f1' : 'var(--surface-1)',
                    color: active ? '#fff' : 'var(--text-2)',
                    border: '1px solid ' + (active ? '#6366f1' : 'var(--border-1)'),
                    cursor: 'pointer',
                  }}
                >{wd.label}</button>
              );
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Ngày bắt đầu tháng tới</div>
            <input
              type="date"
              value={scheduleStartDay}
              onChange={e => setScheduleStartDay(e.target.value)}
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 13, width: '100%' }}
            />
          </div>
          {previewDates.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#a5b4fc' }}>
              Tháng {ymMonth === 12 ? 1 : ymMonth + 1} sẽ có {previewDates.length} buổi, từ {previewDates[0]?.slice(8)}/{String(ymMonth === 12 ? 1 : ymMonth + 1).padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Court fee */}
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Chi phí tháng</div>
        <div style={{ background: 'var(--surface-2, #1e2235)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Tiền sân tháng {ymMonth}</div>
          <input
            type="number"
            value={courtFee}
            onChange={e => setCourtFee(e.target.value)}
            placeholder="vd: 4550000"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 13, width: '100%' }}
          />
          {perSession > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
              {sessionCount} buổi → {fmtVND(perSession)} đ / buổi
            </div>
          )}
        </div>

        <button
          onClick={() => { onClose(); onOpenBatchEntry(); }}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12,
            background: 'rgba(251,191,36,0.10)', color: '#fbbf24',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            border: '1px solid rgba(251,191,36,0.3)', marginBottom: 12,
          }}
        >📋 Nhập chi phí sân</button>

        <button
          onClick={saveConfig}
          disabled={saving}
          style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: saving ? '#3a3d55' : '#6366f1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Đang lưu...' : '💾 Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add `showBatchEntry` state and wire modal in `ScreenPickleball`**

Add state:
```jsx
const [showBatchEntry, setShowBatchEntry] = useState(false);
```

Add modal before the closing `</div>` of the main return:
```jsx
<ClubSettingsModal
  show={showSettings}
  onClose={() => setShowSettings(false)}
  pickleballGroup={pickleballGroup}
  viewMonth={viewMonth}
  monthlyConfig={monthlyConfig}
  pickSessions={pickSessions}
  onSaved={(newConfig) => setMonthlyConfig(prev => ({ ...(prev || {}), ...newConfig }))}
  onOpenBatchEntry={() => setShowBatchEntry(true)}
/>
```

- [ ] **Step 5: Verify in browser**

As treasurer: tap ⚙️ in hero → bottom sheet opens with weekday toggles, date picker, court fee input. Save → config written to DB. Non-treasurer: ⚙️ not visible.

- [ ] **Step 6: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: settings CLB modal with schedule config and court fee"
```

---

### Task 6: Batch Entry Form

**Files:**
- Modify: `src/screen-pickleball.jsx` — add `BatchEntryForm` full-screen view

Lets treasurer enter water cost per past session (split evenly among attendees) and free-form extras (ball, accessories) with per-member selection. Opened from Settings modal.

- [ ] **Step 1: Add `BatchEntryForm` component**

```jsx
function BatchEntryForm({ pickSessions, sessionAttendanceMap, groupMembers, sessionItemsMap, setSessionItemsMap, todayStr, onClose, onSessionsUpdated }) {
  const [drafts, setDrafts] = useState(() => {
    const d = {};
    pickSessions.forEach(s => {
      const existing = sessionItemsMap[s.id] || [];
      d[s.id] = {
        water: s.water_amount > 0 ? String(s.water_amount) : '',
        items: existing.map(item => ({
          id: item.id,
          name: item.name,
          amount: String(item.amount),
          memberIds: item.member_ids || groupMembers.map(m => m.id),
        })),
      };
    });
    return d;
  });
  const [saving, setSaving] = useState(false);

  function setWater(sessionId, value) {
    setDrafts(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], water: value } }));
  }

  function addItem(sessionId) {
    setDrafts(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        items: [...(prev[sessionId]?.items || []), { name: '', amount: '', memberIds: groupMembers.map(m => m.id) }],
      },
    }));
  }

  function updateItem(sessionId, idx, field, value) {
    setDrafts(prev => {
      const items = [...(prev[sessionId]?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, [sessionId]: { ...prev[sessionId], items } };
    });
  }

  function toggleItemMember(sessionId, idx, memberId) {
    setDrafts(prev => {
      const items = [...(prev[sessionId]?.items || [])];
      const current = items[idx].memberIds || [];
      items[idx] = { ...items[idx], memberIds: current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId] };
      return { ...prev, [sessionId]: { ...prev[sessionId], items } };
    });
  }

  async function saveAll() {
    setSaving(true);
    try {
      const client = getAuthedSupabaseClient();
      for (const session of pickSessions) {
        if (session.date >= todayStr) continue;
        const draft = drafts[session.id];
        if (!draft) continue;
        const waterAmt = Number(String(draft.water || '').replace(/[^0-9]/g, '')) || 0;
        await client.from('pickleball_sessions').update({ water_amount: waterAmt }).eq('id', session.id);
        await client.from('pickleball_session_items').delete().eq('session_id', session.id);
        const validItems = (draft.items || []).filter(it => it.name && Number(String(it.amount).replace(/[^0-9]/g, '')) > 0);
        if (validItems.length > 0) {
          await client.from('pickleball_session_items').insert(
            validItems.map(it => ({
              session_id: session.id,
              name: it.name,
              amount: Number(String(it.amount).replace(/[^0-9]/g, '')),
              member_ids: it.memberIds,
            }))
          );
        }
      }
      onSessionsUpdated();
      onClose();
    } catch (e) {
      alert('Lỗi lưu: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const pastSessions = pickSessions.filter(s => s.date < todayStr);
  const futureSessions = pickSessions.filter(s => s.date >= todayStr);
  let totalWater = 0, totalItems = 0;
  pastSessions.forEach(s => {
    const d = drafts[s.id];
    totalWater += Number(String(d?.water || '').replace(/[^0-9]/g, '')) || 0;
    (d?.items || []).forEach(it => { totalItems += Number(String(it.amount).replace(/[^0-9]/g, '')) || 0; });
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'var(--bg, #0f1117)', overflowY: 'auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'sticky', top: 0, background: 'var(--bg, #0f1117)', zIndex: 1, paddingTop: 20 }}>
        <button onClick={onClose} style={{ ...iconBtnStyle, width: 34, height: 34 }}>
          <Icon name="chevron-left" size={20}/>
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>📋 Chi phí sân tháng</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Nước, bóng, phụ kiện theo buổi</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Past sessions */}
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Buổi đã đánh · {pastSessions.length}/{pickSessions.length}
        </div>

        {pastSessions.map(session => {
          const draft = drafts[session.id] || { water: '', items: [] };
          const attendance = sessionAttendanceMap[session.id] || {};
          const presentCount = groupMembers.filter(m => attendance[m.id] === 'present').length || groupMembers.length;
          const waterAmt = Number(String(draft.water).replace(/[^0-9]/g, '')) || 0;
          const waterPerPerson = waterAmt > 0 && presentCount > 0 ? Math.round(waterAmt / presentCount) : 0;
          const dow = formatDow(session.date);
          const dd = session.date.slice(8, 10);
          const mm = session.date.slice(5, 7);
          const sessionIdx = pickSessions.findIndex(s => s.id === session.id);
          const extraTotal = draft.items.reduce((s, it) => s + (Number(String(it.amount).replace(/[^0-9]/g, '')) || 0), 0);
          const hasData = waterAmt > 0 || extraTotal > 0;

          return (
            <div key={session.id} style={{ background: 'var(--surface-2, #1e2235)', borderRadius: 12, padding: 12, marginBottom: 8, border: hasData ? '1px solid rgba(52,211,153,0.2)' : '1px solid transparent' }}>
              {/* Session header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: hasData ? '#1a2e1a' : 'var(--surface-1, #13161f)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: hasData ? '#34d399' : 'var(--text-1)', lineHeight: 1 }}>{dd}</span>
                  <span style={{ fontSize: 7, color: hasData ? '#34d399' : 'var(--text-3)' }}>{dow}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>Buổi #{sessionIdx + 1} · {dd}/{mm}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{presentCount} có mặt</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: hasData ? '#34d399' : 'var(--text-3)', fontStyle: hasData ? 'normal' : 'italic' }}>
                  {hasData ? `${fmtVND(waterAmt + extraTotal)} đ` : 'Chưa nhập'}
                </div>
              </div>

              {/* Water input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>💧</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-2)' }}>Tiền nước</div>
                  {waterPerPerson > 0 && (
                    <div style={{ fontSize: 8, color: 'var(--text-3)' }}>
                      Chia đều {presentCount} người → {fmtVND(waterPerPerson)} đ/người
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  value={draft.water}
                  onChange={e => setWater(session.id, e.target.value)}
                  placeholder="vd: 88000"
                  style={{ background: 'var(--surface-1)', border: `1px solid ${draft.water ? 'rgba(52,211,153,0.4)' : 'var(--border-1)'}`, borderRadius: 7, padding: '6px 9px', fontSize: 11, color: draft.water ? '#34d399' : 'var(--text-1)', width: 110, textAlign: 'right' }}
                />
              </div>

              {/* Extra items */}
              {draft.items.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--surface-1)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      value={item.name}
                      onChange={e => updateItem(session.id, idx, 'name', e.target.value)}
                      placeholder="Tên khoản (vd: Bóng BX)"
                      style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 6, padding: '5px 8px', fontSize: 10, color: 'var(--text-1)' }}
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={e => updateItem(session.id, idx, 'amount', e.target.value)}
                      placeholder="Tiền"
                      style={{ background: 'var(--surface-2)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6, padding: '5px 8px', fontSize: 10, color: '#fbbf24', width: 90, textAlign: 'right' }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 4 }}>Áp dụng cho:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {groupMembers.map(m => {
                      const sel = item.memberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleItemMember(session.id, idx, m.id)}
                          style={{
                            padding: '3px 8px', borderRadius: 10, fontSize: 8, fontWeight: 700,
                            background: sel ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)',
                            color: sel ? '#a5b4fc' : '#6c6f80',
                            border: `1px solid ${sel ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          {m.name?.split(' ').at(-1) || m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={() => addItem(session.id)}
                style={{ width: '100%', padding: '6px 0', background: 'transparent', border: '1px dashed var(--border-1)', borderRadius: 7, color: 'var(--text-3)', fontSize: 10, cursor: 'pointer', marginTop: 4 }}
              >+ Thêm bóng / phụ kiện</button>
            </div>
          );
        })}

        {/* Future sessions */}
        {futureSessions.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 8px' }}>
              Buổi sắp tới · {futureSessions.length}/{pickSessions.length}
            </div>
            {futureSessions.map(session => (
              <div key={session.id} style={{ opacity: 0.4, background: 'var(--surface-2)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{session.date.slice(8, 10)}</span>
                  <span style={{ fontSize: 7, color: 'var(--text-3)' }}>{formatDow(session.date)}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Chưa đến</span>
              </div>
            ))}
          </>
        )}

        {/* Summary */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', margin: '16px 0 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tổng kết đã nhập</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', paddingBottom: 4 }}>
            <span>💧 Tiền nước</span>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmtVND(totalWater)} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', paddingBottom: 4 }}>
            <span>📦 Phụ kiện</span>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmtVND(totalItems)} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-1)', marginTop: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Tổng tháng</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#fbbf24' }}>{fmtVND(totalWater + totalItems)} đ</span>
          </div>
        </div>

        <button
          onClick={saveAll}
          disabled={saving}
          style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: saving ? '#3a3d55' : 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Đang lưu...' : '💾 Lưu tất cả'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render `BatchEntryForm` in `ScreenPickleball`**

Add after `ClubSettingsModal`:
```jsx
{showBatchEntry && (
  <BatchEntryForm
    pickSessions={pickSessions}
    sessionAttendanceMap={sessionAttendanceMap}
    groupMembers={groupMembers}
    sessionItemsMap={sessionItemsMap}
    setSessionItemsMap={setSessionItemsMap}
    todayStr={todayStr}
    onClose={() => setShowBatchEntry(false)}
    onSessionsUpdated={() => loadSessions(pickleballGroup?.id)}
  />
)}
```

- [ ] **Step 3: Verify in browser**

As treasurer: ⚙️ → "Nhập chi phí sân" → full-screen batch form. Enter water amounts per session, add extra items with member chips, tap 💾 Lưu tất cả → data saved. Return to calendar, tap a session → detail panel shows entered costs.

- [ ] **Step 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: batch entry form for per-session water cost and extra items"
```

---

### Task 7: Navigation Fix — "Điểm danh buổi này"

**Files:**
- Modify: `src/screen-pickleball.jsx` — update button in `PickleOverview`

The "Điểm danh buổi này" button in the Overview tab should switch to Buổi đánh AND auto-expand today's (or nearest upcoming) session.

- [ ] **Step 1: Locate the button in `PickleOverview`**

Search for `Điểm danh buổi này` in `src/screen-pickleball.jsx`. It's inside `PickleOverview` component. The component receives `setActiveTab`, `toggleSessionExpand`, `todaySession`, `pickSessions`, `todayStr` as props (already passed from `ScreenPickleball`).

- [ ] **Step 2: Update the button's `onClick` handler**

Replace whatever `onClick` the button has with:
```jsx
onClick={() => {
  setActiveTab('sessions');
  const target = todaySession || pickSessions.find(s => s.date >= todayStr);
  if (target) {
    setTimeout(() => toggleSessionExpand(target.id), 80);
  }
}}
```

- [ ] **Step 3: Verify in browser**

On Overview tab, tap "Điểm danh buổi này" → switches to Buổi đánh tab → today's session (or nearest future session) detail panel expands automatically.

- [ ] **Step 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: auto-expand today/next session when navigating from Overview"
```

---

### Task 8: Simplified Home Card

**Files:**
- Modify: `src/screen-home.jsx` — replace `PickleballMonthCard` content

Replace the existing Pickleball home card (which may include an attendance grid) with: header, 3 metrics (sessions played, absences, total), progress bar, net debt, and a CTA button.

- [ ] **Step 1: Read the current `PickleballMonthCard` in `src/screen-home.jsx`**

Use the Read tool on `/Users/giinlow./Spliteasy-boss/src/screen-home.jsx` and search for the `PickleballMonthCard` function. Note its props and current structure.

- [ ] **Step 2: Replace `PickleballMonthCard` with simplified version**

```jsx
function PickleballMonthCard({ sessions, pickleNet, monthNumber, switchTab }) {
  const todayStr = todayInputValue();
  const totalSessions = sessions.length;
  const pastSessions = sessions.filter(s => (s.date || s.session_date) < todayStr);
  const attended = pastSessions.length;
  const progress = totalSessions > 0 ? Math.round((pastSessions.length / totalSessions) * 100) : 0;
  const netAmt = typeof pickleNet === 'number' ? pickleNet : 0;

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>🏓 CLB Pickleball</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Tháng {monthNumber}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{attended}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Đã đánh</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{totalSessions}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Tổng buổi</div>
        </div>
        <div style={{ flex: 1 }}/>
        {netAmt !== 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1, color: netAmt < 0 ? '#f87171' : '#34d399' }}>
              {netAmt < 0 ? '-' : '+'}{fmtVND(Math.abs(netAmt))} đ
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{netAmt < 0 ? 'Còn nợ' : 'Số dư'}</div>
          </div>
        )}
      </div>

      <div style={{ height: 4, borderRadius: 4, background: 'var(--border-1)', marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#7AC74F', borderRadius: 4, transition: 'width 0.4s ease' }}/>
      </div>

      <button
        onClick={() => switchTab && switchTab('pickle')}
        style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid var(--border-1)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        Xem lịch & chi tiết <Icon name="arrow-right" size={14}/>
      </button>
    </div>
  );
}
```

Note: `todayInputValue` is already defined in `screen-pickleball.jsx`; copy or duplicate the 3-line helper into `screen-home.jsx` if not present:
```jsx
function todayInputValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
```
Also ensure `fmtVND` is imported (it's from `'./data.jsx'` — check current imports in screen-home.jsx).

- [ ] **Step 3: Update the callsite of `PickleballMonthCard`**

Find where it's called in `ScreenHome` and update props to match:
```jsx
<PickleballMonthCard
  sessions={homeMonthSessions}
  pickleNet={pickleNet}
  monthNumber={monthNumber}
  switchTab={switchTab}
/>
```

- [ ] **Step 4: Verify in browser**

Home screen Pickleball card shows: title + month, sessions played / total, progress bar, debt/balance, and CTA button. No attendance grid. Tapping CTA switches to Pickleball tab.

- [ ] **Step 5: Commit**

```bash
git add src/screen-home.jsx
git commit -m "feat: simplified Pickleball home card with progress bar and CTA"
```

---

## Self-Review

**Spec coverage check:**
- A1 (Home card simplified) → Task 8 ✓
- A2 (Calendar grid) → Task 3 ✓
- A3 (Session detail panel) → Task 4 ✓
- A4 (Settings CLB modal) → Task 5 ✓
- A5 (Navigation fix) → Task 7 ✓
- A6 (Access control: isTreasurer gates) → Tasks 3, 4, 5 all gate on `isTreasurer` ✓
- B1 (DB schema) → Task 1 ✓
- B2 (Batch entry form) → Task 6 ✓
- B3 (Financial logic — tiền sân ÷ sessions, tiền nước ÷ present, phụ kiện ÷ member_ids) → Task 4 `SessionDetailPanel` ✓

**Execution order:** Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Each task builds on the previous. DB must come first; Task 3 depends on state from Task 2; Task 4 is consumed by Task 3's `PickleCalendar`; Tasks 5–6 are the modal+batch form layered on top; Tasks 7–8 are standalone nav and home card.
