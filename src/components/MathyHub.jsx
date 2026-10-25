import { useEffect, useState } from 'react'
import MathyGame from './MathyGame'
import Mathy2Game from './Mathy2Game'
import { accederMathy2 } from '../services/mathy2'
import { MathyHeader, WorldArt } from './Mathy2UI'
import '../mathy.css'
import '../mathy2.css'

export default function MathyHub({ student, onBack, onStudentUpdated }) {
  const [view, setView] = useState('menu')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (view !== 'menu') return
    let cancelled = false
    setLoading(true)
    setError('')
    accederMathy2(student.id).then(({ estado }) => {
      if (!cancelled) setStatus(estado)
    }).catch((err) => {
      if (!cancelled) setError(err.message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [student.id, view, reload])

  if (view === 'one') return <MathyGame key={`one-${student.id}`} student={student}
    onBack={() => setView('menu')} onStudentUpdated={onStudentUpdated} />
  if (view === 'two') return <Mathy2Game key={`two-${student.id}`} student={student}
    onBack={() => setView('menu')} onStudentUpdated={onStudentUpdated} />

  const unlocked = status && !status.bloqueado
  return <main className="app-shell mathy-game mathy2 mathy2-hub">
    <MathyHeader onBack={onBack} label="Universo Mathy" backLabel="Perfil" />
    <div className="mathy-content">
      <section className="mathy2-hub-hero">
        <div><span className="mathy2-eyebrow">TU SIGUIENTE GRAN MISIÓN</span>
          <h1>Elige tu<br /><em>aventura.</em></h1>
          <p>Tu esfuerzo abre nuevos mundos. Mathy te espera, {student.nombre}.</p>
        </div>
        <img src="/mathy.png" alt="Mathy" />
        <WorldArt mundo={unlocked ? 2 : 1} />
      </section>
      <div className="mathy2-adventures">
        <section className="mathy2-adventure mathy2-adventure-one">
          <div className="mathy2-adventure-head"><span className="mathy2-season">AVENTURA 01</span><span aria-hidden="true">🧭</span></div>
          <h2>Juega con Mathy 1</h2>
          <p>La aventura donde todo comenzó. Tus niveles y premios siguen aquí.</p>
          <div className="mathy2-adventure-stat"><strong>{status?.mathy1_completados ?? '—'}</strong><span>de 100 retos completados</span></div>
          <progress max="100" value={status?.mathy1_completados || 0} aria-label="Avance Mathy 1" />
          <button type="button" onClick={() => setView('one')}>
            {status?.mathy1_completados === 100 ? 'Ver aventura completada' : 'Continuar Mathy 1'} <span aria-hidden="true">↗</span>
          </button>
        </section>
        <section className={`mathy2-adventure mathy2-adventure-two ${unlocked ? '' : 'mathy2-locked'}`}>
          <div className="mathy2-adventure-head"><span className="mathy2-season">AVENTURA 02</span><span aria-hidden="true">{unlocked ? '⚡' : '🔒'}</span></div>
          <h2>Juega con Mathy 2</h2>
          <p>{status?.grado === 2 ? 'Potencias, ciencia y álgebra. Conquista el núcleo de la incógnita.' : 'Enteros, enigmas y operaciones. Llega a la cumbre de los números.'}</p>
          <div className="mathy2-chips"><span>50 niveles</span><span>4 MC por acierto</span><span>2 intentos</span></div>
          {unlocked && <p className="mathy2-save-status">{status.completados}/50 niveles · {status.ganados} MC ganados · {status.grado}° grado</p>}
          {!unlocked && <p className="mathy2-lock-reason">{loading ? 'Comprobando tu avance…' : error ? 'No se pudo comprobar el desbloqueo.' : status?.motivo}</p>}
          <button type="button" disabled={loading || !unlocked || !!error} onClick={() => setView('two')}>
            {loading ? 'Comprobando…' : unlocked ? status.completados === 50 ? 'Ver mis resultados' : 'Entrar a Mathy 2' : 'Aventura bloqueada'}
          </button>
        </section>
      </div>
      {error && <div className="mathy2-error" role="alert"><p>{error}</p><button type="button" onClick={() => setReload((n) => n + 1)}>Volver a comprobar</button></div>}
      <p className="mathy2-footnote">Tus logros de Mathy 1 se conservan. En Mathy 2, cada nivel es una oportunidad nueva.</p>
    </div>
  </main>
}
