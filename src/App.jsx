import {
  useEffect,
  useState
} from 'react'

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  LogOut,
  Search,
  ShieldCheck,
  Target,
  Trophy
} from 'lucide-react'

import ScannerQR from './components/ScannerQR'
import History from './components/History'
import TeacherDashboard from './components/TeacherDashboard'
import RankingView from './components/RankingView'

import {
  cambiarPeriodoMathWallet,
  cerrarSesion,
  iniciarSesion,
  obtenerAlumno,
  obtenerAlumnos,
  obtenerConfiguracionMathWallet,
  obtenerMetasMathCoins,
  obtenerMovimientos,
  registrarMovimiento
} from './services/mathwallet'

import {
  supabase,
  supabaseConfigured,
  supabaseConfigError
} from './lib/supabase'

const CODIGO_MAESTRO =
  import.meta.env.VITE_CODIGO_MAESTRO ||
  '2026'

const CODIGO_ALUMNO =
  import.meta.env.VITE_CODIGO_ALUMNO ||
  '1234'

function nombreCompleto(alumno = {}) {
  return [
    alumno.nombre,
    alumno.apellido_paterno,
    alumno.apellido_materno
  ]
    .filter(Boolean)
    .join(' ')
}

export default function App() {
  const [screen, setScreen] =
    useState('access')

  const [role, setRole] =
    useState(null)

  const [user, setUser] =
    useState(null)

  const [students, setStudents] =
    useState([])

  const [student, setStudent] =
    useState(null)

  const [movements, setMovements] =
    useState([])

  const [period, setPeriod] =
    useState('dia')

  const [loading, setLoading] =
    useState(false)

  const [notice, setNotice] =
    useState('')

  const [checkingSession, setCheckingSession] =
    useState(true)

  const [confirmLogout, setConfirmLogout] =
    useState(false)

  const [walletConfig, setWalletConfig] =
    useState({
      periodo_actual: 1,
      ciclo_escolar: '2026-2027'
    })

  const [goals, setGoals] =
    useState([])

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false)
      return
    }

    let mounted = true

    async function recoverAccess() {
      try {
        const { data } =
          await supabase.auth.getSession()

        if (!mounted) return

        if (data.session?.user) {
          const [
            allowedStudents,
            config
          ] = await Promise.all([
            obtenerAlumnos(),
            obtenerConfiguracionMathWallet()
          ])

          if (!mounted) return

          setUser(data.session.user)
          setRole('teacher')
          setStudents(allowedStudents)
          setWalletConfig(config)
          setScreen('teacher-home')

          return
        }

        const savedStudentId =
          localStorage.getItem(
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
              obtenerMovimientos(
                savedStudentId,
                'dia'
              ),
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
      } catch (error) {
        console.error(
          'No se pudo recuperar la sesión:',
          error
        )
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
        if (
          event === 'SIGNED_IN' &&
          session?.user
        ) {
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

  function go(nextScreen) {
    setNotice('')
    setScreen(nextScreen)
  }

  function showNotice(text) {
    setNotice(text)

    window.setTimeout(() => {
      setNotice('')
    }, 3600)
  }

  async function loadStudents() {
    setLoading(true)

    try {
      const [
        allowedStudents,
        config
      ] = await Promise.all([
        obtenerAlumnos(),
        obtenerConfiguracionMathWallet()
      ])

      setStudents(allowedStudents)
      setWalletConfig(config)
    } catch (error) {
      showNotice(
        error.message ||
        'No fue posible cargar los alumnos.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadGoals() {
    setLoading(true)

    try {
      const [
        records,
        config
      ] = await Promise.all([
        obtenerMetasMathCoins(),
        obtenerConfiguracionMathWallet()
      ])

      setGoals(records)
      setWalletConfig(config)
    } catch (error) {
      showNotice(
        error.message ||
        'No fue posible cargar las metas.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function openStudent(
    id,
    destination = 'student-profile'
  ) {
    setLoading(true)

    if (destination === 'teacher-student') {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setLoading(false)
        setRole('teacher')
        go('teacher-login')

        return false
      }
    }

    try {
      const foundStudent =
        await obtenerAlumno(id)

      const studentMovements =
        await obtenerMovimientos(
          foundStudent.id,
          'dia'
        )

      setStudent(foundStudent)
      setMovements(studentMovements)
      setPeriod('dia')

      if (
        destination === 'student-profile'
      ) {
        localStorage.setItem(
          'mathwallet_student_id',
          String(foundStudent.id)
        )

        setRole('student')
      }

      go(destination)

      return true
    } catch (error) {
      showNotice(
        error.message ||
        'No encontramos un alumno con ese código.'
      )

      return false
    } finally {
      setLoading(false)
    }
  }

  async function changeHistoryPeriod(value) {
    if (!student) return

    setPeriod(value)
    setLoading(true)

    try {
      const updatedMovements =
        await obtenerMovimientos(
          student.id,
          value
        )

      setMovements(updatedMovements)
    } catch (error) {
      showNotice(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    localStorage.removeItem(
      'mathwallet_student_id'
    )

    await cerrarSesion()

    setUser(null)
    setRole(null)
    setStudent(null)
    setStudents([])
    setMovements([])
    setGoals([])
    setConfirmLogout(false)

    go('access')
  }

  if (checkingSession) {
    return (
      <main className="session-loader">
        <img
          src="/logo.png"
          alt="MathWallet"
        />

        <div className="loader-ring" />

        <p>Abriendo MathWallet…</p>
      </main>
    )
  }

  const protectedTeacherScreen =
    [
      'teacher-home',
      'teacher-scan',
      'teacher-student',
      'groups',
      'goals'
    ].includes(screen) ||
    (
      screen === 'ranking' &&
      role === 'teacher'
    )

  if (
    protectedTeacherScreen &&
    (
      role !== 'teacher' ||
      !user
    )
  ) {
    return (
      <TeacherLogin
        onBack={() => {
          setRole(null)
          go('access')
        }}
        onSuccess={(authenticatedUser) => {
          setUser(authenticatedUser)
          setRole('teacher')
          go('teacher-home')
          loadStudents()
        }}
      />
    )
  }

  if (screen === 'access') {
    return (
      <Access
        notice={notice}
        onEnter={(code) => {
          if (code === CODIGO_MAESTRO) {
            setRole('teacher')
            go('teacher-login')
            return
          }

          if (code === CODIGO_ALUMNO) {
            setRole('student')
            go('student-scan')
            return
          }

          showNotice(
            'Código incorrecto. Inténtalo nuevamente.'
          )
        }}
      />
    )
  }

  if (screen === 'teacher-login') {
    return (
      <TeacherLogin
        onBack={() => go('access')}
        onSuccess={(authenticatedUser) => {
          setUser(authenticatedUser)
          setRole('teacher')
          go('teacher-home')
          loadStudents()
        }}
      />
    )
  }

  if (screen === 'student-scan') {
    return (
      <Shell
        title="Acceso de alumno"
        onBack={() => go('access')}
      >
        <ScannerQR
          title="Escanea tu tarjeta"
          allowManual={false}
          onRead={(id) =>
            openStudent(
              id,
              'student-profile'
            )
          }
        />

        {notice && (
          <Toast text={notice} />
        )}
      </Shell>
    )
  }

  if (screen === 'teacher-home') {
    return (
      <>
        <TeacherDashboard
          students={students}
          loading={loading}
          period={
            walletConfig.periodo_actual
          }
          onGroups={() => go('groups')}
          onScan={() => go('teacher-scan')}
          onRanking={() => go('ranking')}
          onGoals={() => {
            /*
              Primero abre la pantalla.
              Después consulta Supabase.
            */
            go('goals')
            loadGoals()
          }}
          onLogout={() =>
            setConfirmLogout(true)
          }
        />

        {confirmLogout && (
          <ConfirmLogout
            onCancel={() =>
              setConfirmLogout(false)
            }
            onConfirm={logout}
          />
        )}
      </>
    )
  }

  if (screen === 'teacher-scan') {
    return (
      <Shell
        title="Escáner del maestro"
        onBack={() =>
          go('teacher-home')
        }
      >
        <ScannerQR
          title="Escanear alumno"
          allowManual
          onRead={(id) =>
            openStudent(
              id,
              'teacher-student'
            )
          }
        />

        {notice && (
          <Toast text={notice} />
        )}
      </Shell>
    )
  }

  if (screen === 'groups') {
    return (
      <Groups
        students={students}
        onBack={() =>
          go('teacher-home')
        }
        onOpen={(id) =>
          openStudent(
            id,
            'teacher-student'
          )
        }
      />
    )
  }

  if (screen === 'goals') {
    return (
      <GoalsPanel
        goals={goals}
        config={walletConfig}
        loading={loading}
        notice={notice}
        onBack={() =>
          go('teacher-home')
        }
        onAdvance={async (
          nextPeriod,
          confirmation
        ) => {
          setLoading(true)

          try {
            await cambiarPeriodoMathWallet(
              nextPeriod,
              confirmation
            )

            const [
              updatedStudents,
              updatedGoals,
              updatedConfig
            ] = await Promise.all([
              obtenerAlumnos(),
              obtenerMetasMathCoins(),
              obtenerConfiguracionMathWallet()
            ])

            setStudents(updatedStudents)
            setGoals(updatedGoals)
            setWalletConfig(updatedConfig)

            showNotice(
              `Periodo ${nextPeriod} activado correctamente.`
            )

            return true
          } catch (error) {
            showNotice(
              error.message ||
              'No fue posible cambiar el periodo.'
            )

            return false
          } finally {
            setLoading(false)
          }
        }}
      />
    )
  }

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
          onLogout={() =>
            setConfirmLogout(true)
          }
        />

        {confirmLogout && (
          <ConfirmLogout
            onCancel={() =>
              setConfirmLogout(false)
            }
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
        onBack={() =>
          go('teacher-scan')
        }
        onPeriod={changeHistoryPeriod}
        onMove={async (
          cantidad,
          causa,
          tipo
        ) => {
          setLoading(true)

          try {
            await registrarMovimiento({
              alumnoId: student.id,
              cantidad,
              causa,
              tipo
            })

            const updatedStudent =
              await obtenerAlumno(
                student.id
              )

            setStudent(updatedStudent)

            setStudents(
              (currentStudents) =>
                currentStudents.map(
                  (currentStudent) =>
                    currentStudent.id ===
                    updatedStudent.id
                      ? updatedStudent
                      : currentStudent
                )
            )

            if (tipo === 'recompensa') {
              showNotice(
                `Se agregaron ${cantidad} MathCoins.`
              )
            } else if (tipo === 'compra') {
              showNotice(
                `Compra registrada: se restaron ${Math.abs(
                  cantidad
                )} MathCoins del saldo disponible.`
              )
            } else {
              showNotice(
                `Falta registrada: se restaron ${Math.abs(
                  cantidad
                )} MathCoins del saldo disponible y acumulado.`
              )
            }

            /*
              Después del movimiento vuelve
              automáticamente al escáner.
            */
            setScreen('teacher-scan')
          } catch (error) {
            showNotice(
              error.message ||
              'No fue posible registrar el movimiento.'
            )
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
          onPeriod={
            changeHistoryPeriod
          }
          studentHeader
          onLogout={() =>
            setConfirmLogout(true)
          }
          onRanking={() => {
            go('ranking')
            loadStudents()
          }}
          notice={notice}
        />

        {confirmLogout && (
          <ConfirmLogout
            onCancel={() =>
              setConfirmLogout(false)
            }
            onConfirm={logout}
          />
        )}
      </>
    )
  }

  return null
}

function Access({
  onEnter,
  notice
}) {
  const [code, setCode] =
    useState('')

  return (
    <main className="access-page">
      <section className="access-card">
        <div className="brand-mark logo-mark">
          <img
            src="/logo.png"
            alt="Logo de MathWallet"
          />
        </div>

        <span className="eyebrow">
          SISTEMA ESCOLAR
        </span>

        <h1>MathWallet</h1>

        <p>
          Convierte tu esfuerzo en MathCoins.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onEnter(code)
            setCode('')
          }}
        >
          <label htmlFor="access-code">
            Código de acceso
          </label>

          <input
            id="access-code"
            className="access-input"
            type="password"
            inputMode="numeric"
            enterKeyHint="go"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value.replace(
                  /\D/g,
                  ''
                )
              )
            }
            placeholder="••••"
            autoFocus
          />

          <button
            className="primary large"
            type="submit"
          >
            Continuar
            <ChevronRight size={20} />
          </button>
        </form>

        {!supabaseConfigured && (
          <small className="setup-note">
            {supabaseConfigError ||
              'No fue posible iniciar la conexión con Supabase.'}
          </small>
        )}

        {notice && (
          <Toast text={notice} />
        )}
      </section>
    </main>
  )
}

function TeacherLogin({
  onBack,
  onSuccess
}) {
  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [
    showPassword,
    setShowPassword
  ] = useState(false)

  const [busy, setBusy] =
    useState(false)

  const [error, setError] =
    useState('')

  function translateLoginError(message) {
    const text = String(
      message || ''
    ).toLowerCase()

    if (
      text.includes(
        'invalid login credentials'
      )
    ) {
      return 'El correo o la contraseña son incorrectos.'
    }

    if (
      text.includes(
        'email not confirmed'
      )
    ) {
      return 'Debes confirmar tu correo antes de iniciar sesión.'
    }

    if (
      text.includes(
        'failed to fetch'
      )
    ) {
      return 'No se pudo conectar con el servidor.'
    }

    return 'No fue posible iniciar sesión. Verifica tus datos.'
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (busy) return

    setError('')
    setBusy(true)

    try {
      const authenticatedUser =
        await iniciarSesion(
          email.trim(),
          password
        )

      onSuccess(authenticatedUser)
    } catch (loginError) {
      setError(
        translateLoginError(
          loginError.message
        )
      )
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

        <span className="eyebrow">
          ACCESO PROTEGIDO
        </span>

        <h1>Maestro</h1>

        <p>
          Inicia sesión con tu cuenta autorizada.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="teacher-email">
            Correo electrónico
          </label>

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

          <label htmlFor="teacher-password">
            Contraseña
          </label>

          <div className="password-field">
            <input
              id="teacher-password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value
                )

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
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
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
            <div
              className="login-error"
              role="alert"
            >
              <AlertCircle size={20} />

              <div>
                <strong>
                  No pudimos iniciar sesión
                </strong>

                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            className="primary large"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Verificando…'
              : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function Groups({
  students,
  onBack,
  onOpen
}) {
  const [query, setQuery] =
    useState('')

  const [group, setGroup] =
    useState('Todos')

  const groups = [
    'Todos',
    ...new Set(
      students.map(
        (item) => item.grupo
      )
    )
  ]

  const visibleStudents =
    students.filter((item) => {
      const matchesGroup =
        group === 'Todos' ||
        item.grupo === group

      const matchesSearch =
        nombreCompleto(item)
          .toLowerCase()
          .includes(
            query
              .trim()
              .toLowerCase()
          )

      return (
        matchesGroup &&
        matchesSearch
      )
    })

  return (
    <Shell
      title="Alumnos"
      onBack={onBack}
    >
      <div className="search-box">
        <Search size={19} />

        <input
          placeholder="Buscar por nombre"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />
      </div>

      <div className="chips">
        {groups.map((groupName) => (
          <button
            type="button"
            className={
              groupName === group
                ? 'active'
                : ''
            }
            onClick={() =>
              setGroup(groupName)
            }
            key={groupName}
          >
            {groupName}
          </button>
        ))}
      </div>

      <div className="student-list">
        {visibleStudents.map(
          (item) => (
            <button
              type="button"
              key={item.id}
              onClick={() =>
                onOpen(item.id)
              }
            >
              <span className="avatar">
                {item.nombre?.[0]}
                {item.apellido_paterno?.[0]}
              </span>

              <div>
                <strong>
                  {nombreCompleto(item)}
                </strong>

                <small>
                  {item.grupo} · ID {item.id}
                </small>
              </div>

              <b>
                {Number(
                  item.saldo || 0
                ).toLocaleString('es-MX')}{' '}
                MC
              </b>

              <ChevronRight size={18} />
            </button>
          )
        )}
      </div>
    </Shell>
  )
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

  return (
    <Shell
      title={
        teacher
          ? 'Perfil del alumno'
          : 'Mi MathWallet'
      }
      onBack={onBack}
      walletHeader={studentHeader}
      onLogout={onLogout}
    >
      <section className="profile-hero">
        <span className="profile-avatar">
          {student.nombre?.[0]}
          {student.apellido_paterno?.[0]}
        </span>

        <div>
          <h2>
            {nombreCompleto(student)}
          </h2>

          <p>
            {student.grupo} · ID {student.id}
          </p>
        </div>
      </section>

      <section className="wallet-balance-card">
        <span className="wallet-balance-label">
          SALDO DISPONIBLE
        </span>

        <strong className="wallet-main-balance">
          <Coins />

          {Number(
            student.saldo || 0
          ).toLocaleString('es-MX')}
        </strong>

        <small>
          MathCoins disponibles · Nivel{' '}
          {student.nivel || 1}
        </small>

        <div className="wallet-accumulated-row">
          <div>
            <Target size={19} />

            <span>
              Acumulado del periodo
            </span>
          </div>

          <strong>
            {Number(
              student.saldo_acumulado || 0
            ).toLocaleString('es-MX')}{' '}
            MC
          </strong>
        </div>
      </section>

      {teacher && (
        <CoinForm
          onMove={onMove}
          disabled={loading}
        />
      )}

      {!teacher && (
        <button
          type="button"
          className="ranking-link"
          onClick={onRanking}
        >
          <Trophy />

          Ver mi posición en el ranking

          <ChevronRight />
        </button>
      )}

      <section className="history-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              ACTIVIDAD
            </span>

            <h2>Historial</h2>
          </div>

          <BarChart3 />
        </div>

        <div className="tabs">
          {[
            ['dia', 'Día'],
            ['semana', 'Semana'],
            ['mes', 'Mes'],
            ['curso', 'Curso']
          ].map(([value, label]) => (
            <button
              type="button"
              className={
                period === value
                  ? 'active'
                  : ''
              }
              onClick={() =>
                onPeriod(value)
              }
              key={value}
            >
              {label}
            </button>
          ))}
        </div>

        <History
          items={movements}
          loading={loading}
        />
      </section>

      {notice && (
        <Toast text={notice} />
      )}
    </Shell>
  )
}

function CoinForm({
  onMove,
  disabled
}) {
  const [
    shortcutAmount,
    setShortcutAmount
  ] = useState(5)

  const [
    customAmount,
    setCustomAmount
  ] = useState('')

  const [cause, setCause] =
    useState('')

  const [type, setType] =
    useState('recompensa')

  const amount =
    customAmount === ''
      ? shortcutAmount
      : Number(customAmount)

  const validAmount =
    Number.isInteger(amount) &&
    amount > 0 &&
    amount <= 100000

  function chooseShortcut(value) {
    setShortcutAmount(value)
    setCustomAmount('')
  }

  function submitMovement() {
    if (!validAmount || disabled) return

    const signedAmount =
      type === 'recompensa'
        ? amount
        : -amount

    onMove(
      signedAmount,
      cause,
      type
    )
  }

  return (
    <section className="coin-form">
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">
            MOVIMIENTO
          </span>

          <h2>Modificar MathCoins</h2>
        </div>
      </div>

      <div className="movement-types">
        <button
          type="button"
          className={
            type === 'recompensa'
              ? 'active'
              : ''
          }
          onClick={() =>
            setType('recompensa')
          }
        >
          Recompensa
        </button>

        <button
          type="button"
          className={
            type === 'compra'
              ? 'active'
              : ''
          }
          onClick={() =>
            setType('compra')
          }
        >
          Compra
        </button>

        <button
          type="button"
          className={
            type === 'falta'
              ? 'active'
              : ''
          }
          onClick={() =>
            setType('falta')
          }
        >
          Falta
        </button>
      </div>

      <p className="movement-help">
        {type === 'compra'
          ? 'Resta solamente del saldo disponible.'
          : type === 'falta'
            ? 'Resta del saldo disponible y del acumulado.'
            : 'Suma al saldo disponible y al acumulado.'}
      </p>

      <div className="amounts">
        {[5, 10, 20, 50, 100].map(
          (value) => (
            <button
              type="button"
              className={
                customAmount === '' &&
                shortcutAmount === value
                  ? 'active'
                  : ''
              }
              onClick={() =>
                chooseShortcut(value)
              }
              key={value}
            >
              {value}
            </button>
          )
        )}
      </div>

      <label className="custom-amount-field">
        <span>
          Cantidad personalizada
        </span>

        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="100000"
          step="1"
          value={customAmount}
          onChange={(event) =>
            setCustomAmount(
              event.target.value
                .replace(/[^0-9]/g, '')
                .slice(0, 6)
            )
          }
          placeholder={
            `Usar atajo: ${shortcutAmount}`
          }
        />
      </label>

      <input
        value={cause}
        onChange={(event) =>
          setCause(event.target.value)
        }
        placeholder="Causa (opcional)"
        maxLength={120}
      />

      <button
        type="button"
        className={
          type === 'recompensa'
            ? 'movement-submit add'
            : 'movement-submit subtract'
        }
        disabled={
          disabled ||
          !validAmount
        }
        onClick={submitMovement}
      >
        {type === 'recompensa'
          ? '+'
          : '−'}{' '}

        {type === 'recompensa'
          ? 'Sumar'
          : 'Restar'}{' '}

        {validAmount ? amount : ''}{' '}
        MathCoins
      </button>

      {customAmount !== '' &&
        !validAmount && (
          <small className="amount-error">
            Escribe una cantidad entera entre
            1 y 100000.
          </small>
        )}
    </section>
  )
}

function GoalsPanel({
  goals,
  config,
  loading,
  onBack,
  onAdvance,
  notice
}) {
  const [query, setQuery] =
    useState('')

  const [group, setGroup] =
    useState('Todos')

  const [
    selectedPeriod,
    setSelectedPeriod
  ] = useState(
    Number(config.periodo_actual || 1)
  )

  const [target, setTarget] =
    useState('Todas')

  const [
    showAdvance,
    setShowAdvance
  ] = useState(false)

  const [
    confirmation,
    setConfirmation
  ] = useState('')

  const groups = [
    ...new Set(
      goals
        .map(
          (item) =>
            item.alumno?.grupo
        )
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(
      b,
      'es',
      {
        numeric: true,
        sensitivity: 'base'
      }
    )
  )

  const visibleGoals =
    goals.filter((item) => {
      const completeName =
        nombreCompleto(
          item.alumno || {}
        ).toLowerCase()

      const matchesPeriod =
        Number(item.periodo) ===
        Number(selectedPeriod)

      const matchesGroup =
        group === 'Todos' ||
        item.alumno?.grupo === group

      const matchesTarget =
        target === 'Todas' ||
        Number(item.meta) ===
        Number(target)

      const matchesSearch =
        completeName.includes(
          query
            .trim()
            .toLowerCase()
        )

      return (
        matchesPeriod &&
        matchesGroup &&
        matchesTarget &&
        matchesSearch
      )
    })

  const groupsToShow =
    group === 'Todos'
      ? groups
      : [group]

  const groupedGoals =
    groupsToShow
      .map((groupName) => [
        groupName,
        visibleGoals.filter(
          (item) =>
            item.alumno?.grupo ===
            groupName
        )
      ])
      .filter(
        ([, records]) =>
          records.length > 0
      )

  const nextPeriod =
    Number(
      config.periodo_actual || 1
    ) + 1

  const requiredPhrase =
    `CAMBIAR AL PERIODO ${nextPeriod}`

  return (
    <Shell
      title="Metas por periodo"
      onBack={onBack}
    >
      <section className="goals-summary">
        <div>
          <span>Periodo activo</span>

          <strong>
            {config.periodo_actual}
          </strong>
        </div>

        <div>
          <span>Meta actual</span>

          <strong>
            {Number(
              config.periodo_actual
            ) % 2 === 1
              ? '550'
              : '1,100'}{' '}
            MC
          </strong>
        </div>

        <div>
          <span>Ciclo</span>

          <strong>
            {config.ciclo_escolar}
          </strong>
        </div>
      </section>

      <section className="goals-tools">
        <div className="search-box">
          <Search size={19} />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Buscar alumno"
          />
        </div>

        <div className="goal-selects">
          <select
            value={selectedPeriod}
            onChange={(event) =>
              setSelectedPeriod(
                Number(
                  event.target.value
                )
              )
            }
          >
            {[1, 2, 3, 4, 5, 6].map(
              (value) => (
                <option
                  value={value}
                  key={value}
                >
                  Periodo {value}
                </option>
              )
            )}
          </select>

          <select
            value={group}
            onChange={(event) =>
              setGroup(
                event.target.value
              )
            }
          >
            <option value="Todos">
              Todos los salones
            </option>

            {groups.map(
              (groupName) => (
                <option
                  value={groupName}
                  key={groupName}
                >
                  {groupName}
                </option>
              )
            )}
          </select>

          <select
            value={target}
            onChange={(event) =>
              setTarget(
                event.target.value
              )
            }
          >
            <option value="Todas">
              Todas las metas
            </option>

            <option value="550">
              Meta 550
            </option>

            <option value="1100">
              Meta 1,100
            </option>
          </select>
        </div>
      </section>

      <section className="goal-results">
        {loading ? (
          <p className="empty">
            Cargando metas…
          </p>
        ) : groupedGoals.length > 0 ? (
          groupedGoals.map(
            ([groupName, records]) => (
              <div
                className="goal-group"
                key={groupName}
              >
                <h2>
                  {groupName}

                  <span>
                    {records.length}{' '}
                    {records.length === 1
                      ? 'alumno'
                      : 'alumnos'}
                  </span>
                </h2>

                {records.map(
                  (record) => (
                    <article key={record.id}>
                      <span className="avatar">
                        {
                          record.alumno
                            ?.nombre?.[0]
                        }

                        {
                          record.alumno
                            ?.apellido_paterno?.[0]
                        }
                      </span>

                      <div>
                        <strong>
                          {nombreCompleto(
                            record.alumno
                          )}
                        </strong>

                        <small>
                          Periodo{' '}
                          {record.periodo}
                          {' · '}
                          Alcanzó{' '}
                          {Number(
                            record
                              .acumulado_alcanzado
                          ).toLocaleString(
                            'es-MX'
                          )}{' '}
                          MC
                        </small>
                      </div>

                      <b>
                        {Number(
                          record.meta
                        ).toLocaleString(
                          'es-MX'
                        )}
                      </b>
                    </article>
                  )
                )}
              </div>
            )
          )
        ) : (
          <div className="goals-empty-state">
            <Target size={38} />

            <strong>
              Todavía no hay alumnos
            </strong>

            <p>
              Ningún alumno ha alcanzado la
              meta seleccionada en este periodo.
            </p>
          </div>
        )}
      </section>

      {Number(
        config.periodo_actual
      ) < 6 && (
        <button
          type="button"
          className="advance-period-button"
          onClick={() => {
            setConfirmation('')
            setShowAdvance(true)
          }}
        >
          <Target />

          Avanzar al periodo {nextPeriod}
        </button>
      )}

      {showAdvance && (
        <div className="dialog-overlay">
          <section className="confirm-dialog period-dialog">
            <div className="confirm-icon">
              <Target />
            </div>

            <h2>
              ¿Cambiar al periodo {nextPeriod}?
            </h2>

            <p>
              {[3, 5].includes(nextPeriod)
                ? 'Este cambio realizará el corte. Quienes alcanzaron 1,100 comenzarán con 100 MathCoins y los demás con 50.'
                : 'Se conservarán los saldos y el acumulado continuará hacia la siguiente meta.'}
            </p>

            <label>
              Escribe{' '}
              <strong>
                {requiredPhrase}
              </strong>
            </label>

            <input
              value={confirmation}
              onChange={(event) =>
                setConfirmation(
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder={
                requiredPhrase
              }
              autoComplete="off"
            />

            <div className="confirm-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowAdvance(false)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="logout-button"
                disabled={
                  confirmation.trim() !==
                    requiredPhrase ||
                  loading
                }
                onClick={async () => {
                  const completed =
                    await onAdvance(
                      nextPeriod,
                      confirmation
                    )

                  if (completed) {
                    setShowAdvance(false)
                    setSelectedPeriod(
                      nextPeriod
                    )
                  }
                }}
              >
                {loading
                  ? 'Procesando…'
                  : 'Confirmar cambio'}
              </button>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <Toast text={notice} />
      )}
    </Shell>
  )
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
            <img
              src="/logo.png"
              alt="MathWallet"
            />
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
            aria-label="Volver"
          >
            <ArrowLeft />
          </button>
        ) : (
          <span className="mini-logo">
            <Coins />
          </span>
        )}

        <h1>{title}</h1>

        {action || (
          <span className="header-spacer" />
        )}
      </header>

      <div className="page-content">
        {children}
      </div>
    </main>
  )
}

function Toast({ text }) {
  return (
    <div className="toast">
      {text}
    </div>
  )
}

function ConfirmLogout({
  onCancel,
  onConfirm
}) {
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
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="confirm-icon">
          <LogOut size={27} />
        </div>

        <h2 id="logout-title">
          ¿Cerrar sesión?
        </h2>

        <p>
          Tendrás que volver a introducir tus
          datos para entrar nuevamente.
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