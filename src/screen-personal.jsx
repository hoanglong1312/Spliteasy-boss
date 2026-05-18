import React, { useEffect, useState } from 'react'
import { createSupabase } from './lib/supabase.js'
import { totalBalances, pickleSummary } from './data.jsx'

const money = (value) => `${Math.round(Math.abs(value)).toLocaleString('vi-VN')}đ`

function assertNoError(results) {
  const failed = results.find(r => r.error)
  if (failed) throw failed.error
}

export function ScreenPersonal() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    const match = window.location.hash.match(/\/me\/([a-f0-9]+)/i)
    if (!match) {
      setError('Link không hợp lệ.')
      setLoading(false)
      return
    }
    load(match[1])
  }, [])

  async function load(token) {
    try {
      const anonSb = createSupabase(null)
      const { data: memberInfo, error: memberError } = await anonSb.rpc('get_member_by_token', { p_token: token })
      if (memberError || memberInfo?.error) {
        setError('Link không hợp lệ hoặc đã hết hạn.')
        setLoading(false)
        return
      }

      const { member_id: memberId, member_name: memberName } = memberInfo
      const sb = createSupabase(token)
      const [expensesR, participantsR, settlementsR, sessionsR, attendeesR, membersR, groupsR, pickleConfigR] = await Promise.all([
        sb.from('expenses').select('*').order('expense_date', { ascending: false }),
        sb.from('expense_participants').select('*'),
        sb.from('settlements').select('*').order('settlement_date', { ascending: false }),
        sb.from('pickle_sessions').select('*').order('session_date', { ascending: false }),
        sb.from('pickle_attendees').select('*'),
        sb.from('members').select('*'),
        sb.from('groups').select('*'),
        sb.from('pickle_configs').select('*').limit(1).maybeSingle(),
      ])
      assertNoError([expensesR, participantsR, settlementsR, sessionsR, attendeesR, membersR, groupsR, pickleConfigR])

      const members = membersR.data || []
      const group = (groupsR.data || [])[0]
      if (!group) {
        setError('Không tải được dữ liệu nhóm.')
        setLoading(false)
        return
      }

      const expenses = (expensesR.data || []).filter(e => e.status === 'approved')
      const participants = participantsR.data || []
      const settlements = settlementsR.data || []
      const pickleSessions = sessionsR.data || []
      const pickleAttendees = attendeesR.data || []

      const normalExpenses = expenses.map(e => {
        const expenseParticipants = participants.filter(p => p.expense_id === e.id)
        return {
          id: e.id,
          amount: Number(e.amount || 0),
          paidBy: e.paid_by_member_id,
          participants: expenseParticipants.map(p => p.member_id),
          splits: expenseParticipants.map(p => ({
            memberId: p.member_id,
            amount: Number(p.share_amount || 0),
          })),
          pickleSessionId: e.pickle_session_id,
        }
      })

      const normalSettlements = settlements.map(s => ({
        id: s.id,
        fromId: s.from_member_id,
        toId: s.to_member_id,
        amount: Number(s.amount || 0),
        date: s.settlement_date,
      }))

      const groupObj = [{
        id: group.id,
        members: members.map(m => m.id),
        expenses: normalExpenses,
        settlements: normalSettlements,
      }]
      const balances = totalBalances(groupObj, memberId)
      const groupBalance = Object.values(balances).reduce((sum, value) => sum + value, 0)

      const normalSessions = pickleSessions.map(s => ({
        id: s.id,
        date: s.session_date,
        status: s.status,
        attendees: pickleAttendees
          .filter(a => a.session_id === s.id && !a.is_guest)
          .map(a => a.member_id),
        guests: pickleAttendees.filter(a => a.session_id === s.id && a.is_guest),
        expenses: normalExpenses.filter(e => e.pickleSessionId === s.id),
      }))
      const pickleState = {
        sessions: normalSessions,
        fixedMembers: members.filter(m => m.is_active !== false).map(m => m.id),
        monthlyCourtFee: Number(pickleConfigR.data?.monthly_court_fee || 0),
        guestFeePerSession: Number(pickleConfigR.data?.guest_fee_per_session || 0),
      }
      const pSummary = pickleSummary(pickleState)
      const pickleOwes = pSummary.memberOwes?.[memberId] || 0

      const now = new Date()
      const paidThisMonth = normalSettlements
        .filter(s => {
          const paidDate = new Date(s.date)
          return s.fromId === memberId
            && paidDate.getMonth() === now.getMonth()
            && paidDate.getFullYear() === now.getFullYear()
        })
        .reduce((sum, s) => sum + s.amount, 0)

      setData({ memberName, groupBalance, pickleOwes, paidThisMonth, members })
    } catch (err) {
      console.error('[personal] load error:', err)
      setError('Có lỗi xảy ra khi tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)' }}>
      <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Đang tải...</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)', padding: 24 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
      <div style={{ color: 'var(--text-1)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Không tải được</div>
      <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center' }}>{error}</div>
    </div>
  )

  const now = new Date()
  const monthLabel = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  const totalOwed = (data.groupBalance < 0 ? Math.abs(data.groupBalance) : 0)
    + (data.pickleOwes < 0 ? Math.abs(data.pickleOwes) : 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)', padding: '24px 16px', fontFamily: 'var(--vb-font-body)' }}>
      <h2 style={{ color: 'var(--text-1)', margin: '0 0 4px', fontSize: 20 }}>
        {monthLabel} của {data.memberName}
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 24px' }}>Tóm tắt cá nhân</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        <div style={{ background: 'var(--surface-1)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 2 }}>📦 Chi tiêu nhóm</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: data.groupBalance < 0 ? '#EF4444' : '#10B981' }}>
                {data.groupBalance < 0 ? `Nợ ${money(data.groupBalance)}` : data.groupBalance > 0 ? `Được nhận ${money(data.groupBalance)}` : 'Cân bằng ✅'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface-1)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', ...(data.pickleOwes < 0 ? { borderLeft: '4px solid var(--brand-1)' } : {}) }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 2 }}>
              🏸 Pickleball {data.pickleOwes < 0 ? '⚡' : ''}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: data.pickleOwes < 0 ? '#EF4444' : '#10B981' }}>
              {data.pickleOwes < 0 ? `Nợ ${money(data.pickleOwes)}` : 'Cân bằng ✅'}
            </div>
          </div>
        </div>

        {data.paidThisMonth > 0 && (
          <div style={{ background: 'var(--surface-1)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 2 }}>✅ Đã thanh toán</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#10B981' }}>
              {data.paidThisMonth.toLocaleString('vi-VN')}đ tháng này
            </div>
          </div>
        )}

        {totalOwed > 0 && (
          <div style={{ background: 'var(--brand-1)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
              Cần thanh toán: {totalOwed.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
              Mở app để thanh toán
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
