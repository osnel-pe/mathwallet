import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  LogOut,
  QrCode,
  Search,
  ShieldCheck,
  Trophy,
  Users
} from 'lucide-react'
import ScannerQR from './components/ScannerQR'
import History from './components/History'
import { cerrarSesion, iniciarSesion, obtenerAlumno, obtenerAlumnos, obtenerMovimientos, registrarMovimiento } from './services/mathwallet'
import {
  supabase,
  supabaseConfigured,
  supabaseConfigError
} from './lib/supabase'

import TeacherDashboard from './components/TeacherDashboard'
import RankingView from './components/RankingView'

const CODIGO_MAESTRO = import.meta.env.VITE_CODIGO_MAESTRO || '2026'
const CODIGO_ALUMNO = import.meta.env.VITE_CODIGO_ALUMNO || '1234'

function nombreCompleto(a) { return [a.nombre, a.apellido_paterno, a.apellido_materno].filter(Boolean).join(' ') }

export default function App() {
  const [screen, setScreen] = useState('access')
  const [role, setRole] = useState(null)
  const [user, setUser] = useState(null)
  const [students, setStudents] = useState([])
  const [student, setStudent] = useState(null)
  const [movements, setMovements] = useState([])
  const [period, setPeriod] = useState('dia')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const [checkingSession, setCheckingSession] = useState(true)
const [confirmLogout, setConfirmLogout] = useState(false)

useEffect(() => {
  if (!supabase) {
    setCheckingSession(false)
    return
  }

  let mounted = true

  async function recoverAccess() {
    try {
      const { data } = await supabase.auth.getSession()

      if (!mounted) return

      if (data.session?.user) {
        const allowedStudents = await obtenerAlumnos()

        if (!mounted) return

        setUser(data.session.user)
        setRole('teacher')
        setStudents(allowedStudents)
        setScreen('teacher-home')
        return
      }

      const savedStudentId = localStorage.getItem(
        'mathwallet_student_id'
      )

      if (savedStudentId) {
        try {
          const [
            savedStudent,
            savedMovements,
            allowedStudents
          ] = await Promise.all([
            obtenerAlumno(savedStudentId),
            obtenerMovimientos(savedStudentId, 'dia'),
            obtenerAlumnos()
          ])

          if (!mounted) return

          setStudent(savedStudent)
          setMovements(savedMovements)
          setStudents(allowedStudents)
          setPeriod('dia')
          setRole('student')
          setScreen('student-profile')
        } catch {
          localStorage.removeItem(
            'mathwallet_student_id'
          )
        }
      }
    } finally {
      if (mounted) {
        setCheckingSession(false)
      }
    }
  }

  recoverAccess()

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setRole('teacher')
      }
    }
  )

  return () => {
    mounted = false
    subscription.unsubscribe()
  }
}, [])

  const go = (next) => { setNotice(''); setScreen(next) }
  const showNotice = (text) => { setNotice(text); setTimeout(() => setNotice(''), 3200) }

  async function loadStudents() {
    setLoading(true)

    try {
      const allowedStudents = await obtenerAlumnos()
      setStudents(allowedStudents)
    } catch (error) {
      showNotice(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function openStudent(
  id,
  destination = 'student-profile'
) {
  setLoading(true)

  try {
    const foundStudent = await obtenerAlumno(id)

    setStudent(foundStudent)
    setPeriod('dia')

    const studentMovements = await obtenerMovimientos(
      foundStudent.id,
      'dia'
    )

    setMovements(studentMovements)

    if (destination === 'student-profile') {
      localStorage.setItem(
        'mathwallet_student_id',
        String(foundStudent.id)
      )

      setRole('student')
    }

    go(destination)
  } catch (error) {
    showNotice(
      error.message ||
      'No encontramos un alumno con ese ID.'
    )
  } finally {
    setLoading(false)
  }
}

  async function changePeriod(value) {
    setPeriod(value); setLoading(true)
    try { setMovements(await obtenerMovimientos(student.id, value)) } catch (e) { showNotice(e.message) } finally { setLoading(false) }
  }

  async function logout() {
  localStorage.removeItem('mathwallet_student_id')

  await cerrarSesion()

  setUser(null)
  setRole(null)
  setStudent(null)
  setStudents([])
  setMovements([])
  setConfirmLogout(false)
  go('access')
}

  if (checkingSession) {
  return (
    <main className="session-loader">
      <img src="/logo.png" alt="MathWallet" />
      <div className="loader-ring" />
      <p>Abriendo MathWallet…</p>
    </main>
  )
}

  if (screen === 'access') return <Access onEnter={(code) => {
    if (code === CODIGO_MAESTRO) { setRole('teacher'); go('teacher-login') }
    else if (code === CODIGO_ALUMNO) { setRole('student'); go('student-scan') }
    else showNotice('Código incorrecto. Inténtalo nuevamente.')
  }} notice={notice} />

  if (screen === 'teacher-login') {
    return (
      <TeacherLogin
        onBack={() => go('access')}
        onSuccess={(authenticatedUser) => {
          setUser(authenticatedUser)
          setRole('teacher')
          loadStudents()
          go('teacher-home')
        }}
      />
    )
  }
  if (screen === 'student-scan') return <Shell title="Acceso de alumno" onBack={() => go('access')}><ScannerQR title="Escanea tu tarjeta" onRead={(id) => openStudent(id, 'student-profile')} />{notice && <Toast text={notice} />}</Shell>
  if (screen === 'teacher-home') {
    return (
      <>
        <TeacherDashboard
          students={students}
          loading={loading}
          onGroups={() => go('groups')}
          onScan={() => go('teacher-scan')}
          onRanking={() => go('ranking')}
          onLogout={() => setConfirmLogout(true)}
        />

        {confirmLogout && (
          <ConfirmLogout
            onCancel={() => setConfirmLogout(false)}
            onConfirm={async () => {
              setConfirmLogout(false)
              await logout()
            }}
          />
        )}
      </>
    )
  }
  if (screen === 'teacher-scan') return <Shell title="Escáner del maestro" onBack={() => go('teacher-home')}><ScannerQR onRead={(id) => openStudent(id, 'teacher-student')} />{notice && <Toast text={notice} />}</Shell>
  if (screen === 'groups') return <Groups students={students} onBack={() => go('teacher-home')} onOpen={(id) => openStudent(id, 'teacher-student')} />
  if (screen === 'ranking') {
  return (
    <>
      <RankingView
        students={students}
        student={student}
        role={role}
        onBack={() =>
          go(
            role === 'teacher'
              ? 'teacher-home'
              : 'student-profile'
          )
        }
        onLogout={() => setConfirmLogout(true)}
      />

      {confirmLogout && (
        <ConfirmLogout
          onCancel={() => setConfirmLogout(false)}
          onConfirm={logout}
        />
      )}
    </>
  )
}
  if (screen === 'teacher-student') {
  return (
    <StudentProfile
      student={student}
      movements={movements}
      period={period}
      loading={loading}
      teacher
      onBack={() => go('teacher-scan')}
      onPeriod={changePeriod}
      onMove={async (cantidad, causa) => {
        setLoading(true)

        try {
          await registrarMovimiento({
            alumnoId: student.id,
            cantidad,
            causa
          })

          const updatedStudent = await obtenerAlumno(
            student.id
          )

          setStudent(updatedStudent)

          setStudents((currentStudents) =>
            currentStudents.map((currentStudent) =>
              currentStudent.id === updatedStudent.id
                ? updatedStudent
                : currentStudent
            )
          )

          showNotice(
            cantidad > 0
              ? `Se agregaron ${cantidad} MathCoins.`
              : `Se restaron ${Math.abs(cantidad)} MathCoins.`
          )

          // Vuelve automáticamente al lector.
          setScreen('teacher-scan')
        } catch (error) {
          showNotice(error.message)
        } finally {
          setLoading(false)
        }
      }}
      notice={notice}
    />
  )
}
  if (screen === 'student-profile') {
  return (
    <>
      <StudentProfile
        student={student}
        movements={movements}
        period={period}
        loading={loading}
        onPeriod={changePeriod}
        studentHeader
        onLogout={() => setConfirmLogout(true)}
        onRanking={async () => {
          await loadStudents()
          go('ranking')
        }}
        notice={notice}
      />

      {confirmLogout && (
        <ConfirmLogout
          onCancel={() => setConfirmLogout(false)}
          onConfirm={logout}
        />
      )}
    </>
  )
}
}

function Access({ onEnter, notice }) {
  const [code, setCode] = useState('')
  return <main className="access-page">
    <section className="access-card">
      <div className="brand-mark logo-mark">
        <img src="/logo.png" alt="Logo de MathWallet" />
      </div>
      <span className="eyebrow">SISTEMA ESCOLAR</span><h1>MathWallet</h1>
      <p>Convierte tu esfuerzo en MathCoins.</p>
      <form onSubmit={(e) => { e.preventDefault(); onEnter(code); setCode('') }}>
        <label>Código de acceso</label>
        <input className="access-input" type="password" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••" autoFocus />
        <button className="primary large" type="submit">Continuar <ChevronRight size={20} /></button>
      </form>
      {!supabaseConfigured && <small className="setup-note">{supabaseConfigError || 'No fue posible iniciar la conexión con Supabase. Revisa el archivo .env.'}</small>}
      {notice && <Toast text={notice} />}
    </section>
  </main>
}

function TeacherLogin({ onBack, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function translateLoginError(message) {
    const text = String(message || '').toLowerCase()

    if (text.includes('invalid login credentials')) {
      return 'El correo o la contraseña son incorrectos.'
    }

    if (text.includes('email not confirmed')) {
      return 'Debes confirmar tu correo antes de iniciar sesión.'
    }

    if (text.includes('failed to fetch')) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión.'
    }

    return 'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.'
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (busy) return

    setError('')
    setBusy(true)

    try {
      const authenticatedUser = await iniciarSesion(
        email.trim(),
        password
      )

      onSuccess(authenticatedUser)
    } catch (loginError) {
      setError(translateLoginError(loginError.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="access-page">
      <section className="access-card teacher-login-card">
        <button
          type="button"
          className="back-link"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <div className="brand-mark">
          <ShieldCheck size={32} />
        </div>

        <span className="eyebrow">ACCESO PROTEGIDO</span>
        <h1>Maestro</h1>
        <p>Inicia sesión con tu cuenta autorizada.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="teacher-email">Correo electrónico</label>

          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
            autoComplete="email"
            inputMode="email"
            placeholder="correo@escuela.com"
            required
            autoFocus
          />

          <label htmlFor="teacher-password">Contraseña</label>

          <div className="password-field">
            <input
              id="teacher-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              autoComplete="current-password"
              enterKeyHint="go"
              placeholder="Escribe tu contraseña"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword
                  ? 'Ocultar contraseña'
                  : 'Mostrar contraseña'
              }
            >
              {showPassword
                ? <EyeOff size={20} />
                : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <AlertCircle size={20} />
              <div>
                <strong>No pudimos iniciar sesión</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            className="primary large"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function TeacherHome({ students, loading, onScan, onGroups, onRanking, onLogout }) {
  const groups = new Set(students.map((s) => s.grupo)).size
  const coins = students.reduce((sum, s) => sum + Number(s.saldo || 0), 0)
  return <Shell title="Panel del maestro" action={<button className="icon-button" onClick={onLogout}><LogOut size={20} /></button>}>
    <section className="welcome"><div><span className="eyebrow">MATHWALLET</span><h2>¿Qué haremos hoy?</h2></div><div className="coin-orbit"><Coins size={34} /></div></section>
    <div className="metrics"><Metric icon={<Users />} value={loading ? '—' : students.length} label="Alumnos" /><Metric icon={<BookOpen />} value={loading ? '—' : groups} label="Grupos" /><Metric icon={<Coins />} value={loading ? '—' : coins.toLocaleString('es-MX')} label="MathCoins" /></div>
    <button className="scan-action" onClick={onScan}><span><QrCode size={30} /></span><div><strong>Escanear tarjeta</strong><small>Abrir rápidamente un perfil</small></div><ChevronRight /></button>
    <div className="menu-grid"><button onClick={onGroups}><Users /><strong>Grupos</strong><small>Consulta todos los alumnos</small></button><button onClick={onRanking}><Trophy /><strong>Rankings</strong><small>Por salón y por grado</small></button></div>
  </Shell>
}

function Metric({ icon, value, label }) { return <article className="metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></article> }

function Groups({ students, onBack, onOpen }) {
  const [query, setQuery] = useState(''); const [group, setGroup] = useState('Todos')
  const groups = ['Todos', ...new Set(students.map((s) => s.grupo))]
  const visible = students.filter((s) => (group === 'Todos' || s.grupo === group) && nombreCompleto(s).toLowerCase().includes(query.toLowerCase()))
  return <Shell title="Alumnos" onBack={onBack}>
    <div className="search-box"><Search size={19} /><input placeholder="Buscar por nombre" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="chips">{groups.map((g) => <button className={g === group ? 'active' : ''} onClick={() => setGroup(g)} key={g}>{g}</button>)}</div>
    <div className="student-list">{visible.map((s) => <button key={s.id} onClick={() => onOpen(s.id)}><span className="avatar">{s.nombre[0]}{s.apellido_paterno?.[0]}</span><div><strong>{nombreCompleto(s)}</strong><small>{s.grupo} · ID {s.id}</small></div><b>{s.saldo} MC</b><ChevronRight size={18} /></button>)}</div>
  </Shell>
}

function StudentProfile({
  student,
  movements,
  period,
  loading,
  teacher,
  studentHeader,
  onBack,
  onPeriod,
  onMove,
  onRanking,
  onLogout,
  notice
}) {
  if (!student) return null
  return <Shell
  title={teacher ? 'Perfil del alumno' : 'Mi MathWallet'}
  onBack={onBack}
  walletHeader={studentHeader}
  onLogout={onLogout}
>
    <section className="profile-hero"><span className="profile-avatar">{student.nombre[0]}{student.apellido_paterno?.[0]}</span><div><h2>{nombreCompleto(student)}</h2><p>{student.grupo} · ID {student.id}</p></div></section>
    <section className="balance-card"><span>Saldo disponible</span><strong><Coins /> {Number(student.saldo || 0).toLocaleString('es-MX')}</strong><small>MathCoins · Nivel {student.nivel || 1}</small></section>
    {teacher && <CoinForm onMove={onMove} disabled={loading} />}
    {!teacher && <button className="ranking-link" onClick={onRanking}><Trophy /> Ver mi posición en el ranking <ChevronRight /></button>}
    <section className="history-section"><div className="section-heading"><div><span className="eyebrow">ACTIVIDAD</span><h2>Historial</h2></div><BarChart3 /></div>
      <div className="tabs">{[['dia','Día'],['semana','Semana'],['mes','Mes'],['curso','Curso']].map(([value,label]) => <button className={period === value ? 'active' : ''} onClick={() => onPeriod(value)} key={value}>{label}</button>)}</div>
      <History items={movements} loading={loading} />
    </section>{notice && <Toast text={notice} />}
  </Shell>
}

function CoinForm({ onMove, disabled }) {
  const [amount, setAmount] = useState(5); const [cause, setCause] = useState('')
  return <section className="coin-form"><div className="section-heading"><div><span className="eyebrow">MOVIMIENTO</span><h2>Modificar MathCoins</h2></div></div>
    <div className="amounts">{[5,10,20,50,100].map((n) => <button className={amount === n ? 'active' : ''} onClick={() => setAmount(n)} key={n}>{n}</button>)}</div>
    <input value={cause} onChange={(e) => setCause(e.target.value)} placeholder="Causa (opcional)" />
    <div className="move-actions"><button className="subtract" disabled={disabled} onClick={() => onMove(-amount, cause)}>− Restar</button><button className="add" disabled={disabled} onClick={() => onMove(amount, cause)}>+ Sumar</button></div>
  </section>
}

function Ranking({ students, student, onBack }) {
  const [scope, setScope] = useState('grupo')
  const ranked = useMemo(() => students.filter((s) => scope === 'grado' || !student || s.grupo === student.grupo).sort((a,b) => b.saldo - a.saldo), [students, scope, student])
  return <Shell title="Ranking" onBack={onBack}><div className="tabs ranking-tabs"><button className={scope === 'grupo' ? 'active' : ''} onClick={() => setScope('grupo')}>Salón</button><button className={scope === 'grado' ? 'active' : ''} onClick={() => setScope('grado')}>Año escolar</button></div>
    <div className="ranking-list">{ranked.map((s, i) => <article className={student?.id === s.id ? 'is-me' : ''} key={s.id}><span className="place">{i + 1}</span><span className="avatar">{s.nombre[0]}{s.apellido_paterno?.[0]}</span><div><strong>{nombreCompleto(s)}</strong><small>{s.grupo}</small></div><b>{s.saldo} MC</b></article>)}</div>
  </Shell>
}

function Shell({
  title,
  onBack,
  action,
  children,
  walletHeader,
  onLogout
}) {
  if (walletHeader) {
    return (
      <main className="app-shell">
        <header className="teacher-topbar">
          <div className="header-logo">
            <img src="/logo.png" alt="MathWallet" />
          </div>

          <h1>MathCoins</h1>

          <button
            type="button"
            className="logout-header-button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
          >
            <LogOut size={21} />
          </button>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header>
        {onBack ? (
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
          >
            <ArrowLeft />
          </button>
        ) : (
          <span className="mini-logo">
            <Coins />
          </span>
        )}

        <h1>{title}</h1>

        {action || <span className="header-spacer" />}
      </header>

      <div className="page-content">
        {children}
      </div>
    </main>
  )
}
function Toast({ text }) { return <div className="toast">{text}</div> }

function ConfirmLogout({ onCancel, onConfirm }) {
  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={onCancel}
    >
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-icon">
          <LogOut size={27} />
        </div>

        <h2 id="logout-title">¿Cerrar sesión?</h2>

        <p>
          Tendrás que volver a introducir tus datos para entrar al
          perfil del maestro.
        </p>

        <div className="confirm-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={onConfirm}
          >
            Sí, cerrar sesión
          </button>
        </div>
      </section>
    </div>
  )
}
