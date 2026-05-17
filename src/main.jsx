import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store.jsx'
import { IOSDevice } from './ios-frame.jsx'
import App from './app.jsx'
import './vb-tokens.css'

function Mount() {
  return (
    <IOSDevice width={402} height={874} dark={false}>
      <App />
    </IOSDevice>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <Mount />
  </AppProvider>
)
