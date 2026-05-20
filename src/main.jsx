import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store.jsx'
import AppV2 from './app-v2'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <AppV2 />
  </AppProvider>
)
