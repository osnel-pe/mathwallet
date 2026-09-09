import { createClient } from '@supabase/supabase-js'

const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

function validUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

export const supabaseConfigError = !url || !anonKey
  ? 'Faltan la URL o la clave pública de Supabase en el archivo .env.'
  : !validUrl(url)
    ? 'La URL de Supabase no es válida. Debe verse como https://xxxxx.supabase.co'
    : null

export const supabaseConfigured = !supabaseConfigError

let client = null
if (supabaseConfigured) {
  try {
    client = createClient(url, anonKey)
  } catch (error) {
    console.error('No se pudo iniciar Supabase:', error)
  }
}

export const supabase = client
