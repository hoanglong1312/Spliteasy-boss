# Home Redesign + Pickleball Attendance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign trang chủ thành personal monthly overview + thêm pickleball session/attendance system.

**Architecture:** (1) DB migration tạo `pickleball_sessions` + `pickleball_attendance`. (2) Store thêm monthly aggregation. (3) `screen-home.jsx` redesign toàn bộ layout. (4) `screen-pickleball.jsx` thêm session management + attendance cho treasurer.

**Tech Stack:** React + Vite (JSX), Supabase (PostgreSQL + RLS), vb-tokens.css, no TypeScript, no test suite.

**Spec:** `docs/superpowers/specs/2026-05-18-home-redesign-pickleball-attendance.md`

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/20260518000005_pickleball_sessions.sql` | Create |
| `src/store.jsx` | Modify — thêm fetchHomeMonth, fetchPickleballSessions |
| `src/screen-home.jsx` | Modify — redesign toàn bộ |
| `src/screen-pickleball.jsx` | Modify — thêm session creation + attendance UI |

---

## Task 1: DB Migration — pickleball_sessions + pickleball_attendance

**Files:**
- Create: `supabase/migrations/20260518000005_pickleball_sessions.sql`

**Context:** Project dùng Supabase. Migrations đã có trong `supabase/migrations/`. Migration mới nhất là `20260518000002_get_member_by_token_rpc.sql`. Đọc `supabase/migrations/20260517000006_rls_policies.sql` để hiểu pattern RLS hiện tại trước khi viết.

- [ ] **Step 1: Tạo migration file**

```sql
-- supabase/migrations/20260518000005_pickleball_sessions.sql

-- Sessions: mỗi buổi đánh pickleball của 1 CLB (group)
CREATE TABLE IF NOT EXISTS pickleball_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date        date NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(group_id, date)
);

-- Attendance: điểm danh từng thành viên cho từng buổi
CREATE TABLE IF NOT EXISTS pickleball_attendance (
  session_id  uuid NOT NULL REFERENCES pickleball_sessions(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  marked_by   uuid REFERENCES members(id),
  marked_at   timestamptz DEFAULT now(),
  PRIMARY KEY (session_id, member_id)
);

-- RLS: pickleball_sessions
ALTER TABLE pickleball_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view sessions in their groups"
  ON pickleball_sessions FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "treasurer can manage sessions"
  ON pickleball_sessions FOR ALL
  USING (
    group_id IN (
      SELECT m.group_id FROM members m
      WHERE m.id IN (SELECT get_my_member_ids())
        AND m.role = 'treasurer'
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT m.group_id FROM members m
      WHERE m.id IN (SELECT get_my_member_ids())
        AND m.role = 'treasurer'
    )
  );

-- RLS: pickleball_attendance
ALTER TABLE pickleball_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view attendance in their groups"
  ON pickleball_attendance FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM pickleball_sessions
      WHERE group_id IN (SELECT get_my_group_ids())
    )
  );

CREATE POLICY "treasurer can manage attendance"
  ON pickleball_attendance FOR ALL
  USING (
    session_id IN (
      SELECT ps.id FROM pickleball_sessions ps
      JOIN members m ON m.group_id = ps.group_id
      WHERE m.id IN (SELECT get_my_member_ids())
        AND m.role = 'treasurer'
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT ps.id FROM pickleball_sessions ps
      JOIN members m ON m.group_id = ps.group_id
      WHERE m.id IN (SELECT get_my_member_ids())
        AND m.role = 'treasurer'
    )
  );

-- Helper: get_my_member_ids() — trả về tất cả member IDs của token hiện tại
-- Kiểm tra xem function này đã tồn tại chưa trước khi tạo:
CREATE OR REPLACE FUNCTION get_my_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.id FROM members m
  JOIN member_tokens mt ON mt.member_id = m.id
  WHERE mt.token_hash = encode(
    digest(current_setting('request.headers', true)::json->>'x-member-token', 'sha256'),
    'hex'
  )
