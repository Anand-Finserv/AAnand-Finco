import React    from 'react'
import ReactDOM from 'react-dom/client'
import App      from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)

// PWA: register the (minimal, safe) service worker – production only.
// Any failure is silently ignored so it can never affect the app.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
