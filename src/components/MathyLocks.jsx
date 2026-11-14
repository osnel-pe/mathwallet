import { useEffect, useState } from 'react'
import { obtenerBloqueos } from '../services/mathwallet'
import { getSuperMathyLocks } from '../services/superMathy'
export function summarizeLocks(rows, adventure) {
  const nums = rows
    .filter((r) => r.aventura === adventure && r.bloqueado)
    .map((r) => r.nivel)
    .sort((a, b) => a - b)
  const ranges = []
  for (const n of nums) {
    const last = ranges[ranges.length - 1]
    if (last && last[1] + 1 === n) last[1] = n
    else ranges.push([n, n])
  }
  return ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ')
}
export default function MathyLocks({ onChange }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const load = () =>
      Promise.all([obtenerBloqueos(), getSuperMathyLocks()])
        .then((parts) => {
          const data = parts.flat()
          return data
        })
        .then((data) => {
          if (alive) {
            setRows(data)
            setError('')
            onChange?.(data)
          }
        })
        .catch(() => {
          if (alive) setError('No pudimos actualizar los niveles disponibles.')
        })
    load()
    const timer = setInterval(load, 15000)
    window.addEventListener('focus', load)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('focus', load)
    }
  }, [onChange])
  const locked = [1, 2, 3].map((n) => [n, summarizeLocks(rows, n)]).filter(([, text]) => text)
  return error ? (
    <p className="mw-lock-summary" role="alert">
      {error}
    </p>
  ) : locked.length ? (
    <aside className="mw-lock-summary">
      <b>🔒 Niveles cerrados por tu maestro</b>
      {locked.map(([n, text]) => (
        <details key={n}>
          <summary>
            Mathy {n} · {rows.filter((r) => r.aventura === n && r.bloqueado).length} niveles
          </summary>
          <small>{text}</small>
        </details>
      ))}
    </aside>
  ) : null
}
