# Pickleball Attendance Redesign — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix data source pickleball tab + thêm card "Buổi hôm nay" + đổi attendance UI thành inline tap-to-toggle

**Architecture:** Sửa duy nhất `src/screen-pickleball.jsx` — đổi queries sang schema mới, thêm todaySession card ở Tổng quan, đổi session list sang inline attendance expand.

**Tech Stack:** React, Supabase JS v2, inline styles

---

## Task 1: Fix isTreasurer + load sessions từ schema mới

**Files:**
- Modify: `src/screen-pickleball.jsx`

- [ ] Đọc `src/screen-pickleball.jsx` để hiểu cấu trúc hiện tại

- [ ] Fix `isTreasurer`: tìm group pickleball từ `state.groups` (name.toLowerCase().includes('pickleball')), tìm member trong group đó, check `role === 'treasurer'`

```javascript
const pickleballGroup = state.groups?.find(g =>
  g.name?.toLowerCase().includes('pickleball')
)
const currentMember = pickleballGroup
  ? state.members?.find(m =>
      m.group_id === pickleballGroup.id &&
      m.id === state.currentMemberId
    )
  : null
const isTreasurer = currentMember?.role === 'treasurer'
```

- [ ] Thêm state cho sessions mới:
```javascript
const [pickSessions, setPickSessions] = useState([])
const [sessionsLoading, setSessionsLoading] = useState(false)
```

- [ ] Thêm hàm `loadSessions(groupId)` dùng `pickleball_sessions`:
```javascript
async function loadSessions(groupId) {
  if (!groupId) return
  setSessionsLoading(true)
  try {
    const { token } = getStoredAuth()
    const sb = createSupabase(token)
    const now = new Date()
    const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const end = new Date(now.getFullYear(), now.getMonth()+1, 0)
      .toISOString().slice(0,10)
    const { data, error } = await sb
      .from('pickleball_sessions')
      .select('id, date, notes, group_id')
      .eq('group_id', groupId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
    if (error) throw error
    setPickSessions(data || [])
  } catch (e) {
    console.error('loadSessions error', e)
  } finally {
    setSessionsLoading(false)
  }
}
```

- [ ] Gọi `loadSessions(pickleballGroup?.id)` trong useEffect khi component mount và khi `pickleballGroup?.id` thay đổi

- [ ] Commit: `fix: load pickleball sessions from new schema + fix isTreasurer`

---

## Task 2: Card "Buổi hôm nay" trong Tab Tổng quan

**Files:**
- Modify: `src/screen-pickleball.jsx`

- [ ] Tính `todayStr = new Date().toISOString().slice(0, 10)`

- [ ] Tính `todaySession = pickSessions.find(s => s.date === todayStr)`

- [ ] Tính `todayAttendance` từ `sessionAttendanceMap[todaySession?.id]` (nếu đã load)

- [ ] Thêm card ở đầu Tab Tổng quan, CHỈ render khi `isTreasurer && todaySession`:

```jsx
{isTreasurer && todaySession && (
  <div style={{
    background: 'linear-gradient(135deg, #3730a3, #4f46e5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  }}>
    <div style={{
      display: 'inline-block',
      background: 'rgba(255,255,255,0.15)',
      color: '#c7d2fe',
      fontSize: 10,
      padding: '2px 10px',
      borderRadius: 20,
      marginBottom: 8,
    }}>
      📅 Hôm nay · {formatDow(todaySession.date)} {formatDate(todaySession.date)}
    </div>
    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
      Buổi {formatDate(todaySession.date)}
    </div>
    {todayAttendance && (
      <div style={{ fontSize: 11, color: '#c7d2fe', marginBottom: 10 }}>
        {Object.values(todayAttendance).filter(s => s === 'present').length} có mặt ·{' '}
        {Object.values(todayAttendance).filter(s => s === 'absent').length} vắng
      </div>
    )}
    <button
      onClick={() => { setActiveTab('sessions'); setExpandedSession(todaySession.id); }}
      style={{
        width: '100%', padding: '8px 0', background: '#fff',
        color: '#4f46e5', border: 'none', borderRadius: 8,
        fontWeight: 700, fontSize: 12, cursor: 'pointer',
      }}
    >
      ✓ Điểm danh buổi này
    </button>
  </div>
)}
```

- [ ] Cần hàm helper:
  - `formatDow(dateStr)` → "T2", "T3"... "CN"
  - `formatDate(dateStr)` → "19/05"

  ```javascript
  function formatDow(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['CN','T2','T3','T4','T5','T6','T7']
    return days[d.getDay()]
  }
  function formatDate(dateStr) {
    const [,m,dd] = dateStr.split('-')
    return `${dd}/${m}`
  }
  ```

