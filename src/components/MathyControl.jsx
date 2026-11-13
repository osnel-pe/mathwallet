import { useEffect, useState } from 'react'
import { obtenerBloqueos, cambiarBloqueos } from '../services/mathwallet'

export default function MathyControl() {
  const [rows, setRows] = useState([])
  const [adventure, setAdventure] = useState(1)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(100)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function load() { setRows(await obtenerBloqueos()) }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setBusy(false)) }, [])
  async function save(locked) {
    setBusy(true); setError(''); setNotice('')
    try { await cambiarBloqueos(adventure, Number(from), Number(to), locked); await load(); setNotice(`Mathy ${adventure} · niveles ${from}–${to} ${locked ? 'bloqueados' : 'desbloqueados'} para todos.`) }
    catch(e) { setError(e.message) } finally { setBusy(false) }
  }
  const levels = rows.filter(r => r.aventura === adventure)
  const max = adventure === 1 ? 100 : 50
  const valid = Number.isInteger(Number(from)) && Number.isInteger(Number(to)) && Number(from) >= 1 && Number(to) >= Number(from) && Number(to) <= max
  return <section className="mw-control coin-form">
    <span className="eyebrow">EL MAESTRO MARCA EL RITMO</span><h2>Misiones disponibles</h2>
    <p>Bloquea un nivel, un rango o toda una aventura. El avance ganado se conserva; los niveles cerrados no permiten responder ni ganar más MC.</p>
    <div className="tabs">{[1,2].map(n => <button key={n} disabled={busy} className={adventure === n ? 'active' : ''} onClick={() => { setAdventure(n); setFrom(1); setTo(n === 1 ? 100 : 50) }}>Mathy {n}</button>)}</div>
    <fieldset className="mw-fields" disabled={busy}><legend>Rango de niveles</legend><div className="mw-range"><label>Desde<input type="number" min="1" max={max} value={from} onChange={e => setFrom(e.target.value)} /></label><label>Hasta<input type="number" min="1" max={max} value={to} onChange={e => setTo(e.target.value)} /></label></div>
    <div className="mw-range"><button className="primary" disabled={!valid} onClick={() => save(true)}>Bloquear rango</button><button className="secondary" disabled={!valid} onClick={() => save(false)}>Desbloquear rango</button></div></fieldset>
    <p className="mw-ranking-note">{levels.filter(r => r.bloqueado).length}/{max} niveles bloqueados · toca un número para seleccionarlo</p>
    <div className="mw-level-grid">{levels.map(r => <button key={r.nivel} disabled={busy} aria-label={`Nivel ${r.nivel}, ${r.bloqueado ? 'bloqueado' : 'abierto'}`} className={r.bloqueado ? 'locked' : ''} onClick={() => { setFrom(r.nivel); setTo(r.nivel) }}>{r.bloqueado ? '🔒' : ''}{r.nivel}</button>)}</div>
    {busy && <p role="status">Actualizando niveles…</p>}{error && <p role="alert" className="mw-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>
}
