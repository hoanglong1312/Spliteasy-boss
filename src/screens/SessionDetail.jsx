// Spliteasy Boss — Chi tiết buổi đánh
// Props: data { number, dateLabel, courtName, courtAddress, timeRange,
//                presentMembers[], absentMembers[], guests[], status,
//                courtFee{}, waterFee{}, accessories[], totalPerPerson }

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, SectionLabel, Button,
} from '../primitives';

const ATTENDANCE_CHIP_SIZE = 34;

export default function SessionDetail({ data, isTreasurer = false, onAction }) {
  const d = data || DEMO;
  const [waterInput, setWaterInput] = useState(String(d.waterFee?.total || ''));

  return (
    <PhoneFrame>
      <Screen style={{ paddingBottom: '72px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: '#6ee7b7', textTransform: 'uppercase',
            }}>{d.groupName}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              Buổi #{d.number} · {d.dateLabel}
            </div>
          </div>
          <IconButton onClick={() => onAction?.('more')}>⋯</IconButton>
        </div>

        {/* Hero — emerald */}
        <div style={{
          background: colors.heroEmerald,
          border: '1px solid rgba(52,211,153,0.35)',
          borderRadius: 20, padding: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.2px', color: '#6ee7b7',
              }}>{d.timeRange}</div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 6 }}>
                {d.courtName}
              </div>
              <div style={{ fontSize: 12, color: '#a7f3d0', marginTop: 4 }}>{d.courtAddress}</div>
            </div>
            <div style={{ textAlign: 'right', position: 'relative' }}>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.5px', ...type.mono }}>
                {d.presentMembers.length}
                <span style={{ fontSize: 16, color: '#6ee7b7', fontWeight: 600 }}>
                  /{d.presentMembers.length + d.absentMembers.length}
                </span>
              </div>
              <div style={{
                fontSize: 10, color: '#a7f3d0', fontWeight: 600,
                letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>Có mặt</div>
            </div>
          </div>
          <div style={{
            display: 'inline-flex', gap: 6, marginTop: 14,
            padding: '5px 12px', borderRadius: 100,
            background: 'rgba(0,0,0,0.25)',
            fontSize: 10, fontWeight: 700, color: '#a7f3d0',
            letterSpacing: '0.5px', textTransform: 'uppercase', position: 'relative',
          }}>● {d.status}</div>
        </div>

        {/* Attendance */}
        <SectionLabel action="+ Thêm khách">
          Điểm danh · {d.presentMembers.length}/{d.presentMembers.length + d.absentMembers.length} tham gia
          {d.guests.length > 0 && ` · ${d.guests.length} khách`}
        </SectionLabel>

        <Card style={{ padding: 14 }}>
          <PeopleGroup
            label="✓ Có mặt"
            labelColor="#6ee7b7"
            people={d.presentMembers}
            variant="present"
            onToggle={isTreasurer ? (id) => onAction?.('markAttendance', { sessionId: d.id, memberId: id, status: 'absent' }) : undefined}
          />
          {d.absentMembers.length > 0 && (
            <PeopleGroup
              label="○ Vắng"
              labelColor={colors.textSecondary}
              people={d.absentMembers}
              variant="absent"
              onToggle={isTreasurer ? (id) => onAction?.('markAttendance', { sessionId: d.id, memberId: id, status: 'present' }) : undefined}
            />
          )}
          {d.guests.length > 0 && (
            <PeopleGroup label="★ Khách vãng lai" labelColor="#fcd34d" people={d.guests} variant="guest"
              onRemove={(id) => onAction?.('removeGuest', id)}
              footer={
                <button onClick={() => onAction?.('addGuest')} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 100,
                  background: 'rgba(251,191,36,0.06)',
                  border: '1px dashed rgba(251,191,36,0.3)',
                  fontSize: 11, fontWeight: 600, color: '#fcd34d',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>+ Thêm khách</button>
              }
            />
          )}
        </Card>

        {/* Costs */}
        <SectionLabel>Chi phí buổi</SectionLabel>
        <Card style={{ padding: 14 }}>
          <CostRow
            icon="🏸" title="Tiền sân / người" sub={d.courtFee.sub}
            amount={formatVND(d.courtFee.perPerson)}
          />
          <Divider />
          <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  💧 <span>Tiền nước / người</span>
                </div>
                <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3, marginLeft: 24 }}>
                  {d.waterFee.sub}
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px', color: colors.pickleball, ...type.mono }}>
                {formatVND(d.waterFee.perPerson)}
              </span>
            </div>
            <div style={{ marginTop: 8, marginLeft: 24, position: 'relative' }}>
              <input
                value={waterInput}
                onChange={e => setWaterInput(e.target.value)}
                onBlur={() => onAction?.('saveWater', { sessionId: d.id, total: Number(waterInput) || 0 })}
                style={{
                  width: '100%', padding: '8px 36px 8px 12px',
                  background: colors.inputBg,
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: 12, color: colors.textPrimary,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'inherit', outline: 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                color: colors.textMuted, fontSize: 11, fontWeight: 600,
              }}>đ</span>
            </div>
          </div>
          <Divider />

          {d.accessories.map((acc, i) => (
            <React.Fragment key={i}>
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {acc.icon} <span>{acc.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3, marginLeft: 24 }}>
                      {formatVND(acc.total)} chia {acc.appliesTo.length} người
                    </div>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px', ...type.mono }}>
                    {formatVND(Math.round(acc.total / acc.appliesTo.length))}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, marginLeft: 24 }}>
                  {acc.appliesTo.map((n, j) => (
                    <span key={j} style={{
                      padding: '3px 8px', borderRadius: 6,
                      background: 'rgba(167,139,250,0.15)',
                      fontSize: 10, fontWeight: 700, color: '#c4b5fd',
                    }}>{n} ✓</span>
                  ))}
                </div>
              </div>
              {i < d.accessories.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          {/* Add accessory */}
          <button onClick={() => onAction?.('addAccessory')} style={{
            marginTop: 6, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 14px',
            border: '1px dashed rgba(99,102,241,0.4)',
            background: 'transparent', borderRadius: 10,
            color: colors.brandLight, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.3px', fontFamily: 'inherit', cursor: 'pointer',
          }}><span style={{ fontSize: 13 }}>+</span> Thêm khoản phụ</button>

          {/* Total per person */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 10, padding: '11px 12px',
            background: 'rgba(52,211,153,0.08)', borderRadius: 10,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#6ee7b7',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>Tổng / người</span>
            <span style={{
              fontSize: 18, fontWeight: 900, color: colors.pickleball,
              letterSpacing: '-0.5px', ...type.mono,
            }}>{formatVND(d.totalPerPerson)}</span>
          </div>
        </Card>

        <Button block variant="ghost" style={{ marginTop: 14, fontSize: 13 }}
          onClick={() => onAction?.('reschedule')}>
          📅 Dời buổi sang ngày khác
        </Button>
      </Screen>
    </PhoneFrame>
  );
}

