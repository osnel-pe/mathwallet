import { supabase, supabaseConfigured } from '../lib/supabase'
function uuid() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16)
      return (c === 'x' ? r : (r & 3) | 8).toString(16)
    })
  )
}
export function operationId() {
  return uuid()
}
export function createSuperMathyApi(studentId) {
  let token = null,
    version = 0
  const key = `super-mathy:session:${studentId}`
  return {
    async connect() {
      if (!supabaseConfigured) throw Error('Configura Supabase antes de entrar a Super Mathy.')
      try {
        const value = localStorage.getItem(key)
        if (/^[a-f0-9-]{36}$/i.test(value || '')) token = value
      } catch {}
      const { data, error } = await supabase.rpc('super_mathy_acceso', {
        p_alumno_id: Number(studentId),
        p_token: token,
      })
      if (error) throw error
      if (!data?.estado?.diamantes || !Number.isInteger(data.estado.diamantes_total)) {
        throw Error(
          'El servidor todavía no tiene activo el guardado de diamantes. Ejecuta 20261115_super_mathy_diamantes.sql y vuelve a entrar.',
        )
      }
      token = data.token
      version = data.estado.version
      try {
        localStorage.setItem(key, token)
      } catch {}
      return data.estado
    },
    prepare(type, level, gate = null, answer = null) {
      return { token, operation: uuid(), version, type, level, gate, answer }
    },
    async send(op) {
      // Se fija la versión en el primer envío real, después de las recogidas previas.
      // Los reintentos conservan operación y versión originales.
      if (!op.sent) {
        op.version = version
        op.sent = true
      }
      const { data, error } =
        op.type === 'gems'
          ? await supabase.rpc('super_mathy_diamantes', {
              p_token: token,
              p_operacion: op.operation,
              p_version: op.version,
              p_nivel: op.level,
              p_diamantes: op.answer,
            })
          : await supabase.rpc('super_mathy_evento', {
              p_token: token,
              p_operacion: op.operation,
              p_version: op.version,
              p_tipo: op.type,
              p_nivel: op.level,
              p_puerta: op.gate,
              p_respuesta: op.answer == null ? null : String(op.answer),
            })
      if (error) throw error
      version = data.estado.version
      return data
    },
  }
}
// Solo se usa si la demo recibe explícitamente un banco de práctica externo.
// No comparte progreso, tokens ni movimientos con la API real.
export function createPracticeApi(questions, grade = 1) {
  let state = {
      grado: grade,
      abiertas: [],
      completados: [],
      desbloqueado: 0,
      activo: 0,
      corazones: 3,
      reinicio: false,
      version: 0,
      ganados: 0,
      ganados_diamantes: 0,
      diamantes_total: 0,
      diamantes: {},
      perdidos: 0,
      saldo: 50,
      saldo_acumulado: 50,
      nivel: 1,
      ciclo: 'DEMO',
    },
    done = new Map()
  const serialize = () => {
    const q = questions.find((q) => q.grade === grade && q.id === state.abiertas.length + 1)
    return {
      ...state,
      diamantes: Object.fromEntries(Object.entries(state.diamantes).map(([k, v]) => [k, [...v]])),
      abiertas: [...state.abiertas],
      completados: [...state.completados],
      pregunta: q
        ? {
            id: q.id,
            topic: q.topic,
            question: q.question,
            options: q.options,
            hint: q.hint,
            blocked: false,
          }
        : null,
    }
  }
  return {
    async connect() {
      return serialize()
    },
    prepare(type, level, gate, answer) {
      return { operation: uuid(), type, level, gate, answer }
    },
    async send(op) {
      if (done.has(op.operation))
        return {
          ...done.get(op.operation),
          repetido: true,
          version_operacion: done.get(op.operation).estado.version,
          delta: 0,
          delta_original: done.get(op.operation).delta,
          estado: serialize(),
        }
      let correct = false,
        restart = false,
        delta = 0,
        explanation = ''
      if (op.type === 'begin') state.activo = op.level
      if (op.type === 'answer') {
        const q = questions.find((q) => q.grade === grade && q.id === op.gate)
        correct = String(op.answer) === q.correct
        explanation = correct ? q.explanation : q.hint
        if (correct && !state.abiertas.includes(op.gate)) {
          state.abiertas.push(op.gate)
          state.reinicio = false
          state.ganados += 4
          delta = 4
        }
      }
      if (op.type === 'gems') {
        const before = state.diamantes_total
        const collected = new Set(state.diamantes[op.level] || [])
        for (const id of op.answer) collected.add(id)
        state.diamantes[op.level] = [...collected]
        state.diamantes_total = Object.values(state.diamantes).reduce((sum, v) => sum + v.length, 0)
        delta = Math.floor(state.diamantes_total / 2) - Math.floor(before / 2)
        state.ganados_diamantes += delta
        state.ganados += delta
      }
      if (op.type === 'damage') {
        state.corazones--
        if (state.corazones === 0) {
          state.corazones = 3
          state.reinicio = true
          restart = true
          delta = state.saldo > 0 ? -1 : 0
          state.perdidos += Math.abs(delta)
        }
      }
      if (op.type === 'finish' && !state.completados.includes(op.level)) {
        state.completados.push(op.level)
        state.desbloqueado = Math.max(state.desbloqueado, Math.min(9, op.level + 1))
        state.corazones = 3
        state.reinicio = false
      }
      state.version++
      state.saldo = Math.max(0, state.saldo + delta)
      state.saldo_acumulado = Math.max(0, state.saldo_acumulado + delta)
      const result = {
        correcto: correct,
        reinicio: restart,
        delta,
        delta_original: delta,
        explicacion: explanation,
        estado: serialize(),
      }
      done.set(op.operation, result)
      return result
    },
  }
}
export async function getSuperMathyLocks() {
  const { data, error } = await supabase.from('sm_puertas').select('id,bloqueado').order('id')
  if (error) throw error
  return (data || []).map((row) => ({ aventura: 3, nivel: row.id, bloqueado: row.bloqueado }))
}
export async function setSuperMathyLocks(from, to, blocked) {
  const { error } = await supabase.rpc('super_mathy_docente', {
    p_desde: Number(from),
    p_hasta: Number(to),
    p_bloqueado: blocked,
  })
  if (error) throw error
}
export async function setSuperMathyGrade(student, grade) {
  const { error } = await supabase.rpc('super_mathy_asignar', {
    p_alumno: Number(student),
    p_grado: Number(grade),
  })
  if (error) throw error
}

