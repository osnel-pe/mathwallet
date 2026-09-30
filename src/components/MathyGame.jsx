import { useEffect, useRef, useState } from 'react'
import {
  accederMathyDirecto,
  resolverMathy
} from '../services/mathy'
import '../mathy.css'

export default function MathyGame({ student, onBack, onStudentUpdated }) {
  const [clave, setClave] = useState('')
  const [state, setState] = useState(null)
  const [selection, setSelection] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  const requestLock = useRef(false)
  const mounted = useRef(true)
  const [started, setStarted] = useState(false)

  function sync(data) {
    setState(data)
    setSelection([])
    onStudentUpdated?.({
      ...student,
      saldo: data.saldo,
      saldo_acumulado: data.saldo_acumulado,
      nivel: data.nivel
    })
  }

  useEffect(() => {
  mounted.current = true
  entrar()

  return () => {
    mounted.current = false
  }

  // El acceso se carga cuando cambia el alumno.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [student.id])

  useEffect(() => {
    if (!celebrate) return
    const timer = setTimeout(() => setCelebrate(false), 1600)
    return () => clearTimeout(timer)
  }, [celebrate])

  async function entrar() {
  if (requestLock.current) return

  requestLock.current = true
  setBusy(true)
  setMessage('')

  try {
    const data = await accederMathyDirecto(
      student.id
    )

    if (!mounted.current) return

    setClave(data.clave)
    sync(data.estado)
  } catch (error) {
    if (mounted.current) {
      setMessage(error.message)
    }
  } finally {
    requestLock.current = false

    if (mounted.current) {
      setBusy(false)
    }
  }
}

  async function responder(answer) {
    if (requestLock.current || busy || !state?.reto) return
    requestLock.current = true
    setBusy(true)
    setMessage('')
    try {
      const result = await resolverMathy(student.id, clave, state.reto.id, answer)
      if (!mounted.current) return
      if (result.correcto) {
        sync(result.estado)
        setCelebrate(!result.ya_resuelto)
        setMessage(result.ya_resuelto
          ? 'Este reto ya estaba guardado. Continuamos donde te quedaste.'
          : `¡Lo lograste! +${result.premio} MathCoins. ${result.explicacion}`)
      } else {
        setMessage(`¡Inténtalo de nuevo! ${result.pista}`)
      }
    } catch (error) {
      if (mounted.current) setMessage(`${error.message}. Puedes reintentar: un reto no cobra dos veces.`)
    } finally {
      requestLock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const reto = state?.reto
  const payload = reto?.contenido
  const options = payload?.opciones || []
  const completed = Number(state?.completados || 0)
  const selectedSum = selection.reduce((sum, index) => sum + options[index], 0)

  return (
    <main className="app-shell mathy-game">
      <header className="mathy-topbar">
        <button type="button" onClick={onBack}>← Volver al perfil</button>
        <strong>La aventura de Mathy</strong>
      </header>
      <div className="mathy-content">
        <section className="mathy-intro">
          <div className={`mathy-character ${celebrate ? 'mathy-celebrate' : ''}`}>
            <img src="/mathy.jpeg" alt="Mathy, tu compañero de aventura" />
            {celebrate && <span className="mathy-prize">+2 MC ✨</span>}
          </div>
          <div>
            <span className="mathy-tag">100 retos · 10 mundos</span>
            <h1>{state ? `¡Vamos, ${student.nombre}!` : 'Aprende y gana con Mathy'}</h1>
            <p>Acertijos, caminos, números y tesoros. Cada reto nuevo resuelto te da 2 MathCoins.</p>
            <p>Puedes salir cuando quieras. Guardamos cada reto completado.</p>
          </div>
        </section>

        <p className="mathy-message" role="status" aria-live="polite">{message}</p>

        {!state ? (
        <section className="mathy-card">
          <h2>Preparando tu aventura</h2>

          {busy ? (
            <p>Conectando con Mathy…</p>
          ) : (
            <button
              type="button"
              onClick={entrar}
            >
              Reintentar
            </button>
          )}
        </section>
        ) : (
          <>
            <section className="mathy-progress mathy-card">
              <div><strong>{completed}/100 retos</strong><span>{state.ganados} MC ganados en Mathy</span></div>
              <progress value={completed} max="100" aria-label="Retos completados" />
              <small>Saldo actual: {state.saldo} MC · Período activo: {state.periodo}</small>
            </section>

            {reto && !started ? (
  <section className="mathy-card">
    <h2>
      {completed === 0
        ? '¡Tu aventura comienza aquí!'
        : '¡Continuemos tu aventura!'}
    </h2>

    <p>
      {completed === 0
        ? 'Mathy te espera con acertijos y misiones.'
        : `Tu avance está guardado. Sigue el reto ${reto.id}.`}
    </p>

    <button
      type="button"
      onClick={() => setStarted(true)}
    >
      {completed === 0
        ? 'Comenzar el juego'
        : `Continuar en el reto ${reto.id}`}
    </button>
  </section>
) : reto ? (
  <section
    className="mathy-card mathy-challenge"
    key={reto.id}
  >
    <span className="mathy-tag">
      Mundo {reto.mundo}: {reto.nombre_mundo}
    </span>

    <h2>
      Reto {reto.id}: {reto.titulo}
    </h2>

    <p>{payload.pregunta}</p>

    <span className="mathy-reward">
      Premio: 2 MC
    </span>

    {(reto.tipo === 'choice' ||
      reto.tipo === 'path') && (
      <div
        className={`mathy-options ${
          reto.tipo === 'path' ? 'mathy-paths' : ''
        }`}
      >
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            disabled={busy}
            onClick={() => responder(index)}
          >
            {reto.tipo === 'path' && (
              <span aria-hidden="true">🚪</span>
            )}

            {option}
          </button>
        ))}
      </div>
    )}

    {(reto.tipo === 'order' ||
      reto.tipo === 'collect') && (
      <>
        <div className="mathy-options">
          {options.map((option, index) => (
            <button
              type="button"
              key={index}
              disabled={busy}
              aria-pressed={selection.includes(index)}
              className={
                selection.includes(index)
                  ? 'mathy-selected'
                  : ''
              }
              onClick={() =>
                setSelection((current) =>
                  current.includes(index)
                    ? current.filter(
                        (value) => value !== index
                      )
                    : [...current, index]
                )
              }
            >
              {reto.tipo === 'collect' ? '🪙 ' : ''}
              {option}
            </button>
          ))}
        </div>

        <div className="mathy-selection">
          {reto.tipo === 'order'
            ? `Tu orden: ${
                selection
                  .map((index) => options[index])
                  .join(' → ') || 'toca los números'
              }`
            : `Tu bolsa: ${selectedSum} / ${payload.objetivo}`}
        </div>

        <div className="mathy-actions">
          <button
            type="button"
            disabled={busy || !selection.length}
            onClick={() => setSelection([])}
          >
            Limpiar
          </button>

          <button
            type="button"
            disabled={busy || !selection.length}
            onClick={() => responder(selection)}
          >
            {busy ? 'Guardando…' : 'Comprobar'}
          </button>
        </div>
      </>
    )}

    {busy && (
      <p>Comprobando y guardando…</p>
    )}
  </section>
) : (
  <section className="mathy-card mathy-finish">
    <h2>🏆 ¡Completaste la aventura!</h2>

    <p>
      Resolviste 100 retos y ganaste
      200 MathCoins en total.
    </p>
  </section>
)}

            <div className="mathy-worlds" aria-label="Mundos de la aventura">
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} className={completed >= (index + 1) * 10 ? 'mathy-world-done' : ''}>
                  {completed >= (index + 1) * 10 ? '✓' : index + 1}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
