// Home tab — dashboard with balance summary, recent activity, group cards
// Has 3 layout variations exposed via Tweaks: 'overview' | 'feed' | 'compact'

function ScreenHome({ tweaks, push, pushToTab, switchTab }) {
  const { state } = useApp();
  const { groups, members, currentUserId } = state;
  const meId = currentUserId || ME;
  const meMember = members.find(m => m.id === meId) || M[ME];

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const totals = useMemo(() => totalBalances(groups, meId), [groups, meId]);
  const youAreOwed = Object.values(totals).filter(v => v > 0).reduce((a,b) => a+b, 0);
  const youOwe = Object.values(totals).filter(v => v < 0).reduce((a,b) => a+b, 0);
  const net = youAreOwed + youOwe;
  const layout = tweaks.homeLayout || 'overview';

  const activity = useMemo(() => recentActivity(groups, 20), [groups]);

  const filteredGroups = searchQuery.trim()
    ? groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.expenses || []).some(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : groups;

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Top greeting */}
      <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--vb-font-meta)', fontWeight: 500, fontSize: 13, color: 'var(--text-2)' }}>Xin chào,</div>
          <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{meMember.name} 👋</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {searchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhóm, chi tiêu..."
                style={{
                  appearance: 'none', height: 40, padding: '0 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border-1)',
                  borderRadius: 12, fontFamily: 'var(--vb-font-body)', fontSize: 14,
                  color: 'var(--text-1)', outline: 'none', width: 180,
                }}
              />
              <button style={iconBtnStyle()} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                <Icon name="x" size={18} color="var(--text-1)"/>
              </button>
            </div>
          ) : (
            <button style={iconBtnStyle()} onClick={() => setSearchOpen(true)}>
              <Icon name="search" size={20} color="var(--text-1)"/>
            </button>
          )}
          <button style={iconBtnStyle()} onClick={() => push('notifications')}>
            <Icon name="bell" size={20} color="var(--text-1)"/>
          </button>
        </div>
      </div>

      {/* Balance hero */}
      <div style={{ padding: '0 20px 20px' }}>
        <BalanceHero net={net} youAreOwed={youAreOwed} youOwe={youOwe} push={push}/>
      </div>

      {layout === 'overview' && <OverviewLayout push={push} pushToTab={pushToTab} switchTab={switchTab} tweaks={tweaks} activity={activity} groups={filteredGroups}/>}
      {layout === 'feed' && <FeedLayout push={push} pushToTab={pushToTab} switchTab={switchTab} tweaks={tweaks} activity={activity} groups={filteredGroups}/>}
      {layout === 'compact' && <CompactLayout push={push} pushToTab={pushToTab} switchTab={switchTab} tweaks={tweaks} activity={activity} groups={filteredGroups}/>}
    </div>
  );
}

function iconBtnStyle() {
  return {
    appearance: 'none', position: 'relative',
    width: 40, height: 40, borderRadius: 12,
    border: '1px solid var(--border-1)', background: 'var(--surface-1)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  };
}

// ── Balance Hero (the big summary card at top) ──────────────────────────────
function BalanceHero({ net, youAreOwed, youOwe, push }) {
  const positive = net >= 0;
  return (
    <div style={{
      borderRadius: 'var(--vb-radius-2xl)',
      background: 'linear-gradient(135deg, var(--brand-1) 0%, var(--brand-2) 100%)',
      color: '#fff',
      padding: '20px 20px 16px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 24px -8px var(--brand-shadow)',
    }}>
      {/* decorative orb */}
      <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
      <div style={{ position: 'absolute', bottom: -50, right: 40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--vb-font-body)', fontSize: 12, fontWeight: 600, opacity: 0.8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {positive ? 'Tổng cộng bạn được nhận' : 'Tổng cộng bạn còn nợ'}
        </div>
        <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>
          {fmtVNDFull(Math.abs(net))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <SubBalance label="Được nhận" amount={youAreOwed} positive/>
          <SubBalance label="Phải trả" amount={Math.abs(youOwe)}/>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => push('add-expense')} style={{
            appearance: 'none', flex: 1, height: 44, borderRadius: 12,
            background: '#fff', color: 'var(--brand-1)', border: 0,
            fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
          }}>
            <Icon name="plus" size={18} color="var(--brand-1)"/> Thêm chi tiêu
          </button>
          <button onClick={() => push('settle-all')} style={{
            appearance: 'none', flex: 1, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
          }}>
            <Icon name="zap" size={18} color="#fff"/> Tất toán
          </button>
        </div>
      </div>
    </div>
  );
}

function SubBalance({ label, amount, positive = false }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px',
      background: 'rgba(255,255,255,0.14)', borderRadius: 14,
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.16)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
        <Icon name={positive ? 'arrow-down' : 'arrow-up'} size={12} color="#fff"/>{label}
      </div>
      <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 17, fontWeight: 700, marginTop: 2 }}>{fmtVNDFull(amount)}</div>
    </div>
  );
}