function PeopleGroup({ label, labelColor, people, variant, onToggle, onRemove, footer }) {
  const active = variant === 'present' || variant === 'guest';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: labelColor,
        textTransform: 'uppercase', marginBottom: 8,
      }}>{label} · {people.length}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {people.map((p) => (
          <span key={p.id || p.name} style={{ width: 44, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => onToggle?.(p.id)}
              disabled={!onToggle}
              aria-label={`${p.name} ${active ? 'tham gia' : 'vắng'}`}
              style={{
                width: ATTENDANCE_CHIP_SIZE,
                height: ATTENDANCE_CHIP_SIZE,
                borderRadius: '50%',
                background: active ? colors.pickleball : 'rgba(255,255,255,0.06)',
                border: `1px solid ${active ? 'rgba(52,211,153,0.48)' : colors.borderSubtle}`,
                color: active ? '#052e26' : colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: onToggle ? 'pointer' : 'default',
                boxShadow: active ? '0 0 12px rgba(52,211,153,0.22)' : 'none',
              }}
            >
              {p.initial}
            </button>
            <span style={{
              width: '100%',
              color: active ? '#6ee7b7' : colors.textMuted,
              fontSize: 9,
              fontWeight: 700,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{p.name}</span>
            {variant === 'guest' && onRemove && (
              <button onClick={() => onRemove(p.id)} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'rgba(248,113,113,0.18)', color: '#fca5a5',
                border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, marginLeft: -2, cursor: 'pointer', fontFamily: 'inherit',
              }}>✕</button>
            )}
          </span>
        ))}
        {footer}
      </div>
    </div>
  );
}

function CostRow({ icon, title, sub, amount, amountColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon} <span>{title}</span>
        </div>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3, marginLeft: 24 }}>{sub}</div>
      </div>
      <span style={{
        fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px',
        color: amountColor || colors.textPrimary, ...type.mono,
      }}>{amount}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />;
}

const DEMO = {
  id: 'demo-session',
  number: 9,
  groupName: 'CLB Cầu Giấy',
  dateLabel: 'T3 19/05',
  timeRange: 'HÔM NAY · 19:00 – 21:00',
  courtName: 'Sân 3 · Trung tâm CG',
  courtAddress: '19 Trần Đăng Ninh, Cầu Giấy',
  status: 'Đang diễn ra',
  presentMembers: [
    { id: 1, name: 'Long',  initial: 'L' },
    { id: 2, name: 'Minh',  initial: 'M' },
    { id: 3, name: 'Hoa',   initial: 'H' },
    { id: 4, name: 'Nam',   initial: 'N' },
    { id: 5, name: 'Diệu',  initial: 'D' },
    { id: 6, name: 'Bình',  initial: 'B' },
    { id: 7, name: 'Quang', initial: 'Q' },
    { id: 8, name: 'Phú',   initial: 'P' },
  ],
  absentMembers: [
    { id: 9, name: 'Tuấn', initial: 'T'  },
    { id: 10, name: 'Linh', initial: 'Li' },
  ],
  guests: [
    { id: 'g1', name: 'An', initial: 'A' },
  ],
  courtFee: { perPerson: 20000, sub: '240k ÷ 13 buổi ÷ 12 TV' },
  waterFee: { perPerson: 12000, total: 132000, sub: '132k ÷ 11 người (gồm khách)' },
  accessories: [
    { icon: '📦', name: 'Băng dán vợt', total: 40000,
      appliesTo: ['Long', 'Minh', 'Hoa', 'Nam', 'Diệu'] },
  ],
  totalPerPerson: 40000,
};
