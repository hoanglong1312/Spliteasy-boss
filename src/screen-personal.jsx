import React, { useEffect, useState } from 'react'
import { createSupabase } from './lib/supabase.js'

const money = (value) => `${Math.round(Math.abs(value)).toLocaleString('vi-VN')}đ`

function assertNoError(results) {
  const failed = results.find(r => r.error)
  if (failed) throw failed.error
}

function memberName(membersById, memberId) {
  return membersById[memberId]?.short || membersById[memberId]?.name || 'Không rõ'
}

function buildDirectTransactions({ expenses, participants, members, groups, memberId }) {
  const membersById = Object.fromEntries(members.map(m => [m.id, m]))
  const groupsById = Object.fromEntries(groups.map(g => [g.id, g]))
  const participantsByExpense = participants.reduce((acc, p) => {
    if (!acc[p.expense_id]) acc[p.expense_id] = []
    acc[p.expense_id].push(p)
    return acc
  }, {})

  return expenses.flatMap(expense => {
    const expenseParticipants = participantsByExpense[expense.id] || []
    const group = groupsById[expense.group_id]
    const base = {
      groupName: group?.name || 'Nhóm',
      expenseName: expense.title || 'Chi tiêu',
      date: expense.expense_date,
    }

    if (expense.paid_by_member_id === memberId) {
      return expenseParticipants
        .filter(p => p.member_id !== memberId && Number(p.share_amount || 0) > 0)
        .map(p => ({
          ...base,
          id: `${expense.id}-${p.member_id}`,
          direction: 'owedToMe',
          counterpartyName: memberName(membersById, p.member_id),
          amount: Number(p.share_amount || 0),
        }))
    }

    const myShare = expenseParticipants.find(p => p.member_id === memberId)
    const amount = Number(myShare?.share_amount || 0)
    if (!myShare || amount <= 0) return []

    return [{
      ...base,
      id: `${expense.id}-${memberId}`,
      direction: 'iOwe',
      counterpartyName: memberName(membersById, expense.paid_by_member_id),
      amount,
    }]
  })
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
      const [expensesR, participantsR, membersR, groupsR] = await Promise.all([
        sb.from('expenses').select('*').order('expense_date', { ascending: false }),
        sb.from('expense_participants').select('*'),
        sb.from('members').select('*'),
        sb.from('groups').select('*'),
      ])
      assertNoError([expensesR, participantsR, membersR, groupsR])

      const members = membersR.data || []
      const groups = groupsR.data || []
      if (groups.length === 0) {
        setError('Không tải được dữ liệu nhóm.')
        setLoading(false)
        return
      }

      const expenses = (expensesR.data || []).filter(e => e.status === 'approved')
      const participants = participantsR.data || []
      const transactions = buildDirectTransactions({ expenses, participants, members, groups, memberId })

      setData({ memberName, transactions })
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)', padding: '24px 16px', fontFamily: 'var(--vb-font-body)' }}>
      <h2 style={{ color: 'var(--text-1)', margin: '0 0 4px', fontSize: 20 }}>
        {monthLabel} của {data.memberName}
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 24px' }}>Các khoản bạn trực tiếp nợ hoặc được nhận</p>

      <div style={{ maxWidth: 440 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
          Giao dịch liên quan trực tiếp
        </div>

        {data.transactions.length === 0 ? (
          <div style={{ background: 'var(--surface-1)', borderRadius: 14, padding: '18px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
              Chưa có khoản nào
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45 }}>
              Chỉ các chi tiêu mà {data.memberName} là người trả hoặc người chia phần mới xuất hiện ở đây.
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-1)', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {data.transactions.map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                divider={index < data.transactions.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TransactionRow({ transaction, divider }) {
  const isOwedToMe = transaction.direction === 'owedToMe'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      padding: '14px 16px',
      borderBottom: divider ? '1px solid var(--border-1)' : 'none',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transaction.groupName}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transaction.expenseName}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 4 }}>
          {isOwedToMe ? `${transaction.counterpartyName} nợ bạn` : `Bạn nợ ${transaction.counterpartyName}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
          {isOwedToMe ? 'Được nhận' : 'Cần trả'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: isOwedToMe ? '#10B981' : '#EF4444' }}>
          {money(transaction.amount)}
        </div>
      </div>
    </div>
  )
}
