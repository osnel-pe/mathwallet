import { useEffect, useRef, useState } from 'react'
import { accederMathy2, responderMathy2 } from '../services/mathy2'
import { Confetti, MathyCompanion, MathyHeader, MathyToast, WORLDS, WorldArt } from './Mathy2UI'
import '../mathy.css'
import '../mathy2.css'

const cheers = ['¡Tu razonamiento brilla!', '¡Un paso más hacia la cima!', '¡Esa conexión fue excelente!', '¡Lo resolviste con ingenio!', '¡Tu esfuerzo está dando frutos!']

export default function Mathy2Game({ student, onBack, onStudentUpdated }) {
  const [state, setState] = useState(null)
  const [clave, setClave] = useState('')
  const [started, setStarted] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [emotion, setEmotion] = useState('ready')
  const [selection, setSelection] = useState([])
  const [celebrate, setCelebrate] = useState(false)
  const [reload, setReload] = useState(0)
  const lock = useRef(false)
  const alive = useRef(false)
  const generation = useRef(0)
  const pending = useRef(null)
  const viewport = useRef(null)
  const callbacks = useRef({ student, onStudentUpdated })
  callbacks.current = { student, onStudentUpdated }

  function sync(data) {
    setState(data)
    setSelection([])
    const { student: current, onStudentUpdated: notify } = callbacks.current
    notify?.({ ...current, saldo: data.saldo, saldo_acumulado: data.saldo_acumulado, nivel: data.nivel })
  }

  useEffect(() => {
    alive.current = true
    const request = ++generation.current
    setBusy(true)
    setError('')
    accederMathy2(student.id).then((data) => {
      if (!alive.current || request !== generation.current) return
      setClave(data.clave)
      sync(data.estado)
    }).catch((err) => {
      if (alive.current && request === generation.current) setError(err.message)
    }).finally(() => {
      if (alive.current && request === generation.current) setBusy(false)
    })
    return () => { alive.current = false }
    // La identidad controla la carga; el saldo se actualiza sin reiniciar el juego.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, reload])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!celebrate) return
    const timer = setTimeout(() => { setCelebrate(false); setEmotion('ready') }, 2200)
    return () => clearTimeout(timer)
  }, [celebrate])

  useEffect(() => {
    if (started && viewport.current) viewport.current.scrollTop = 0
  }, [state?.reto?.id, started])

  async function answer(response, retry = false) {
    if (lock.current || busy || !state?.reto || message) return
    lock.current = true
    setBusy(true)
    setError('')
    setEmotion('thinking')
    // Conserva los mismos parámetros al reintentar una petición de red.
    const operation = retry && pending.current ? pending.current : {
      nivel: state.reto.id,
      intento: state.intentos_usados + 1,
      respuesta: response
    }
    pending.current = operation
    try {
      const result = await responderMathy2(student.id, clave, operation.nivel, operation.intento, operation.respuesta)
      if (!alive.current) return
      pending.current = null
      sync(result.estado)
      if (result.repetido) {
        setEmotion('ready')
        setMessage({ kind: 'info', title: 'Tu intento ya estaba guardado', text: `Recuperé tu avance sin gastar otro intento ni repetir premios.\n\n${result.explicacion || result.pista || 'Continuemos con tu nivel pendiente.'}` })
      } else if (result.correcto) {
        setCelebrate(true)
        setEmotion('happy')
        const worldDone = result.nivel_evaluado % 10 === 0
        setMessage({ kind: 'success', title: worldDone ? '¡Mundo completado! +4 MC' : `${cheers[result.nivel_evaluado % cheers.length]} +4 MC`,
          text: `${result.explicacion}\n\nLlevas ${result.estado.ganados} MC en Mathy 2. Acumulado del período: ${result.estado.saldo_acumulado} MC.` })
      } else if (result.cerrado) {
        setEmotion('encourage')
        setMessage({ kind: 'learn', title: 'Aprender también es avanzar 💪',
          text: `Este nivel terminó sin premio. Mira cómo se resuelve:\n\n${result.explicacion}\n\nEl siguiente reto es una nueva oportunidad.` })
      } else {
        setEmotion('thinking')
        setMessage({ kind: 'hint', title: 'Te queda una oportunidad. ¡Tú puedes!', text: result.pista })
      }
    } catch (err) {
      if (alive.current) {
        setError(`${err.message}. Reintenta el envío para recuperar su resultado sin duplicar intentos.`)
        setEmotion('encourage')
      }
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }

  const reto = state?.reto
  const options = reto?.contenido?.opciones || []
  const done = state?.completados || 0
  const world = reto?.mundo || 5
  const names = WORLDS[state?.grado || 1]
  const selectedSum = selection.reduce((sum, i) => sum + Number(options[i]), 0)
  const disabled = busy || !!message || !!pending.current

  return <main ref={viewport} className="app-shell mathy-game mathy2" data-world={world}>
    <MathyHeader onBack={onBack} label="Mathy 2" />
    <Confetti show={celebrate} />
    <div className="mathy-content">
      {error && <section className="mathy2-error" role="alert"><p>{error}</p>
        <button type="button" disabled={busy} onClick={() => pending.current ? answer(null, true) : setReload((n) => n + 1)}>
          {busy ? 'Comprobando…' : pending.current ? 'Reintentar el mismo envío' : 'Volver a conectar'}
        </button>
      </section>}
      {!state && !error && <section className="mathy-card mathy2-loading"><span className="mathy2-loader" /><h1>Abriendo tu próximo mundo…</h1><p>Recuperando tus logros e intentos.</p></section>}

      {state?.bloqueado && <section className="mathy-card mathy2-blocked"><span aria-hidden="true">🔒</span><h1>Tu aventura te espera</h1>
        <p>{state.motivo}</p><p>Mathy 1: {state.mathy1_completados}/100 retos.</p>
        <button type="button" onClick={onBack}>Volver a mis aventuras</button>
      </section>}

      {state && !state.bloqueado && <>
        {!started && <section className="mathy2-welcome">
          <div><span className="mathy2-eyebrow">AVENTURA 02 · {state.grado}° GRADO</span>
            <h1>Tu mente.<br /><em>Tu superpoder.</em></h1>
            <p>{state.grado === 1 ? 'Cruza ciudades bajo cero, activa reactores y conquista los enteros.' : 'Domina potencias, explora galaxias y descifra el lenguaje del álgebra.'}</p>
            <div className="mathy2-chips"><span>50 niveles</span><span>5 mundos</span><span>Hasta 200 MC</span></div>
          </div>
          <img src="/mathy.png" alt="Mathy te da la bienvenida" />
          <WorldArt mundo={world} />
        </section>}

        <section className="mathy-card mathy2-dashboard">
          <div className="mathy2-score"><div><small>TU RECORRIDO</small><strong>{done}<span>/50</span></strong></div>
            <div><small>GANADOS AQUÍ</small><strong>{state.ganados}<span> MC</span></strong></div>
            <div><small>ACIERTOS</small><strong>{state.aciertos}</strong></div>
          </div>
          <progress max="50" value={done} aria-label="Niveles terminados de Mathy 2" />
          <div className="mathy2-balance"><span>Saldo: {state.saldo} MC</span><span>Período {state.periodo} · {state.ciclo_escolar}</span></div>
        </section>

        {!started && reto && <section className="mathy-card mathy2-launch">
          <h2>{done ? 'Tu misión sigue aquí.' : '¿Listo para despegar?'}</h2>
          <p>Cada nivel tiene dos intentos. Acertar en cualquiera suma <b>4 MC</b>. Si fallas ambos, avanzas sin premio y ese nivel queda cerrado.</p>
          <p>Puedes salir cuando quieras: guardamos tus intentos y tu avance.</p>
          {state.intentos_usados === 1 && <p className="mathy2-attempt-note">En tu nivel pendiente queda 1 intento.</p>}
          <button type="button" onClick={() => setStarted(true)}>{done || state.intentos_usados ? `Continuar en el nivel ${reto.id}` : '¡Comenzar Mathy 2!'} <span aria-hidden="true">↗</span></button>
        </section>}

        {started && reto && <section className="mathy-card mathy-challenge mathy2-challenge" key={reto.id}>
          <div className="mathy2-level-head"><span className="mathy-tag">MUNDO {reto.mundo} · {reto.nombre_mundo}</span><span className="mathy2-reward">✦ +4 MC</span></div>
          <div className="mathy2-topic">NIVEL {reto.id} / 50 · {reto.tema}</div>
          <h1>{reto.titulo}</h1>
          <div className="mathy2-lives" aria-label={`${2 - state.intentos_usados} intentos disponibles`}>
            <span className={state.intentos_usados > 0 ? 'spent' : ''}>◆</span><span>◆</span>
            <small>{2 - state.intentos_usados} {state.intentos_usados ? 'intento disponible' : 'intentos disponibles'}</small>
          </div>
          <p className="mathy2-question">{reto.contenido.pregunta}</p>

          {(reto.tipo === 'choice' || reto.tipo === 'path') && <div className={`mathy-options ${reto.tipo === 'path' ? 'mathy-paths' : ''}`}>
            {options.map((option, i) => <button type="button" key={i} disabled={disabled || state.descartadas.includes(i)}
              onClick={() => answer(i)} className={state.descartadas.includes(i) ? 'mathy2-discarded' : ''}>
              <span className="mathy2-option-symbol" aria-hidden="true">{reto.tipo === 'path' ? '🚪' : ['A', 'B', 'C', 'D'][i]}</span>
              <span>{option}</span>
              {state.descartadas.includes(i) && <small>Ya intentada</small>}
            </button>)}
          </div>}

          {(reto.tipo === 'order' || reto.tipo === 'collect') && <>
            <div className="mathy-options">
              {options.map((option, i) => <button type="button" key={i} disabled={disabled}
                aria-pressed={selection.includes(i)} className={selection.includes(i) ? 'mathy-selected' : ''}
                onClick={() => setSelection((current) => current.includes(i) ? current.filter((n) => n !== i) : [...current, i])}>
                {reto.tipo === 'collect' && <span aria-hidden="true">⚡ </span>}{option}
              </button>)}
            </div>
            <div className="mathy-selection" aria-live="polite">{reto.tipo === 'order'
              ? `Tu orden: ${selection.map((i) => options[i]).join(' → ') || 'toca las fichas en orden'}`
              : `Energía seleccionada: ${selectedSum} · Objetivo: ${reto.contenido.objetivo}`}</div>
            <div className="mathy-actions"><button type="button" disabled={disabled || !selection.length} onClick={() => setSelection([])}>Limpiar</button>
              <button type="button" disabled={disabled || (reto.tipo === 'order' ? selection.length !== options.length : !selection.length)} onClick={() => answer(selection)}>{busy ? 'Guardando…' : 'Confirmar mi respuesta'}</button></div>
            <small className="mathy2-help">Tocar fichas o limpiar no gasta intentos. Confirmar sí.</small>
          </>}
          {busy && <p className="mathy2-saving" role="status">Comprobando y guardando tu intento…</p>}
        </section>}

        {!reto && <section className="mathy-card mathy2-finish">
          <span aria-hidden="true">🏆</span><span className="mathy2-eyebrow">MISIÓN COMPLETADA</span><h1>¡Llegaste hasta el final!</h1>
          <p>Recorriste los 50 niveles de Mathy 2. Cada desafío fue una oportunidad para aprender.</p>
          <div className="mathy2-result-grid"><div><strong>{state.aciertos}</strong><span>con premio</span></div><div><strong>{state.sin_premio}</strong><span>sin premio</span></div><div><strong>{state.ganados}</strong><span>MC ganados</span></div></div>
          <button type="button" onClick={onBack}>Volver a mis aventuras</button>
        </section>}

        <nav className="mathy2-world-map" aria-label="Recorrido por los mundos">
          {names.map((name, i) => <div key={name} className={done >= (i + 1) * 10 ? 'done' : world === i + 1 && done < 50 ? 'current' : ''}>
            <span className="mathy2-world-number">{done >= (i + 1) * 10 ? '✓' : i + 1}</span><strong>{name}</strong><small>{Math.max(0, Math.min(10, done - i * 10))}/10 niveles</small>
          </div>)}
        </nav>
      </>}
    </div>
    <MathyCompanion emotion={!reto && state && !state.bloqueado ? 'finish' : emotion} show={started && !state?.bloqueado} />
    <MathyToast message={message} onClose={() => { setMessage(null); if (!celebrate) setEmotion('ready') }} speech={started} />
  </main>
}
