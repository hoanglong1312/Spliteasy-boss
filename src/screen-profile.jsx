// Profile / Cá nhân tab — personal stats + settings

function ScreenProfile({ tweaks, push, setTweak }) {
  const { state, dispatch } = useApp();
  const meId = state.currentUserId || ME;
  const me = state.members.find(m => m.id === meId) || M[ME];
  const totals = useMemo(() => totalBalances(state.groups, meId), [state.groups, meId]);
  const owed = Object.values(totals).filter(v => v > 0).reduce((a,b)=>a+b, 0);
  const owe = Math.abs(Object.values(totals).filter(v => v < 0).reduce((a,b)=>a+b, 0));

  // total spent across all groups, paid by me, plus my share where I didn't pay
  const stats = useMemo(() => {
    let paid = 0; let share = 0; let count = 0;
    for (const g of state.groups) {
      for (const e of g.expenses) {
        const per = Math.round(e.amount / e.participants.length);
        if (e.paidBy === meId) paid += e.amount;
        if (e.participants.includes(meId)) { share += per; count++; }
      }
    }
    return { paid, share, count };
  }, [state.groups, meId]);

  const categorySpend = useMemo(() => {
    const acc = {};
    for (const g of state.groups) {
      for (const e of g.expenses) {
        if (!e.participants.includes(meId)) continue;
        const per = Math.round(e.amount / e.participants.length);
        acc[e.cat] = (acc[e.cat] || 0) + per;
      }
    }
    return Object.entries(acc).sort((a,b)=>b[1]-a[1]);
  }, [state.groups, meId]);
  const maxCat = categorySpend.length > 0 ? categorySpend[0][1] : 1;
  const catLabels = { food: 'Ăn uống', drink: 'Đồ uống', travel: 'Đi lại', gift: 'Quà tặng' };

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Profile header */}
      <div style={{
        padding: '24px 20px 20px',
        background: 'linear-gradient(180deg, var(--brand-soft) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar member={me} size={64} style={tweaks.avatarStyle}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{me.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, marginTop: 2 }}>{me.short?.toLowerCase()}@spliteasy.vn</div>
            <div style={{ marginTop: 6 }}><Pill bg="var(--brand-soft)" color="var(--brand-1)" size="xs">Thành viên • 3 tháng</Pill></div>
          </div>
          <button onClick={() => push('settings')} style={iconBtnStyle()}><Icon name="settings" size={20} color="var(--text-1)"/></button>
        </div>
        <button onClick={() => dispatch({ type: 'SET_CURRENT_USER', userId: null })} style={{
          appearance: 'none', cursor: 'pointer', background: 'transparent', border: 0,
          color: 'var(--text-2)', fontSize: 12, fontWeight: 600, padding: '4px 0',
        }}>Đổi người dùng</button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard
            icon="arrow-down" iconColor="var(--vb-success-700)" iconBg="var(--vb-success-100)"
            label="Được nhận" value={owed}
          />
          <StatCard
            icon="arrow-up" iconColor="var(--vb-danger-700)" iconBg="var(--vb-danger-50)"
            label="Còn nợ" value={owe}
          />
          <StatCard
            icon="wallet" iconColor="var(--brand-1)" iconBg="var(--brand-soft)"
            label={`Đã chi (${stats.count} lần)`} value={stats.share}
          />
          <StatCard
            icon="card" iconColor="#A05C0C" iconBg="var(--vb-warn-100)"
            label="Đã trả thay" value={stats.paid}
          />
        </div>

        {/* Category breakdown */}
        <div>
          <SectionHeader title="Chi tiêu theo loại" action="Tháng 5" onAction={() => {}}/>
          <Card>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {categorySpend.map(([cat, v]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CategoryIcon cat={cat} size={32}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{catLabels[cat] || cat}</span>
                      <Money value={v} size={13} compact/>
                    </div>
                    <div style={{ marginTop: 6, height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(v / maxCat) * 100}%`,
                        background: 'var(--brand-1)',
                        borderRadius: 999,
                        transition: 'width .6s cubic-bezier(.2,.7,.2,1)',
                      }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top people */}
        <div>
          <SectionHeader title="Hay chia tiền cùng"/>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 4px 8px', marginLeft: -4, marginRight: -4 }}>
            {state.members.filter(m => m.id !== meId).slice(0, 6).map(m => {
              const count = state.groups.reduce((acc, g) => acc + g.expenses.filter(e => e.participants.includes(m.id) && e.participants.includes(meId)).length, 0);
              return (
                <div key={m.id} style={{
                  flexShrink: 0, width: 110, padding: '14px 10px',
                  background: 'var(--surface-1)', border: '1px solid var(--border-1)',
                  borderRadius: 14, textAlign: 'center',
                }}>
                  <Avatar member={m} size={48} style={tweaks.avatarStyle}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginTop: 8 }}>{m.short}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 600 }}>{count} giao dịch</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu */}
        <div>
          <SectionHeader title="Tài khoản"/>
          <Card>
            <ListRow left={<MenuIcon name="wallet" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Phương thức thanh toán" subtitle="Momo, ZaloPay, ngân hàng" right={<Pill bg="var(--brand-soft)" color="var(--brand-1)" size="xs">Sắp ra mắt</Pill>} onClick={() => alert('Tính năng này sắp ra mắt!')}/>
            <ListRow left={<MenuIcon name="bell" bg="#FFF7E0" c="#A05C0C"/>} title="Thông báo" subtitle="Cài đặt nhắc nợ qua Zalo" right={<Pill bg="var(--brand-soft)" color="var(--brand-1)" size="xs">Sắp ra mắt</Pill>} onClick={() => alert('Tính năng này sắp ra mắt!')}/>
            <ListRow left={<MenuIcon name="users" bg="var(--vb-success-100)" c="var(--vb-success-700)"/>} title="Lời mời" subtitle="0 lời mời đang chờ" right={<Pill bg="var(--brand-soft)" color="var(--brand-1)" size="xs">Sắp ra mắt</Pill>} onClick={() => alert('Tính năng này sắp ra mắt!')}/>
            <ListRow left={<MenuIcon name="settings" bg="var(--surface-2)" c="var(--text-1)"/>} title="Cài đặt chung" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>} onClick={() => push('settings')} divider={false}/>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MenuIcon({ name, bg, c }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={name} size={18} color={c}/>
    </div>
  );
}

function StatCard({ icon, iconColor, iconBg, label, value }) {
  return (
    <div style={{
      padding: 14, background: 'var(--surface-1)', border: '1px solid var(--border-1)',
      borderRadius: 14, boxShadow: 'var(--vb-shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={14} color={iconColor}/>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <Money value={value} size={17} style={{ marginTop: 8 }}/>
    </div>
  );
}

function ScreenSettings({ pop }) {
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Cài đặt" onBack={pop}/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <ListRow left={<MenuIcon name="user" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Thông tin cá nhân" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>}/>
          <ListRow left={<MenuIcon name="card" bg="var(--vb-success-100)" c="var(--vb-success-700)"/>} title="Tiền tệ" subtitle="VND" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>}/>
          <ListRow left={<MenuIcon name="bell" bg="#FFF7E0" c="#A05C0C"/>} title="Nhắc qua Zalo" subtitle="Đang bật" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>} divider={false}/>
        </Card>
        <Card>
          <ListRow left={<MenuIcon name="sparkle" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Phiên bản" subtitle="Spliteasy 1.0.0 (build 2026.05)" divider={false}/>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenProfile, ScreenSettings });