// Realtime para reaccionar al bloqueo; consulta periódica como respaldo.
export function watchSuperMathyLocks(onState) {
  if (!supabaseConfigured || !supabase) {
    onState([], true)
    return () => {}
  }
  let live = true,
    reading = false,
    revision = 0
  const rows = new Map()
  const emit = () => onState([...rows.values()], false)
  async function refresh() {
    if (!live || reading) return
    reading = true
    const started = revision
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      let result
      try {
        result = await supabase.rpc('super_mathy_bloqueos').abortSignal(controller.signal)
      } finally {
        clearTimeout(timeout)
      }
      const { data, error } = result
      if (error) throw error
      if (!Array.isArray(data) || data.length !== 50) throw Error('Estado de bloqueo incompleto')
      if (live && revision === started) {
        rows.clear()
        data.forEach((row) => rows.set(row.id, row))
        emit()
      }
    } catch {
      if (live) onState([], true)
    } finally {
      reading = false
    }
  }
  const channel = supabase
    .channel(`super-mathy-locks-${uuid()}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sm_puertas' },
      ({ new: row }) => {
        if (!live) return
        revision++
        rows.set(row.id, row)
        if (rows.size === 50) emit()
        else refresh()
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh()
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status) && live) onState([], true)
    })
  refresh()
  const timer = setInterval(refresh, 2000)
  const focus = () => {
    if (live) {
      onState([], true)
      refresh()
    }
  }
  window.addEventListener('focus', focus)
  window.addEventListener('online', focus)
  window.addEventListener('offline', focus)
  return () => {
    live = false
    clearInterval(timer)
    supabase.removeChannel(channel)
    window.removeEventListener('focus', focus)
    window.removeEventListener('online', focus)
    window.removeEventListener('offline', focus)
  }
}
