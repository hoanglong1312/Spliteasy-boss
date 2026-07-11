// Spliteasy Boss — Tham gia nhóm
// Props: data { code, group, existingNames[], selectedName }

import React, { useState, useEffect, useRef } from 'react';
import { lookupGroupByCode, lookupGroupInviteLink, requestJoinByInviteLink, getTokenAfterPinVerify, saveRecentInvite, getRecentSessions, removeRecentSession, verifyProfilePin } from '../lib/auth.js';
import { colors, type } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button, Avatar, AvatarStack, SectionLabel, LoadingSpinner, loadingOverlayStyle } from '../primitives';

export default function JoinGroup({ data, onAction, pinSession, pinValue = '', pinError = '', pinLoading, onPinChange, onPinSubmit, onPinCancel }) {
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
  const [pinRequiredMemberName, setPinRequiredMemberName] = useState(null);
  const [invitePinValue, setInvitePinValue] = useState('');
  const [invitePinError, setInvitePinError] = useState('');
  const [invitePinLoading, setInvitePinLoading] = useState(false);
  const lookupTimer = useRef(null);
  const memberName = (newName || selected || '').trim();
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminPinValue, setAdminPinValue] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [expandedPinSessionId, setExpandedPinSessionId] = useState(null);
  const [sessionPinValue, setSessionPinValue] = useState('');
  const [sessionPinError, setSessionPinError] = useState('');
  const [sessionPinLoading, setSessionPinLoading] = useState(false);
  const [localSessions, setLocalSessions] = useState(() => getRecentSessions());
  const [savedInviteCodes, setSavedInviteCodes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spliteasy_invite_codes') || '[]') } catch { return [] }
  });
  const [chipPinName, setChipPinName] = useState(null);
  const [chipPinValue, setChipPinValue] = useState('');
  const [chipPinError, setChipPinError] = useState('');
  const [chipPinLoading, setChipPinLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const SESSION_AVATAR_COLORS = [
  'linear-gradient(135deg, #4a6cf7, #7c3aed)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #e11d48, #be123c)',
  'linear-gradient(135deg, #0ea5e9, #0284c7)',
];
const getSessionAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SESSION_AVATAR_COLORS[Math.abs(hash) % SESSION_AVATAR_COLORS.length];
};
  const isTreasurerSession = s => s?.role === 'treasurer' || s?.hasPin === true && s?.profileId === '6faee487-3a0e-42d7-b8b9-06ccf2248dbc'
  const longSession = d.recentSessions?.find(isTreasurerSession)
    || (isTreasurerSession(d.pinnedSession) ? d.pinnedSession : null);
  const recentSessions = d.recentSessions || [];
  const inviteToken = d.inviteToken || '';
  const isInviteLinkFlow = Boolean(inviteToken);
  const hasGroupPreview = Boolean(foundGroup || d.group?.id);
  const recentInvites = d.recentInvites || [];
  const visibleRecentSessions = recentSessions
    .filter(s => !isTreasurerSession(s))
    .filter((s, i, arr) => {
      const key = s.profileId || s.memberId;
      return arr.findIndex(x => (x.profileId || x.memberId) === key) === i;
    });
  const joinButtonText = joining
    ? 'Đang tham gia...'
    : selected && !newName
      ? 'Vào nhóm'
      : isInviteLinkFlow
        ? 'Gửi yêu cầu tham gia'
        : 'Tham gia';

  const existingNames = hasGroupPreview
    ? (inviteToken
        ? (foundGroup?.member_names || [])
        : (foundGroup?.member_names || d.existingNames || []))
    : [];
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
        saveRecentInvite(inviteToken, result);
        setFoundGroup({
          ...result,
          member_names: result.member_names || [],
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
    const pin = adminPinValue;
    if (!pin) { setAdminError('Nhập mã PIN'); return; }
    setAdminLoading(true);
    setAdminError('');
    try {
      const result = await onAction?.('adminPinLogin', { pin, session: longSession });
      if (result?.error === 'wrong_pin') {
        setAdminError('Sai mã PIN. Thử lại.');
        setAdminPinValue('');
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
    await new Promise(r => requestAnimationFrame(r));
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
        groupName: foundGroup?.name || '',
        inviteCode: foundGroup?.invite_code || '',
      });
      setInvitePinLoading(false);
    } catch (err) {
      setInvitePinError(err?.message || 'Lỗi xác minh PIN. Thử lại.');
      setInvitePinLoading(false);
    }
  };
  const handleChipPinSubmit = async () => {
  if (!chipPinValue.trim()) { setChipPinError('Nhập mã PIN'); return; }
  const allSessions = [...(d.recentSessions || []), ...(localSessions || [])];
  if (longSession) allSessions.push(longSession);
  const session = allSessions.find(s => s.memberName === chipPinName);
  if (!session) { setChipPinError('Không tìm thấy session. Thử lại.'); return; }
  setChipPinLoading(true);
  setChipPinError('');
  await new Promise(r => requestAnimationFrame(r));
  try {
    const ok = await verifyProfilePin(session.profileId, chipPinValue);
    if (!ok) {
      setChipPinError('Sai PIN. Thử lại.');
      setChipPinValue('');
      setChipPinLoading(false);
      return;
    }
    setChipPinName(null);
    setChipPinValue('');
    setSelected(chipPinName);
  } catch {
    setChipPinError('Lỗi xác minh. Thử lại.');
  } finally {
    setChipPinLoading(false);
  }
};

