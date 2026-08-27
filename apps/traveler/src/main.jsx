import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAuth, loadDestinations } from './store'

// Restores a signed-in session (if any) and loads the published
// destinations cache before the first render — the country picker and
// dashboard theming both need it synchronously during render (see
// store.js's travelerCountry/publishedDestinations).
Promise.all([initAuth(), loadDestinations()]).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
