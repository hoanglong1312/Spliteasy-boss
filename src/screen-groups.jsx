// Groups tab — list / detail / add expense / settle
// Several sub-screens, all driven by `push` from the nav stack.

// ── Groups list ─────────────────────────────────────────────────────────────
function ScreenGroups({ tweaks, push }) {
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => {
    if (filter === 'owe') return GROUPS.filter(g => groupNet(g) < 0);
    if (filter === 'owed') return GROUPS.filter(g => groupNet(g) > 0);
    if (filter === 'settled') return GROUPS.filter(g => groupNet(g) === 0);
    return GROUPS;
  }, [filter]);

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>Nhóm</div>
          <div style={{ fontFamily: 'var(--vb-font-body)', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{GROUPS.length} nhóm đang hoạt động</div>
        </div>
        <button onClick={() => push('new-group')} style={{
          appearance: 'none', height: 40, padding: '0 14px', cursor: 'pointer',
          background: 'var(--brand-1)', color: '#fff', border: 0, borderRadius: 12,
          fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}><Icon name="plus" size={18} color="#fff"/>Nhóm mới</button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'owed', label: 'Được nhận' },
          { id: 'owe', label: 'Phải trả' },
          { id: 'settled', label: 'Đã cân bằng' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            appearance: 'none', flexShrink: 0,
            height: 34, padding: '0 14px',
            background: filter === f.id ? 'var(--text-1)' : 'var(--surface-1)',
            color: filter === f.id ? 'var(--surface-1)' : 'var(--text-1)',
            border: '1px solid ' + (filter === f.id ? 'var(--text-1)' : 'var(--border-1)'),
            borderRadius: 'var(--vb-radius-pill)',
            fontFamily: 'var(--vb-font-body)', fontWeight: 600, fontSize: 13,
            cursor: 'pointer',
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(g => <GroupCard key={g.id} g={g} avatarStyle={tweaks.avatarStyle} onClick={() => push('group-detail', { groupId: g.id })}/>)}
      </div>
    </div>
  );
}