const handleSessionPinSubmit = async (session) => {
    if (!sessionPinValue.trim()) { setSessionPinError('Nhập mã PIN'); return; }
    setSessionPinLoading(true);
    setSessionPinError('');
    await new Promise(r => requestAnimationFrame(r));
    try {
      const ok = await verifyProfilePin(session.profileId, sessionPinValue);
      if (!ok) {
        setSessionPinError('Sai PIN. Thử lại.');
        setSessionPinValue('');
        setSessionPinLoading(false);
        return;
      }
      setExpandedPinSessionId(null);
      setSessionPinValue('');
      const pinKey = session.profileId || session.memberId;
      if (pinKey) sessionStorage.setItem('spliteasy_pin_unlocked', pinKey);
      await onAction?.('resumeRecentSession', session);
    } catch {
      setSessionPinError('Lỗi xác minh. Thử lại.');
    } finally {
      setSessionPinLoading(false);
    }
  };


  return (
    <PhoneFrame>
      {(sessionPinLoading || resumeLoading) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
            animation: 'pickleballLoadingSpin 0.8s linear infinite',
          }} />
          <div style={{ marginTop: 12, color: '#fff', fontSize: 13, fontWeight: 600 }}>Đang xác nhận...</div>
        </div>
      )}
      <Screen style={{ paddingBottom: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Tham gia nhóm</div>
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* Admin section — hardcoded Long, uncontrolled input */}
        <div style={{ marginBottom: 14 }}>
          {!adminExpanded ? (
            <button
              type="button"
                  onClick={() => { setAdminExpanded(true); setAdminError(''); setAdminPinValue(''); }}
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
                padding: '12px 14px', borderRadius: '12px 12px 0px 0px',
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
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={adminPinValue}
                  onChange={e => { setAdminPinValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setAdminError(''); }}
                  placeholder="Nhập mã PIN"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && !adminLoading && handleAdminLogin()}
                  style={{
                    width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
                    border: `1px solid ${adminError ? 'rgba(248,113,113,0.5)' : 'rgba(251,191,36,0.3)'}`,
                    background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
                    fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
                    WebkitTextSecurity: 'disc',
                    boxSizing: 'border-box',
                  }}
                />
                {adminError && <div style={{ fontSize: 12, color: '#fca5a5' }}>{adminError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setAdminExpanded(false); setAdminError(''); setAdminPinValue(''); }} style={{
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

        {!hasGroupPreview && !looking && !isInviteLinkFlow && localSessions.length === 0 && (
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

        {!hasGroupPreview && localSessions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase',
              marginBottom: 6,
            }}>Vào lại tài khoản gần đây</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 10 }}>
              Chạm vào tên đã dùng trên máy này.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {localSessions.map((session) => {
                const sessionKey = session.profileId || session.memberId;
                const isExpanded = expandedPinSessionId === sessionKey;
                return (
                  <div
                    key={sessionKey}
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${isExpanded ? colors.brand : 'rgba(255,255,255,0.08)'}`,
                      background: isExpanded ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Card header row */}
                    <div
                      onClick={!isExpanded ? async () => {
                        if (session.hasPin) {
                          setExpandedPinSessionId(sessionKey);
                          setSessionPinValue('');
                          setSessionPinError('');
                        } else {
                          setResumeLoading(true);
                          await onAction?.('resumeRecentSession', session);
                          setResumeLoading(false);
                        }
                      } : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', cursor: !isExpanded ? 'pointer' : 'default' }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: getSessionAvatarColor(session.memberName),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: '#fff',
                      }}>
                        {(session.memberName || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                        {session.memberName}
                      </div>
                      {!isExpanded && (
                        <span style={{ fontSize: 18, color: colors.brand, padding: '4px 8px', lineHeight: 1 }}>
                          {session.hasPin ? '🔒' : '›'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isExpanded) { setExpandedPinSessionId(null); setSessionPinValue(''); setSessionPinError(''); }
                          if (session.inviteCode && session.inviteCode.trim()) {
                            const next = [...new Set([session.inviteCode, ...savedInviteCodes])].slice(0, 5);
                            localStorage.setItem('spliteasy_invite_codes', JSON.stringify(next));
                            setSavedInviteCodes(next);
                          }
                          const updated = removeRecentSession(session);
                          setLocalSessions(updated);
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 13, color: colors.textMuted,
                          minWidth: 28, minHeight: 28,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 14, padding: 4,
                        }}
                      >×</button>
                    </div>
                    {/* Inline PIN expand */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid rgba(99,102,241,0.25)',
                        padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                          🔒 Nhập PIN để vào tài khoản này
                        </div>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="Nhập mã PIN"
                          value={sessionPinValue}
                          autoFocus
                          onChange={e => { setSessionPinValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setSessionPinError(''); }}
                          onKeyDown={e => e.key === 'Enter' && !sessionPinLoading && handleSessionPinSubmit(session)}
                          disabled={sessionPinLoading}
                          style={{
                            width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
                            border: `1px solid ${sessionPinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
                            background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
                            fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
                            WebkitTextSecurity: 'disc', boxSizing: 'border-box', marginBottom: 6,
                          }}
                        />
                        {sessionPinError && (
                          <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>{sessionPinError}</div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSessionPinSubmit(session)}
                          disabled={sessionPinLoading}
                          style={{
                            width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                            background: sessionPinLoading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)',
                            color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                            cursor: sessionPinLoading ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          {sessionPinLoading && (
                            <span style={{
                              width: 14, height: 14, borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                              display: 'inline-block', animation: 'pickleballLoadingSpin 0.8s linear infinite',
                            }} />
                          )}
                          {sessionPinLoading ? 'Đang xác nhận...' : 'Xác nhận'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setTimeout(() => setCodeFocused(false), 150)}
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
                fontSize: 16,
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

        {/* Recent code suggestions */}
        {!inviteToken && !code && codeFocused && (() => {
          const seen = new Set();
          const allCodes = [
            ...localSessions.filter(s => s.inviteCode && s.inviteCode.trim()).map(s => s.inviteCode),
            ...savedInviteCodes,
          ];
          const suggestions = allCodes
            .filter(c => c && !seen.has(c) && seen.add(c))
            .slice(0, 3)
            .map(c => ({ code: c, label: c }));
          if (!suggestions.length) return null;
          return (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {suggestions.map(({ code: ic, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { if (ic) { setCode(ic); setCodeFocused(false); } }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(52,211,153,0.35)',
                    background: 'rgba(52,211,153,0.08)',
                    color: '#6ee7b7',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
            </div>
          );
        })()}

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
              Có mã mời thì chọn tên có sẵn để vào nhóm. Link mời công khai chỉ nhận tên mới để chờ thủ quỹ duyệt. Tên đã có cần link cá nhân hoặc PIN.
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
                    <button key={name} onClick={() => {
                      const allSessions = [...(d.recentSessions || []), ...(localSessions || [])];
                      if (longSession) allSessions.push(longSession);
                      const session = allSessions.find(s => s.memberName === name);
                      if (session?.hasPin && !isTreasurerSession(session)) {
                        setChipPinName(name);
                        setChipPinValue('');
                        setChipPinError('');
                        setSelected(null);
                        setNewName('');
                      } else {
                        setSelected(name);
                        setNewName('');
                        setChipPinName(null);
                      }
                    }} style={{
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

              {chipPinName && (
                <div style={{ marginTop: 10, borderRadius: 12, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.07)', padding: 12 }}>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                    🔒 Nhập PIN để xác nhận danh tính của <strong style={{ color: colors.textPrimary }}>{chipPinName}</strong>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Nhập mã PIN"
                    value={chipPinValue}
                    autoFocus
                    onChange={e => { setChipPinValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setChipPinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && !chipPinLoading && handleChipPinSubmit()}
                    disabled={chipPinLoading}
                    style={{
                      width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
                      border: `1px solid ${chipPinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
                      background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
                      fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
                      WebkitTextSecurity: 'disc', boxSizing: 'border-box', marginBottom: 6,
                    }}
                  />
                  {chipPinError && <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>{chipPinError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => { setChipPinName(null); setChipPinValue(''); setChipPinError(''); }}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${colors.borderNormal}`, background: 'transparent', color: colors.textSecondary, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Hủy
                    </button>
                    <button type="button" onClick={handleChipPinSubmit} disabled={chipPinLoading}
                      style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: chipPinLoading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: chipPinLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {chipPinLoading && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', display: 'inline-block', animation: 'pickleballLoadingSpin 0.8s linear infinite' }} />}
                      {chipPinLoading ? 'Đang xác nhận...' : 'Xác nhận'}
                    </button>
                  </div>
                </div>
              )}

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
                  fontSize: 16, fontWeight: 500,
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </Card>

            {pinRequired && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
                  Xác minh danh tính
                </div>
                <div style={{
                  borderRadius: 14,
                  border: '1px solid rgba(99,102,241,0.5)',
                  background: 'rgba(99,102,241,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px',
                    borderBottom: '1px solid rgba(99,102,241,0.2)',
                    background: 'rgba(99,102,241,0.10)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: getSessionAvatarColor(pinRequiredMemberName || 'T'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: '#fff',
                    }}>
                      {(pinRequiredMemberName || 'T')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                        {pinRequiredMemberName || 'Thành viên'}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                        {foundGroup?.name || ''} · Có PIN
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, color: colors.textSecondary }}>
                      🔒 Nhập PIN để xác minh danh tính
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Nhập mã PIN"
                      value={invitePinValue}
                      onChange={e => { setInvitePinValue(e.target.value); setInvitePinError(''); }}
                      onKeyDown={e => e.key === 'Enter' && !invitePinLoading && handleInvitePinSubmit()}
                      disabled={invitePinLoading}
                      autoFocus
                      style={{
                        width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
                        border: `1px solid ${invitePinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
                        background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
                        fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
                        WebkitTextSecurity: 'disc', boxSizing: 'border-box',
                      }}
                    />
                    {invitePinError && <div style={{ fontSize: 12, color: '#fca5a5' }}>{invitePinError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button"
                        onClick={() => { setPinRequired(false); setInvitePinValue(''); setInvitePinError(''); }}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 8,
                          border: `1px solid ${colors.borderNormal}`, background: 'transparent',
                          color: colors.textSecondary, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>Hủy</button>
                      <button type="button" onClick={handleInvitePinSubmit} disabled={invitePinLoading}
                        style={{
                          flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
                          background: invitePinLoading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)',
                          color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                          cursor: invitePinLoading ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                        {invitePinLoading && (
                          <span style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                            display: 'inline-block', animation: 'pickleballLoadingSpin 0.8s linear infinite',
                          }} />
                        )}
                        {invitePinLoading ? 'Đang xác nhận...' : 'Xác nhận'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

                {hasGroupPreview && !pinRequired && !pinSession && <Button block variant="brand" style={{ marginTop: 10, opacity: joining ? 0.6 : 1 }}
          onClick={async () => {
            if (joining) return;
            setJoinError('');
            if (!inviteToken && !code.trim()) { setJoinError('Vui lòng nhập mã mời.'); return; }
            if (!memberName) { setJoinError('Vui lòng chọn hoặc nhập tên của bạn.'); return; }
            if (isInviteLinkFlow && selected && !newName) {
              // Existing member selected — try to resume their session
              const allSessions = [...(d.recentSessions || [])];
              if (longSession) allSessions.push(longSession);
              const existingSession = allSessions.find(s => s.memberName === selected);
              if (existingSession) {
                if (isTreasurerSession(existingSession)) {
                  setAdminExpanded(true);
                } else {
                  setJoining(true);
                  await onAction?.('resumeRecentSession', existingSession);
                  setJoining(false);
                }
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
                    groupName: foundGroup?.name || '',
                    inviteCode: foundGroup?.invite_code || '',
                  });
                  setJoining(false);
                  return;
                }
                if (result?.status === 'requires_pin') {
                  setPinRequired(true);
                  setPinRequiredMemberId(result.memberId);
                  setPinRequiredMemberName(result.memberName || '');
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
              const joinResult = await onAction?.('joinGroup', { code: code.trim(), memberName });
              if (joinResult?.status === 'requires_pin') {
                setPinRequired(true);
                setPinRequiredMemberId(joinResult.memberId);
                setPinRequiredMemberName(joinResult.memberName || memberName);
                setInvitePinValue('');
                setInvitePinError('');
                setJoining(false);
                return;
              }
              setJoining(false);
            } catch (err) {
              setJoinError(err?.message || 'Mã mời không đúng hoặc kết nối có vấn đề. Thử lại.');
              setJoining(false);
            }
          }}>
          {joinButtonText}
        </Button>}

        {/* Pending hint — only for new member invite-link flow before/after submit */}
        {hasGroupPreview && isInviteLinkFlow && !selected && <div style={{
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