- [ ] Khi nút "Điểm danh buổi này" được bấm, auto load attendance nếu chưa có: gọi `toggleSessionExpand(todaySession.id)` sau khi switch tab

- [ ] Commit: `feat: add today session card in pickleball overview for treasurer`

---

## Task 3: Tab Buổi đánh — Inline Attendance

**Files:**
- Modify: `src/screen-pickleball.jsx`

- [ ] Đọc lại phần render Tab Buổi đánh hiện tại (sessions tab)

- [ ] Thay thế render sessions bằng list từ `pickSessions`:

```jsx
// Trong tab "sessions"
<div>
  {sessionsLoading && <div style={{color:'#888',textAlign:'center',padding:20}}>Đang tải...</div>}
  {!sessionsLoading && pickSessions.length === 0 && (
    <div style={{color:'#888',textAlign:'center',padding:20}}>Chưa có buổi nào tháng này</div>
  )}
  {pickSessions.map((session, i) => {
    const isToday = session.date === todayStr
    const isFuture = session.date > todayStr
    const isExpanded = expandedSession === session.id
    const attendance = sessionAttendanceMap[session.id] || {}
    const presentCount = groupMembers.filter(m =>
      (attendance[m.id] || 'present') === 'present'
    ).length
    const absentCount = groupMembers.length - presentCount

    return (
      <div key={session.id} style={{
        background: '#1e2235',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
        opacity: isFuture ? 0.55 : 1,
        border: isToday ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
      }}>
        {/* Header */}
        <div
          onClick={() => !isFuture && isTreasurer && toggleSessionExpand(session.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', cursor: !isFuture && isTreasurer ? 'pointer' : 'default',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: isToday ? '#3730a3' : '#2a2d45',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
              {session.date.slice(8)}
            </span>
            <span style={{ fontSize: 8, color: isToday ? '#c7d2fe' : '#888' }}>
              {formatDow(session.date)}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              Buổi #{i + 1}
              {isToday && (
                <span style={{ color: '#fbbf24', fontSize: 10, marginLeft: 6 }}>
                  · Hôm nay
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
              {isFuture
                ? 'Chưa đến · Chưa điểm danh'
                : `${presentCount} có mặt · ${absentCount} vắng`}
            </div>
          </div>
          {!isFuture && isTreasurer && (
            <span style={{ color: isExpanded ? '#6366f1' : '#444', fontSize: 16 }}>›</span>
          )}
        </div>

        {/* Expanded attendance */}
        {isExpanded && isTreasurer && (
          <div style={{ borderTop: '1px solid #2a2d3a', padding: '8px 12px 12px' }}>
            <div style={{
              fontSize: 9, color: '#6c6f80', textTransform: 'uppercase',
              letterSpacing: '0.8px', paddingBottom: 8,
            }}>
              Tap để đánh dấu vắng
            </div>
            {groupMembers.map(member => {
              const status = attendance[member.id] || 'present'
              const isPresent = status === 'present'
              return (
                <div
                  key={member.id}
                  onClick={() => markAttendance(session.id, member.id, isPresent ? 'absent' : 'present')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10, marginBottom: 6,
                    cursor: 'pointer',
                    background: isPresent ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
                    border: `1px solid ${isPresent ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.3)'}`,
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    background: isPresent ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)',
                    color: isPresent ? '#34d399' : '#fb7185',
                  }}>
                    {member.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>
                    {member.name}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    color: isPresent ? '#34d399' : '#fb7185',
                  }}>
                    {isPresent ? '✓ Có mặt' : '✗ Vắng'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  })}
</div>
```

- [ ] Xóa section riêng "Điểm danh tháng" (`<SectionHeader title="Điểm danh tháng"/>` và block map sessions bên dưới nó) — giữ nguyên "Quản lý CLB" (tạo lịch)

- [ ] Đảm bảo `groupMembers` = danh sách active members của pickleball group (đã có trong state)

- [ ] Commit: `feat: inline attendance in sessions tab, remove separate attendance section`

---

## Task 4: Đảm bảo saveSessionSchedule refresh pickSessions

**Files:**
- Modify: `src/screen-pickleball.jsx`

- [ ] Sau khi `saveSessionSchedule()` thành công → gọi `loadSessions(pickleballGroup?.id)` để refresh list

- [ ] Test thủ công: tạo lịch → xem sessions hiện ra không

- [ ] Commit: `fix: refresh sessions list after schedule creation`
