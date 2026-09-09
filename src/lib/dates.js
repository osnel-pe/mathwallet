export function inicioPeriodo(periodo) {
  const now = new Date()
  const start = new Date(now)
  if (periodo === 'dia') start.setHours(0, 0, 0, 0)
  if (periodo === 'semana') {
    const day = (now.getDay() + 6) % 7
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
  }
  if (periodo === 'mes') start.setFullYear(now.getFullYear(), now.getMonth(), 1)
  if (periodo === 'curso') {
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    start.setFullYear(year, 8, 1)
    start.setHours(0, 0, 0, 0)
  }
  return start.toISOString()
}

export function fechaCorta(value) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value))
}
