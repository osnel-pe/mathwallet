import { supabase, supabaseConfigured } from '../lib/supabase'

async function rpc(name, parameters) {
  if (!supabaseConfigured) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase.rpc(name, parameters)
  if (error) throw error
  return data
}

export const accederMathy2 = (alumnoId) =>
  rpc('mathy2_acceso_directo', { p_alumno_id: Number(alumnoId) })

export const responderMathy2 = (alumnoId, clave, nivel, intento, respuesta) =>
  rpc('mathy2_resolver', {
    p_alumno_id: Number(alumnoId),
    p_clave: clave,
    p_nivel: Number(nivel),
    p_intento: Number(intento),
    p_respuesta: respuesta
  })
