import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/geist/400.css'
import '@fontsource/geist/500.css'
import '@fontsource/geist/700.css'
import '@fontsource/geist/800.css'
import '@fontsource/geist/900.css'
import { AppProvider } from './store.jsx'
import AppV2 from './app-v2'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <AppV2 />
  </AppProvider>
)
