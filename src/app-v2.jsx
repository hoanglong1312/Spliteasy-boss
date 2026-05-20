import React, { useState } from 'react'

import { useApp } from './store.jsx'
import { useScreenData } from './hooks/useScreenData'
import Home from './screens/Home'
import GroupsList from './screens/GroupsList'
import GroupDetail from './screens/GroupDetail'
import AddExpense from './screens/AddExpense'
import PickleballOverview from './screens/PickleballOverview'
import PickleballCalendar from './screens/PickleballCalendar'
import PickleballMembers from './screens/PickleballMembers'
import PickleballTickets from './screens/PickleballTickets'
import PickleballSettings from './screens/PickleballSettings'
import BatchEntry from './screens/BatchEntry'
import Profile from './screens/Profile'
import PaymentFlow from './screens/PaymentFlow'
import JoinGroup from './screens/JoinGroup'
import ExpenseDetail from './screens/ExpenseDetail'
import SessionDetail from './screens/SessionDetail'
import NewGroup from './screens/NewGroup'
import SettleAll from './screens/SettleAll'
import Notifications from './screens/Notifications'
import ApprovalQueue from './screens/ApprovalQueue'
import Settings from './screens/Settings'
import SettlementPeriod from './screens/SettlementPeriod'

export default function AppV2() {
  const { state, dispatch } = useApp()
  const {
    isTreasurer,
    homeData,
    groupsListData,
    groupDetailData,
    pickleballOverviewData,
    profileData,
    getGroupDetailData,
    getSessionDetailData,
    getPickleballCalendarData,
    getPickleballMembersData,
    getPickleballTicketsData,
    getPickleballSettingsData,
    getBatchEntryData,
    getPaymentFlowData,
    getJoinGroupData,
    newGroupData,
    getSettleAllData,
    notificationsData,
    approvalQueueData,
    accountSettingsData,
    getSettlementPeriodData,
    getExpenseDetailData,
  } = useScreenData()
  // Keys must match TAB_ITEMS in primitives.jsx: 'home','groups','pickleball','profile'
  const [activeTab, setActiveTab] = useState('home')
  const [stack, setStack] = useState([])
  const [awaitingPin, setAwaitingPin] = useState(() => (
    !!(
      localStorage.getItem('spliteasy_pin') &&
      localStorage.getItem('spliteasy_token') &&
      localStorage.getItem('spliteasy_member')
    )
  ))
  const [pinError, setPinError] = useState('')
  const [pinInput, setPinInput] = useState('')

  function submitPin(value = pinInput) {
    const stored = localStorage.getItem('spliteasy_pin')
    if (value === stored) {
      setAwaitingPin(false)
      setPinError('')
      setPinInput('')
    } else {
      setPinError('Mã PIN không đúng. Thử lại.')
      setPinInput('')
    }
  }

  function updatePinInput(value) {
    setPinInput(value)
    if (pinError) setPinError('')
  }

  async function handle(type, payload) {
    if (type === 'logout') {
      dispatch({ type: 'LOGOUT' })
      setStack([])
      setActiveTab('home')
      setAwaitingPin(false)
      setPinError('')
      setPinInput('')
      return
    }

    if (type === 'tab') {
      setActiveTab(payload)
      setStack([])
      return
    }

    if (type === 'push') {
      const route = typeof payload === 'string'
        ? { screen: payload }
        : { screen: payload?.screen, params: payload?.params }
      if (route.screen) setStack((s) => [...s, route])
      return
    }

    if (type === 'pop' || type === 'back' || type === 'close') {
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'open') {
      if (payload) {
        try {
          await dispatch({ type: 'SWITCH_GROUP', groupId: payload })
        } catch (err) {
          console.error('switch group failed', err)
        }
      }
      setStack((s) => [...s, { screen: 'group-detail', params: { groupId: payload } }])
      return
    }

    if (type === 'attend' || type === 'sessionDetail') {
      setStack((s) => [...s, { screen: 'session-detail', params: { sessionId: payload } }])
      return
    }

    if (type === 'settings') {
      const route = stack[stack.length - 1]
      const routeScreen = String(route?.screen || '')
      const fromPickleball = activeTab === 'pickleball' || routeScreen.startsWith('pickleball')
      setStack((s) => [...s, { screen: fromPickleball ? 'pickleball-settings' : 'settings', params: payload }])
      return
    }

    if (type === 'saveSettings' || (type === 'save' && stack[stack.length - 1]?.screen === 'pickleball-settings')) {
      console.log('saveSettings', payload)
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'addMember') {
      alert('Chức năng thêm thành viên — coming soon')
      return
    }

    if (type === 'subTab') {
      const SUBTAB_TO_SCREEN = {
        overview: 'pickleball-overview',
        calendar: 'pickleball-calendar',
        members: 'pickleball-members',
        tickets: 'pickleball-tickets',
      }
      if (payload === 'overview') {
        setStack([])
      } else if (SUBTAB_TO_SCREEN[payload]) {
        setStack((s) => [...s, { screen: SUBTAB_TO_SCREEN[payload] }])
      }
      return
    }

    if (type === 'copyAccount') {
      const text = typeof payload === 'string' ? payload : (payload?.account || '')
      if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
      return
    }

    if (type === 'confirm') {
      console.log('confirm payload', payload)
      const route = stack[stack.length - 1]
      const paymentData = route?.screen === 'payment-flow'
        ? getPaymentFlowData(route.params)
        : null
      const settlement = payload?.settlement || (payload?.fromId && payload?.toId ? payload : null) || paymentData?.settlement
      if (settlement) {
        await dispatch({
          type: 'SETTLE_DEBT',
          groupId: payload?.groupId || settlement.groupId || state.currentGroupId,
          settlement,
        })
      }
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'save') {
      if (payload?.title && payload?.amount != null) {
        if (!state.currentUserId) throw new Error('Chưa đăng nhập. Vui lòng tham gia nhóm trước.')
        const groupId = payload.groupId || state.currentGroupId
        if (!groupId) throw new Error('Không xác định được nhóm. Vui lòng mở nhóm trước khi thêm chi tiêu.')
        await dispatch({
          type: 'ADD_EXPENSE',
          groupId,
          expense: {
            title: payload.title,
            amount: Number(payload.amount) || 0,
            paidBy: payload.paidBy,
            category: payload.category,
            cat: payload.category,
            date: dateFromLabel(payload.dateLabel),
            participants: payload.participants || [],
            splitMode: payload.splitMode,
          },
          isTreasurer,
        })
        setStack((s) => s.slice(0, -1))
        return
      }
      console.log('save', payload)
      return
    }

    if (type === 'saveWater') {
      const route = stack[stack.length - 1]
      const sessionId = payload?.sessionId ?? route?.params?.sessionId ?? route?.params
      const total = Number(payload?.total) || 0
      const sessionData = getSessionDetailData(sessionId)
      const participants = (sessionData?.presentMembers || []).map((m) => m.id)
      if (sessionId && total > 0) {
        await dispatch({
          type: 'ADD_PICKLE_EXPENSE',
          sessionId,
          expense: {
            title: 'Tiền nước',
            amount: total,
            paidBy: state.currentUserId,
            category: 'water',
            cat: 'water',
            participants,
          },
        })
      }
      return
    }

    if (type === 'togglePresence') {
      const route = stack[stack.length - 1]
      const sessionId = payload?.sessionId ?? route?.params?.sessionId ?? route?.params
      const memberId = payload?.memberId ?? payload
      if (sessionId && memberId) {
        const sessionData = getSessionDetailData(sessionId)
        const isPresent = (sessionData?.presentMembers || []).some((m) => String(m.id) === String(memberId))
        await dispatch({
          type: 'CONFIRM_ATTENDANCE',
          sessionId,
          memberId,
          attending: payload?.attending ?? !isPresent,
        })
      }
      return
    }

    if (type === 'edit') {
      const route = stack[stack.length - 1]
      const expenseId = route?.params?.expenseId ?? route?.params?.id ?? route?.params
      const expenseData = getExpenseDetailData(expenseId)
      setStack((s) => [...s, { screen: 'add-expense', params: payload || expenseData?.expense || expenseData }])
      return
    }

    if (type === 'delete') {
      const route = stack[stack.length - 1]
      const expenseId = payload?.expenseId ?? payload?.id ?? route?.params?.expenseId ?? route?.params?.id ?? route?.params
      if (expenseId) {
        await dispatch({ type: 'DELETE_EXPENSE', expenseId, groupId: state.currentGroupId })
      }
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'payNow') {
      const route = stack[stack.length - 1]
      const expenseId = route?.params?.expenseId ?? route?.params?.id ?? route?.params
      const expenseData = getExpenseDetailData(expenseId)
      const memberId = payload?.memberId ?? payload?.toId ?? expenseData?.payer?.id ?? payload
      setStack((s) => [...s, { screen: 'payment-flow', params: { memberId, amount: payload?.amount } }])
      return
    }

    if (type === 'joinGroup') {
      const { joinGroup } = await import('./lib/auth.js')
      const result = await joinGroup(payload.code, payload.memberName)
      await dispatch({
        type: 'LOGIN',
        token: result.token,
        memberId: result.member_id,
        groupId: result.group_id,
        memberName: result.member_name,
      })
      const storedPin = localStorage.getItem('spliteasy_pin')
      if (storedPin) {
        setAwaitingPin(true)
        return
      }
      return
    }

    if (type === 'create') {
      if (!payload?.name?.trim()) return
      try {
        await dispatch({ type: 'CREATE_GROUP', group: payload })
        setStack((s) => s.slice(0, -1))
      } catch (err) {
        console.error('create group failed', err)
      }
      return
    }

    if (type === 'approveJoin' || type === 'approve') {
      await dispatch({ type: 'APPROVE_JOIN_REQUEST', requestId: payload })
      return
    }

    if (type === 'rejectJoin' || type === 'reject' || type === 'decline') {
      await dispatch({ type: 'REJECT_JOIN_REQUEST', requestId: payload })
      return
    }

    if (type === 'approveAll') {
      await Promise.all((state.joinRequests || []).map((req) => (
        dispatch({ type: 'APPROVE_JOIN_REQUEST', requestId: req.id })
      )))
      return
    }

    if (type === 'payOne') {
      setStack((s) => [...s, { screen: 'payment-flow', params: { memberId: payload } }])
      return
    }

    if (type === 'closePeriod') {
      setStack((s) => [...s, { screen: 'settlement-period', params: payload }])
      return
    }

    if (type === 'color') {
      await dispatch({ type: 'UPDATE_MEMBER_COLOR', color: payload })
      return
    }

    if (type === 'exportCsv') {
      exportStateCsv(state)
      return
    }

    if (type === 'saveBank') {
      await dispatch({ type: 'UPDATE_BANK_INFO', bankInfo: payload })
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'addGuest') {
      console.log('addGuest', payload)
      return
    }

    if (type === 'filter') {
      return
    }

    if ([
      'receive',
      'markAllRead',
      'addName',
      'editBank',
      'addBank',
      'changePin',
      'removePin',
      'setPin',
      'changeLanguage',
      'deleteAccount',
      'more',
      'menu',
      'help',
      'shareQR',
      'toggleBreakdown',
      'changeRecipient',
      'removeGuest',
      'addAccessory',
      'reschedule',
      'remindAll',
      'confirmClose',
      'expandMembers',
      'monthPrev',
      'monthNext',
      'complete',
      'saveAll',
      'uploadPhoto',
      'promote',
      'add',
    ].includes(type)) {
      console.log(type, payload)
      return
    }

    if (type === 'fab') {
      setStack((s) => [...s, { screen: 'add-expense', params: payload }])
      return
    }

    const ACTION_TO_SCREEN = {
      addExpense:       'add-expense',
      payment:          'payment-flow',
      pay:              'payment-flow',
      settings:         'settings',
      pickleballSettings: 'pickleball-settings',
      batchEntry:       'batch-entry',
      newGroup:         'new-group',
      notifications:    'notifications',
      approvalQueue:    'approval-queue',
      settleAll:        'settle-all',
      settle:           'settle-all',
      settlementPeriod: 'settlement-period',
      closeMonth:       'settlement-period',
      closePeriod:      'settlement-period',
      join:             'join-group',
      expenseDetail:    'expense-detail',
      sessionDetail:    'session-detail',
      accountSettings:  'settings',
    }

    if (ACTION_TO_SCREEN[type]) {
      setStack((s) => [...s, { screen: ACTION_TO_SCREEN[type], params: payload }])
      return
    }

    console.log('onAction', type, payload)
  }

  if (!state.currentUserId) {
    return (
      <div style={{ minHeight: '100vh', background: '#07080f' }}>
        <JoinGroup data={getJoinGroupData()} onAction={handle} />
      </div>
    )
  }

  if (awaitingPin) {
    return (
      <div style={{ minHeight: '100vh', background: '#07080f' }}>
        <PinEntryScreen
          error={pinError}
          value={pinInput}
          onChange={updatePinInput}
          onSubmit={submitPin}
        />
      </div>
    )
  }

  function renderTabScreen() {
    switch (activeTab) {
      case 'groups':
        return <GroupsList data={groupsListData} onAction={handle} />
      case 'pickleball':
        return <PickleballOverview data={pickleballOverviewData} isTreasurer={isTreasurer} onAction={handle} />
      case 'profile':
        return <Profile data={profileData} isTreasurer={isTreasurer} onAction={handle} />
      case 'home':
      default:
        return <Home data={homeData} onAction={handle} />
    }
  }

  function renderStackScreen(route) {
    switch (route.screen) {
      case 'group-detail':        return <GroupDetail data={route.params?.groupId ? getGroupDetailData(route.params.groupId) : groupDetailData} isTreasurer={isTreasurer} onAction={handle} />
      case 'add-expense':         return <AddExpense data={buildAddExpenseData(groupDetailData)} onAction={handle} />
      case 'pickleball-calendar': return <PickleballCalendar data={getPickleballCalendarData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'pickleball-members':  return <PickleballMembers data={getPickleballMembersData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'pickleball-tickets':  return <PickleballTickets data={getPickleballTicketsData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'pickleball-settings': return <PickleballSettings data={getPickleballSettingsData()} onAction={handle} />
      case 'batch-entry':         return <BatchEntry data={getBatchEntryData()} onAction={handle} />
      case 'payment-flow':        return <PaymentFlow data={getPaymentFlowData(route.params)} onAction={handle} />
      case 'join-group':          return <JoinGroup data={getJoinGroupData()} onAction={handle} />
      case 'expense-detail':      return <ExpenseDetail data={getExpenseDetailData(route.params?.expenseId ?? route.params)} onAction={handle} />
      case 'session-detail':      return <SessionDetail data={getSessionDetailData(route.params?.sessionId ?? route.params)} isTreasurer={isTreasurer} onAction={handle} />
      case 'new-group':           return <NewGroup data={newGroupData} onAction={handle} />
      case 'settle-all':          return <SettleAll data={getSettleAllData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'notifications':       return <Notifications data={notificationsData} onAction={handle} />
      case 'approval-queue':      return <ApprovalQueue data={approvalQueueData} isTreasurer={isTreasurer} onAction={handle} />
      case 'settings':            return <Settings data={accountSettingsData} onAction={handle} />
      case 'settlement-period':   return <SettlementPeriod data={getSettlementPeriodData(route.params)} onAction={handle} />
      default:
        return renderTabScreen()
    }
  }

  function renderCurrent() {
    if (stack.length > 0) {
      return renderStackScreen(stack[stack.length - 1])
    }

    return renderTabScreen()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07080f' }}>
      {renderCurrent()}
    </div>
  )
}

function dateFromLabel(label) {
  const match = String(label || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return new Date().toISOString().slice(0, 10)
  const [, day, month, year] = match
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function exportStateCsv(state) {
  const members = (state.members || [])
  const expenses = (state.homeMonthExpenses || [])
  const findName = (id) => members.find(m => m.id === id)?.name || id || ''

  const rows = [
    ['Ngày', 'Tiêu đề', 'Số tiền', 'Người chi', 'Trạng thái', 'Nhóm'],
  ]
  expenses.forEach(ep => {
    const e = ep.expenses || ep
    rows.push([
      e.expense_date || e.date || '',
      e.title || '',
      e.amount || '',
      findName(e.paid_by_member_id || e.paidBy),
      e.status || '',
      e.groups?.name || '',
    ])
  })

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spliteasy-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function buildAddExpenseData(groupDetailData) {
  const members = (groupDetailData?.members || []).map((member) => ({
    id: member.id,
    name: member.name,
    initial: member.initial || member.initials || String(member.name || '?').slice(0, 2),
  }))

  return {
    groupName: groupDetailData?.name || groupDetailData?.group?.name || 'Nhóm',
    members,
  }
}

function PinEntryScreen({ error, value, onChange, onSubmit }) {
  return (
    <div style={{
      width: 375,
      minHeight: 812,
      margin: '24px auto',
      background: '#07080f',
      borderRadius: 38,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 8px #1a1c28',
      fontFamily: "'Inter', sans-serif",
      color: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0 }}>Nhập mã PIN</div>
      <div style={{ display: 'flex', gap: 14 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: i < value.length ? '#6366f1' : 'transparent',
            border: i < value.length ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
            boxShadow: i < value.length ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
          }} />
        ))}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>{error}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, i) => {
          if (key === '') return <div key={i} />
          const isBackspace = key === '⌫'
          return (
            <button key={i} onClick={() => {
              if (isBackspace) {
                onChange(value.slice(0, -1))
                return
              }
              const next = value.length < 6 ? `${value}${key}` : value
              onChange(next)
              if (next.length === 6) onSubmit(next)
            }} style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: isBackspace ? 20 : 24,
              fontWeight: 700,
              color: '#f1f5f9',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>{key}</button>
          )
        })}
      </div>
      <button onClick={() => onSubmit()} style={{
        padding: '14px 48px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: 'none',
        color: 'white',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
        opacity: value.length === 6 ? 1 : 0.4,
      }}>Xác nhận</button>
    </div>
  )
}
