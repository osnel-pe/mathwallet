import {
  supabase,
  supabaseConfigured
} from '../lib/supabase'

import { inicioPeriodo } from '../lib/dates'

export function obtenerGrado(grupo = '') {
  const match = String(grupo)
    .trim()
    .match(/^([123])/)

  return match ? Number(match[1]) : null
}

export function esGrupoPermitido(grupo) {
  return [1, 2].includes(
    obtenerGrado(grupo)
  )
}

function requireSupabase() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase no está configurado'
    )
  }
}

export async function iniciarSesion(
  email,
  password
) {
  requireSupabase()

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    })

  if (error) throw error

  return data.user
}

export async function cerrarSesion() {
  if (supabase) {
    await supabase.auth.signOut()
  }
}

const CAMPOS_ALUMNO = `
  id,
  nombre,
  apellido_paterno,
  apellido_materno,
  sexo,
  grupo,
  saldo,
  saldo_acumulado,
  nivel
`

export async function obtenerAlumnos() {
  if (!supabaseConfigured) return []

  const [{ data, error }, awards] = await Promise.all([
    supabase.from('alumnos').select(CAMPOS_ALUMNO)
      .order('grupo').order('apellido_paterno').order('nombre'),
    obtenerEstrellas()
  ])

  if (error) throw error

  return (data ?? []).filter(alumno => esGrupoPermitido(alumno.grupo)).map(alumno => ({ ...alumno, estrellas: awards.filter(e => Number(e.alumno_id) === Number(alumno.id)) }))
}

export async function obtenerAlumno(id) {
  requireSupabase()

  const [{ data, error }, awards] = await Promise.all([
    supabase.from('alumnos').select(CAMPOS_ALUMNO).eq('id', Number(id)).single(),
    obtenerEstrellas()
  ])

  if (error) throw error

  if (!esGrupoPermitido(data.grupo)) {
    throw new Error(
      'Este alumno no pertenece a primero ni segundo.'
    )
  }

  return { ...data, estrellas: awards.filter(e => Number(e.alumno_id) === Number(data.id)) }
}

export async function obtenerMovimientos(
  alumnoId,
  periodo = 'curso'
) {
  if (!supabaseConfigured) return []

  const { data, error } = await supabase
    .from('movimientos_mathcoins')
    .select('*')
    .eq('alumno_id', alumnoId)
    .gte('created_at', inicioPeriodo(periodo))
    .order('created_at', {
      ascending: false
    })

  if (error) throw error

  return data ?? []
}

export async function registrarMovimiento({
  alumnoId,
  cantidad,
  causa,
  tipo
}) {
  requireSupabase()

  const { data, error } = await supabase.rpc(
    'mw_registrar_movimiento',
    {
      p_alumno_id: alumnoId,
      p_cantidad: cantidad,
      p_causa: causa?.trim() || null,
      p_tipo: tipo
    }
  )

  if (error) throw error

  return data
}

export async function obtenerConfiguracionMathWallet() {
  requireSupabase()

  const { data, error } = await supabase
    .from('configuracion_mathwallet')
    .select(`
      periodo_actual,
      ciclo_escolar,
      updated_at
    `)
    .eq('id', 1)
    .single()

  if (error) throw error

  return data
}

export async function obtenerMetasMathCoins() {
  requireSupabase()

  const { data, error } = await supabase
    .from('metas_mathcoins')
    .select(`
      id,
      alumno_id,
      periodo,
      ciclo_escolar,
      meta,
      acumulado_alcanzado,
      alcanzada_at,
      alumno:alumnos!metas_mathcoins_alumno_id_fkey(
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        grupo,
        saldo,
        saldo_acumulado
      )
    `)
    .order('alcanzada_at', {
      ascending: false
    })

  if (error) throw error

  return data ?? []
}

export async function cambiarPeriodoMathWallet(
  nuevoPeriodo,
  confirmacion
) {
  requireSupabase()

  const { data, error } = await supabase.rpc(
    'mw_cambiar_periodo',
    {
      p_nuevo_periodo: Number(nuevoPeriodo),
      p_confirmacion: confirmacion
    }
  )

  if (error) throw error

  invalidarEstrellas()
  return data
}
// Caché breve y peticiones compartidas: las estrellas no requieren una
// descarga de todo el historial por cada alumno que se abre.
let starsCache = null
let starsExpires = 0
let starsPending = null
let starsVersion = 0
function invalidarEstrellas() {
  starsVersion += 1
  starsCache = null
  starsPending = null
  starsExpires = 0
}
export async function obtenerEstrellas() {
  if (starsCache && Date.now() < starsExpires) return starsCache
  if (starsPending) return starsPending
  const version = starsVersion
  const request = (async () => {
    const { data, error } = await supabase.rpc('mw_estrellas_actuales')
    if (error) throw error
    const records = data || []
    if (version === starsVersion) { starsCache = records; starsExpires = Date.now() + 30000 }
    return records
  })()
  starsPending = request
  try { return await request }
  finally { if (starsPending === request) starsPending = null }
}
export async function obtenerBloqueos() {
  const { data, error } = await supabase.from('mw_mathy_niveles').select('*').order('aventura').order('nivel')
  if (error) throw error
  return data || []
}
export async function cambiarBloqueos(aventura, desde, hasta, bloqueado) {
  const { error } = await supabase.rpc('mw_bloquear_niveles', { p_aventura: aventura, p_desde: desde, p_hasta: hasta, p_bloqueado: bloqueado })
  if (error) throw error
}
