// Respaldo de recogidas pendientes, no un saldo ni una fuente de premios.
// Supabase vuelve a validar cada ID y evita pagar una recogida dos veces.
function key(student, cycle) {
  return `super-mathy:gems-pending:v1:${student}:${cycle}`
}
export function readGemJournal(student, cycle) {
  try {
    const raw = JSON.parse(localStorage.getItem(key(student, cycle)) || '{}')
    const result = {}
    for (const [level, ids] of Object.entries(raw || {})) {
      if (!/^[0-9]$/.test(level) || !Array.isArray(ids)) continue
      const valid = [
        ...new Set(
          ids.filter((id) => typeof id === 'string' && /^[0-4]:(base|top|air):[0-9]+$/.test(id))
        )
      ]
      if (valid.length) result[level] = valid
    }
    return result
  } catch {
    return {}
  }
}
function save(student, cycle, value) {
  try {
    localStorage.setItem(key(student, cycle), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
export function rememberGem(student, cycle, level, id) {
  const value = readGemJournal(student, cycle)
  value[level] = [...new Set([...(value[level] || []), id])]
  return save(student, cycle, value)
}
export function acknowledgeGems(student, cycle, level, ids) {
  const value = readGemJournal(student, cycle),
    accepted = new Set(ids)
  value[level] = (value[level] || []).filter((id) => !accepted.has(id))
  if (!value[level].length) delete value[level]
  return save(student, cycle, value)
}
