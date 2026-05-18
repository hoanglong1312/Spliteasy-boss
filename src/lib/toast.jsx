import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function showBrowserNotification(message, type) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (typeof document === 'undefined' || !document.hidden) return
  if (Notification.permission !== 'granted') return

  const icons = { success: '✅', warning: '⚠️', info: 'ℹ️' }
  new Notification('SpliteasyBoss', {
    body: `${icons[type] || icons.info} ${message}`,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'spliteasy-' + Date.now(),
  })
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    setToasts(ts => [...ts, { id, message, type }])
    setTimeout(() => removeToast(id), 3000)
    showBrowserNotification(message, type)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

const TYPE_COLOR = {
  info:    'var(--brand-1)',
  success: '#10B981',
  warning: '#F59E0B',
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          style={{
            pointerEvents: 'auto',
            background: 'var(--surface-1, #fff)',
            borderLeft: `4px solid ${TYPE_COLOR[t.type] || TYPE_COLOR.info}`,
            borderRadius: 10,
            padding: '10px 14px',
            maxWidth: 280,
            fontSize: 13,
            color: 'var(--text-1, #111)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            animation: 'toast-in 0.2s ease',
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
