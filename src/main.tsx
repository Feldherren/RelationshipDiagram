import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { getAppPreferences } from './utils/appPreferences'
import { applyAppearance } from './utils/uiTheme'

const prefs = getAppPreferences()
applyAppearance(prefs.themePreference, prefs.customThemes, prefs.uiScale)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
