import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store.jsx'
import { ToastProvider, useToast } from './lib/toast.jsx'
import AppV2 from './app-v2'

function AppWithProviders() {
  const { addToast } = useToast()

  return (
    <AppProvider onToast={addToast}>
      <AppV2 />
    </AppProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <AppWithProviders />
  </ToastProvider>
)