$$;
```

**Lưu ý:** Đọc `supabase/migrations/20260517000008_fix_rls_recursion.sql` để kiểm tra `get_my_group_ids()` đã dùng pattern gì, tránh recursion. Nếu `get_my_member_ids()` đã tồn tại thì bỏ phần tạo function đó.

- [ ] **Step 2: Apply migration qua Supabase MCP**

```
Tool: mcp__supabase__apply_migration
name: pickleball_sessions
sql: [nội dung file trên]
```

Verify: dùng `mcp__supabase__execute_sql` để check:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('pickleball_sessions', 'pickleball_attendance');
```
Expected: 2 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260518000005_pickleball_sessions.sql
git commit -m "feat: add pickleball_sessions + pickleball_attendance tables with RLS"
```

---

## Task 2: Store — fetchPickleballSessions + monthly expense aggregation

**Files:**
- Modify: `src/store.jsx`

**Context:** Đọc `src/store.jsx` toàn bộ trước khi sửa. Hiểu cách `fetchGroupData(token)` hoạt động, cách state được normalize, và pattern của các action hiện tại. Token lấy từ `getStoredAuth()` trong `src/lib/auth.js`.

- [ ] **Step 1: Thêm helper `getMonthRange(yearMonth)`**

Thêm vào phần đầu store.jsx (sau imports):
```js
// yearMonth: "2026-05" → { start: "2026-05-01", end: "2026-05-31" }
function getMonthRange(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
```

- [ ] **Step 2: Thêm `fetchPickleballSessions(token, yearMonth)` vào store**

Function này fetch sessions + attendance của member hiện tại trong tháng:

```js
export async function fetchPickleballSessions(token, yearMonth) {
  const { start, end } = getMonthRange(yearMonth);
  const client = getSupabaseClient(token);

  // Lấy tất cả groups của member để tìm group pickleball
  // group có category = 'pickleball' hoặc tên chứa 'pickleball'/'clb'
  const { data: sessions, error } = await client
    .from('pickleball_sessions')
    .select(`
      id, date, notes, group_id,
      pickleball_attendance ( session_id, member_id, status )
    `)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error) throw error;
  return sessions || [];
}
```

- [ ] **Step 3: Thêm `fetchMonthlyExpenses(token, yearMonth)` vào store**

```js
export async function fetchMonthlyExpenses(token, yearMonth) {
  const { start, end } = getMonthRange(yearMonth);
  const client = getSupabaseClient(token);

  const { data: splits, error } = await client
    .from('expense_splits')
    .select(`
      amount, share,
      expenses!inner ( date, description, category, group_id,
        groups ( name ) )
    `)
    .gte('expenses.date', start)
    .lte('expenses.date', end)
    .order('expenses(date)', { ascending: false });

  if (error) throw error;
  return splits || [];
}
```

**Lưu ý:** Tên bảng (`expense_splits`, `expenses`) phải khớp với schema hiện tại. Đọc `src/store.jsx` để xem tên bảng đang được dùng, điều chỉnh cho đúng. Nếu cách query hiện tại khác thì dùng pattern tương tự.

- [ ] **Step 4: Thêm action `FETCH_HOME_MONTH` vào reducer**

Trong reducer (hàm `reducer` hoặc `dispatch` handler), thêm case:

```js
case 'FETCH_HOME_MONTH_SUCCESS':
  return {
    ...state,
    homeMonth: action.yearMonth,
    homeMonthSessions: action.sessions,      // pickleball sessions array
    homeMonthExpenses: action.expenses,      // expense splits array
  };
case 'FETCH_HOME_MONTH_ERROR':
  return { ...state, homeMonthError: action.error };