// ── OVERVIEW layout (default) — groups + ai nợ ai + recent ──────────────────
function OverviewLayout({ push, pushToTab, switchTab, tweaks, activity, groups }) {
  const { state: _s } = useApp();
  const meId = (_s.currentUserId || ME);
  const balances = useMemo(() => totalBalances(groups, meId), [groups, meId]);
  const ranked = Object.entries(balances).filter(([id, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Quick chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 4px', marginLeft: -4, marginRight: -4 }}>
        {[
          { label: 'Chia đều', icon: 'split' },
          { label: 'Thanh toán', icon: 'card' },
          { label: 'Nhắc nợ', icon: 'send' },
          { label: 'Pickleball', icon: 'pickle', onClick: () => switchTab('pickle') },
          { label: 'Thống kê', icon: 'sparkle', onClick: () => switchTab('me') },
        ].map((q, i) => (
          <button key={i} onClick={q.onClick} style={{
            appearance: 'none', flexShrink: 0,
            padding: '10px 14px', height: 40,
            background: 'var(--surface-1)', border: '1px solid var(--border-1)',
            borderRadius: 'var(--vb-radius-pill)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--vb-font-body)', fontWeight: 600, fontSize: 13, color: 'var(--text-1)',
            cursor: 'pointer',
          }}>
            <Icon name={q.icon} size={16} color="var(--brand-1)"/>{q.label}
          </button>
        ))}
      </div>

      {/* Ai nợ ai */}
      <div>
        <SectionHeader title="Ai nợ ai" action="Tất toán →" onAction={() => push('settle-all')}/>
        <WhoOwesView ranked={ranked} variant={tweaks.balanceView || 'cards'} avatarStyle={tweaks.avatarStyle} push={push}/>
      </div>

      {/* Groups */}
      <div>
        <SectionHeader title="Nhóm của bạn" action="Xem tất cả →" onAction={() => switchTab('groups')}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.slice(0, 3).map(g => <GroupCard key={g.id} g={g} onClick={() => pushToTab('groups', 'group-detail', { groupId: g.id })} avatarStyle={tweaks.avatarStyle}/>)}
        </div>
      </div>

      {/* Recent */}
      <div>
        <SectionHeader title="Hoạt động gần đây"/>
        <Card>
          {activity.slice(0, 5).map((e, i) => (
            <ActivityRow key={e.id} e={e} divider={i < 4} avatarStyle={tweaks.avatarStyle}/>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── FEED layout — emphasize activity ──────────────────────────────────────
function FeedLayout({ push, pushToTab, switchTab, tweaks, activity, groups }) {
  const { state: _s } = useApp();
  const meId = _s.currentUserId || ME;
  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Active groups strip */}
      <div>
        <SectionHeader title="Nhóm" action="Xem tất cả →" onAction={() => switchTab('groups')}/>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4 }}>
          {groups.map(g => (
            <button key={g.id} onClick={() => pushToTab('groups', 'group-detail', { groupId: g.id })} style={{
              appearance: 'none', cursor: 'pointer', flexShrink: 0, textAlign: 'left',
              width: 152, padding: 12, background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 14,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: hexA(g.color, 0.12), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{g.emoji}</div>
              <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 600 }}>{g.members.length} thành viên</div>
              <div style={{ marginTop: 8 }}>
                <Money value={groupNet(g, meId)} size={14} color={groupNet(g, meId) >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} compact/>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div>
        <SectionHeader title="Hoạt động gần đây" action="Lọc" onAction={() => {}}/>
        <Card>
          {activity.map((e, i) => (
            <ActivityRow key={e.id} e={e} divider={i < activity.length - 1} avatarStyle={tweaks.avatarStyle} showGroup/>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── COMPACT layout — minimal, list-driven ──────────────────────────────────
function CompactLayout({ push, pushToTab, switchTab, tweaks, activity, groups }) {
  const { state: _s } = useApp();
  const meId = (_s.currentUserId || ME);
  const balances = useMemo(() => totalBalances(groups, meId), [groups, meId]);
  const ranked = Object.entries(balances).filter(([id, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <ListRow
          left={<div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--vb-success-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-down" size={18} color="var(--vb-success-700)"/></div>}
          title="Bạn cho mượn"
          subtitle={`${ranked.filter(([,v])=>v>0).length} người`}
          right={<Money value={Object.values(balances).filter(v=>v>0).reduce((a,b)=>a+b,0)} size={16} color="var(--vb-success-700)"/>}
          onClick={() => push('settle-all')}
        />
        <ListRow
          left={<div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--vb-danger-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-up" size={18} color="var(--vb-danger-700)"/></div>}
          title="Bạn nợ"
          subtitle={`${ranked.filter(([,v])=>v<0).length} người`}
          right={<Money value={Math.abs(Object.values(balances).filter(v=>v<0).reduce((a,b)=>a+b,0))} size={16} color="var(--vb-danger-700)"/>}
          onClick={() => push('settle-all')}
          divider={false}
        />
      </Card>

      <div>
        <SectionHeader title="Nhóm" action="Xem tất cả →" onAction={() => switchTab('groups')}/>
        <Card>
          {groups.map((g, i) => (
            <ListRow
              key={g.id}
              left={<div style={{ width: 36, height: 36, borderRadius: 10, background: hexA(g.color, 0.12), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{g.emoji}</div>}
              title={g.name}
              subtitle={`${g.members.length} thành viên • ${g.expenses.length} giao dịch`}
              right={<Money value={groupNet(g, meId)} size={14} color={groupNet(g, meId) >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} compact/>}
              onClick={() => pushToTab('groups', 'group-detail', { groupId: g.id })}
              divider={i < groups.length - 1}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── Who owes who — 3 visual variants ────────────────────────────────────────
function WhoOwesView({ ranked, variant, avatarStyle, push }) {
  if (ranked.length === 0) {
    return <Card><EmptyState icon="check-circle" title="Mọi người đã thanh toán hết!" subtitle="Không có khoản nào chưa quyết toán"/></Card>;
  }

  if (variant === 'list') {
    return (
      <Card>
        {ranked.map(([id, v], i) => {
          const m = M[id]; const positive = v > 0;
          return (
            <ListRow key={id}
              left={<Avatar member={m} size={40} style={avatarStyle}/>}
              title={positive ? `${m.name} nợ bạn` : `Bạn nợ ${m.name}`}
              subtitle={positive ? 'Tổng từ các nhóm' : 'Tổng từ các nhóm'}
              right={<Money value={Math.abs(v)} size={15} color={positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>}
              divider={i < ranked.length - 1}
            />
          );
        })}
      </Card>
    );
  }

  if (variant === 'graph') {
    const max = Math.max(...ranked.map(([,v]) => Math.abs(v)));
    return (
      <Card>
        <div style={{ padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ranked.map(([id, v]) => {
            const m = M[id]; const positive = v > 0;
            const pct = (Math.abs(v) / max) * 100;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar member={m} size={32} style={avatarStyle}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{m.short}</span>
                    <Money value={v} size={13} color={positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} compact/>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: positive ? 'var(--vb-success-500)' : 'var(--vb-danger-600)',
                      borderRadius: 999, transition: 'width .6s cubic-bezier(.2,.7,.2,1)',
                    }}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // cards (default): horizontal scroll cards
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginLeft: -16, marginRight: -16, padding: '4px 16px 8px' }}>
      {ranked.map(([id, v]) => {
        const m = M[id]; const positive = v > 0;
        return (
          <div key={id} style={{
            flexShrink: 0, width: 168, padding: 14,
            background: 'var(--surface-1)', border: '1px solid var(--border-1)',
            borderRadius: 14, boxShadow: 'var(--vb-shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Avatar member={m} size={36} style={avatarStyle}/>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{m.short}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{positive ? 'Nợ bạn' : 'Bạn nợ'}</div>
              </div>
            </div>
            <Money value={Math.abs(v)} size={18} color={positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
            <button style={{
              appearance: 'none', cursor: 'pointer', marginTop: 10, width: '100%', height: 32,
              background: positive ? 'var(--vb-success-100)' : 'var(--vb-danger-50)',
              color: positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 12,
            }}>{positive ? 'Nhắc trả' : 'Thanh toán'}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Group Card ──────────────────────────────────────────────────────────────
function GroupCard({ g, onClick, avatarStyle }) {
  const { state: _s } = useApp();
  const meId = _s.currentUserId || ME;
  const net = groupNet(g, meId);
  return (
    <Card interactive onClick={onClick}>
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: hexA(g.color, 0.12),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{g.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
          <div style={{ marginTop: 6 }}>
            <AvatarStack ids={g.members} size={22} overlap={7} avatarStyle={avatarStyle} max={5}/>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>{net === 0 ? 'Cân bằng' : net > 0 ? 'Nhận lại' : 'Còn nợ'}</div>
          <Money value={Math.abs(net)} size={15} color={net >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} compact/>
        </div>
      </div>
    </Card>
  );
}

// ── Activity row ────────────────────────────────────────────────────────────
function ActivityRow({ e, divider, avatarStyle, showGroup }) {
  const { state: _s } = useApp();
  const me = _s.currentUserId || ME;
  const myShare = e.participants.includes(me) ? Math.round(e.amount / e.participants.length) : 0;
  const balance = e.paidBy === me ? e.amount - myShare : -myShare;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      borderBottom: divider ? '1px solid var(--border-1)' : 'none',
    }}>
      <CategoryIcon cat={e.cat} size={40}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {showGroup ? <>{e.groupEmoji} {e.groupName} • </> : null}
          {M[e.paidBy].short === 'Bạn' ? 'Bạn trả' : `${M[e.paidBy].short} trả`} {fmtVND(e.amount)} • {e.date}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {balance > 0 ? 'Bạn cho mượn' : balance < 0 ? 'Bạn nợ' : '—'}
        </div>
        <Money value={Math.abs(balance)} size={13} color={balance > 0 ? 'var(--vb-success-700)' : balance < 0 ? 'var(--vb-danger-700)' : 'var(--text-2)'} compact/>
      </div>
    </div>
  );
}

// utility: hex + alpha
function hexA(hex, a) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

Object.assign(window, { ScreenHome, BalanceHero, WhoOwesView, GroupCard, ActivityRow, hexA });
