import { useEffect, useState } from 'react'
import { obtenerBloqueos, cambiarBloqueos } from '../services/mathwallet'
import { getSuperMathyLocks, setSuperMathyLocks, setSuperMathyGrade } from '../services/superMathy'
export default function MathyControl() {
  const [rows, setRows] = useState([]),
    [adventure, setAdventure] = useState(1),
    [from, setFrom] = useState(1),
    [to, setTo] = useState(100),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [student, setStudent] = useState(''),
    [grade, setGrade] = useState(1)
  const max = adventure === 1 ? 100 : 50,
    label = adventure === 3 ? 'Super Mathy' : `Mathy ${adventure}`
  useEffect(() => {
    let live = true
    setBusy(true)
    setError('')
    setNotice('')
    ;(adventure === 3 ? getSuperMathyLocks() : obtenerBloqueos())
      .then((data) => {
        if (live) setRows(data)
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
      .finally(() => {
        if (live) setBusy(false)
      })
    return () => {
      live = false
    }
  }, [adventure])
  const valid =
    Number.isInteger(Number(from)) &&
    Number.isInteger(Number(to)) &&
    Number(from) >= 1 &&
    Number(to) >= Number(from) &&
    Number(to) <= max
  async function save(blocked, first = from, last = to) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (adventure === 3) await setSuperMathyLocks(first, last, blocked)
      else await cambiarBloqueos(adventure, Number(from), Number(to), blocked)
      setRows(adventure === 3 ? await getSuperMathyLocks() : await obtenerBloqueos())
      setNotice(
        `${label} · ${adventure === 3 ? 'puertas' : 'niveles'} ${first}–${last} ${blocked ? 'bloqueados' : 'desbloqueados'} para todos.`,
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const levels = rows.filter((r) => r.aventura === adventure)
  return (
    <section className="mw-control coin-form">
      <span className="eyebrow">EL MAESTRO MARCA EL RITMO</span>
      <h2>Misiones disponibles</h2>
      <p>Controla qué retos pueden resolver los alumnos. Los logros anteriores se conservan.</p>
      <div className="tabs">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            disabled={busy}
            className={adventure === n ? 'active' : ''}
            onClick={() => {
              setAdventure(n)
              setFrom(1)
              setTo(n === 1 ? 100 : 50)
            }}
          >
            {n === 3 ? 'Super Mathy' : `Mathy ${n}`}
          </button>
        ))}
      </div>
      {adventure === 3 && (
        <div className="mw-range">
          <button className="primary" disabled={busy} onClick={() => save(true, 1, 50)}>
            🔒 Bloquear todo Super Mathy
          </button>
          <button className="secondary" disabled={busy} onClick={() => save(false, 1, 50)}>
            Desbloquear todo Super Mathy
          </button>
        </div>
      )}
      <fieldset className="mw-fields" disabled={busy}>
        <legend>{adventure === 3 ? 'Rango de puertas' : 'Rango de niveles'}</legend>
        <div className="mw-range">
          <label>
            Desde
            <input
              type="number"
              min="1"
              max={max}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="number"
              min="1"
              max={max}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="mw-range">
          <button className="primary" disabled={!valid} onClick={() => save(true)}>
            Bloquear rango
          </button>
          <button className="secondary" disabled={!valid} onClick={() => save(false)}>
            Desbloquear rango
          </button>
        </div>
      </fieldset>
      <p className="mw-ranking-note">
        {levels.filter((r) => r.bloqueado).length}/{max} bloqueados · toca un número para
        seleccionarlo
      </p>
      <div className="mw-level-grid">
        {levels.map((r) => (
          <button
            key={r.nivel}
            disabled={busy}
            aria-label={`${adventure === 3 ? 'Puerta' : 'Nivel'} ${r.nivel}, ${r.bloqueado ? 'bloqueado' : 'abierto'}`}
            className={r.bloqueado ? 'locked' : ''}
            onClick={() => {
              setFrom(r.nivel)
              setTo(r.nivel)
            }}
          >
            {r.bloqueado ? '🔒' : ''}
            {r.nivel}
          </button>
        ))}
      </div>
      {adventure === 3 && (
        <form
          className="sm-assign"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            setNotice('')
            try {
              await setSuperMathyGrade(student, grade)
              setNotice(
                'Banco de preguntas asignado. El alumno debe volver a entrar a Super Mathy.',
              )
            } catch (e) {
              setError(e.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <h3>Banco de preguntas por alumno</h3>
          <p>
            Asigna primero, segundo o prepa antes de que abra su primera puerta. No cambia su grupo
            escolar.
          </p>
          <label>
            ID del alumno
            <input
              inputMode="numeric"
              value={student}
              onChange={(e) => setStudent(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>
          <label>
            Nivel académico
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              <option value="1">Primero de secundaria</option>
              <option value="2">Segundo de secundaria</option>
              <option value="3">Preparatoria</option>
            </select>
          </label>
          <button className="primary" disabled={busy || !student}>
            Asignar banco
          </button>
        </form>
      )}
      {busy && <p role="status">Actualizando…</p>}
      {error && (
        <p role="alert" className="mw-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
