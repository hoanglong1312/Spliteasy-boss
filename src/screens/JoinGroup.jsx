// Spliteasy Boss — Tham gia nhóm (bước 2/2)
// Props: data { code, group, existingNames[], selectedName }

import React, { useState, useEffect, useRef } from 'react';
import { lookupGroupByCode, lookupGroupInviteLink, requestJoinByInviteLink } from '../lib/auth.js';
import { colors, type } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button, Avatar, AvatarStack, SectionLabel } from '../primitives';

export default function JoinGroup({ data, onAction }) {
  const d = data || DEMO;
  const [code, setCode] = useState(d.code || '');
  const [selected, setSelected] = useState(d.selectedName);
  const [newName, setNewName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [foundGroup, setFoundGroup] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);
  const [joinSent, setJoinSent] = useState(false);
  const lookupTimer = useRef(null);
  const memberName = (newName || selected || '').trim();
  const recentSessions = d.recentSessions || [];
  const inviteToken = d.inviteToken || '';
  const isInviteLinkFlow = Boolean(inviteToken);
  const hasGroupPreview = Boolean(foundGroup || d.group?.id);

  const existingNames = hasGroupPreview ? (foundGroup?.member_names || d.existingNames || []) : [];
  const displayGroup = foundGroup
    ? { emoji: foundGroup.emoji, name: foundGroup.name, treasurer: foundGroup.treasurer,
        foundedLabel: '', activeCount: existingNames.length, memberCount: existingNames.length,
        memberAvatars: existingNames.slice(0, 6).map(n => n[0]?.toUpperCase() || '?'),
        extraMembers: Math.max(existingNames.length - 6, 0) }
    : hasGroupPreview ? d.group : null;

  useEffect(() => {
    if (!inviteToken) return;
    let alive = true;
    setLooking(true);
    setLookupError('');
    lookupGroupInviteLink(inviteToken)
      .then(result => {
        if (!alive) return;
        setFoundGroup({
          ...result,
          member_names: [],
          treasurer: result.treasurer || result.treasurer_name,
        });
      })
      .catch(err => {
        if (!alive) return;
        setLookupError(err?.message || 'Link mời không còn hiệu lực.');
      })
      .finally(() => {
        if (alive) setLooking(false);
      });
    return () => { alive = false; };
  }, [inviteToken]);

  useEffect(() => {
    if (inviteToken) return;
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const trimmed = code.trim();
    if (trimmed.length < 6) { setFoundGroup(null); setLookupError(''); return; }
    lookupTimer.current = setTimeout(async () => {
      setLooking(true);
      setLookupError('');
      try {
        const result = await lookupGroupByCode(trimmed);
        setFoundGroup(result);
        setSelected(null);
        setNewName('');
      } catch (err) {
        setFoundGroup(null);
        setLookupError(err?.message || 'Mã mời không hợp lệ.');
      } finally {
        setLooking(false);
      }
    }, 600);
    return () => clearTimeout(lookupTimer.current);
  }, [code, inviteToken]);

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase',
            }}>Bước 2 / 2</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Tham gia nhóm</div>
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 100, background: colors.pickleball }} />
          <div style={{
            flex: 1, height: 4, borderRadius: 100, background: colors.brand,
            boxShadow: '0 0 8px rgba(99,102,241,0.4)',
          }} />
        </div>

        {/* Invite code */}
        {recentSessions.length > 0 && (
          <Card style={{ padding: 14, marginBottom: 14 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '1px',
              color: colors.textSecondary, textTransform: 'uppercase',
              marginBottom: 10,
            }}>Vào lại tài khoản gần đây</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(session => (
                <button
                  key={session.memberId}
                  type="button"
                  onClick={() => onAction?.('resumeRecentSession', session)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${colors.borderSubtle}`,
                    background: colors.inputBg,
                    color: colors.textPrimary,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{session.memberName || 'Thành viên'}</span>
                  <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                    {session.groupName || 'Nhóm đã tham gia'}{session.hasPin ? ' · Có PIN' : ''}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {!hasGroupPreview && !looking && (
          <Card style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: 'rgba(99,102,241,0.14)',
                border: '1px solid rgba(99,102,241,0.26)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>🔐</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Chưa xác định nhóm</div>
                <div style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary, lineHeight: 1.55 }}>
                  Mở link cá nhân thủ quỹ gửi qua Zalo/Messenger để vào lại tài khoản. Nếu là người mới, xin link mời nhóm.
                </div>
              </div>
            </div>
          </Card>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 12, marginBottom: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(52,211,153,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🔗</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 9, color: '#6ee7b7', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>{inviteToken ? 'Link mời nhóm' : 'Có mã mời? Nhập tại đây'}</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NHẬP-MÃ-MỜI"
              disabled={Boolean(inviteToken)}
              style={{
                width: '100%',
                marginTop: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: colors.textPrimary,
                opacity: inviteToken ? 0.45 : 1,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.5px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>
          {!inviteToken && code && <button onClick={() => setCode('')} style={{
            background: 'none', border: 'none',
            fontSize: 11, color: colors.brandLight, fontWeight: 700,
            letterSpacing: '0.3px', cursor: 'pointer', fontFamily: 'inherit',
          }}>XÓA</button>}
        </div>

        {/* Lookup status */}
        {looking && (
          <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 10, textAlign: 'center' }}>
            🔍 Đang tìm nhóm...
          </div>
        )}
        {lookupError && (
          <div style={{
            padding: '10px 14px', marginBottom: 10,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 10, fontSize: 11, color: '#fca5a5',
          }}>{lookupError}</div>
        )}

        {/* Group preview card */}
        {hasGroupPreview ? (
          <Card accent="pickleball" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>{displayGroup.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>{displayGroup.name}</div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                  {displayGroup.treasurer ? `Thủ quỹ: ${displayGroup.treasurer}` : 'Nhóm đã được xác nhận'}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 8, padding: '3px 9px', borderRadius: 100,
                  background: 'rgba(52,211,153,0.12)',
                  color: '#6ee7b7', fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                }}>● {displayGroup.activeCount} đang hoạt động</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 14, paddingTop: 14,
              borderTop: `1px solid ${colors.borderSubtle}`,
            }}>
              <AvatarStack people={displayGroup.memberAvatars} extra={displayGroup.extraMembers} />
              <span style={{ fontSize: 11, color: colors.textSecondary }}>
                {displayGroup.memberCount} thành viên
              </span>
            </div>
          </Card>
        ) : null}

        {/* Identity selection */}
        {hasGroupPreview && (
          <>
            <SectionLabel>Bạn là ai?</SectionLabel>
            <div style={{ fontSize: 11, color: colors.textSecondary, margin: '-4px 0 12px', lineHeight: 1.5 }}>
              Có mã mời thì chọn tên có sẵn để vào nhóm. Link mời công khai chỉ nhận tên mới để chờ thủ quỹ duyệt.
            </div>

            <Card style={{ padding: 14 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '1px',
                color: colors.textSecondary, textTransform: 'uppercase',
                marginBottom: 10,
              }}>Tên có sẵn trong nhóm</div>
              {existingNames.length === 0 && (
                <div style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                  Link mời không hiển thị danh sách tên để tránh vào nhầm tài khoản.
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {existingNames.map((name) => {
                  const active = name === selected;
                  return (
                    <button key={name} onClick={() => { setSelected(name); setNewName(''); }} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px 7px 6px', borderRadius: 100,
                      background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      <Avatar initial="?" size={22} color="rgba(255,255,255,0.08)" ring={false} style={{
                        color: active ? '#c7d2fe' : colors.textSecondary, fontWeight: 700,
                      }} />
                      <span style={{
                        fontSize: 12, fontWeight: active ? 700 : 600,
                        color: active ? '#c7d2fe' : colors.textSecondary,
                      }}>{name}{active ? ' ✓' : ''}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ height: 1, background: colors.borderSubtle, margin: '14px 0' }} />

              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '1px',
                color: colors.textSecondary, textTransform: 'uppercase',
                marginBottom: 8,
              }}>Hoặc nhập tên mới</div>
              <input
                value={newName}
                placeholder="VD: Phương Anh"
                onChange={(e) => { setNewName(e.target.value); if (e.target.value) setSelected(null); }}
                style={{
                  width: '100%', padding: '11px 14px',
                  background: colors.inputBg,
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: 12, color: colors.textPrimary,
                  fontSize: 13, fontWeight: 500,
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </Card>
          </>
        )}

        {joinError && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 10, fontSize: 11, color: '#fca5a5',
          }}>{joinError}</div>
        )}

        {joinSent && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: 'rgba(52,211,153,0.10)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 10, fontSize: 11, color: '#6ee7b7',
          }}>Đã gửi yêu cầu tham gia. Chờ thủ quỹ duyệt trước khi xem dữ liệu nhóm.</div>
        )}

        {hasGroupPreview && <Button block variant="brand" style={{ marginTop: 10, opacity: joining ? 0.6 : 1 }}
          onClick={async () => {
            if (joining) return;
            setJoinError('');
            if (!inviteToken && !code.trim()) { setJoinError('Vui lòng nhập mã mời.'); return; }
            if (!memberName) { setJoinError('Vui lòng chọn hoặc nhập tên của bạn.'); return; }
            if (isInviteLinkFlow && selected && !newName) { setJoinError('Tên đã có cần link cá nhân hoặc PIN. Nhờ thủ quỹ gửi link vào app.'); return; }
            setJoining(true);
            try {
              if (isInviteLinkFlow) {
                await requestJoinByInviteLink(inviteToken, memberName);
                setJoinSent(true);
                setJoining(false);
                return;
              }
              await onAction?.('joinGroup', { code: code.trim(), memberName });
            } catch (err) {
              setJoinError(err?.message || 'Mã mời không đúng hoặc kết nối có vấn đề. Thử lại.');
              setJoining(false);
            }
          }}>
          {joining ? '⏳ Đang tham gia...' : 'Tham gia →'}
        </Button>}

        {/* Pending hint */}
        {hasGroupPreview && <div style={{
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
          marginTop: 14, padding: 12, borderRadius: 12,
          background: 'rgba(251,191,36,0.08)',
          border: '1px dashed rgba(251,191,36,0.3)',
        }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ fontSize: 11, color: '#fcd34d', fontWeight: 600 }}>
            Sau khi gửi, chờ thủ quỹ duyệt (~vài phút)
          </span>
        </div>}
      </Screen>
    </PhoneFrame>
  );
}

const DEMO = {
  code: 'CLB-CG-2026',
  group: {
    emoji: '🏓',
    name: 'CLB Pickleball Cầu Giấy',
    treasurer: 'Long Nguyễn',
    foundedLabel: '02/2025',
    activeCount: 12,
    memberCount: 12,
    memberAvatars: ['L', 'M', 'H', 'T', 'N', 'Li'],
    extraMembers: 6,
  },
  existingNames: ['Phương Anh', 'Quang', 'Trang'],
  selectedName: 'Phương Anh',
};