```

- [ ] **Step 5: Commit**

```bash
git add src/store.jsx
git commit -m "feat: add fetchPickleballSessions + fetchMonthlyExpenses for home month view"
```

---

## Task 3: Home Screen Redesign

**Files:**
- Modify: `src/screen-home.jsx`

**Context:** Đọc toàn bộ `src/screen-home.jsx` trước khi sửa. Hiểu cách component nhận props (token, state, dispatch), cách navigate giữa tabs, và CSS classes đang dùng (vb-tokens.css). Xem `src/components.jsx` để biết shared components nào có sẵn.

Thiết kế cuối cùng đã được approve — xem mockup tại `.superpowers/brainstorm/*/content/home-v5.html` để tham khảo CSS chính xác.

- [ ] **Step 1: Thêm state + helper tính net monthly**

Thêm vào component ScreenHome:

```jsx
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});

// "2026-05" → "Tháng 5, 2026"
function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return `Tháng ${month}, ${year}`;
}

function isCurrentMonth(yearMonth) {
  const now = new Date();
  return yearMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Load data khi selectedMonth thay đổi**

Trong useEffect (hoặc tương đương):

```jsx
useEffect(() => {
  if (!token) return;
  Promise.all([
    fetchPickleballSessions(token, selectedMonth),
    fetchMonthlyExpenses(token, selectedMonth),
  ]).then(([sessions, expenses]) => {
    dispatch({ type: 'FETCH_HOME_MONTH_SUCCESS', yearMonth: selectedMonth, sessions, expenses });
  }).catch(err => {
    dispatch({ type: 'FETCH_HOME_MONTH_ERROR', error: err.message });
  });
}, [selectedMonth, token]);
```

- [ ] **Step 3: Tính net amount từ homeMonthExpenses**

```jsx
function calcMonthNet(expenses, currentMemberId) {
  // expense_splits: share = phần người này phải trả (dương = nợ), amount = tổng expense
  // Nếu người này là payer thì được nhận lại phần của người khác
  // Logic này phụ thuộc vào schema — đọc data shape trong src/data.jsx hoặc store.jsx
  // Pattern: net = Σ(paid_by_me) - Σ(my_share)
  // Điều chỉnh theo cách tính hiện tại của app
  let totalOwed = 0;
  let totalOwedToMe = 0;
  for (const split of expenses) {
    if (split.member_id === currentMemberId) {
      totalOwed += split.share || 0;
    }
    if (split.expenses?.paid_by === currentMemberId) {
      totalOwedToMe += split.amount || 0;
    }
  }
  return totalOwedToMe - totalOwed;
}
```

**Lưu ý:** Đọc `src/data.jsx` để hiểu cách tính tiền hiện tại. Điều chỉnh `calcMonthNet` cho đúng với schema thực tế.

- [ ] **Step 4: Render month nav**

Thay thế group switcher bar bằng:

```jsx
<div style={{display:'flex', justifyContent:'center', padding:'10px 18px 14px', background:'#fff'}}>
  <div style={{display:'inline-flex', alignItems:'center', background:'#f0f0f7', borderRadius:20, padding:4}}>
    <button
      onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
      style={{background:'#fff', border:'none', width:32, height:32, borderRadius:14,
              fontSize:17, color:'#5b4ede', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,.1)'}}>
      ‹
    </button>
    <div style={{padding:'0 16px', fontSize:13, fontWeight:700, color:'#1a1a2e', whiteSpace:'nowrap'}}>
      {formatMonthLabel(selectedMonth)}
    </div>
    <button
      onClick={() => !isCurrentMonth(selectedMonth) && setSelectedMonth(nextMonth(selectedMonth))}
      disabled={isCurrentMonth(selectedMonth)}
      style={{background:'none', border:'none', width:32, height:32, borderRadius:14,
              fontSize:17, color: isCurrentMonth(selectedMonth) ? '#ccc' : '#5b4ede',
              cursor: isCurrentMonth(selectedMonth) ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center'}}>
      ›
    </button>
  </div>
</div>
```

Thêm helper `nextMonth`:
```js
function nextMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Render summary card với net tháng**

```jsx
const netAmount = calcMonthNet(homeMonthExpenses || [], currentUserId);
const netLabel = netAmount > 0
  ? `Bạn được nhận ${netAmount.toLocaleString('vi-VN')}đ tháng này`
  : netAmount < 0
  ? `Bạn đang nợ ${Math.abs(netAmount).toLocaleString('vi-VN')}đ tháng này`
  : 'Bạn đã cân bằng tháng này';

// Trong JSX:
<div style={{margin:'0 14px 14px', padding:18,
             background:'linear-gradient(135deg,#5b4ede 0%,#7c6ff7 100%)',
             borderRadius:20, color:'#fff', boxShadow:'0 6px 24px rgba(91,78,222,.45)'}}>
  <div style={{fontSize:10, letterSpacing:1, opacity:.75, marginBottom:6}}>
    TỔNG THÁNG {selectedMonth.split('-')[1]}
  </div>
  <div style={{fontSize:28, fontWeight:800, letterSpacing:-1}}>
    {netAmount >= 0 ? '+' : '−'}{Math.abs(netAmount).toLocaleString('vi-VN')} đ
  </div>
  <div style={{fontSize:12, opacity:.75, marginBottom:14}}>{netLabel}</div>
  <div style={{display:'flex', gap:8}}>
    <button onClick={() => dispatch({type:'NAVIGATE', screen:'add-expense'})}
      style={{flex:1, background:'rgba(255,255,255,.95)', color:'#5b4ede',
              border:'none', borderRadius:12, padding:'10px 8px', fontSize:12, fontWeight:700}}>
      + Thêm chi tiêu
    </button>
    <button onClick={() => dispatch({type:'NAVIGATE', screen:'settlement'})}
      style={{flex:1, background:'rgba(255,255,255,.2)', color:'#fff',
              border:'none', borderRadius:12, padding:'10px 8px', fontSize:12, fontWeight:700}}>
      ⚡ Thanh toán
    </button>
  </div>
</div>
```

**Lưu ý:** Điều chỉnh `dispatch({type:'NAVIGATE', ...})` theo cách navigate thực tế của app (xem `src/app.jsx`).

- [ ] **Step 6: Render Pickleball card với attendance grid**

```jsx
// Lọc sessions của tháng đã chọn
const pickleballSessions = (homeMonthSessions || [])
  .filter(s => s.date.startsWith(selectedMonth));

// Tính attendance của currentUser
function getSessionStatus(session, memberId) {
  const att = session.pickleball_attendance?.find(a => a.member_id === memberId);
  if (!att) return 'upcoming'; // chưa có attendance record = sắp tới
  return att.status; // 'present' | 'absent'
}

const today = new Date().toISOString().split('T')[0];

// Tính nợ Pickleball trong tháng
const pickleballNet = calcPickleballNet(homeMonthExpenses || [], currentUserId);

// Render card
{pickleballSessions.length > 0 && (
  <div onClick={() => navigateTo('pickleball')}
    style={{background:'linear-gradient(160deg,#1e1b4b 0%,#312e81 55%,#3730a3 100%)',
            borderRadius:20, overflow:'hidden', boxShadow:'0 6px 24px rgba(30,27,75,.5)',
            cursor:'pointer', marginBottom:12}}>
    {/* Header */}
    <div style={{padding:'14px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:40, height:40, background:'rgba(255,255,255,.12)',
                     borderRadius:12, display:'flex', alignItems:'center',
                     justifyContent:'center', fontSize:22}}>🏓</div>
        <div>
          <div style={{fontSize:14, fontWeight:700, color:'#fff'}}>Pickleball CLB</div>
          <div style={{fontSize:11, color:'#fca5a5', fontWeight:600}}>
            {pickleballNet > 0 ? `Được nhận ${pickleballNet.toLocaleString('vi-VN')}đ`
                               : `Nợ ${Math.abs(pickleballNet).toLocaleString('vi-VN')}đ`}
          </div>
        </div>
      </div>
      <div style={{background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)',
                   padding:'5px 10px', borderRadius:20, fontSize:11,
                   color:'rgba(255,255,255,.8)', display:'flex', alignItems:'center', gap:3}}>
        Xem CLB ›
      </div>
    </div>

    {/* Label */}
    <div style={{padding:'2px 16px 8px', fontSize:10, color:'rgba(255,255,255,.35)',
                 letterSpacing:.5, textTransform:'uppercase'}}>
      Điểm danh cá nhân · {formatMonthLabel(selectedMonth)}
    </div>

    {/* Session grid — 6 cột */}
    <div style={{padding:'0 16px 10px'}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:5}}>
        {pickleballSessions.map(session => {
          const status = session.date > today ? 'upcoming' : getSessionStatus(session, currentUserId);
          const dayOfWeek = ['CN','T2','T3','T4','T5','T6','T7'][new Date(session.date + 'T00:00:00').getDay()];
          const dayNum = parseInt(session.date.split('-')[2]);

          const styles = {
            present: {
              background:'rgba(110,231,183,.25)',
              border:'1px solid rgba(110,231,183,.5)',
              labelColor:'rgba(167,243,208,.8)',
              numColor:'#d1fae5',
            },
            absent: {
              background:'rgba(251,113,133,.2)',
              border:'1px solid rgba(251,113,133,.45)',
              labelColor:'rgba(253,164,175,.85)',
              numColor:'#fecdd3',
            },
            upcoming: {
              background:'rgba(255,255,255,.05)',
              border:'1.5px dashed rgba(255,255,255,.18)',
              labelColor:'rgba(255,255,255,.3)',
              numColor:'rgba(255,255,255,.4)',
            },
          }[status];

          return (
            <div key={session.id}
              style={{aspectRatio:1, background:styles.background,
                      border:styles.border, borderRadius:8,
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center'}}>
              <div style={{fontSize:7, fontWeight:600, color:styles.labelColor}}>{dayOfWeek}</div>
              <div style={{fontSize:11, fontWeight:800, color:styles.numColor}}>{dayNum}</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{display:'flex', gap:14, marginTop:9}}>
        {[
          {color:'rgba(110,231,183,.4)', border:'1px solid rgba(110,231,183,.6)', label:`Có mặt (${pickleballSessions.filter(s => getSessionStatus(s, currentUserId) === 'present').length})`},
          {color:'rgba(251,113,133,.3)', border:'1px solid rgba(251,113,133,.5)', label:`Vắng (${pickleballSessions.filter(s => getSessionStatus(s, currentUserId) === 'absent').length})`},
          {color:'rgba(255,255,255,.05)', border:'1px dashed rgba(255,255,255,.2)', label:`Sắp tới (${pickleballSessions.filter(s => s.date > today).length})`},
        ].map(item => (
          <div key={item.label} style={{display:'flex', alignItems:'center', gap:5, fontSize:10, color:'rgba(255,255,255,.5)'}}>
            <div style={{width:10, height:10, background:item.color, border:item.border, borderRadius:3}}/>
            {item.label}
          </div>
        ))}
      </div>
    </div>

    {/* Stats footer */}
    {['Có mặt','Vắng','Tổng buổi','Bạn nợ'].map((label, i) => {
      const values = [
        pickleballSessions.filter(s => getSessionStatus(s,currentUserId)==='present').length,
        pickleballSessions.filter(s => getSessionStatus(s,currentUserId)==='absent').length,
        pickleballSessions.length,
        Math.abs(pickleballNet).toLocaleString('vi-VN')+'k',
      ];
      const colors = ['#a7f3d0','#fecdd3','rgba(255,255,255,.8)','#fca5a5'];
      return (
        <React.Fragment key={label}>
          {i > 0 && <div style={{width:1, background:'rgba(255,255,255,.08)'}}/>}
          <div style={{flex:1, textAlign:'center', padding:'9px 0'}}>
            <div style={{fontSize:15, fontWeight:800, color:colors[i]}}>{values[i]}</div>
            <div style={{fontSize:9, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:.3}}>{label}</div>
          </div>
        </React.Fragment>
      );
    })}
  </div>
)}
```

- [ ] **Step 7: Render Chi tiêu nhóm card**

```jsx
// 3 giao dịch gần nhất từ homeMonthExpenses
const recentExpenses = (homeMonthExpenses || [])
  .slice(0, 3);

const groupNet = calcGroupNet(homeMonthExpenses || [], currentUserId);
const totalSpent = (homeMonthExpenses || []).reduce((s, e) => s + (e.expenses?.amount || 0), 0);

{recentExpenses.length > 0 && (
  <div onClick={() => navigateTo('groups')}
    style={{background:'linear-gradient(160deg,#0c2340 0%,#0f3460 55%,#154a7a 100%)',
            borderRadius:20, overflow:'hidden', boxShadow:'0 6px 24px rgba(12,35,64,.5)',
            cursor:'pointer', marginBottom:12}}>
    {/* Header */}
    <div style={{padding:'14px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:40, height:40, background:'rgba(255,255,255,.12)',
                     borderRadius:12, display:'flex', alignItems:'center',
                     justifyContent:'center', fontSize:22}}>📦</div>
        <div>
          <div style={{fontSize:14, fontWeight:700, color:'#fff'}}>Chi tiêu nhóm</div>
          <div style={{fontSize:11, color:'#fcd34d', fontWeight:600}}>
            {groupNet < 0 ? `Nợ ${Math.abs(groupNet).toLocaleString('vi-VN')}đ` : `+${groupNet.toLocaleString('vi-VN')}đ`}
          </div>
        </div>
      </div>
      <div style={{background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)',
                   padding:'5px 10px', borderRadius:20, fontSize:11,
                   color:'rgba(255,255,255,.8)', display:'flex', alignItems:'center', gap:3}}>
        Chi tiết ›
      </div>
    </div>

    {/* Recent transactions */}
    <div style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
      {recentExpenses.map((split, idx) => (
        <div key={idx}
          style={{display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 16px',
                  borderBottom: idx < recentExpenses.length-1 ? '1px solid rgba(255,255,255,.06)' : 'none'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{fontSize:17}}>💰</div>
            <div>
              <div style={{fontSize:12, fontWeight:600, color:'#f1f5f9'}}>
                {split.expenses?.description || 'Chi tiêu'}
              </div>
              <div style={{fontSize:10, color:'rgba(255,255,255,.35)'}}>
                {split.expenses?.date ? new Date(split.expenses.date).toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit'}) : ''} · {split.expenses?.groups?.name || ''}
              </div>
            </div>
          </div>
          <div style={{fontSize:12, fontWeight:700,
                       color: split.share > 0 ? '#fca5a5' : '#86efac'}}>
            {split.share > 0 ? `−${split.share.toLocaleString('vi-VN')}` : `+${Math.abs(split.share).toLocaleString('vi-VN')}`}k
          </div>
        </div>
      ))}
    </div>

    {/* Stats */}
    <div style={{display:'flex', padding:'9px 16px 13px', borderTop:'1px solid rgba(255,255,255,.07)'}}>
      {[
        {val: (homeMonthExpenses||[]).length, label:'Giao dịch', color:'rgba(255,255,255,.85)'},
        {val: `${(totalSpent/1000).toFixed(0)}k`, label:'Tổng chi', color:'rgba(255,255,255,.85)'},
        {val: `${(Math.abs(groupNet)/1000).toFixed(0)}k`, label:'Bạn nợ', color:'#fcd34d'},
      ].map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <div style={{width:1, background:'rgba(255,255,255,.08)'}}/>}
          <div style={{flex:1, textAlign:'center'}}>
            <div style={{fontSize:15, fontWeight:800, color:item.color}}>{item.val}</div>
            <div style={{fontSize:9, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:.3}}>{item.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 8: Xóa group switcher + "Ai nợ ai" section**

Tìm và xóa hoặc comment out:
- Component `<GroupSwitcherBar .../>` trong screen-home.jsx
- Section "AI NỢ AI" / `whoOwesWho` rendering
- Bất kỳ import hoặc prop nào chỉ dùng cho 2 phần trên

- [ ] **Step 9: Commit**

```bash
git add src/screen-home.jsx
git commit -m "feat: redesign home screen — month nav, pickleball grid, expense card, remove ai-no-ai"
```

---

## Task 4: Pickleball Screen — Session Management + Attendance

**Files:**
- Modify: `src/screen-pickleball.jsx`

**Context:** Đọc toàn bộ `src/screen-pickleball.jsx` trước khi sửa. Tìm phần nào là "Quản lý CLB" hoặc dành cho treasurer. Thêm 2 tính năng mới vào đó: (1) Tạo lịch tháng, (2) Điểm danh.

- [ ] **Step 1: Thêm UI tạo lịch tháng (chỉ treasurer)**

Thêm section vào tab quản lý của treasurer trong `screen-pickleball.jsx`:

```jsx
// State cho form tạo lịch
const [scheduleForm, setScheduleForm] = useState({
  open: false,
  startDate: '',
  weekdays: [1, 3, 5], // T2=1, T4=3, T6=5 (getDay() trả về 0=CN,1=T2...)
  month: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`,
});

// Tính preview danh sách ngày từ form
function generateSessionDates(startDate, weekdays, yearMonth) {
  if (!startDate) return [];
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(startDate + 'T00:00:00');
  const endOfMonth = new Date(year, month, 0);
  const dates = [];
  const cur = new Date(start);
  while (cur <= endOfMonth) {
    // 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
    if (weekdays.includes(cur.getDay())) {
      dates.push(cur.toISOString().split('T')[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Lưu sessions vào DB
async function saveSessionSchedule(dates, groupId) {
  const client = getSupabaseClient(token);
  const rows = dates.map(date => ({ group_id: groupId, date }));
  const { error } = await client
    .from('pickleball_sessions')
    .upsert(rows, { onConflict: 'group_id,date', ignoreDuplicates: true });
  if (error) throw error;

  // Auto-insert attendance rows cho tất cả members (default = present)
  const { data: members } = await client
    .from('members')
    .select('id')
    .eq('group_id', groupId);

  if (members && dates.length > 0) {
    const { data: sessions } = await client
      .from('pickleball_sessions')
      .select('id')
      .eq('group_id', groupId)
      .in('date', dates);

    const attRows = (sessions || []).flatMap(s =>
      members.map(m => ({
        session_id: s.id,
        member_id: m.id,
        status: 'present',
      }))
    );
    await client.from('pickleball_attendance')
      .upsert(attRows, { onConflict: 'session_id,member_id', ignoreDuplicates: true });
  }
}
```

Render form (chỉ khi `isTreasurer`):

```jsx
{isTreasurer && (
  <div style={{margin:'12px 0', padding:16, background:'#f8f8fd', borderRadius:16}}>
    <div style={{fontWeight:700, marginBottom:8}}>📅 Tạo lịch tháng</div>
    <div style={{display:'flex', gap:8, marginBottom:8}}>
      <div style={{flex:1}}>
        <div style={{fontSize:11, color:'#888', marginBottom:4}}>Tháng</div>
        <input type="month"
          value={scheduleForm.month}
          onChange={e => setScheduleForm(f => ({...f, month: e.target.value}))}
          style={{width:'100%', padding:'8px 10px', borderRadius:8,
                  border:'1px solid #ddd', fontSize:13}} />
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:11, color:'#888', marginBottom:4}}>Ngày bắt đầu</div>
        <input type="date"
          value={scheduleForm.startDate}
          onChange={e => setScheduleForm(f => ({...f, startDate: e.target.value}))}
          style={{width:'100%', padding:'8px 10px', borderRadius:8,
                  border:'1px solid #ddd', fontSize:13}} />
      </div>
    </div>
    <div style={{marginBottom:8}}>
      <div style={{fontSize:11, color:'#888', marginBottom:6}}>Các ngày trong tuần</div>
      <div style={{display:'flex', gap:6}}>
        {[{label:'T2',val:1},{label:'T3',val:2},{label:'T4',val:3},{label:'T5',val:4},{label:'T6',val:5},{label:'T7',val:6},{label:'CN',val:0}].map(d => (
          <button key={d.val}
            onClick={() => setScheduleForm(f => ({
              ...f,
              weekdays: f.weekdays.includes(d.val)
                ? f.weekdays.filter(w => w !== d.val)
                : [...f.weekdays, d.val]
            }))}
            style={{padding:'6px 10px', borderRadius:20, fontSize:12,
                    background: scheduleForm.weekdays.includes(d.val) ? '#5b4ede' : '#eee',
                    color: scheduleForm.weekdays.includes(d.val) ? '#fff' : '#444',
                    border:'none', cursor:'pointer'}}>
            {d.label}
          </button>
        ))}
      </div>
    </div>
    {scheduleForm.startDate && (
      <div style={{marginBottom:8, fontSize:12, color:'#555'}}>
        Preview: {generateSessionDates(scheduleForm.startDate, scheduleForm.weekdays, scheduleForm.month).length} buổi —{' '}
        {generateSessionDates(scheduleForm.startDate, scheduleForm.weekdays, scheduleForm.month).map(d => {
          const day = new Date(d+'T00:00:00').getDate();
          return day;
        }).join(', ')}
      </div>
    )}
    <button
      disabled={!scheduleForm.startDate || scheduleForm.weekdays.length === 0}
      onClick={async () => {
        const dates = generateSessionDates(scheduleForm.startDate, scheduleForm.weekdays, scheduleForm.month);
        try {
          await saveSessionSchedule(dates, currentGroupId);
          // reload sessions
          dispatch({type:'REFRESH'});
          setScheduleForm(f => ({...f, open: false, startDate: ''}));
        } catch(e) {
          alert('Lỗi tạo lịch: ' + e.message);
        }
      }}
      style={{width:'100%', padding:12, background:'#5b4ede', color:'#fff',
              border:'none', borderRadius:12, fontWeight:700, fontSize:13,
              cursor:'pointer', opacity: (!scheduleForm.startDate || scheduleForm.weekdays.length===0) ? .5 : 1}}>
      Tạo lịch
    </button>
  </div>
)}
```

- [ ] **Step 2: Thêm UI điểm danh từng buổi (chỉ treasurer)**

Trong danh sách sessions, mỗi session có nút "Điểm danh":

```jsx
async function markAttendance(sessionId, memberId, status) {
  const client = getSupabaseClient(token);
  const { error } = await client
    .from('pickleball_attendance')
    .upsert({
      session_id: sessionId,
      member_id: memberId,
      status,
      marked_by: currentUserId,
      marked_at: new Date().toISOString(),
    }, { onConflict: 'session_id,member_id' });
  if (error) throw error;
}
```

Trong render mỗi session (treasurer view):

```jsx
// Với mỗi session, hiện danh sách members với toggle Có mặt/Vắng
{isTreasurer && expandedSession === session.id && (
  <div style={{padding:'8px 0'}}>
    {groupMembers.map(member => {
      const att = sessionAttendance[session.id]?.[member.id] || 'present';
      return (
        <div key={member.id}
          style={{display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'6px 16px'}}>
          <div style={{fontSize:13}}>{member.name}</div>
          <div style={{display:'flex', gap:6}}>
            {['present','absent'].map(s => (
              <button key={s}
                onClick={() => markAttendance(session.id, member.id, s).then(() => {
                  setSessionAttendance(prev => ({
                    ...prev,
                    [session.id]: {...(prev[session.id]||{}), [member.id]: s}
                  }));
                })}
                style={{padding:'4px 12px', borderRadius:20, fontSize:11,
                        background: att === s
                          ? (s==='present' ? '#27ae60' : '#e74c3c')
                          : '#f0f0f0',
                        color: att === s ? '#fff' : '#666',
                        border:'none', cursor:'pointer', fontWeight:600}}>
                {s === 'present' ? 'Có mặt' : 'Vắng'}
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
)}
```

State cần thêm:
```jsx
const [expandedSession, setExpandedSession] = useState(null);
const [sessionAttendance, setSessionAttendance] = useState({});
```

Load attendance khi expand session:
```jsx
async function loadSessionAttendance(sessionId) {
  const client = getSupabaseClient(token);
  const { data } = await client
    .from('pickleball_attendance')
    .select('member_id, status')
    .eq('session_id', sessionId);
  const map = {};
  (data || []).forEach(a => { map[a.member_id] = a.status; });
  setSessionAttendance(prev => ({...prev, [sessionId]: map}));
  setExpandedSession(sessionId);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: pickleball treasurer tools — bulk session creation + attendance marking"
```

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Month navigation | Task 3 Step 1,4 |
| Net tổng tháng âm/dương | Task 3 Step 5 |
| Pickleball card với attendance grid | Task 3 Step 6 |
| Chi tiêu card với recent transactions | Task 3 Step 7 |
| Xóa group switcher + "Ai nợ ai" | Task 3 Step 8 |
| Click Pickleball → navigate to pickleball tab | Task 3 Step 6 |
| Click Chi tiêu → navigate to groups tab | Task 3 Step 7 |
| DB tables pickleball_sessions + attendance | Task 1 |
| Session generation T2/T4/T6 từ start date | Task 4 Step 1 |
| Treasurer điểm danh | Task 4 Step 2 |
| Màu ô: present/absent/upcoming | Task 3 Step 6 |
