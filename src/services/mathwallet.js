import { supabase, supabaseConfigured } from '../lib/supabase'
import { inicioPeriodo } from '../lib/dates'

export function obtenerGrado(grupo = '') {
  const match = String(grupo).trim().match(/^([123])/)
  return match ? Number(match[1]) : null
}

export function esGrupoPermitido(grupo) {
  return [1, 2].includes(obtenerGrado(grupo))
}

export async function iniciarSesion(email, password) {
  if (!supabaseConfigured) {
    throw new Error('Primero configura Supabase en el archivo .env')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
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

export async function obtenerAlumnos() {
  if (!supabaseConfigured) return []

  const { data, error } = await supabase
    .from('alumnos')
    .select(`
      id,
      nombre,
      apellido_paterno,
      apellido_materno,
      sexo,
      grupo,
      saldo,
      nivel
    `)
    .order('grupo')
    .order('apellido_paterno')
    .order('nombre')

  if (error) throw error

  // Los alumnos de tercero nunca entran a MathWallet.
  return (data ?? []).filter((alumno) =>
    esGrupoPermitido(alumno.grupo)
  )
}

export async function obtenerAlumno(id) {
  if (!supabaseConfigured) {
    throw new Error('Supabase no está configurado')
  }

  const { data, error } = await supabase
    .from('alumnos')
    .select(`
      id,
      nombre,
      apellido_paterno,
      apellido_materno,
      sexo,
      grupo,
      saldo,
      nivel
    `)
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
  causa
}) {
  if (!supabaseConfigured) {
    throw new Error('Supabase no está configurado')
  }

  const { data, error } = await supabase.rpc(
    'registrar_movimiento_mathcoins',
    {
      p_alumno_id: alumnoId,
      p_cantidad: cantidad,
      p_causa: causa?.trim() || null
    }
  )

  if (error) throw error

  return data
}