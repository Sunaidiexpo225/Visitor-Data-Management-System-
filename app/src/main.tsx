import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ConfigError from './components/ConfigError.tsx'
import { supabaseConfigured } from './lib/supabase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? <App /> : <ConfigError />}
  </StrictMode>,
)
