import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useApp } from './store.jsx'
import { ME, getMemberMap, fmtVND, fmtVNDFull, fmtDate, groupBalance, groupNet, splitEqual, totalBalances, pickleSummary } from './data.jsx'
import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, NavHeader, ListRow, EmptyState, HScroll, SectionHeader, CategoryIcon, StatusBadge, DisputePopup, SwipeCard } from './components.jsx'

// Groups tab — list / detail / add expense / settle
// Several sub-screens, all driven by `push` from the nav stack.

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeGroup(g) {
  return {
    ...g,
    members: safeArray(g?.members),
    expenses: safeArray(g?.expenses),
    settlements: safeArray(g?.settlements),
  };
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

function hexA(hex, a) {
  const h = (typeof hex === 'string' && /^#?[0-9a-fA-F]{6}$/.test(hex))
    ? hex.replace('#', '')
    : '574EFA';
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Groups list ─────────────────────────────────────────────────────────────
function ScreenGroups({ tweaks = {}, push }) {
  const { state } = useApp();
  const meId = state.currentUserId || ME;
  const [filter, setFilter] = useState('all');
  const filteredGroups = useMemo(() => {
    const myGroups = safeArray(state.groups).filter(g => safeArray(g.members).includes(meId));
    return myGroups.filter(g => {
      if (filter === 'all') return true;
      const myBal = groupNet(safeGroup(g), meId);
      if (filter === 'owed') return myBal < 0;
      if (filter === 'balanced') return myBal >= 0;
      return true;
    });
  }, [filter, state.groups, meId]);

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>Nhóm</div>
          <div style={{ fontFamily: 'var(--vb-font-body)', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{safeArray(state.groups).length} nhóm đang hoạt động</div>
        </div>
        <button onClick={() => push('new-group')} style={{
          appearance: 'none', height: 40, padding: '0 14px', cursor: 'pointer',
          background: 'var(--brand-1)', color: '#fff', border: 0, borderRadius: 12,
          fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}><Icon name="plus" size={18} color="#fff"/>Nhóm mới</button>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 12px',
        overflowX: 'auto',
      }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'owed', label: 'Còn nợ' },
          { key: 'balanced', label: 'Cân bằng' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              appearance: 'none',
              padding: '6px 14px', borderRadius: 20,
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              whiteSpace: 'nowrap',
              background: filter === f.key ? 'var(--brand-1)' : 'var(--surface-2)',
              color: filter === f.key ? '#fff' : 'var(--text-2)',
              transition: 'background 0.15s, color 0.15s',
              fontFamily: 'var(--vb-font-body)',
              flexShrink: 0,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <div style={{ padding: '0 16px' }}>
          <EmptyState icon="users" title="Chưa có nhóm nào" subtitle="Bấm + để tạo nhóm mới"/>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredGroups.map(g => <GroupCard key={g.id} g={g} avatarStyle={tweaks.avatarStyle} onClick={() => push('group-detail', { groupId: g.id })}/>)}
        </div>
      )}
    </div>
  );
}

// ── Group Card ──────────────────────────────────────────────────────────────
function GroupCard({ g, onClick, avatarStyle }) {
  const { state: _s } = useApp();
  const meId = _s.currentUserId || ME;
  const group = safeGroup(g);
  const net = groupNet(group, meId);
  return (
    <Card interactive onClick={onClick}>
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: hexA(group.color, 0.12),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{group.emoji || '👥'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name || 'Nhóm'}</div>
          <div style={{ marginTop: 6 }}>
            <AvatarStack ids={group.members} size={22} overlap={7} avatarStyle={avatarStyle} max={5}/>
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
  const M = getMemberMap(_s.members);
  const [disputeOpen, setDisputeOpen] = React.useState(false);
  const participants = safeArray(e?.participants);
  const amount = Number(e?.amount) || 0;
  const myShare = participants.includes(me) && participants.length > 0 ? Math.round(amount / participants.length) : 0;
  const balance = e?.paidBy === me ? amount - myShare : -myShare;
  const payer = memberOrFallback(M, e?.paidBy);
  const status = e?.status || 'approved';
  const canDispute = status !== 'declined';

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        borderBottom: divider ? '1px solid var(--border-1)' : 'none',
      }}>
        <CategoryIcon cat={e?.cat} size={40}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e?.title || 'Chi tiêu'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {showGroup ? <>{e?.groupEmoji} {e?.groupName} • </> : null}
            {payer.short === 'Bạn' || e?.paidBy === me ? 'Bạn trả' : `${payer.short} trả`} {fmtVND(amount)} • {e?.date || '--/--'}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={status} declineReason={e?.declineReason}/>
            {canDispute && (
              <button
                onClick={ev => { ev.stopPropagation(); setDisputeOpen(true); }}
                style={{
                  appearance: 'none', cursor: 'pointer', border: 'none', background: 'none',
                  fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--vb-font-body)',
                  padding: '2px 6px', borderRadius: 6,
                  textDecoration: 'underline',
                }}
              >
                Báo sai
              </button>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {balance > 0 ? 'Bạn cho mượn' : balance < 0 ? 'Bạn nợ' : '—'}
          </div>
          <Money value={Math.abs(balance)} size={13} color={balance > 0 ? 'var(--vb-success-700)' : balance < 0 ? 'var(--vb-danger-700)' : 'var(--text-2)'} compact/>
        </div>
      </div>
      {disputeOpen && (
        <DisputePopup expenseId={e?.id} onClose={() => setDisputeOpen(false)}/>
      )}
    </>
  );
}

