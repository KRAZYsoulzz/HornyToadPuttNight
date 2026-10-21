import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/anton'
import '@fontsource/space-grotesk'
import '@fontsource/space-mono'
import './theme/tokens.css'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