// ── Group detail — tabs: Hoạt động / Số dư / Thành viên ────────────────────
function ScreenGroupDetail({ params, tweaks, push, pop }) {
  const g = GROUPS.find(x => x.id === params.groupId);
  const [tab, setTab] = useState('activity');
  const balance = useMemo(() => groupBalance(g), [g]);
  const net = useMemo(() => groupNet(g), [g]);

  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader
        title={g.name}
        subtitle={`${g.members.length} thành viên`}
        onBack={pop}
        right={<button style={iconBtnStyle()}><Icon name="more" size={20} color="var(--text-1)"/></button>}
      />

      {/* Header summary */}
      <div style={{ padding: '16px 16px 20px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: hexA(g.color, 0.14),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>{g.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {net === 0 ? 'Bạn đã cân bằng' : net > 0 ? 'Bạn được nhận' : 'Bạn còn nợ'}
            </div>
            <Money value={Math.abs(net)} size={26} color={net === 0 ? 'var(--text-1)' : net > 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
              {g.expenses.length} giao dịch • {fmtVND(g.expenses.reduce((a,e)=>a+e.amount,0))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button variant="primary" full icon="plus" onClick={() => push('add-expense', { groupId: g.id })}>Thêm chi tiêu</Button>
          <Button variant="secondary" full icon="zap" onClick={() => push('settle-group', { groupId: g.id })}>Tất toán</Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 16px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border-1)', position: 'sticky', top: 56, zIndex: 4 }}>
        {[
          { id: 'activity', label: 'Hoạt động' },
          { id: 'balance', label: 'Số dư' },
          { id: 'members', label: 'Thành viên' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            appearance: 'none', flex: 1, height: 44, cursor: 'pointer',
            background: 'transparent', border: 0,
            position: 'relative',
            fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 14,
            color: tab === t.id ? 'var(--brand-1)' : 'var(--text-2)',
          }}>
            {t.label}
            {tab === t.id && <div style={{ position: 'absolute', bottom: -1, left: 16, right: 16, height: 2, background: 'var(--brand-1)', borderRadius: 2 }}/>}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'activity' && <GroupActivity g={g} push={push} avatarStyle={tweaks.avatarStyle}/>}
        {tab === 'balance' && <GroupBalance g={g} balance={balance} avatarStyle={tweaks.avatarStyle}/>}
        {tab === 'members' && <GroupMembers g={g} balance={balance} avatarStyle={tweaks.avatarStyle}/>}
      </div>
    </div>
  );
}

function GroupActivity({ g, push, avatarStyle }) {
  // Group expenses by date
  const byDate = {};
  for (const e of g.expenses) { (byDate[e.date] = byDate[e.date] || []).push(e); }
  const dates = Object.keys(byDate);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {dates.map(d => (
        <div key={d}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px 8px' }}>{d}/2026</div>
          <Card>
            {byDate[d].map((e, i) => (
              <div key={e.id} onClick={() => push('expense-detail', { groupId: g.id, expenseId: e.id })}>
                <ActivityRow e={e} divider={i < byDate[d].length - 1} avatarStyle={avatarStyle}/>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function GroupBalance({ g, balance, avatarStyle }) {
  // simplify debts: for each non-zero balance, show pairs
  const entries = Object.entries(balance).filter(([, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (entries.length === 0) {
    return <Card><EmptyState icon="check-circle" title="Nhóm này đã cân bằng" subtitle="Mọi người đã thanh toán đầy đủ"/></Card>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ padding: '14px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Cần thanh toán giữa thành viên
        </div>
        {entries.map(([id, v], i) => {
          const m = M[id]; const positive = v > 0;
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid var(--border-1)',
            }}>
              {positive ? <>
                <Avatar member={M[id]} size={32} style={avatarStyle}/>
                <Icon name="arrow-right" size={16} color="var(--text-2)"/>
                <Avatar member={M[ME]} size={32} style={avatarStyle}/>
              </> : <>
                <Avatar member={M[ME]} size={32} style={avatarStyle}/>
                <Icon name="arrow-right" size={16} color="var(--text-2)"/>
                <Avatar member={M[id]} size={32} style={avatarStyle}/>
              </>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                  {positive ? `${m.short} trả bạn` : `Bạn trả ${m.short}`}
                </div>
                <Money value={Math.abs(v)} size={13} color={positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
              </div>
              <button style={{
                appearance: 'none', cursor: 'pointer',
                height: 32, padding: '0 12px',
                background: positive ? 'var(--brand-soft)' : 'var(--brand-1)',
                color: positive ? 'var(--brand-1)' : '#fff',
                border: 0, borderRadius: 8, fontWeight: 700, fontSize: 12,
              }}>{positive ? 'Nhắc' : 'Trả'}</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function GroupMembers({ g, balance, avatarStyle }) {
  return (
    <Card>
      {g.members.map((id, i) => {
        const m = M[id]; const b = balance[id] || 0;
        return (
          <ListRow key={id}
            left={<Avatar member={m} size={40} style={avatarStyle}/>}
            title={m.isMe ? m.name + ' (bạn)' : m.name}
            subtitle={m.isMe ? 'Quản trị viên' : 'Thành viên'}
            right={m.isMe ? null : <Money value={b} size={13} color={b > 0 ? 'var(--vb-success-700)' : b < 0 ? 'var(--vb-danger-700)' : 'var(--text-2)'} compact/>}
            divider={i < g.members.length - 1}
          />
        );
      })}
    </Card>
  );
}

// ── Expense Detail ──────────────────────────────────────────────────────────
function ScreenExpenseDetail({ params, push, pop, tweaks }) {
  const g = GROUPS.find(x => x.id === params.groupId);
  const e = g.expenses.find(x => x.id === params.expenseId);
  const per = Math.round(e.amount / e.participants.length);
  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader title="Chi tiết" subtitle={g.name} onBack={pop}
        right={<button style={iconBtnStyle()}><Icon name="edit" size={18} color="var(--text-1)"/></button>}
      />
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ margin: '8px auto 12px' }}>
          <CategoryIcon cat={e.cat} size={64}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{e.title}</div>
        <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 36, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', marginTop: 4 }}>
          {fmtVNDFull(e.amount)}
        </div>
        <div style={{ marginTop: 6, display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
          <Avatar member={M[e.paidBy]} size={20} style={tweaks.avatarStyle}/>
          <span><b style={{ color: 'var(--text-1)' }}>{M[e.paidBy].name}</b> đã trả • {e.date}/2026</span>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
            Chia đều cho {e.participants.length} người
          </div>
          {e.participants.map((id, i) => (
            <ListRow key={id}
              left={<Avatar member={M[id]} size={36} style={tweaks.avatarStyle}/>}
              title={M[id].name}
              subtitle={id === e.paidBy ? 'Người trả' : 'Chia phần'}
              right={<Money value={per} size={14} color={id === e.paidBy ? 'var(--vb-success-700)' : 'var(--text-1)'}/>}
              divider={i < e.participants.length - 1}
            />
          ))}
        </Card>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" full icon="send">Nhắc qua Zalo</Button>
          <Button variant="danger" full icon="trash">Xoá</Button>
        </div>
      </div>
    </div>
  );
}

// ── Add expense — 2 variants: single screen vs wizard ───────────────────────
function ScreenAddExpense({ params, push, pop, tweaks }) {
  const [g, setG] = useState(params?.groupId ? GROUPS.find(x=>x.id===params.groupId) : GROUPS[0]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(ME);
  const [participants, setParticipants] = useState(g.members);
  const [splitMode, setSplitMode] = useState('equal');
  const [step, setStep] = useState(0);
  const useWizard = (tweaks.addExpenseFlow || 'single') === 'wizard';

  const toggleP = (id) => setParticipants(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const num = Number((amount || '0').replace(/[^0-9]/g, ''));
  const per = participants.length > 0 ? Math.round(num / participants.length) : 0;

  const Header = () => (
    <NavHeader title={useWizard ? `Bước ${step+1}/3` : 'Thêm chi tiêu'} onBack={() => useWizard && step > 0 ? setStep(step-1) : pop()}
      right={<button onClick={() => { pop(); }} style={{
        appearance: 'none', height: 32, padding: '0 12px', cursor: 'pointer',
        background: num > 0 && title ? 'var(--brand-1)' : 'var(--surface-2)',
        color: num > 0 && title ? '#fff' : 'var(--text-3)',
        border: 0, borderRadius: 8, fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13,
      }}>Lưu</button>}/>
  );

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header/>
      {useWizard && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= step ? 'var(--brand-1)' : 'var(--surface-2)',
                transition: 'background .3s ease',
              }}/>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(!useWizard || step === 0) && <>
          {/* Step 1: Basics — amount + title + group */}
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>Số tiền</div>
            <input
              type="text" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              style={{
                appearance: 'none', width: '100%', textAlign: 'center', border: 0,
                background: 'transparent', outline: 'none',
                fontFamily: 'var(--vb-font-num)', fontSize: 44, fontWeight: 700, color: 'var(--text-1)',
                letterSpacing: '-0.02em',
              }}
            />
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{num > 0 ? fmtVNDFull(num) : 'VND'}</div>
          </div>

          <FormRow label="Mô tả" icon="tag">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Cơm trưa văn phòng"
              style={inputStyle()}/>
          </FormRow>

          <FormRow label="Nhóm" icon="users">
            <select value={g.id} onChange={(e) => { const ng = GROUPS.find(x=>x.id===e.target.value); setG(ng); setParticipants(ng.members); }} style={inputStyle()}>
              {GROUPS.map(gr => <option key={gr.id} value={gr.id}>{gr.emoji} {gr.name}</option>)}
            </select>
          </FormRow>

          <FormRow label="Phân loại" icon="filter">
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {[
                { id: 'food', label: 'Ăn uống' },
                { id: 'drink', label: 'Đồ uống' },
                { id: 'travel', label: 'Đi lại' },
                { id: 'gift', label: 'Quà tặng' },
              ].map(c => (
                <button key={c.id} style={{
                  appearance: 'none', cursor: 'pointer', flexShrink: 0,
                  height: 36, padding: '0 12px',
                  background: 'var(--surface-1)', border: '1px solid var(--border-1)',
                  borderRadius: 'var(--vb-radius-pill)', fontWeight: 600, fontSize: 13, color: 'var(--text-1)',
                  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}><CategoryIcon cat={c.id} size={20}/>{c.label}</button>
              ))}
            </div>
          </FormRow>
        </>}

        {(!useWizard || step === 1) && <>
          <FormRow label="Ai đã trả?" icon="wallet">
            <Card>
              {g.members.map((id, i) => (
                <ListRow key={id}
                  left={<Avatar member={M[id]} size={36} style={tweaks.avatarStyle}/>}
                  title={M[id].name}
                  right={<RadioMark on={paidBy === id}/>}
                  onClick={() => setPaidBy(id)}
                  divider={i < g.members.length - 1}
                />
              ))}
            </Card>
          </FormRow>
        </>}

        {(!useWizard || step === 2) && <>
          <FormRow label="Chia cho ai?" icon="split">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { id: 'equal', label: 'Chia đều', icon: 'split' },
                { id: 'parts', label: 'Theo phần', icon: 'fraction' },
                { id: 'percent', label: '%', icon: 'percent' },
              ].map(m => (
                <button key={m.id} onClick={() => setSplitMode(m.id)} style={{
                  appearance: 'none', flex: 1, height: 36, cursor: 'pointer',
                  background: splitMode === m.id ? 'var(--brand-soft)' : 'var(--surface-1)',
                  border: '1px solid ' + (splitMode === m.id ? 'var(--brand-1)' : 'var(--border-1)'),
                  borderRadius: 8, fontWeight: 700, fontSize: 12,
                  color: splitMode === m.id ? 'var(--brand-1)' : 'var(--text-1)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}><Icon name={m.icon} size={14} color={splitMode === m.id ? 'var(--brand-1)' : 'var(--text-1)'}/>{m.label}</button>
              ))}
            </div>
            <Card>
              {g.members.map((id, i) => {
                const on = participants.includes(id);
                return (
                  <div key={id} onClick={() => toggleP(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '12px 16px', borderBottom: i < g.members.length - 1 ? '1px solid var(--border-1)' : 'none',
                  }}>
                    <Avatar member={M[id]} size={36} style={tweaks.avatarStyle}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{M[id].name}</div>
                      {on && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{fmtVNDFull(per)}</div>}
                    </div>
                    <CheckMark on={on}/>
                  </div>
                );
              })}
            </Card>
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--brand-soft)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-1)' }}>Mỗi người trả</span>
              <Money value={per} size={16} color="var(--brand-1)"/>
            </div>
          </FormRow>
        </>}

        {useWizard && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {step > 0 && <Button variant="secondary" full onClick={() => setStep(step-1)}>Quay lại</Button>}
            {step < 2 && <Button variant="primary" full onClick={() => setStep(step+1)} iconRight="arrow-right">Tiếp tục</Button>}
            {step === 2 && <Button variant="primary" full onClick={pop} icon="check">Lưu chi tiêu</Button>}
          </div>
        )}
        {!useWizard && (
          <Button variant="primary" full size="lg" icon="check" onClick={pop}>Lưu chi tiêu</Button>
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

function RadioMark({ on }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: '1.5px solid ' + (on ? 'var(--brand-1)' : 'var(--border-strong)'),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface-1)',
    }}>
      {on && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-1)' }}/>}
    </div>
  );
}

function CheckMark({ on }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6,
      border: '1.5px solid ' + (on ? 'var(--brand-1)' : 'var(--border-strong)'),
      background: on ? 'var(--brand-1)' : 'transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {on && <Icon name="check" size={14} color="#fff" stroke={3}/>}
    </div>
  );
}

// ── Settle screens ──────────────────────────────────────────────────────────
function ScreenSettleAll({ pop, tweaks }) {
  const totals = useMemo(() => totalBalances(), []);
  const owed = Object.entries(totals).filter(([,v]) => v > 0);
  const owe  = Object.entries(totals).filter(([,v]) => v < 0);

  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader title="Tất toán" subtitle="Tổng kết tất cả các nhóm" onBack={pop}/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {owed.length > 0 && (
          <div>
            <SectionHeader title="Mọi người cần trả bạn"/>
            <Card>
              {owed.map(([id, v], i) => (
                <ListRow key={id}
                  left={<Avatar member={M[id]} size={40} style={tweaks.avatarStyle}/>}
                  title={M[id].name}
                  subtitle="Nhắc trả qua Zalo"
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Money value={v} size={14} color="var(--vb-success-700)"/>
                      <button style={{ appearance: 'none', cursor: 'pointer', height: 28, padding: '0 10px', background: 'var(--brand-soft)', color: 'var(--brand-1)', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 11 }}>Nhắc</button>
                    </div>
                  }
                  divider={i < owed.length - 1}
                />
              ))}
            </Card>
          </div>
        )}

        {owe.length > 0 && (
          <div>
            <SectionHeader title="Bạn cần trả"/>
            <Card>
              {owe.map(([id, v], i) => (
                <ListRow key={id}
                  left={<Avatar member={M[id]} size={40} style={tweaks.avatarStyle}/>}
                  title={M[id].name}
                  subtitle="Quét QR để thanh toán"
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Money value={Math.abs(v)} size={14} color="var(--vb-danger-700)"/>
                      <button style={{ appearance: 'none', cursor: 'pointer', height: 28, padding: '0 10px', background: 'var(--brand-1)', color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 11 }}>Trả</button>
                    </div>
                  }
                  divider={i < owe.length - 1}
                />
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenNewGroup({ pop }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [selected, setSelected] = useState([ME]);
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Tạo nhóm mới" onBack={pop} right={<button onClick={pop} style={{
        appearance: 'none', height: 32, padding: '0 12px', cursor: 'pointer',
        background: name && selected.length > 1 ? 'var(--brand-1)' : 'var(--surface-2)',
        color: name && selected.length > 1 ? '#fff' : 'var(--text-3)',
        border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
      }}>Tạo</button>}/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto', borderRadius: 24,
            background: 'var(--brand-soft)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 42,
          }}>{emoji}</div>
          <div style={{ marginTop: 12, display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['🎯','🍜','🏔️','🎂','🏖️','🍻','🎬','🛍️'].map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{
                appearance: 'none', cursor: 'pointer',
                width: 36, height: 36, borderRadius: 10,
                background: emoji === e ? 'var(--brand-soft)' : 'var(--surface-2)',
                border: '1px solid ' + (emoji === e ? 'var(--brand-1)' : 'transparent'),
                fontSize: 20,
              }}>{e}</button>
            ))}
          </div>
        </div>
        <FormRow label="Tên nhóm" icon="tag">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="VD: Ăn trưa team Eng" style={inputStyle()}/>
        </FormRow>
        <FormRow label={`Thành viên (${selected.length})`} icon="users">
          <Card>
            {MEMBERS.map((m, i) => (
              <div key={m.id} onClick={() => !m.isMe && toggle(m.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: m.isMe ? 'default' : 'pointer',
                padding: '12px 16px', borderBottom: i < MEMBERS.length - 1 ? '1px solid var(--border-1)' : 'none',
                opacity: m.isMe ? 0.7 : 1,
              }}>
                <Avatar member={m} size={36}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{m.name}</div>
                </div>
                {m.isMe ? <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>Bạn</span> : <CheckMark on={selected.includes(m.id)}/>}
              </div>
            ))}
          </Card>
        </FormRow>
      </div>
    </div>
  );
}

function ScreenNotifications({ pop, tweaks }) {
  const items = [
    { id: 'n1', who: 'u3', text: 'đã ghi 285.000₫ trà sữa', group: 'Ăn trưa team Eng', when: '2 giờ trước', kind: 'add' },
    { id: 'n2', who: 'u9', text: 'đã thanh toán 1.800.000₫ cho bạn', group: 'Du lịch Đà Lạt', when: '4 giờ trước', kind: 'pay' },
    { id: 'n3', who: 'u4', text: 'đã nhắc bạn trả 360.000₫', group: 'Ăn trưa team Eng', when: 'hôm qua', kind: 'remind' },
    { id: 'n4', who: 'u2', text: 'đã thêm bạn vào nhóm', group: 'Team building Vũng Tàu', when: '2 ngày trước', kind: 'invite' },
  ];
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Thông báo" onBack={pop}/>
      <div style={{ padding: 16 }}>
        <Card>
          {items.map((n, i) => (
            <ListRow key={n.id}
              left={<Avatar member={M[n.who]} size={40} style={tweaks.avatarStyle}/>}
              title={<><b>{M[n.who].name}</b> {n.text}</>}
              subtitle={`${n.group} • ${n.when}`}
              divider={i < items.length - 1}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenGroups, ScreenGroupDetail, ScreenExpenseDetail,
  ScreenAddExpense, ScreenSettleAll, ScreenNewGroup, ScreenNotifications,
});
