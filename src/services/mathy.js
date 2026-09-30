import { supabase, supabaseConfigured } from '../lib/supabase'

async function rpc(name, parameters) {
  if (!supabaseConfigured) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase.rpc(name, parameters)
  if (error) throw error
  return data
}

export const generarClaveMathy = (alumnoId) =>
  rpc('mathy_generar_clave', { p_alumno_id: Number(alumnoId) })

export const cargarMathy = (alumnoId, clave) =>
  rpc('mathy_estado', { p_alumno_id: Number(alumnoId), p_clave: clave })

export const resolverMathy = (alumnoId, clave, retoId, respuesta) =>
  rpc('mathy_resolver', {
    p_alumno_id: Number(alumnoId),
    p_clave: clave,
    p_reto_id: Number(retoId),
    p_respuesta: respuesta
  })

  export const accederMathyDirecto = (alumnoId) =>
  rpc('mathy_acceso_directo', {
    p_alumno_id: Number(alumnoId)
  })