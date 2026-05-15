// Pickleball tab — special sub-app for the company's CLB Pickleball
// Has 2 visual styles via Tweaks: 'sporty' (vibrant lime/orange) | 'consistent' (purple match)

function ScreenPickleball({ tweaks, push }) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState('overview'); // overview | sessions | members | external
  const summary = useMemo(() => pickleSummary(state.pickle), [state.pickle]);
  const style = tweaks.pickleballStyle || 'sporty';
  const accent = style === 'sporty' ? '#7AC74F' : 'var(--brand-1)';
  const accentBg = style === 'sporty' ? 'rgba(122,199,79,0.12)' : 'var(--brand-soft)';
  const heroGrad = style === 'sporty'
    ? 'linear-gradient(135deg, #0E1726 0%, #1F3A47 60%, #2F5347 100%)'
    : 'linear-gradient(135deg, var(--brand-1) 0%, var(--brand-2) 100%)';

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
            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2 }}>{state.pickle.sessions.length} buổi cố định • {state.pickle.fixedMembers.length} thành viên</div>

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
        {tab === 'overview' && <PickleOverview push={push} tweaks={tweaks} summary={summary} accent={accent} accentBg={accentBg} style={style} pickle={state.pickle} dispatch={dispatch}/>}
        {tab === 'sessions' && <PickleSessions push={push} tweaks={tweaks} accent={accent} accentBg={accentBg} style={style} pickle={state.pickle}/>}
        {tab === 'external' && <PickleExternal push={push} tweaks={tweaks} accent={accent} accentBg={accentBg} style={style} pickle={state.pickle}/>}
        {tab === 'members' && <PickleMembers tweaks={tweaks} summary={summary} accent={accent} accentBg={accentBg} style={style} pickle={state.pickle}/>}
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
function PickleOverview({ push, tweaks, summary, accent, accentBg, style, pickle, dispatch }) {
  const totalCourt = pickle.monthlyCourtFee;
  const guestCount = pickle.sessions.reduce((a,s)=>a+s.guests.length,0);

  // Compute "what you contributed vs what you owe" for me
  const myCourt = summary.courtPerMember;
  const myCredit = summary.guestCreditPer;
  const myExpenses = summary.memberOwes[ME] || 0;
  const myNet = -myCourt + myCredit + myExpenses;

  const next = pickle.upcoming[0];
  const meId = ME;
  const isGoing = next && (next.going || []).includes(meId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <BreakdownRow label="Tiền thuê sân tháng 5" sub={`${pickle.fixedMembers.length} người chia đều`} value={-myCourt} icon="card"/>
          <BreakdownRow label={`Phí vé vãng lai (${guestCount} lượt)`} sub="Chia đều cho thành viên cố định" value={+myCredit} icon="users" positive accent={accent}/>
          <BreakdownRow label="Chi phí bóng / nước / ăn" sub="Đã trả - phần phải đóng" value={myExpenses} icon="ball" positive={myExpenses >= 0} accent={accent}/>
        </div>
      </Card>

      {/* Upcoming */}
      <div>
        <SectionHeader title="Buổi đánh sắp tới" action="Xem lịch →" onAction={() => {}}/>
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
                <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 18, fontWeight: 700, color: accent }}>{next.date.split('/')[0]}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{next.time} • {next.court}</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AvatarStack ids={next.going} size={22} overlap={7} avatarStyle={tweaks.avatarStyle} max={5}/>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{(next.going || []).length} người tham gia</span>
                </div>
              </div>
              <button onClick={() => dispatch({ type: 'TOGGLE_UPCOMING', sessionId: next.id, memberId: meId })} style={{
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
function PickleSessions({ push, tweaks, accent, accentBg, style, pickle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionHeader title="Sắp diễn ra"/>
        <Card>
          {pickle.upcoming.map((s, i) => (
            <div key={s.id} onClick={() => push('session-detail', { sessionId: s.id })} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14, borderBottom: i < pickle.upcoming.length - 1 ? '1px solid var(--border-1)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 44, height: 48, borderRadius: 10, flexShrink: 0,
                background: accentBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.05em' }}>{s.day}</div>
                <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 15, fontWeight: 700, color: accent }}>{s.date.split('/')[0]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{s.time} • {s.court}</div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AvatarStack ids={s.going || []} size={20} overlap={6} avatarStyle={tweaks.avatarStyle} max={4}/>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>{(s.going || []).length} người</span>
                </div>
              </div>
              <Pill bg={accentBg} color={accent} size="xs">Sắp tới</Pill>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <SectionHeader title="Đã diễn ra"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pickle.sessions.map(s => (
            <Card key={s.id} interactive onClick={() => push('session-detail', { sessionId: s.id })}>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 48, borderRadius: 10, flexShrink: 0,
                    background: accentBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.05em' }}>{s.day}</div>
                    <div style={{ fontFamily: 'var(--vb-font-num)', fontSize: 15, fontWeight: 700, color: accent }}>{s.date.split('/')[0]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{s.time} • {s.court}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
                      {(s.attendees || s.attended || []).length} có mặt{(s.guests || []).length > 0 ? ` • ${(s.guests || []).length} vãng lai` : ''}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={18} color="var(--text-3)"/>
                </div>

                {s.expenses.length > 0 && (
                  <div style={{ paddingTop: 10, borderTop: '1px dashed var(--border-1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {s.expenses.map((ex, i) => {
                      const cat = ex.category || ex.kind;
                      const lbl = ex.title || ex.label;
                      const payer = M[ex.payerId || ex.paidBy];
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <Icon name={cat === 'ball' ? 'ball' : cat === 'food' ? 'food' : 'drink'} size={14} color="var(--text-2)"/>
                          <span style={{ color: 'var(--text-2)', flex: 1 }}>{lbl} • {payer ? payer.short : ''} trả</span>
                          <Money value={ex.amount} size={12} color="var(--text-1)" compact/>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── External tab — vé lẻ outside the club ───────────────────────────────────
function PickleExternal({ push, tweaks, accent, accentBg, style, pickle }) {
  const tickets = pickle.externalTickets || pickle.external || [];
  const total = tickets.reduce((a,e)=>a+e.amount, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: 'var(--vb-warn-100)', border: '1px solid #FCE3B0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Icon name="sparkle" size={18} color="#A05C0C"/>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#A05C0C' }}>Xé vé lẻ ngoài CLB</div>
        </div>
        <div style={{ fontSize: 12, color: '#8A5008', lineHeight: 1.5 }}>
          Những buổi đánh tự phát ngoài lịch cố định. Tiền chỉ chia cho người tham gia, không tính vào quỹ tháng.
        </div>
      </div>

      <Card>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-1)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tổng tháng này</span>
          <Money value={total} size={18}/>
        </div>
        {tickets.map((ex, i) => {
          const per = Math.round(ex.amount / ex.participants.length);
          const inIt = ex.participants.includes(ME);
          const myDelta = ex.paidBy === ME ? ex.amount - per : (inIt ? -per : 0);
          return (
            <div key={ex.id} style={{
              padding: 14, borderBottom: i < tickets.length - 1 ? '1px solid var(--border-1)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--vb-warn-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon name="ball" size={18} color="#A05C0C"/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{ex.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>{ex.date}/2026 • {M[ex.paidBy].short} trả</div>
                </div>
                <Money value={ex.amount} size={14}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <AvatarStack ids={ex.participants} size={22} overlap={7} avatarStyle={tweaks.avatarStyle} max={5}/>
                {myDelta !== 0 && (
                  <Pill bg={myDelta > 0 ? 'var(--vb-success-100)' : 'var(--vb-danger-50)'} color={myDelta > 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} size="xs">
                    {myDelta > 0 ? `Nhận ${fmtVND(myDelta)}` : `Trả ${fmtVND(Math.abs(myDelta))}`}
                  </Pill>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <Button variant="primary" full size="lg" icon="plus" onClick={() => push('add-external-ticket')}>Thêm buổi vé lẻ</Button>
    </div>
  );
}

// ── Members tab ────────────────────────────────────────────────────────────
function PickleMembers({ tweaks, summary, accent, accentBg, style, pickle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionHeader title={`Thành viên cố định (${pickle.fixedMembers.length})`} action="Thêm" onAction={() => {}}/>
        <Card>
          {pickle.fixedMembers.map((id, i) => {
            const attendedCount = pickle.sessions.filter(s => (s.attendees || s.attended || []).includes(id)).length;
            const myCourt = summary.courtPerMember;
            const myCredit = summary.guestCreditPer;
            const myExp = summary.memberOwes[id] || 0;
            const net = -myCourt + myCredit + myExp;
            return (
              <div key={id} style={{
                padding: 14, borderBottom: i < pickle.fixedMembers.length - 1 ? '1px solid var(--border-1)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={M[id]} size={40} style={tweaks.avatarStyle}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{M[id].name}{M[id].isMe ? ' (bạn)' : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
                      Đi {attendedCount}/{pickle.sessions.length} buổi
                    </div>
                  </div>
                  <Money value={net} size={14} color={net >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'} compact/>
                </div>
                <div style={{ marginTop: 8, height: 5, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(attendedCount / pickle.sessions.length) * 100}%`,
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
            for (const s of pickle.sessions) for (const g of (s.guests || [])) guestMap[g] = (guestMap[g] || 0) + 1;
            const entries = Object.entries(guestMap);
            return entries.map(([name, count], i) => (
              <ListRow key={name}
                left={<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--vb-warn-100)', color: '#A05C0C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{name.split(' ').map(p=>p[0]).join('').slice(-2)}</div>}
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
function ScreenSessionDetail({ params, pop, tweaks }) {
  const { state } = useApp();
  const s = (state.pickle.sessions || []).find(x => x.id === params.sessionId);
  if (!s) return null;
  const attended = s.attendees || s.attended || [];
  const total = s.expenses.reduce((a,e)=>a+e.amount, 0);
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
          {s.expenses.map((ex, i) => {
            const cat = ex.category || ex.kind;
            const lbl = ex.title || ex.label;
            const payer = M[ex.payerId || ex.paidBy];
            return (
              <ListRow key={i}
                left={<div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={cat === 'ball' ? 'ball' : cat === 'food' ? 'food' : 'drink'} size={18} color="var(--brand-1)"/></div>}
                title={lbl}
                subtitle={`${payer ? payer.name : ''} đã trả`}
                right={<Money value={ex.amount} size={14}/>}
                divider={i < s.expenses.length - 1}
              />
            );
          })}
        </Card>

        <Card>
          <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
            Có mặt — chia {fmtVND(per)} mỗi người
          </div>
          {attended.map((id, i) => (
            <ListRow key={id}
              left={<Avatar member={M[id]} size={36} style={tweaks.avatarStyle}/>}
              title={M[id].name}
              right={<Pill bg="var(--vb-success-100)" color="var(--vb-success-700)" size="xs" icon="check">Có mặt</Pill>}
              divider={i < attended.length - 1}
            />
          ))}
        </Card>

        {(s.guests || []).length > 0 && (
          <Card>
            <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
              Vãng lai ({(s.guests || []).length})
            </div>
            {(s.guests || []).map((name, i) => (
              <ListRow key={name}
                left={<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--vb-warn-100)', color: '#A05C0C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{name.split(' ').map(p=>p[0]).join('').slice(-2)}</div>}
                title={name}
                right={<Money value={state.pickle.guestFeePerSession} size={13}/>}
                divider={i < (s.guests || []).length - 1}
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function ScreenAddSessionExpense({ params, pop, tweaks }) {
  const { state, dispatch, genId } = useApp();
  const [kind, setKind] = useState('ball');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(ME);
  const [sessionId, setSessionId] = useState(() => (state.pickle.sessions[0] || {}).id || '');
  const num = Number((amount || '0').replace(/[^0-9]/g, ''));
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Thêm chi phí" subtitle="Buổi đánh Pickleball" onBack={pop} right={
        <button onClick={() => {
          if (num > 0 && sessionId) {
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
          }
          pop();
        }} style={{
          appearance: 'none', height: 32, padding: '0 12px', cursor: 'pointer',
          background: num > 0 ? 'var(--brand-1)' : 'var(--surface-2)',
          color: num > 0 ? '#fff' : 'var(--text-3)',
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
            {state.pickle.fixedMembers.map(id => <option key={id} value={id}>{M[id].name}</option>)}
          </select>
        </FormRow>

        <FormRow label="Buổi đánh" icon="calendar">
          <select value={sessionId} onChange={(e)=>setSessionId(e.target.value)} style={inputStyle()}>
            {state.pickle.sessions.map(s => <option key={s.id} value={s.id}>{s.date} • {s.time} • {s.court}</option>)}
          </select>
        </FormRow>
      </div>
    </div>
  );
}

function ScreenAddExternalTicket({ pop, tweaks }) {
  const { state, dispatch, genId } = useApp();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(ME);
  const [participants, setParticipants] = useState([ME]);
  const num = Number((amount || '0').replace(/[^0-9]/g, ''));

  const toggleParticipant = (id) => {
    setParticipants(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Thêm vé lẻ" subtitle="Ngoài lịch cố định" onBack={pop} right={
        <button onClick={() => {
          if (num > 0 && label && participants.length > 0) {
            dispatch({
              type: 'ADD_EXTERNAL_TICKET',
              ticket: {
                id: genId(),
                date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                label,
                amount: num,
                paidBy,
                participants,
                createdAt: Date.now(),
              }
            });
            pop();
          }
        }} style={{
          appearance: 'none', height: 32, padding: '0 12px', cursor: 'pointer',
          background: num > 0 && label ? 'var(--brand-1)' : 'var(--surface-2)',
          color: num > 0 && label ? '#fff' : 'var(--text-3)',
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
            {state.pickle.fixedMembers.map(id => <option key={id} value={id}>{M[id].name}</option>)}
          </select>
        </FormRow>

        <FormRow label="Người tham gia" icon="users">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {state.pickle.fixedMembers.map(id => (
              <button key={id} onClick={() => toggleParticipant(id)} style={{
                appearance: 'none', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 20,
                background: participants.includes(id) ? 'var(--brand-soft)' : 'var(--surface-2)',
                border: '1px solid ' + (participants.includes(id) ? 'var(--brand-1)' : 'var(--border-1)'),
                color: participants.includes(id) ? 'var(--brand-1)' : 'var(--text-1)',
                fontSize: 13, fontWeight: 600,
              }}>{M[id].short}</button>
            ))}
          </div>
        </FormRow>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenPickleball, ScreenSessionDetail, ScreenAddSessionExpense, ScreenAddExternalTicket });