// ── Group detail — tabs: Hoạt động / Số dư / Thành viên ────────────────────
function ScreenGroupDetail({ params = {}, tweaks = {}, push, pop }) {
  const { state, dispatch } = useApp();
  const meId = state.currentUserId || ME;
  const g = safeArray(state.groups).find(x => x.id === params?.groupId);
  const [tab, setTab] = useState('activity');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const balance = useMemo(() => g ? groupBalance(safeGroup(g), meId) : {}, [g, meId]);
  const net = useMemo(() => g ? groupNet(safeGroup(g), meId) : 0, [g, meId]);
  const isTreasurer = state.members.find(m => m.id === meId)?.role === 'treasurer'
  const pendingCount = safeArray(g ? safeGroup(g).expenses : []).filter(e => e.status === 'pending').length

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  if (!g) return null;
  const group = safeGroup(g);
  const groupMembers = group.members;
  const groupExpenses = group.expenses;

  function handleDeleteGroup() {
    if (!window.confirm(`Xóa nhóm "${group.name || 'Nhóm'}"? Không thể hoàn tác.`)) return;
    dispatch({ type: 'DELETE_GROUP', groupId: g.id });
    pop();
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader
        title={group.name || 'Nhóm'}
        subtitle={`${groupMembers.length} thành viên`}
        onBack={pop}
        right={<div style={{ position: 'relative' }}>
          <button
            style={iconBtnStyle()}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          ><Icon name="more" size={20} color="var(--text-1)"/></button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'var(--surface-1)', borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              minWidth: 200, zIndex: 100,
              border: '1px solid var(--border-1)', overflow: 'hidden',
            }}>
              {[
                { label: '✏️  Sửa nhóm', action: () => { setMenuOpen(false); push('new-group', { editGroupId: g.id }); } },
                { label: '👥  Thành viên', action: () => { setMenuOpen(false); } },
                { label: '🗑  Xóa nhóm', danger: true, action: () => { setMenuOpen(false); handleDeleteGroup(); } },
              ].map((item, i, arr) => (
                <button key={item.label} onClick={item.action} style={{
                  appearance: 'none', display: 'block', width: '100%', textAlign: 'left',
                  padding: '13px 16px', background: 'none',
                  border: 0, borderBottom: i < arr.length-1 ? '1px solid var(--border-1)' : 'none',
                  color: item.danger ? 'var(--vb-danger-700)' : 'var(--text-1)',
                  fontFamily: 'var(--vb-font-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>{item.label}</button>
              ))}
            </div>
          )}
        </div>}
      />

      {/* Header summary */}
      <div style={{ padding: '16px 16px 20px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: hexA(group.color, 0.14),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>{group.emoji || '👥'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {net === 0 ? 'Bạn đã cân bằng' : net > 0 ? 'Bạn được nhận' : 'Bạn còn nợ'}
            </div>
            <Money value={Math.abs(net)} size={26} color={net === 0 ? 'var(--text-1)' : net > 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
              {groupExpenses.length} giao dịch • {fmtVND(groupExpenses.reduce((a,e)=>a+(Number(e.amount) || 0),0))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {isTreasurer && pendingCount > 0 && (
            <button
              onClick={() => push('approval-queue', { groupId: params?.groupId })}
              style={{
                appearance: 'none', cursor: 'pointer',
                height: 36, padding: '0 14px',
                background: 'rgba(245,158,11,0.12)',
                color: '#F59E0B',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 10,
                fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}
            >
              ⏳ {pendingCount} chờ duyệt
            </button>
          )}
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
        {tab === 'activity' && <GroupActivity g={group} push={push} avatarStyle={tweaks.avatarStyle}/>}
        {tab === 'balance' && <GroupBalance g={group} balance={balance} avatarStyle={tweaks.avatarStyle} meId={meId}/>}
        {tab === 'members' && <GroupMembers g={group} balance={balance} avatarStyle={tweaks.avatarStyle}/>}
      </div>
    </div>
  );
}

function GroupActivity({ g, push, avatarStyle }) {
  // Group expenses by date
  const byDate = {};
  for (const e of safeArray(g?.expenses)) { (byDate[e.date || '--/--'] = byDate[e.date || '--/--'] || []).push(e); }
  const dates = Object.keys(byDate).sort((a, b) => {
    // dates are 'DD/MM' — convert to MM/DD for comparison
    const [da, ma] = a.split('/'); const [db, mb] = b.split('/');
    return (mb - ma) || (db - da);
  });
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

function GroupBalance({ g, balance, avatarStyle, meId }) {
  const { state, dispatch, genId } = useApp();
  const M = getMemberMap(state.members);
  const me = memberOrFallback(M, meId);
  const [confirmId, setConfirmId] = useState(null);
  const handleRemind = (id, amount) => {
    const m = memberOrFallback(M, id);
    window.alert(`Nhắc ${m.name} thanh toán ${fmtVND(Math.abs(amount))}.`);
  };
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
          const m = memberOrFallback(M, id); const positive = v > 0;
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid var(--border-1)',
            }}>
              {positive ? <>
                <Avatar member={m} size={32} style={avatarStyle}/>
                <Icon name="arrow-right" size={16} color="var(--text-2)"/>
                <Avatar member={me} size={32} style={avatarStyle}/>
              </> : <>
                <Avatar member={me} size={32} style={avatarStyle}/>
                <Icon name="arrow-right" size={16} color="var(--text-2)"/>
                <Avatar member={m} size={32} style={avatarStyle}/>
              </>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                  {positive ? `${m.short} trả bạn` : `Bạn trả ${m.short}`}
                </div>
                <Money value={Math.abs(v)} size={13} color={positive ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}/>
              </div>
              {positive ? (
                <button onClick={() => handleRemind(id, v)} style={{
                  appearance: 'none', cursor: 'pointer',
                  height: 32, padding: '0 12px',
                  background: 'var(--brand-soft)',
                  color: 'var(--brand-1)',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 12,
                }}>Nhắc</button>
              ) : confirmId === id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setConfirmId(null)}
                    style={{
                      padding: '4px 10px', fontSize: 12, fontWeight: 600,
                      borderRadius: 8, border: '1px solid var(--border-1)',
                      background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer',
                    }}
                  >Hủy</button>
                  <button
                    onClick={() => {
                      dispatch({ type: 'SETTLE_DEBT', groupId: g.id, settlement: {
                        id: genId(), fromId: meId, toId: id,
                        amount: Math.abs(v), date: new Date().toLocaleDateString('vi-VN'),
                      }});
                      setConfirmId(null);
                    }}
                    style={{
                      padding: '4px 10px', fontSize: 12, fontWeight: 600,
                      borderRadius: 8, border: 0,
                      background: 'var(--brand-1)', color: '#fff', cursor: 'pointer',
                    }}
                  >Xác nhận trả {fmtVND(Math.abs(v))}</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(id)}
                  style={{
                    padding: '4px 12px', fontSize: 12, fontWeight: 600,
                    borderRadius: 8, border: '1px solid var(--brand-1)',
                    background: 'transparent', color: 'var(--brand-1)', cursor: 'pointer',
                  }}
                >Trả</button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function GroupMembers({ g, balance, avatarStyle }) {
  const { state } = useApp();
  const M = getMemberMap(state.members);
  const members = safeArray(g?.members);
  return (
    <Card>
      {members.map((id, i) => {
        const m = memberOrFallback(M, id); const b = balance[id] || 0;
        return (
          <ListRow key={id}
            left={<Avatar member={m} size={40} style={avatarStyle}/>}
            title={m.isMe ? m.name + ' (bạn)' : m.name}
            subtitle={m.isMe ? 'Quản trị viên' : 'Thành viên'}
            right={m.isMe ? null : <Money value={b} size={13} color={b > 0 ? 'var(--vb-success-700)' : b < 0 ? 'var(--vb-danger-700)' : 'var(--text-2)'} compact/>}
            divider={i < members.length - 1}
          />
        );
      })}
    </Card>
  );
}

// ── Expense Detail ──────────────────────────────────────────────────────────
function ScreenExpenseDetail({ params = {}, push, pop, tweaks = {} }) {
  const { state, dispatch } = useApp();
  const M = getMemberMap(state.members);
  const g = safeArray(state.groups).find(x => x.id === params?.groupId);
  if (!g) return null;
  const group = safeGroup(g);
  const e = group.expenses.find(x => x.id === params?.expenseId);
  if (!e) return null;
  const participants = safeArray(e.participants);
  const amount = Number(e.amount) || 0;
  const paidByMember = memberOrFallback(M, e.paidBy);
  const per = participants.length > 0 ? Math.round(amount / participants.length) : 0;

  function handleDelete() {
    if (!window.confirm(`Xóa "${e.title}"? Không thể hoàn tác.`)) return;
    dispatch({ type: 'DELETE_EXPENSE', groupId: params?.groupId, expenseId: params?.expenseId });
    pop();
  }
  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader title="Chi tiết" subtitle={group.name || 'Nhóm'} onBack={pop}
        right={<button style={iconBtnStyle()} onClick={() => push('add-expense', { groupId: params?.groupId, expenseId: params?.expenseId })}><Icon name="edit" size={18} color="var(--text-1)"/></button>}
      />
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ margin: '8px auto 12px' }}>
          <CategoryIcon cat={e.cat} size={64}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{e.title}</div>
        <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 36, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', marginTop: 4 }}>
          {fmtVNDFull(amount)}
        </div>
        <div style={{ marginTop: 6, display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
          <Avatar member={paidByMember} size={20} style={tweaks.avatarStyle}/>
          <span><b style={{ color: 'var(--text-1)' }}>{paidByMember.name}</b> đã trả • {e.date || '--/--'}/2026</span>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
            Chia đều cho {participants.length} người
          </div>
          {participants.map((id, i) => {
            const member = memberOrFallback(M, id);
            return (
            <ListRow key={id}
              left={<Avatar member={member} size={36} style={tweaks.avatarStyle}/>}
              title={member.name}
              subtitle={id === e.paidBy ? 'Người trả' : 'Chia phần'}
              right={<Money value={per} size={14} color={id === e.paidBy ? 'var(--vb-success-700)' : 'var(--text-1)'}/>}
              divider={i < participants.length - 1}
            />
            );
          })}
        </Card>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" full icon="send">Nhắc qua Zalo</Button>
          <Button variant="danger" full icon="trash" onClick={handleDelete}>Xoá</Button>
        </div>
      </div>
    </div>
  );
}

// ── Add expense — 2 variants: single screen vs wizard ───────────────────────
function ScreenAddExpense({ params = {}, push, pop, tweaks = {} }) {
  const { state, dispatch, genId } = useApp();
  const M = getMemberMap(state.members);
  const groups = safeArray(state.groups);
  const existing = params?.expenseId
    ? safeArray(groups.find(x => x.id === params?.groupId)?.expenses).find(e => e.id === params.expenseId)
    : null;
  const [g, setG] = useState(
    params?.groupId
      ? (groups.find(x => x.id === params?.groupId) || groups[0])
      : groups[0]
  );
  const [title, setTitle] = useState(existing?.title || '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [paidBy, setPaidBy] = useState(existing?.paidBy || (state.currentUserId || ME));
  const [participants, setParticipants] = useState(existing?.participants || safeArray(g?.members));
  const [splitMode, setSplitMode] = useState(existing?.splitMode === 'custom' ? 'custom' : 'equal');
  const [customAmounts, setCustomAmounts] = useState(() => {
    if (existing?.splitMode === 'custom' && Array.isArray(existing?.splits)) {
      return Object.fromEntries(existing.splits.map(s => [s.memberId, s.amount]));
    }
    return {};
  });
  const [cat, setCat] = useState(existing?.cat || 'food');
  const [step, setStep] = useState(0);
  const useWizard = (tweaks.addExpenseFlow || 'single') === 'wizard';

  const toggleP = (id) => setParticipants(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const num = Number((amount || '0').replace(/[^0-9]/g, ''));
  const per = participants.length > 0 ? Math.round(num / participants.length) : 0;
  const customValid = splitMode !== 'custom' ||
    participants.reduce((s, id) => s + (customAmounts[id] || 0), 0) === num;
  const canSave = num > 0 && !!title.trim() && participants.length > 0 && customValid;

  useEffect(() => {
    if (splitMode === 'custom' && participants.length > 0 && num > 0) {
      const per = Math.round(num / participants.length);
      setCustomAmounts(prev => {
        const init = {};
        participants.forEach((id, i) => {
          init[id] = prev[id] !== undefined ? prev[id]
            : (i === participants.length - 1
                ? num - per * (participants.length - 1)
                : per);
        });
        return init;
      });
    }
  }, [splitMode, participants.join(','), num]);

  function handleSave() {
    if (!title.trim() || num <= 0) return;
    if (participants.length === 0) return;
    if (splitMode === 'custom') {
      const total = participants.reduce((s, id) => s + (customAmounts[id] || 0), 0);
      if (total !== num) return;
    }
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    let splits;
    if (splitMode === 'custom') {
      splits = participants.map(id => ({ memberId: id, amount: customAmounts[id] || 0 }));
    } else {
      const per2 = Math.round(num / participants.length);
      splits = participants.map((id, i) => ({
        memberId: id,
        amount: i === participants.length - 1 ? num - per2 * (participants.length - 1) : per2,
      }));
    }
    const expense = {
      id: existing?.id || genId(),
      title: title.trim(),
      amount: num,
      paidBy: paidBy,
      participants: participants,
      splits: splits,
      splitMode: splitMode,
      date: existing?.date || date,
      cat: cat,
      createdAt: existing?.createdAt || new Date().toISOString(),
      ...(existing ? { updatedAt: new Date().toISOString() } : {}),
    };
    if (existing) {
      dispatch({ type: 'EDIT_EXPENSE', groupId: g.id, expense });
    } else {
      const M2 = getMemberMap(state.members);
      const isTreasurer = M2[state.currentUserId]?.role === 'treasurer';
      dispatch({ type: 'ADD_EXPENSE', groupId: g.id, expense, isTreasurer });
    }
    pop();
  }

  if (!g) {
    return (
      <div style={{ paddingBottom: 32 }}>
        <NavHeader title="Thêm chi tiêu" onBack={pop}/>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>
          Chưa có nhóm nào. Hãy tạo nhóm trước.
        </div>
      </div>
    );
  }
  const groupMembers = safeArray(g.members);

  const Header = () => (
    <NavHeader title={useWizard ? `Bước ${step+1}/3` : (existing ? 'Sửa chi tiêu' : 'Thêm chi tiêu')} onBack={() => useWizard && step > 0 ? setStep(step-1) : pop()}
      right={<button onClick={handleSave} disabled={!canSave} style={{
        appearance: 'none', height: 32, padding: '0 12px', cursor: canSave ? 'pointer' : 'not-allowed',
        background: canSave ? 'var(--brand-1)' : 'var(--surface-2)',
        color: canSave ? '#fff' : 'var(--text-3)',
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
            <select value={g.id} onChange={(e) => {
              const ng = groups.find(x=>x.id===e.target.value);
              const members = safeArray(ng?.members);
              setG(ng || groups[0]);
              setParticipants(members);
              setPaidBy(members.includes(state.currentUserId) ? state.currentUserId : (members[0] || state.currentUserId || ME));
            }} style={inputStyle()}>
              {groups.map(gr => <option key={gr.id} value={gr.id}>{gr.emoji || '👥'} {gr.name || 'Nhóm'}</option>)}
            </select>
          </FormRow>

          <FormRow label="Phân loại" icon="filter">
            <HScroll>
              {[
                { id: 'food', label: 'Ăn uống' },
                { id: 'drink', label: 'Đồ uống' },
                { id: 'travel', label: 'Đi lại' },
                { id: 'gift', label: 'Quà tặng' },
              ].map(c => (
                <button key={c.id} onClick={() => setCat(c.id)} style={{
                  appearance: 'none', cursor: 'pointer', flexShrink: 0,
                  height: 36, padding: '0 12px',
                  background: cat === c.id ? 'var(--brand-soft)' : 'var(--surface-1)',
                  border: '1px solid ' + (cat === c.id ? 'var(--brand-1)' : 'var(--border-1)'),
                  borderRadius: 'var(--vb-radius-pill)', fontWeight: 600, fontSize: 13,
                  color: cat === c.id ? 'var(--brand-1)' : 'var(--text-1)',
                  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}><CategoryIcon cat={c.id} size={20}/>{c.label}</button>
              ))}
            </HScroll>
          </FormRow>
        </>}

        {(!useWizard || step === 1) && <>
          <FormRow label="Ai đã trả?" icon="wallet">
            <Card>
              {groupMembers.map((id, i) => {
                const member = memberOrFallback(M, id);
                return (
                <ListRow key={id}
                  left={<Avatar member={member} size={36} style={tweaks.avatarStyle}/>}
                  title={member.name}
                  right={<RadioMark on={paidBy === id}/>}
                  onClick={() => setPaidBy(id)}
                  divider={i < groupMembers.length - 1}
                />
                );
              })}
            </Card>
          </FormRow>
        </>}

        {(!useWizard || step === 2) && <>
          <FormRow label="Chia cho ai?" icon="split">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { id: 'equal', label: 'Chia đều', icon: 'split' },
                { id: 'custom', label: 'Tự chọn', icon: 'edit' },
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
              {groupMembers.map((id, i) => {
                const on = participants.includes(id);
                const member = memberOrFallback(M, id);
                return (
                  <div key={id} onClick={() => toggleP(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '12px 16px', borderBottom: i < groupMembers.length - 1 ? '1px solid var(--border-1)' : 'none',
                  }}>
                    <Avatar member={member} size={36} style={tweaks.avatarStyle}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{member.name}</div>
                      {on && splitMode === 'equal' && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{fmtVNDFull(per)}</div>}
                    </div>
                    <CheckMark on={on}/>
                  </div>
                );
              })}
            </Card>
            {splitMode === 'equal' && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--brand-soft)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-1)' }}>Mỗi người trả</span>
                <Money value={per} size={16} color="var(--brand-1)"/>
              </div>
            )}
            {splitMode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                {participants.map(id => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar member={memberOrFallback(M, id)} size={32} style={tweaks.avatarStyle}/>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                      {memberOrFallback(M, id).short || memberOrFallback(M, id).name || id}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customAmounts[id] !== undefined ? customAmounts[id] : ''}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                        setCustomAmounts(prev => ({ ...prev, [id]: val }));
                      }}
                      style={{
                        width: 100, textAlign: 'right',
                        padding: '6px 10px', borderRadius: 8,
                        border: '1px solid var(--border-1)',
                        fontSize: 13, fontWeight: 600,
                        background: 'var(--surface-1)', color: 'var(--text-1)',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
                {(() => {
                  const total = participants.reduce((s, id) => s + (customAmounts[id] || 0), 0);
                  const diff = num - total;
                  return (
                    <div style={{
                      fontSize: 12, fontWeight: 700, textAlign: 'right', marginTop: 4,
                      color: diff === 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)',
                    }}>
                      {diff === 0 ? `✓ Đủ ${fmtVND(num)}` : diff > 0 ? `Còn thiếu ${fmtVND(diff)}` : `Vượt quá ${fmtVND(Math.abs(diff))}`}
                    </div>
                  );
                })()}
              </div>
            )}
          </FormRow>
        </>}

        {useWizard && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {step > 0 && <Button variant="secondary" full onClick={() => setStep(step-1)}>Quay lại</Button>}
            {step < 2 && <Button variant="primary" full onClick={() => setStep(step+1)} iconRight="arrow-right">Tiếp tục</Button>}
            {step === 2 && <Button variant="primary" full onClick={handleSave} icon="check" disabled={!canSave}>Lưu chi tiêu</Button>}
          </div>
        )}
        {!useWizard && (
          <Button variant="primary" full size="lg" icon="check" onClick={handleSave} disabled={!canSave}>Lưu chi tiêu</Button>
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
function ScreenSettleAll({ pop, tweaks = {} }) {
  const { state } = useApp();
  const M = getMemberMap(state.members);
  const meId = state.currentUserId || ME;
  const totals = useMemo(() => totalBalances(safeArray(state.groups).map(safeGroup), meId), [state.groups, meId]);
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
              {owed.map(([id, v], i) => {
                const member = memberOrFallback(M, id);
                return (
                <ListRow key={id}
                  left={<Avatar member={member} size={40} style={tweaks.avatarStyle}/>}
                  title={member.name}
                  subtitle="Nhắc trả qua Zalo"
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Money value={v} size={14} color="var(--vb-success-700)"/>
                      <button style={{ appearance: 'none', cursor: 'pointer', height: 28, padding: '0 10px', background: 'var(--brand-soft)', color: 'var(--brand-1)', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 11 }}>Nhắc</button>
                    </div>
                  }
                  divider={i < owed.length - 1}
                />
                );
              })}
            </Card>
          </div>
        )}

        {owe.length > 0 && (
          <div>
            <SectionHeader title="Bạn cần trả"/>
            <Card>
              {owe.map(([id, v], i) => {
                const member = memberOrFallback(M, id);
                return (
                <ListRow key={id}
                  left={<Avatar member={member} size={40} style={tweaks.avatarStyle}/>}
                  title={member.name}
                  subtitle="Quét QR để thanh toán"
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Money value={Math.abs(v)} size={14} color="var(--vb-danger-700)"/>
                      <button style={{ appearance: 'none', cursor: 'pointer', height: 28, padding: '0 10px', background: 'var(--brand-1)', color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 11 }}>Trả</button>
                    </div>
                  }
                  divider={i < owe.length - 1}
                />
                );
              })}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenNewGroup({ params = {}, pop }) {
  const { state, dispatch, genId } = useApp();
  const myId = state.currentUserId || ME;
  const editGroupId = params?.editGroupId;
  const members = safeArray(state.members);
  const existingGroup = editGroupId ? safeArray(state.groups).find(g => g.id === editGroupId) : null;
  const [name, setName] = useState(existingGroup?.name || '');
  const [emoji, setEmoji] = useState(existingGroup?.emoji || '🎯');
  const [selected, setSelected] = useState(existingGroup?.members || (myId ? [myId] : []));
  const [newMemberName, setNewMemberName] = useState('');
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

  function handleAddMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    const newId = 'u_' + Math.random().toString(36).slice(2, 10);
    const words = trimmed.split(' ');
    const newMem = {
      id: newId,
      name: trimmed,
      short: words[words.length - 1],
      initials: words.map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color: ['#574EFA','#E040FB','#F4511E','#0B8043','#039BE5'][Math.floor(Math.random()*5)],
      isMe: false,
    };
    dispatch({ type: 'ADD_MEMBER', member: newMem });
    setSelected(s => [...s, newId]);
    setNewMemberName('');
  }

  function handleCreate() {
    if (!name.trim() || selected.length < 1) return;
    if (existingGroup) {
      dispatch({
        type: 'EDIT_GROUP',
        group: {
          ...existingGroup,
          name: name.trim(),
          emoji: emoji,
          members: selected,
        },
      });
    } else {
      const group = {
        id: genId(),
        name: name.trim(),
        emoji: emoji,
        color: '#574EFA',
        members: selected,
        expenses: [],
        settlements: [],
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_GROUP', group });
    }
    pop();
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title={existingGroup ? 'Sửa nhóm' : 'Tạo nhóm mới'} onBack={pop} right={<button onClick={handleCreate} style={{
        appearance: 'none', height: 32, padding: '0 12px', cursor: 'pointer',
        background: name && selected.length >= 1 ? 'var(--brand-1)' : 'var(--surface-2)',
        color: name && selected.length >= 1 ? '#fff' : 'var(--text-3)',
        border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
      }}>{existingGroup ? 'Lưu' : 'Tạo'}</button>}/>
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
            {members.map((m, i) => {
              const isMe = m.id === myId;
              return (
              <div key={m.id} onClick={() => !isMe && toggle(m.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: isMe ? 'default' : 'pointer',
                padding: '12px 16px', borderBottom: i < members.length - 1 ? '1px solid var(--border-1)' : 'none',
                opacity: isMe ? 0.7 : 1,
              }}>
                <Avatar member={m} size={36}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{m.name}</div>
                </div>
                {isMe ? <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>Bạn</span> : <CheckMark on={selected.includes(m.id)}/>}
              </div>
              );
            })}
            {/* Inline add member by name */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px',
              borderTop: '1px solid var(--border-1)',
            }}>
              <input
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                placeholder="Thêm thành viên bằng tên..."
                style={{
                  flex: 1, height: 34, padding: '0 10px',
                  background: 'var(--surface-2)', border: '1px solid var(--border-1)',
                  borderRadius: 8, fontFamily: 'var(--vb-font-body)', fontSize: 13,
                  color: 'var(--text-1)', outline: 'none',
                }}
              />
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                style={{
                  appearance: 'none', height: 34, padding: '0 12px',
                  background: newMemberName.trim() ? 'var(--brand-1)' : 'var(--surface-2)',
                  color: newMemberName.trim() ? '#fff' : 'var(--text-3)',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: newMemberName.trim() ? 'pointer' : 'default',
                }}
              >+</button>
            </div>
          </Card>
        </FormRow>
      </div>
    </div>
  );
}

function ScreenNotifications({ pop, tweaks = {} }) {
  const { state } = useApp();
  const M = getMemberMap(state.members);
  const items = safeArray(state.notifications);
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Thông báo" onBack={pop}/>
      <div style={{ padding: 16 }}>
        {items.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Chưa có thông báo"
            subtitle="Hoạt động của nhóm sẽ xuất hiện ở đây"
          />
        ) : (
          <Card>
            {items.map((n, i) => {
              const member = M[n.who] || { name: n.who || 'Ai đó', initials: '?', color: '#999', short: '?' };
              return (
                <ListRow key={n.id}
                  left={<Avatar member={member} size={40} style={tweaks.avatarStyle}/>}
                  title={<><b>{member.name}</b> {n.text}</>}
                  subtitle={`${n.group} • ${n.when}`}
                  divider={i < items.length - 1}
                />
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

function ScreenApprovalQueue({ params = {}, pop }) {
  const { state, dispatch } = useApp()
  const meId = state.currentUserId || ME
  const M = getMemberMap(state.members)
  const g = safeArray(state.groups).find(x => x.id === params?.groupId)
  const group = safeGroup(g)
  const pending = safeArray(group.expenses).filter(e => e.status === 'pending')

  const [declineMode, setDeclineMode] = React.useState(false)
  const [declineReason, setDeclineReason] = React.useState('')

  const current = pending[0]

  const handleApprove = async () => {
    if (!current) return
    try {
      await dispatch({ type: 'APPROVE_EXPENSE', expenseId: current.id })
      setDeclineMode(false)
    } catch (err) {
      console.error('[ApprovalQueue] approve failed:', err)
    }
  }

  const handleDeclineClick = () => setDeclineMode(true)

  const handleDeclineConfirm = async () => {
    if (!current || !declineReason.trim()) return
    try {
      await dispatch({ type: 'DECLINE_EXPENSE', expenseId: current.id, reason: declineReason.trim() })
      setDeclineMode(false)
      setDeclineReason('')
    } catch (err) {
      console.error('[ApprovalQueue] decline failed:', err)
    }
  }

  if (!g) return null
  const isTreasurer = state.members.find(m => m.id === meId)?.role === 'treasurer'
  if (!isTreasurer) return null

  return (
    <div style={{ paddingBottom: 40 }}>
      <NavHeader title="Duyệt chi tiêu" onBack={pop}/>

      {pending.length === 0 ? (
        <div style={{ padding: '40px 20px' }}>
          <EmptyState icon="check-circle" title="Không còn chi tiêu chờ duyệt" subtitle="Tất cả đã được xử lý"/>
        </div>
      ) : (
        <div style={{ padding: '24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
            1 / {pending.length} chi tiêu
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
            {pending.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                background: i === 0 ? 'var(--brand-1)' : 'var(--border-1)',
              }}/>
            ))}
          </div>

          <SwipeCard
            expense={current}
            members={M}
            onApprove={handleApprove}
            onDecline={handleDeclineClick}
          />

          {!declineMode ? (
            <div style={{ display: 'flex', gap: 12, padding: '24px 24px 0' }}>
              <Button variant="ghost" style={{ flex: 1, borderColor: '#EF4444', color: '#EF4444' }} onClick={handleDeclineClick}>
                ✕ Từ chối
              </Button>
              <Button variant="primary" style={{ flex: 1 }} onClick={handleApprove}>
                ✓ Duyệt
              </Button>
            </div>
          ) : (
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                Lý do từ chối:
              </div>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Ghi lý do ngắn gọn..."
                style={{
                  width: '100%', minHeight: 80,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 12,
                  color: 'var(--text-1)',
                  fontSize: 14, padding: '10px 12px',
                  resize: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--vb-font-body)',
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setDeclineMode(false); setDeclineReason(''); }}>
                  Huỷ
                </Button>
                <Button variant="primary" style={{ flex: 1, background: '#EF4444' }} onClick={handleDeclineConfirm} disabled={!declineReason.trim()}>
                  Xác nhận từ chối
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ScreenPaymentFlow({ tweaks = {}, pop }) {
  const { state, dispatch } = useApp()
  const meId = state.currentUserId || ME
  const M = getMemberMap(state.members)
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState(null)

  // Consolidated debts: merge group + pickleball debts per person
  const consolidated = useMemo(() => {
    const groupBals = totalBalances(state.groups, meId)
    const groupDebts = Object.entries(groupBals)
      .filter(([, v]) => v < 0)
      .map(([id, v]) => ({ memberId: id, amount: Math.abs(v), source: 'Nhóm', groupId: null }))

    const pSummary = pickleSummary(state.pickle)
    const pickleOwes = pSummary.memberOwes?.[meId] || 0
    const treasurer = state.members.find(m => m.role === 'treasurer')
    const pickleDebts = (pickleOwes < 0 && treasurer && treasurer.id !== meId)
      ? [{ memberId: treasurer.id, amount: Math.abs(pickleOwes), source: 'Pickleball', groupId: state.currentGroupId }]
      : []

    const map = {}
    for (const d of [...groupDebts, ...pickleDebts]) {
      if (!map[d.memberId]) map[d.memberId] = { memberId: d.memberId, amount: 0, sources: [], groupId: d.groupId }
      map[d.memberId].amount += d.amount
      map[d.memberId].sources.push(d.source)
    }
    return Object.values(map)
  }, [state.groups, state.pickle, state.members, state.currentGroupId, meId])

  const totalAmount = consolidated.reduce((a, d) => a + d.amount, 0)

  async function handleConfirm() {
    if (loading || consolidated.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      for (const d of consolidated) {
        await dispatch({
          type: 'SETTLE_DEBT',
          groupId: d.groupId || state.currentGroupId,
          settlement: {
            fromId: meId,
            toId: d.memberId,
            amount: d.amount,
            date: today,
          },
        })
      }
      setDone(true)
    } catch (e) {
      setError('Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ paddingBottom: 96 }}>
        <NavHeader title="Thanh toán" onBack={pop}/>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            Đã ghi nhận thanh toán!
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32 }}>
            Số dư đã được cập nhật
          </div>
          <button
            onClick={pop}
            style={{
              appearance: 'none', cursor: 'pointer',
              height: 48, padding: '0 32px', borderRadius: 14, border: 0,
              background: 'var(--brand-1)', color: '#fff',
              fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 15,
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }

  if (consolidated.length === 0) {
    return (
      <div style={{ paddingBottom: 96 }}>
        <NavHeader title="Thanh toán" onBack={pop}/>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            Không có khoản nào cần trả!
          </div>
        </div>
      </div>
    )
  }

  const monthLabel = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader title={`Thanh toán ${monthLabel}`} onBack={pop}/>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Breakdown */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
            Bạn cần trả:
          </div>
          <Card>
            {consolidated.map((d, i) => {
              const m = M[d.memberId] || { name: '?', short: '?', initials: '??', color: '#999' }
              return (
                <ListRow
                  key={d.memberId}
                  left={<Avatar member={m} size={40} style={tweaks.avatarStyle}/>}
                  title={m.name}
                  subtitle={d.sources.join(' + ')}
                  right={
                    <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 15, color: 'var(--vb-danger-700)' }}>
                      {fmtVND(d.amount)}
                    </div>
                  }
                  divider={i < consolidated.length - 1}
                />
              )
            })}
          </Card>
        </div>

        {/* Total */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Tổng</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--vb-danger-700)', fontFamily: 'var(--vb-font-body)' }}>
            {fmtVND(totalAmount)}
          </span>
        </div>

        {/* QR placeholder */}
        <div style={{
          padding: '20px 16px', borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 160, height: 160, borderRadius: 12,
            background: 'var(--surface-2)', border: '1px dashed var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>📱</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>
              QR chuyển khoản
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
              {consolidated.length === 1 ? (M[consolidated[0].memberId]?.name || '?') : 'Chuyển theo từng người'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              Nội dung: SP-{consolidated.map(d => (M[d.memberId]?.short || '?')).join('-')}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--vb-danger-50)', color: 'var(--vb-danger-700)',
            fontSize: 13, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            appearance: 'none', cursor: loading ? 'default' : 'pointer',
            width: '100%', height: 52, borderRadius: 14, border: 0,
            background: loading ? 'var(--border-1)' : 'var(--vb-success-700)',
            color: loading ? 'var(--text-3)' : '#fff',
            fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 16,
            transition: 'background .15s',
          }}
        >
          {loading ? 'Đang xử lý...' : '✓ Đã chuyển tiền rồi'}
        </button>
      </div>
    </div>
  )
}

export default ScreenGroups
export { ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense, ScreenSettleAll, ScreenNewGroup, ScreenNotifications, ScreenApprovalQueue }
