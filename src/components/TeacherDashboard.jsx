import {
  Coins,
  LogOut,
  QrCode,
  Target,
  Trophy,
  Users
} from 'lucide-react'

export default function TeacherDashboard({
  students,
  loading,
  period = 1,
  onGroups,
  onScan,
  onRanking,
  onGoals,
  onLogout
}) {
  const groupCount = new Set(
    students.map(
      (student) => student.grupo
    )
  ).size

  const totalCoins = students.reduce(
    (total, student) =>
      total + Number(student.saldo || 0),
    0
  )

  const target =
    period % 2 === 1 ? 550 : 1100

  return (
    <main className="app-shell teacher-dashboard">
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

      <div className="page-content dashboard-content">
        <section className="period-status-card">
          <span className="period-status-icon">
            <Target size={22} />
          </span>

          <div>
            <small>
              PERIODO ESCOLAR ACTIVO
            </small>

            <strong>
              Periodo {period}
            </strong>
          </div>

          <span className="period-target">
            <small>Meta</small>

            <b>
              {target.toLocaleString('es-MX')} MC
            </b>
          </span>
        </section>

        <section className="compact-metrics">
          <article className="compact-metric">
            <Users size={20} />

            <strong>
              {loading
                ? '—'
                : students.length}
            </strong>

            <small>Alumnos</small>
          </article>

          <button
            type="button"
            className="compact-metric group-metric"
            onClick={onGroups}
          >
            <Users size={20} />

            <strong>
              {loading
                ? '—'
                : groupCount}
            </strong>

            <small>Grupos</small>
          </button>

          <article className="compact-metric">
            <Coins size={20} />

            <strong>
              {loading
                ? '—'
                : totalCoins.toLocaleString(
                    'es-MX'
                  )}
            </strong>

            <small>MathCoins</small>
          </article>
        </section>

        <button
          type="button"
          className="main-dashboard-action"
          onClick={onScan}
        >
          <span className="dashboard-action-icon">
            <QrCode size={31} />
          </span>

          <span className="dashboard-action-copy">
            <strong>
              Escanear tarjeta
            </strong>

            <small>
              Localizar al alumno mediante su QR
            </small>
          </span>
        </button>

        <button
          type="button"
          className="main-dashboard-action goals-action"
          onClick={onGoals}
        >
          <span className="dashboard-action-icon">
            <Target size={29} />
          </span>

          <span className="dashboard-action-copy">
            <strong>
              Metas por periodo
            </strong>

            <small>
              Alumnos que alcanzaron 550 o 1,100
            </small>
          </span>
        </button>

        <button
          type="button"
          className="main-dashboard-action ranking-action"
          onClick={onRanking}
        >
          <span className="dashboard-action-icon">
            <Trophy size={29} />
          </span>

          <span className="dashboard-action-copy">
            <strong>Rankings</strong>

            <small>
              Consultar por salón o por grado
            </small>
          </span>
        </button>
      </div>
    </main>
  )
}