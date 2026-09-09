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

  const { data, error } = await supabase
    .from('alumnos')
    .select(CAMPOS_ALUMNO)
    .order('grupo')
    .order('apellido_paterno')
    .order('nombre')

  if (error) throw error

  return (data ?? []).filter((alumno) =>
    esGrupoPermitido(alumno.grupo)
  )
}

export async function obtenerAlumno(id) {
  requireSupabase()

  const { data, error } = await supabase
    .from('alumnos')
    .select(CAMPOS_ALUMNO)
    .eq('id', Number(id))
    .single()

  if (error) throw error

  if (!esGrupoPermitido(data.grupo)) {
    throw new Error(
      'Este alumno no pertenece a primero ni segundo.'
    )
  }

  return data
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
    'registrar_movimiento_mathcoins',
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
    'cambiar_periodo_mathwallet',
    {
      p_nuevo_periodo: Number(nuevoPeriodo),
      p_confirmacion: confirmacion
    }
  )

  if (error) throw error

  return data
}