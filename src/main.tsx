import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts'
import './index.css'
import App from './App'
import i18n from './i18n'

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

document.title = `${i18n.t('common.appName')} · ${i18n.t('common.bengaliName')}`

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
