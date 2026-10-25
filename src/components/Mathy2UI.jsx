import { useId } from 'react'

export const WORLDS = {
  1: ['La ciudad bajo cero', 'El puente de los signos', 'El reactor de operaciones', 'La bóveda de los enigmas', 'La cumbre de los enteros'],
  2: ['La central de potencias', 'El observatorio científico', 'El archivo algebraico', 'El traductor de enigmas', 'El núcleo de la incógnita']
}

export function MathyHeader({ onBack, label = 'Mathy 2', backLabel = 'Aventuras' }) {
  return <header className="mathy-topbar">
    <button type="button" className="mathy-back" onClick={onBack}><span aria-hidden="true">‹</span><span>{backLabel}</span></button>
    <img className="mathy-header-logo" src="/logo.png" alt="Logo de la institución" />
    <span className="mathy-header-label">{label}</span>
  </header>
}

export function WorldArt({ mundo = 1 }) {
  const id = useId().replace(/:/g, '')
  return <svg className="mathy2-world-art" viewBox="0 0 600 300" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="600" y2="300" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38e9b9" stopOpacity=".3" /><stop offset="1" stopColor="#8171ed" stopOpacity=".1" />
      </linearGradient>
      <linearGradient id={`${id}-ground`} x1="300" y1="120" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6b80df" stopOpacity=".5" /><stop offset="1" stopColor="#0c2832" />
      </linearGradient>
    </defs>
    <circle cx="410" cy="102" r="85" fill={`url(#${id}-sky)`} />
    <ellipse cx="410" cy="102" rx="118" ry="28" stroke="#9fe9db" strokeOpacity=".3" transform="rotate(-22 410 102)" />
    <path d="M20 265L135 130L222 225L340 95L454 235L540 155L600 270V300H0Z" fill={`url(#${id}-ground)`} />
    <path d="M65 280L160 225L260 252L352 190L470 238L557 217" stroke="#77ffdb" strokeWidth="3" strokeDasharray="7 10" />
    {[1, 2, 3, 4, 5].map((n) => <g key={n} transform={`translate(${65 + (n - 1) * 123},${[280, 225, 252, 190, 217][n - 1]})`}>
      <circle r={n === mundo ? 11 : 7} fill={n <= mundo ? '#7affd4' : '#3c6076'} />
      {n === mundo && <circle r="20" stroke="#7affd4" strokeOpacity=".4" />}
    </g>)}
    <path d="M340 95L360 125L344 119L331 126L318 122Z" fill="#c2e6f0" fillOpacity=".7" />
    <g fill="#b8ffeb"><circle cx="100" cy="60" r="2" /><circle cx="265" cy="40" r="3" /><circle cx="530" cy="55" r="2" /><circle cx="195" cy="98" r="2" /></g>
  </svg>
}

export function MathyCompanion({ emotion = 'ready', show = true }) {
  if (!show) return null
  const badges = { ready: '✦', thinking: '🤔', happy: '✨', encourage: '💪', finish: '🏆' }
  return <div className="mathy-companion mathy2-companion" data-emotion={emotion}>
    <img src="/mathy.png" alt="Mathy, tu compañero" />
    <span className="mathy2-emotion" aria-hidden="true">{badges[emotion] || '✦'}</span>
  </div>
}

export function MathyToast({ message, onClose, speech = true }) {
  if (!message) return null
  return <button type="button" className={`mathy-toast-overlay ${speech ? 'mathy-speech-overlay' : ''} mathy2-toast`}
    onClick={onClose} aria-label="Cerrar mensaje de Mathy">
    <span className="mathy-toast-card" role="status" aria-live="polite">
      <span className="mathy-speaker">{message.kind === 'success' ? '✨ Mathy celebra' : '💬 Mathy te acompaña'}</span>
      <strong className="mathy2-toast-title">{message.title}</strong>
      <span className="mathy-toast-text">{message.text}</span>
      <span className="mathy-toast-hint">Toca para continuar · 5 segundos</span>
    </span>
  </button>
}

export function Confetti({ show }) {
  return show ? <div className="mathy-confetti" aria-hidden="true">
    {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}
  </div> : null
}
