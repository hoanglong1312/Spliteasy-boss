// Spliteasy Boss — Tham gia nhóm (bước 2/2)
// Props: data { code, group, existingNames[], selectedName }

import React, { useState, useEffect, useRef } from 'react';
import { lookupGroupByCode, lookupGroupInviteLink, requestJoinByInviteLink, verifyPinForInviteLink, getTokenAfterPinVerify } from '../lib/auth.js';
import { colors, type } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button, Avatar, AvatarStack, SectionLabel, LoadingSpinner, loadingOverlayStyle } from '../primitives';

export default function JoinGroup({ data, onAction, pinSession, pinValue = '', pinError = '', onPinChange, onPinSubmit, onPinCancel }) {
  const d = data || DEMO;
  const [code, setCode] = useState(d.joinCode || d.code || '');
  const [selected, setSelected] = useState(d.selectedName);
  const [newName, setNewName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [foundGroup, setFoundGroup] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);
  const [joinSent, setJoinSent] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinRequiredMemberId, setPinRequiredMemberId] = useState(null);
  const [invitePinValue, setInvitePinValue] = useState('');
  const [invitePinError, setInvitePinError] = useState('');
  const [invitePinLoading, setInvitePinLoading] = useState(false);
  const lookupTimer = useRef(null);
  const memberName = (newName || selected || '').trim();
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const adminPinRef = useRef(null);
  // Long is the only admin — find from recentSessions or pinnedSession
  const longSession = d.recentSessions?.find(s => s.memberName === 'Long')
    || (d.pinnedSession?.memberName === 'Long' ? d.pinnedSession : null);
  const recentSessions = (d.recentSessions || []).filter(s => s.memberName !== 'Long');
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
    if (d.group?.id) return;  // already have group data from logged-in state, skip lookup
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

  const handleAdminLogin = async () => {
    const pin = adminPinRef.current?.value || '';
    if (!pin) { setAdminError('Nhập mã PIN'); return; }
    setAdminLoading(true);
    setAdminError('');
    try {
      const result = await onAction?.('adminPinLogin', { pin, session: longSession });
      if (result?.error === 'wrong_pin') {
        setAdminError('Sai mã PIN. Thử lại.');
        if (adminPinRef.current) { adminPinRef.current.value = ''; adminPinRef.current.focus(); }
      } else if (result?.error) {
        setAdminError('Không đăng nhập được. Thử lại.');
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleInvitePinSubmit = async () => {
    if (!invitePinValue.trim()) {
      setInvitePinError('Nhập mã PIN để tiếp tục');
      return;
    }
    setInvitePinLoading(true);
    setInvitePinError('');
    try {
      const tokenData = await getTokenAfterPinVerify(pinRequiredMemberId, invitePinValue);
      if (tokenData?.error === 'wrong_pin') {
        setInvitePinError('Mã PIN không đúng');
        setInvitePinLoading(false);
        return;
      }
      // PIN verified — auto-login
      await onAction?.('joinGroup_direct', {
        token: tokenData.token,
        memberId: tokenData.member_id,
        groupId: tokenData.group_id,
        memberName: tokenData.member_name,
      });
      setInvitePinLoading(false);
    } catch (err) {
      setInvitePinError(err?.message || 'Lỗi xác minh PIN. Thử lại.');
      setInvitePinLoading(false);
    }
  };

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

        {/* Admin section — hardcoded Long, uncontrolled input */}
        <div style={{ marginBottom: 14 }}>
          {!adminExpanded ? (
            <button
              type="button"
              onClick={() => { setAdminExpanded(true); setAdminError(''); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 12,
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.22)',
                color: '#fcd34d', fontFamily: 'inherit', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
              }}
            >
              <span>👑</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Đăng nhập nhanh · Admin</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
          ) : (
            <div style={{
              padding: 14,
              background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(99,102,241,0.08) 100%)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 16,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '1.2px',
                color: '#fcd34d', textTransform: 'uppercase', marginBottom: 10,
              }}>👑 Đăng nhập nhanh · Admin</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: '12px 12px 0 0',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)', borderBottom: 'none',
              }}>
                <Avatar initial="L" size={38} color="rgba(251,191,36,0.25)" ring={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: colors.textPrimary }}>Long</div>
                  <div style={{ fontSize: 11, color: '#fcd34d', marginTop: 2, fontWeight: 600 }}>
                    Thủ quỹ · 🔐 PIN
                  </div>
                </div>
              </div>
              <div style={{
                borderRadius: '0 0 12px 12px',
                border: '1px solid rgba(251,191,36,0.25)',
                borderTop: '1px solid rgba(251,191,36,0.1)',
                background: 'rgba(251,191,36,0.04)',
                padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <input
                  ref={adminPinRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  defaultValue=""
                  placeholder="Nhập mã PIN"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && !adminLoading && handleAdminLogin()}
                  style={{
                    width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
                    border: `1px solid ${adminError ? 'rgba(248,113,113,0.5)' : 'rgba(251,191,36,0.3)'}`,
                    background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
                    fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
                    boxSizing: 'border-box',
                  }}
                />
                {adminError && <div style={{ fontSize: 12, color: '#fca5a5' }}>{adminError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setAdminExpanded(false); setAdminError(''); }} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8,
                    border: `1px solid ${colors.borderNormal}`, background: 'transparent',
                    color: colors.textSecondary, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Hủy</button>
                  <button type="button" onClick={handleAdminLogin} disabled={adminLoading} style={{
                    flex: 2, padding: '9px 0', borderRadius: 8,
                    border: 'none', background: adminLoading ? 'rgba(251,191,36,0.5)' : 'rgba(251,191,36,0.9)', color: '#000',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: adminLoading ? 'default' : 'pointer',
                  }}>{adminLoading ? '...' : 'Xác nhận'}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invite code */}
        {recentSessions.length > 0 && (
          <Card style={{ padding: 14, marginBottom: 14, borderColor: 'rgba(99,102,241,0.28)', background: 'rgba(99,102,241,0.08)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 12,
                background: 'rgba(99,102,241,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>↩</div>
              <div>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '1px',
                  color: '#c7d2fe', textTransform: 'uppercase',
                }}>Vào lại tài khoản gần đây</div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Chạm vào tên đã dùng trên máy này.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(session => {
                const isPinRow = pinSession?.memberId === session.memberId
                return (
                  <div key={session.memberId} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div style={{
                      width: '100%',
                      padding: 0,
                      borderRadius: isPinRow ? '12px 12px 0 0' : 12,
                      border: `1px solid ${isPinRow ? 'rgba(99,102,241,0.5)' : colors.borderSubtle}`,
                      borderBottom: isPinRow ? 'none' : undefined,
                      background: isPinRow ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.72)',
                      color: colors.textPrimary,
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                    }}>
                      <button
                        type="button"
                        onClick={() => !isPinRow && onAction?.('resumeRecentSession', session)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '12px 10px 12px 13px',
                          border: 'none',
                          background: 'transparent',
                          color: colors.textPrimary,
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          cursor: isPinRow ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <Avatar initial={(session.memberName || 'T')[0]} size={34} color="rgba(99,102,241,0.32)" ring={false} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{session.memberName || 'Thành viên'}</span>
                          <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session.groupName || 'Bấm để vào lại'}{session.hasPin ? ' · Có PIN' : ''}
                          </span>
                        </span>
                        {!isPinRow && <span style={{ fontSize: 18, color: colors.brandLight }}>›</span>}
                      </button>
                      {!isPinRow && (
                        <button
                          type="button"
                          aria-label={`Xóa tài khoản gần đây ${session.memberName || 'Thành viên'}`}
                          onClick={() => onAction?.('removeRecentSession', session)}
                          style={{
                            width: 42,
                            alignSelf: 'stretch',
                            border: 'none',
                            borderLeft: `1px solid ${colors.borderSubtle}`,
                            background: 'rgba(248,113,113,0.08)',
                            color: '#fca5a5',
                            fontSize: 18,
                            fontWeight: 900,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >×</button>
                      )}
                    </div>
                    {isPinRow && (
                      <div style={{
                        borderRadius: '0 0 12px 12px',
                        border: '1px solid rgba(99,102,241,0.5)',
                        borderTop: '1px solid rgba(99,102,241,0.2)',
                        background: 'rgba(99,102,241,0.06)',
                        padding: '12px 13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={pinValue}
                          onChange={e => onPinChange?.(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={e => e.key === 'Enter' && onPinSubmit?.()}
                          placeholder="Nhập mã PIN"
                          style={{
                            width: '100%',
                            fontSize: 16,
                            padding: '9px 12px',
                            borderRadius: 8,
                            border: `1px solid ${pinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
                            background: 'rgba(0,0,0,0.3)',
                            color: colors.textPrimary,
                            fontFamily: 'inherit',
                            outline: 'none',
                            letterSpacing: '0.2em',
                            WebkitTextSecurity: 'disc',
                          }}
                        />
                        {pinError && <div style={{ fontSize: 12, color: '#fca5a5' }}>{pinError}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={onPinCancel}
                            style={{
                              flex: 1,
                              padding: '9px 0',
                              borderRadius: 8,
                              border: `1px solid ${colors.borderNormal}`,
                              background: 'transparent',
                              color: colors.textSecondary,
                              fontFamily: 'inherit',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >Hủy</button>
                          <button
                            type="button"
                            onClick={() => onPinSubmit?.()}
                            style={{
                              flex: 2,
                              padding: '9px 0',
                              borderRadius: 8,
                              border: 'none',
                              background: 'rgba(99,102,241,0.9)',
                              color: '#fff',
                              fontFamily: 'inherit',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >Xác nhận</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {!(recentSessions.length > 0) && !hasGroupPreview && !looking && (
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

        {pinRequired && (
          <div style={{ marginTop: 10 }}>
            <SectionLabel style={{ marginBottom: 8 }}>Xác nhận bằng mã PIN</SectionLabel>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Nhập mã PIN của bạn"
              value={invitePinValue}
              onChange={(e) => {
                setInvitePinValue(e.target.value);
                setInvitePinError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInvitePinSubmit();
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 16,
                borderRadius: 8,
                border: `1px solid ${invitePinError ? '#fc5c65' : colors.border}`,
                marginBottom: invitePinError ? 6 : 10,
                letterSpacing: '0.3em',
              }}
              disabled={invitePinLoading}
            />
            {invitePinError && (
              <div style={{
                marginBottom: 10, padding: '8px 12px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 8, fontSize: 12, color: '#fca5a5',
              }}>{invitePinError}</div>
            )}
            <Button block variant="brand" onClick={handleInvitePinSubmit} disabled={invitePinLoading}>
              {invitePinLoading ? '⏳ Kiểm tra...' : 'Xác nhận'}
            </Button>
          </div>
        )}

        {hasGroupPreview && <Button block variant="brand" style={{ marginTop: 10, opacity: joining ? 0.6 : 1 }}
          onClick={async () => {
            if (joining) return;
            setJoinError('');
            if (!inviteToken && !code.trim()) { setJoinError('Vui lòng nhập mã mời.'); return; }
            if (!memberName) { setJoinError('Vui lòng chọn hoặc nhập tên của bạn.'); return; }
            if (selected && !newName) {
              // Existing member selected — try to resume their session
              const allSessions = [...(d.recentSessions || [])];
              if (longSession) allSessions.push(longSession);
              const existingSession = allSessions.find(s => s.memberName === selected);
              if (existingSession) {
                if (existingSession.memberName === 'Long') {
                  setAdminExpanded(true);
                } else {
                  setJoining(true);
                  await onAction?.('resumeRecentSession', existingSession);
                  setJoining(false);
                }
                return;
              }
              if (!isInviteLinkFlow && !code.trim()) {
                setJoinError('Tên đã có. Dùng link cá nhân của bạn để vào lại.');
                return;
              }
              // invite link flow: fall through to requestJoinByInviteLink
            }
            setJoining(true);
            try {
              if (isInviteLinkFlow) {
                const result = await requestJoinByInviteLink(inviteToken, memberName);
                if (result?.status === 'existing_member') {
                  // Auto-login — no approval needed
                  await onAction?.('joinGroup_direct', {
                    token: result.token,
                    memberId: result.memberId,
                    groupId: result.groupId,
                    memberName: result.memberName,
                  });
                  setJoining(false);
                  return;
                }
                if (result?.status === 'requires_pin') {
                  // Show PIN input
                  setPinRequired(true);
                  setPinRequiredMemberId(result.memberId);
                  setInvitePinValue('');
                  setInvitePinError('');
                  setJoining(false);
                  return;
                }
                // status === 'pending' (new member)
                setJoinSent(true);
                setJoining(false);
                return;
              }
              await onAction?.('joinGroup', { code: code.trim(), memberName });
              setJoining(false);
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
      {(joining || adminLoading || invitePinLoading) && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: '#f1f5f9' }}>Đang xử lý…</div>
        </div>
      )}
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
