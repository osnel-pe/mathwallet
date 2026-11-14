import { useEffect, useRef, useState } from 'react'
import { WORLDS, LEVEL_COUNT, levelTitle, MECHANICS } from '../mathy3/content'
import { createState, stepWorld, solveGate, applyDamage, HEIGHT, ROOM } from '../mathy3/engine'
import { renderWorld } from '../mathy3/render'
import { readGemJournal, rememberGem, acknowledgeGems } from '../mathy3/gemJournal'
import {
  createSuperMathyApi,
  createPracticeApi,
  watchSuperMathyLocks,
} from '../services/superMathy'
import '../mathy3/mathy3.css'
export default function Mathy3Game({
  student,
  onBack,
  onStudentUpdated,
  demoQuestions = null,
  demoGrade = 1,
}) {
  const api = useRef(null)
  if (!api.current)
    api.current = demoQuestions
      ? createPracticeApi(demoQuestions, demoGrade)
      : createSuperMathyApi(student.id)
  const [account, setAccount] = useState(null),
    [mode, setMode] = useState('map'),
    [level, setLevel] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  const [hud, setHud] = useState({ coins: 0, gates: 0, hearts: 3, blocks: 0, progress: 0 }),
    [near, setNear] = useState(null),
    [action, setAction] = useState(false),
    [challenge, setChallenge] = useState(null),
    [answer, setAnswer] = useState(null),
    [feedback, setFeedback] = useState(null),
    [message, setMessage] = useState(''),
    [sound, setSound] = useState(false),
    [full, setFull] = useState(false),
    [loss, setLoss] = useState(null),
    [creditNotice, setCreditNotice] = useState(null)
  const accountRef = useRef(null),
    modeRef = useRef(mode),
    engine = useRef(null),
    canvas = useRef(null),
    shell = useRef(null),
    input = useRef({}),
    busy = useRef(false),
    pending = useRef(null),
    nearRef = useRef(null),
    actionRef = useRef(false),
    openRef = useRef(null),
    soundRef = useRef(false),
    audio = useRef(null),
    alive = useRef(false),
    callbacks = useRef({ student, onStudentUpdated })
  modeRef.current = mode
  soundRef.current = sound
  callbacks.current = { student, onStudentUpdated }
  const gemBuffer = useRef(new Set()),
    gemDrain = useRef(null),
    gemPending = useRef(null),
    shownCredits = useRef(new Set()),
    creditTimer = useRef(null),
    creditQueue = useRef(0),
    connectJob = useRef(null)
  const [teacherLocks, setTeacherLocks] = useState(null)
  const lockRef = useRef(!demoQuestions)
  const teacherBlocked =
    !demoQuestions &&
    (teacherLocks === null ||
      teacherLocks.length !== 50 ||
      teacherLocks.every((row) => row.bloqueado) ||
      (level !== null &&
        teacherLocks.some(
          (row) => row.bloqueado && row.id >= level * 5 + 1 && row.id <= level * 5 + 5,
        )))
  lockRef.current = teacherBlocked
  useEffect(() => {
    if (demoQuestions) return
    return watchSuperMathyLocks((rows, unavailable) => {
      const currentLevel = engine.current?.level.index
      const blocked =
        unavailable ||
        rows.length !== 50 ||
        rows.every((row) => row.bloqueado) ||
        (currentLevel != null &&
          rows.some(
            (row) =>
              row.bloqueado && row.id >= currentLevel * 5 + 1 && row.id <= currentLevel * 5 + 5,
          ))
      lockRef.current = blocked
      setTeacherLocks(unavailable ? null : rows)
      if (blocked) {
        clearInput()
        modeRef.current = 'paused'
        setMode('paused')
        setChallenge(null)
      }
    })
  }, [])
  function displayNextCredit() {
    if (!alive.current || creditQueue.current <= 0) return
    creditQueue.current--
    setCreditNotice({ id: Date.now(), text: '+1 MC' })
    creditTimer.current = setTimeout(() => {
      creditTimer.current = null
      setCreditNotice(null)
      if (creditQueue.current > 0) displayNextCredit()
    }, 1400)
  }
  function showGemCredit(result, operation) {
    if (shownCredits.current.has(operation)) return
    shownCredits.current.add(operation)
    const reward = Number(result.repetido ? result.delta_original : result.delta) || 0
    if (reward <= 0) return
    creditQueue.current += reward
    if (!creditTimer.current) displayNextCredit()
    const s = engine.current
    if (s) {
      s.notifications ||= []
      for (let i = 0; i < reward; i++)
        s.notifications.push({
          x: s.player.x + s.player.w / 2,
          y: s.player.y - 10 - i * 24,
          life: 1.25 + i * 0.12,
          text: '+1 MC',
        })
      s.expression = 0.65
    }
  }
  async function recoverGems(initial) {
    if (!alive.current) return initial
    // No permitir un modo aparentemente funcional con el SQL de diamantes ausente.
    if (!initial.diamantes || !Number.isInteger(initial.diamantes_total))
      throw Error(
        'Falta actualizar el SQL de diamantes en Supabase. Instala 20261115_super_mathy_diamantes.sql y vuelve a entrar.',
      )
    let state = initial
    const journal = readGemJournal(student.id, state.ciclo),
      originalLevel = state.activo
    for (const [levelText, ids] of Object.entries(journal)) {
      if (!alive.current) return state
      const index = Number(levelText)
      const accepted = state.diamantes?.[index] || []
      acknowledgeGems(student.id, state.ciclo, index, accepted)
      const missing = ids.filter((id) => !accepted.includes(id))
      if (!missing.length) continue
      if (index > state.desbloqueado) continue
      if (state.activo !== index) {
        const r = await api.current.send(api.current.prepare('begin', index))
        state = r.estado
      }
      for (let i = 0; i < missing.length; i += 16) {
        const batch = missing.slice(i, i + 16),
          op = api.current.prepare('gems', index, null, batch)
        const result = await api.current.send(op)
        state = result.estado
        acknowledgeGems(student.id, state.ciclo, index, batch)
        if (alive.current) showGemCredit(result, op.operation)
      }
    }
    if (state.activo !== originalLevel) {
      const r = await api.current.send(api.current.prepare('begin', originalLevel))
      state = r.estado
    }
    return state
  }
  function flushGems() {
    if (lockRef.current)
      return Promise.reject(
        Error('Super Mathy está bloqueado o no se pudo verificar su disponibilidad.'),
      )
    if (gemDrain.current) return gemDrain.current
    const task = (async () => {
      while (gemBuffer.current.size || gemPending.current) {
        const s = engine.current
        if (!s) return
        const batch = gemPending.current || { ids: [...gemBuffer.current].slice(0, 16), op: null }
        if (!batch.op) batch.op = api.current.prepare('gems', s.level.index, null, batch.ids)
        gemPending.current = batch
        const result = await api.current.send(batch.op)
        if (!alive.current) return
        sync(result.estado)
        acknowledgeGems(student.id, result.estado.ciclo, s.level.index, batch.ids)
        batch.ids.forEach((id) => gemBuffer.current.delete(id))
        gemPending.current = null
        showGemCredit(result, batch.op.operation)
      }
    })()
    const wrapped = task.finally(() => {
      if (gemDrain.current === wrapped) gemDrain.current = null
    })
    gemDrain.current = wrapped
    return wrapped
  }
  function backgroundGems() {
    if (gemDrain.current) return
    if (!gemBuffer.current.size && !gemPending.current) return
    flushGems().catch((e) => {
      if (!alive.current) return
      setError(
        e.message || 'No se pudieron guardar los diamantes. Reintenta para confirmar los MC.',
      )
      if (!busy.current) {
        pending.current = { kind: 'gems', resume: modeRef.current }
        setMode('sync')
      }
    })
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (!lockRef.current && ['playing', 'paused', 'challenge'].includes(modeRef.current))
        backgroundGems()
    }, 200)
    return () => clearInterval(timer)
  }, [])
  function sync(state) {
    accountRef.current = state
    setAccount(state)
    if (!demoQuestions) {
      const { student: current, onStudentUpdated: notify } = callbacks.current
      notify?.({
        ...current,
        saldo: state.saldo,
        saldo_acumulado: state.saldo_acumulado,
        nivel: state.nivel,
      })
    }
  }
  async function connect() {
    if (connectJob.current) return connectJob.current
    const task = (async () => {
      setLoading(true)
      setError('')
      try {
        const initial = await api.current.connect()
        const data = await recoverGems(initial)
        if (alive.current) sync(data)
      } catch (e) {
        if (alive.current) setError(e.message)
      } finally {
        if (alive.current) setLoading(false)
      }
    })()
    connectJob.current = task
    try {
      return await task
    } finally {
      if (connectJob.current === task) connectJob.current = null
    }
  }

  useEffect(() => {
    alive.current = true
    connect()
    return () => {
      alive.current = false
      clearTimeout(creditTimer.current)
      creditTimer.current = null
      audio.current?.close?.().catch(() => {})
    }
  }, [])
  function clearInput() {
    input.current = { left: false, right: false, jump: false, dash: false, interact: false }
  }
  useEffect(() => {
    if (mode !== 'playing') clearInput()
  }, [mode])
  useEffect(() => {
    const blur = () => {
      clearInput()
      if (modeRef.current === 'playing') setMode('paused')
    }
    const hidden = () => {
      if (document.hidden) blur()
    }
    const fs = () => setFull(!!document.fullscreenElement)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('fullscreenchange', fs)
    return () => {
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('fullscreenchange', fs)
    }
  }, [])
  function beep(type) {
    if (!soundRef.current) return
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      audio.current ||= new AC()
      audio.current.resume().catch(() => {})
      const tones = {
        coin: 900,
        jump: 340,
        spring: 620,
        correct: 1100,
        damage: 170,
        build: 720,
        finish: 1300,
      }
      if (!tones[type]) return
      const osc = audio.current.createOscillator(),
        gain = audio.current.createGain()
      osc.frequency.value = tones[type]
      gain.gain.setValueAtTime(0.035, audio.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.16)
      osc.connect(gain)
      gain.connect(audio.current.destination)
      osc.start()
      osc.stop(audio.current.currentTime + 0.17)
    } catch {}
  }
  function updateHud() {
    const s = engine.current
    if (s)
      setHud({
        coins: s.collected.size,
        gates: s.level.gates.filter((g) => s.solved.has(g.id)).length,
        hearts: s.hearts,
        blocks: s.blocks,
        progress: Math.min(100, Math.round((s.player.x / s.level.finish) * 100)),
      })
  }
  async function transact(op, after) {
    if (busy.current || lockRef.current) return
    busy.current = true
    pending.current = { op, after }
    setError('')
    setMode('sync')
    try {
      await flushGems()
      const result = await api.current.send(op)
      if (!alive.current) return
      sync(result.estado)
      pending.current = null
      if (
        result.estado.activo !== op.level ||
        (result.repetido && Number(result.version_operacion) !== Number(result.estado.version))
      ) {
        engine.current = null
        setLevel(null)
        setError('El nivel activo cambió en otra sesión. El mapa ya está actualizado.')
        setMode('map')
        return
      }
      after(result)
    } catch (e) {
      if (alive.current)
        setError(e.message || 'No se pudo confirmar el movimiento. Reintenta el mismo envío.')
    } finally {
      busy.current = false
    }
  }
  function start(index) {
    if (lockRef.current || !accountRef.current || index > accountRef.current.desbloqueado) return
    const op = api.current.prepare('begin', index)
    transact(op, (result) => {
      const s = createState(index, {
        gates: result.estado.abiertas,
        hearts: result.estado.corazones,
        restart: result.estado.reinicio,
        coins: result.estado.diamantes?.[index] || [],
      })
      s.collected = new Set(result.estado.diamantes?.[index] || [])
      engine.current = s
      setLevel(index)
      setChallenge(null)
      setFeedback(null)
      setAnswer(null)
      setNear(null)
      nearRef.current = null
      setLoss(null)
      setMessage('Explora la ruta. Recoge bloques, activa mecanismos y abre las cinco puertas.')
      updateHud()
      setMode('playing')
    })
  }
  function openGate(id) {
    if (modeRef.current !== 'playing' || id == null) return
    const q = accountRef.current?.pregunta
    if (!q || q.id !== id) {
      setMessage('Actualiza el progreso desde el mapa para comprobar esta puerta.')
      return
    }
    if (q.blocked) {
      setMessage('Tu maestro ha cerrado esta puerta. Tus avances anteriores se conservan.')
      return
    }
    setChallenge(q)
    setAnswer(null)
    setFeedback(null)
    setMode('challenge')
  }
  openRef.current = openGate
  function answerQuestion() {
    if (answer == null || feedback?.correct) return
    const q = challenge
    const op = api.current.prepare('answer', level, q.id, answer)
    transact(op, (result) => {
      if (result.correcto) {
        solveGate(engine.current, q.id)
        updateHud()
        beep('correct')
      }
      setFeedback({
        correct: result.correcto,
        text: result.explicacion,
        delta: result.delta,
        repeated: result.repetido,
      })
      setMode('challenge')
    })
  }
  function damage() {
    const s = engine.current
    if (!s || busy.current) return
    beep('damage')
    transact(api.current.prepare('damage', s.level.index), (result) => {
      applyDamage(s, result.estado.corazones, result.reinicio)
      s.collected = new Set(result.estado.diamantes?.[s.level.index] || [])
      updateHud()
      if (result.reinicio) {
        setLoss({ delta: result.repetido ? result.delta_original : result.delta })
        setMode('loss')
      } else {
        setMessage('Vuelves a tu último punto de control. ¡Todavía puedes!')
        setMode('playing')
      }
    })
  }
  function finish() {
    const s = engine.current
    transact(api.current.prepare('finish', s.level.index), () => {
      beep('finish')
      updateHud()
      setMode('complete')
    })
  }
  const actionsRef = useRef({ damage, finish, updateHud, beep })
  actionsRef.current = { damage, finish, updateHud, beep }
  useEffect(() => {
    if (level == null || !canvas.current) return
    const element = canvas.current,
      ctx = element.getContext('2d')
    if (!ctx) {
      setError('No se pudo iniciar el escenario de este navegador.')
      setMode('paused')
      return
    }
    const portrait = new Image()
    portrait.src = '/mathy.png'
    let frame = 0,
      last = 0,
      lastHud = 0,
      active = true
    const size = { w: 960, h: 640, dpr: 1 },
      reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    function resize() {
      const r = element.getBoundingClientRect()
      size.w = Math.max(1, r.width)
      size.h = Math.max(1, r.height)
      size.dpr = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(size.w * size.dpr)
      element.height = Math.round(size.h * size.dpr)
    }
    resize()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    ro?.observe(element)
    window.addEventListener('resize', resize)
    function loop(now) {
      if (!active) return
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 0
      last = now
      const s = engine.current
      if (s && modeRef.current === 'playing' && !lockRef.current) {
        const events = stepWorld(s, input.current, dt, size.w / (size.h / HEIGHT))
        input.current.jump = false
        input.current.dash = false
        input.current.interact = false
        const next = events.find((e) => e.type === 'near')?.gate ?? null,
          canAct = events.some((e) => e.type === 'action')
        if (next !== nearRef.current) {
          nearRef.current = next
          setNear(next)
        }
        if (canAct !== actionRef.current) {
          actionRef.current = canAct
          setAction(canAct)
        }
        for (const event of events) {
          if (event.type === 'coin') {
            // Escribir en el mismo evento, sin esperar al temporizador de red.
            const saved = rememberGem(student.id, accountRef.current.ciclo, s.level.index, event.id)
            gemBuffer.current.add(event.id)
            if (!saved)
              setMessage(
                'El navegador no permite guardar el respaldo local. Espera la confirmación de los diamantes antes de cerrar.',
              )
          }
          actionsRef.current.beep(event.type)
          if (event.message) setMessage(event.message)
        }
        if (events.some((e) => e.type === 'damage')) actionsRef.current.damage()
        else if (events.some((e) => e.type === 'finish')) actionsRef.current.finish()
        if (now - lastHud > 100 || events.some((e) => !['near', 'action'].includes(e.type))) {
          actionsRef.current.updateHud()
          lastHud = now
        }
      }
      if (s) {
        ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
        ctx.clearRect(0, 0, size.w, size.h)
        renderWorld(ctx, s, size.w, size.h, portrait, reduced)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      active = false
      cancelAnimationFrame(frame)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [level, teacherBlocked])
  useEffect(() => {
    const down = (e) => {
      if (
        e.target?.closest?.('[role="dialog"]') ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)
      )
        return
      const k = e.key.toLowerCase()
      if (k === 'escape') {
        if (modeRef.current === 'playing') setMode('paused')
        else if (modeRef.current === 'paused') setMode('playing')
        return
      }
      if (modeRef.current !== 'playing') return
      if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w', 'e', 'shift'].includes(k))
        e.preventDefault()
      if (['arrowleft', 'a'].includes(k)) input.current.left = true
      if (['arrowright', 'd'].includes(k)) input.current.right = true
      if (!e.repeat && [' ', 'arrowup', 'w'].includes(k)) input.current.jump = true
      if (!e.repeat && k === 'shift') input.current.dash = true
      if (!e.repeat && k === 'e') {
        if (nearRef.current != null) openRef.current(nearRef.current)
        else input.current.interact = true
      }
    }
    const up = (e) => {
      const k = e.key.toLowerCase()
      if (['arrowleft', 'a'].includes(k)) input.current.left = false
      if (['arrowright', 'd'].includes(k)) input.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  function hold(key, e) {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    input.current[key] = true
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await shell.current?.requestFullscreen?.()
    } catch {
      setMessage('Este navegador no permite pantalla completa. Puedes seguir aquí.')
    }
  }
  async function navigate(kind = 'map') {
    if (busy.current) return
    busy.current = true
    pending.current = { kind }
    setMode('sync')
    setError('')
    try {
      await flushGems()
      if (!alive.current) return
      pending.current = null
      if (kind === 'leave') {
        onBack()
        return
      }
      setMode('map')
      setLevel(null)
      engine.current = null
      await connect()
    } catch (e) {
      if (alive.current) setError(e.message)
    } finally {
      busy.current = false
    }
  }
  function map() {
    navigate('map')
  }
  async function retryPending() {
    const task = pending.current
    if (!task) return
    if (task.kind === 'map' || task.kind === 'leave') {
      navigate(task.kind)
      return
    }
    if (task.kind === 'gems') {
      setError('')
      try {
        await flushGems()
        if (alive.current) {
          pending.current = null
          setMode(
            ['playing', 'paused', 'challenge'].includes(task.resume) ? task.resume : 'playing',
          )
        }
      } catch (e) {
        if (alive.current) setError(e.message)
      }
      return
    }
    transact(task.op, task.after)
  }
  function resync() {
    // Solo descarta recogidas SIN confirmar; las acreditadas se recuperan del servidor.
    gemBuffer.current.clear()
    gemPending.current = null
    pending.current = null
    setLevel(null)
    engine.current = null
    setMode('map')
    connect()
  }

  if (teacherBlocked)
    return (
      <main className="m3-app sm-app">
        <div className="m3-map-content">
          <section className="mw-closed-adventure" role="alert">
            <span aria-hidden="true">🔒</span>
            <div>
              <b>
                Super Mathy ·{' '}
                {teacherLocks === null ? 'Comprobando disponibilidad' : 'Bloqueado por tu maestro'}
              </b>
              <p>
                {teacherLocks === null
                  ? 'La partida está detenida hasta verificar la conexión y los permisos.'
                  : 'Esta aventura o ruta ha sido cerrada. Tu avance y tus MC se conservan.'}
              </p>
              <button onClick={onBack}>Volver a las aventuras</button>
            </div>
          </section>
        </div>
      </main>
    )
  const world = level == null ? WORLDS[0] : WORLDS[Math.floor(level / 2)],
    completed = account?.completados?.length || 0
  const room = engine.current ? Math.min(4, Math.floor(engine.current.player.x / ROOM)) : 0
  const mechanic = level == null ? null : MECHANICS[engine.current?.level.recipes[room] || 'gap']
  const gradeLabel = account?.grado === 3 ? 'PREPA' : `${account?.grado || '—'}° SECUNDARIA`
  return (
    <main ref={shell} className={`m3-app sm-app ${full ? 'm3-fullscreen' : ''}`}>
      <header className="m3-header">
        <button
          disabled={busy.current || mode === 'sync'}
          className="m3-back"
          onClick={() => navigate('leave')}
        >
          ← <span>Aventuras</span>
        </button>
        <div className="sm-logo">
          SUPER <b>MATHY</b>
          <small>CONSTRUYE · EXPLORA · CONQUISTA</small>
        </div>
        <button
          className="m3-icon-button"
          onClick={() => setSound(!sound)}
          aria-label={sound ? 'Desactivar sonido' : 'Activar sonido'}
          aria-pressed={sound}
        >
          {sound ? '♫' : '♪'}
        </button>
      </header>
      {creditNotice && (
        <div
          key={creditNotice.id}
          className="sm-credit-confirmation"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">◆</span>
          <b>{creditNotice.text}</b>
          <small>Guardado</small>
        </div>
      )}
      {demoQuestions && (
        <div className="sm-demo-banner">
          DEMO DE PRÁCTICA · Los MC de esta demo no pertenecen a ninguna cuenta real
        </div>
      )}
      {mode === 'map' || level == null ? (
        <div className="m3-map-content">
          <section className="m3-hero sm-hero">
            <div className="m3-hero-copy">
              <span className="m3-eyebrow">LA AVENTURA SUBE DE NIVEL</span>
              <h1>
                No sigas el camino.
                <br />
                <em>Constrúyelo.</em>
              </h1>
              <p>
                De los bosques a la forja: salta, activa mecanismos y transforma bloques en nuevas
                posibilidades. Tu ingenio abre las puertas.
              </p>
              <button
                disabled={loading || !account || !!error || busy.current}
                className="m3-primary"
                onClick={() => start(account.desbloqueado)}
              >
                {loading ? 'Conectando con tu aventura…' : 'Entrar a Super Mathy'} ↗
              </button>
              <div className="m3-hero-stats">
                <span>
                  <b>{completed}/10</b>niveles
                </span>
                <span>
                  <b>{account?.abiertas.length || 0}/50</b>puertas
                </span>
                <span>
                  <b>+{account?.ganados || 0} MC</b>ganados
                </span>
              </div>
            </div>
            <div className="m3-hero-art sm-hero-art" aria-hidden="true">
              <div className="sm-pixel-sun" />
              <div className="sm-pixel-cloud" />
              <div className="sm-pixel-stack sm-stack-1" />
              <div className="sm-pixel-stack sm-stack-2" />
              <div className="sm-pixel-stack sm-stack-3" />
              <img src="/mathy.png" alt="" />
              <span className="m3-art-gem">✦</span>
              <span className="m3-art-block">4</span>
              <div className="m3-art-tag">CADA BLOQUE ES UNA POSIBILIDAD</div>
            </div>
          </section>
          {error && (
            <div className="sm-alert" role="alert">
              <p>{error}</p>
              <button onClick={connect}>Reintentar conexión</button>
            </div>
          )}
          <div className="sm-season">
            <span>◈ {gradeLabel}</span>
            <span>Puertas +4 MC · Cada 2 diamantes +1 MC</span>
            <span>♥ ♥ ♥ → reinicio y −1 MC</span>
          </div>
          <div className="m3-section-heading">
            <div>
              <span className="m3-eyebrow">UN ATLAS DE POSIBILIDADES</span>
              <h2>Cinco mundos. Nada es igual.</h2>
            </div>
            <span className="m3-progress-pill">{account?.ciclo || 'SUPER MATHY'}</span>
          </div>
          <div className="sm-world-grid">
            {WORLDS.map((w) => (
              <section className={`sm-world-card sm-biome-${w.id}`} key={w.id}>
                <div className="sm-world-art">
                  <div className="sm-art-mountain" />
                  <div className="sm-art-platform" />
                  <span>{w.icon}</span>
                  <i>0{w.id + 1}</i>
                </div>
                <div className="sm-world-body">
                  <span className="m3-eyebrow">{w.tag}</span>
                  <h3>{w.name}</h3>
                  <p>{w.description}</p>
                  <small>{w.mechanics}</small>
                  <div className="sm-world-levels">
                    {[0, 1].map((i) => {
                      const index = w.id * 2 + i,
                        done = account?.completados.includes(index),
                        locked =
                          !account ||
                          index > account.desbloqueado ||
                          (!demoQuestions &&
                            teacherLocks?.some(
                              (row) =>
                                row.bloqueado && row.id >= index * 5 + 1 && row.id <= index * 5 + 5,
                            ))
                      return (
                        <button
                          key={index}
                          disabled={locked || loading || !!error || busy.current}
                          onClick={() => start(index)}
                        >
                          <span>{locked ? '🔒' : done ? '✓' : '▶'}</span>
                          <div>
                            <b>Nivel {levelTitle(index)}</b>
                            <small>
                              Puertas {index * 5 + 1}–{index * 5 + 5}
                            </small>
                          </div>
                          <em>{done ? 'Explorar' : locked ? 'Bloqueado' : 'Jugar'}</em>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            ))}
          </div>
          <section className="m3-how">
            <div>
              <b>01</b>
              <h3>Ingenio en movimiento</h3>
              <p>
                Flechas o A/D para caminar. Espacio para saltar. Shift para impulso. En celular
                tienes controles.
              </p>
            </div>
            <div>
              <b>02</b>
              <h3>Construye y activa</h3>
              <p>
                Recoge tres cubos y pulsa E para levantar un puente. Usa las palancas y viaja en
                plataformas.
              </p>
            </div>
            <div>
              <b>03</b>
              <h3>Cada puerta cuenta</h3>
              <p>
                Una respuesta correcta suma 4 MC una sola vez. Al agotar tres corazones, vuelves al
                inicio del nivel y pierdes 1 MC si tienes saldo.
              </p>
            </div>
          </section>
        </div>
      ) : (
        <div className="m3-game-content">
          <div className="m3-level-bar">
            <button
              disabled={mode === 'sync'}
              className="m3-map-button"
              onClick={() => setMode('paused')}
            >
              Ⅱ Pausa
            </button>
            <div>
              <small>
                MUNDO {world.id + 1} · NIVEL {levelTitle(level)}
              </small>
              <b>{world.name}</b>
            </div>
            <button className="m3-icon-button" onClick={fullscreen} aria-label="Pantalla completa">
              ⛶
            </button>
          </div>
          <div className="m3-hud">
            <span aria-label={`${hud.hearts} corazones`}>
              {'♥'.repeat(hud.hearts)}
              <i>{'♡'.repeat(3 - hud.hearts)}</i>
            </span>
            <span>
              ⚿ <b>{hud.gates}/5</b>
            </span>
            <span>
              ▧ <b>{hud.blocks}</b>
            </span>
            <span className="sm-gem-meter" title="Cada dos diamantes únicos suman 1 MC">
              ◆ {account?.diamantes_total || 0}
              <small>{(account?.diamantes_total || 0) % 2}/2 → +1 MC</small>
            </span>
            <span className="sm-wallet">
              <b>{account?.saldo} MC</b>
              <small>disponibles</small>
            </span>
            <div className="m3-distance">
              <i style={{ width: `${hud.progress}%` }} />
            </div>
          </div>
          <div className="m3-stage sm-stage">
            <canvas
              ref={canvas}
              aria-label="Escenario de Super Mathy. Flechas para caminar, espacio para saltar, E para interactuar y Shift para impulso."
            />
            <div className="m3-stage-vignette" />
            {mode === 'playing' && near != null && (
              <button className="m3-gate-prompt" onClick={() => openGate(near)}>
                ⚿ Puerta {near} · +4 MC <kbd>E</kbd>
              </button>
            )}
            {mode === 'playing' && near == null && action && (
              <button
                className="m3-gate-prompt"
                onClick={() => {
                  input.current.interact = true
                }}
              >
                ▧ Activar / Construir <kbd>E</kbd>
              </button>
            )}
            {mode === 'sync' && (
              <GameDialog label="Confirmando progreso">
                <span className="m3-dialog-icon">◈</span>
                <h2>{error ? 'La aventura está a salvo.' : 'Confirmando progreso…'}</h2>
                <p>{error || 'Guardamos este paso antes de continuar.'}</p>
                {error && (
                  <>
                    <button className="m3-primary" onClick={retryPending}>
                      Reintentar el mismo envío
                    </button>
                    <button className="m3-secondary" onClick={resync}>
                      Recuperar lo guardado en el servidor
                    </button>
                  </>
                )}
              </GameDialog>
            )}
            {mode === 'paused' && (
              <GameDialog label="Juego en pausa">
                <span className="m3-dialog-icon">Ⅱ</span>
                <h2>El siguiente salto es tuyo.</h2>
                <p>Tu saldo y las puertas abiertas están guardados en tu cuenta.</p>
                <button className="m3-primary" onClick={() => setMode('playing')}>
                  Seguir jugando →
                </button>
                <button className="m3-secondary" onClick={map}>
                  Volver al mapa
                </button>
              </GameDialog>
            )}
            {mode === 'loss' && (
              <GameDialog label="Tres corazones agotados">
                <span className="m3-dialog-icon">♡</span>
                <h2>Un nuevo comienzo.</h2>
                <p>
                  {loss?.delta < 0
                    ? 'Se descontó 1 MC de tu disponible y acumulado.'
                    : 'No se descontaron MC porque tu saldo disponible está en cero.'}{' '}
                  Vuelves al inicio del nivel con tres corazones. Las puertas que abriste siguen
                  abiertas.
                </p>
                <button className="m3-primary" onClick={() => setMode('playing')}>
                  ¡Voy de nuevo! →
                </button>
                <button className="m3-secondary" onClick={map}>
                  Volver al mapa
                </button>
              </GameDialog>
            )}
            {mode === 'challenge' && challenge && (
              <GameDialog label="Puerta matemática">
                <div className="m3-challenge-top">
                  <span>PUERTA {challenge.id} / 50</span>
                  <span>+4 MC · {challenge.topic}</span>
                </div>
                <div className="m3-challenge-title">
                  <img src="/mathy.png" alt="Mathy" />
                  <div>
                    <small>EL CONOCIMIENTO ABRE CAMINOS</small>
                    <h2>{challenge.question}</h2>
                  </div>
                </div>
                <div className="m3-options">
                  {challenge.options.map((option, i) => (
                    <button
                      key={option}
                      disabled={feedback?.correct}
                      aria-pressed={answer === option}
                      className={`${answer === option ? 'selected' : ''} ${feedback?.correct && answer === option ? 'correct' : ''}`}
                      onClick={() => {
                        setAnswer(option)
                        setFeedback(null)
                      }}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      {option}
                    </button>
                  ))}
                </div>
                {feedback && (
                  <div role="status" className={`m3-feedback ${feedback.correct ? 'success' : ''}`}>
                    <b>
                      {feedback.correct
                        ? feedback.delta === 4
                          ? '¡Puerta abierta! +4 MC'
                          : 'Esta puerta ya estaba guardada'
                        : 'Una pista para ti'}
                    </b>
                    <p>{feedback.text}</p>
                  </div>
                )}
                <button
                  className="m3-primary"
                  disabled={answer == null}
                  onClick={() => {
                    if (feedback?.correct) {
                      setChallenge(null)
                      setMode('playing')
                      nearRef.current = null
                      setNear(null)
                    } else answerQuestion()
                  }}
                >
                  {feedback?.correct ? 'Continuar aventura →' : 'Comprobar respuesta'}
                </button>
                <button className="m3-text-button" onClick={() => setMode('playing')}>
                  Volver al camino
                </button>
              </GameDialog>
            )}
            {mode === 'complete' && (
              <GameDialog label="Nivel completado">
                <span className="m3-dialog-icon">✦</span>
                <span className="m3-eyebrow">CINCO PUERTAS. UNA GRAN CONQUISTA.</span>
                <h2>{level === 9 ? '¡Eres Super Mathy!' : '¡Tu ingenio llegó más lejos!'}</h2>
                <p>
                  {level === 9
                    ? 'Completaste los cinco mundos y las cincuenta puertas.'
                    : `Nivel ${levelTitle(level)} superado. Ya puedes explorar la siguiente ruta.`}
                </p>
                <div className="m3-result">
                  <span>
                    <b>{account?.abiertas.length}/50</b>puertas abiertas
                  </span>
                  <span>
                    <b>+{account?.ganados} MC</b>ganados
                  </span>
                </div>
                {level < 9 && (
                  <button className="m3-primary" onClick={() => start(level + 1)}>
                    Siguiente nivel →
                  </button>
                )}
                <button className="m3-secondary" onClick={map}>
                  Volver al mapa
                </button>
              </GameDialog>
            )}
          </div>
          <div className="m3-controls">
            <div className="m3-direction">
              {[
                ['left', '←', 'Mover a la izquierda'],
                ['right', '→', 'Mover a la derecha'],
              ].map(([key, label, title]) => (
                <button
                  key={key}
                  aria-label={title}
                  disabled={mode !== 'playing'}
                  onPointerDown={(e) => hold(key, e)}
                  onPointerUp={() => {
                    input.current[key] = false
                  }}
                  onPointerCancel={() => {
                    input.current[key] = false
                  }}
                  onLostPointerCapture={() => {
                    input.current[key] = false
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="sm-extra-controls">
              <button
                disabled={mode !== 'playing'}
                onPointerDown={(e) => {
                  e.preventDefault()
                  input.current.interact = true
                }}
                aria-label="Activar mecanismo"
              >
                E
              </button>
              <button
                disabled={mode !== 'playing'}
                onPointerDown={(e) => {
                  e.preventDefault()
                  input.current.dash = true
                }}
                aria-label="Impulso"
              >
                ⚡
              </button>
            </div>
            <button
              className="m3-jump"
              disabled={mode !== 'playing'}
              onPointerDown={(e) => {
                e.preventDefault()
                input.current.jump = true
              }}
              aria-label="Saltar"
            >
              ↑ <span>SALTAR</span>
            </button>
          </div>
          <div className="sm-mission">
            <b>{mechanic?.[0]}</b>
            <span>{mechanic?.[1]}</span>
          </div>
          <p className="m3-live-message" role="status">
            {message}
          </p>
        </div>
      )}
    </main>
  )
}
function GameDialog({ label, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const before = document.activeElement
    ref.current?.focus()
    return () => {
      if (before?.isConnected) before.focus()
    }
  }, [])
  function trap(e) {
    if (e.key !== 'Tab') return
    const all = [...ref.current.querySelectorAll('button:not(:disabled)')],
      first = all[0],
      last = all.at(-1)
    if (!first) {
      e.preventDefault()
      return
    }
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === ref.current)
    ) {
      e.preventDefault()
      last.focus()
    } else if (
      !e.shiftKey &&
      (document.activeElement === last || document.activeElement === ref.current)
    ) {
      e.preventDefault()
      first.focus()
    }
  }
  return (
    <div className="m3-dialog-shade">
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="m3-dialog"
        onKeyDown={trap}
      >
        {children}
      </section>
    </div>
  )
}
