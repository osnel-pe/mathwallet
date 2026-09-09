import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Award,
  Coins,
  LogOut,
  Medal,
  Trophy
} from 'lucide-react'
import { obtenerGrado } from '../services/mathwallet'

function nombreCompleto(student) {
  return [
    student.nombre,
    student.apellido_paterno,
    student.apellido_materno
  ]
    .filter(Boolean)
    .join(' ')
}

function ordenarRanking(a, b) {
  const diferencia =
    Number(b.saldo || 0) - Number(a.saldo || 0)

  if (diferencia !== 0) {
    return diferencia
  }

  return nombreCompleto(a).localeCompare(
    nombreCompleto(b),
    'es',
    {
      sensitivity: 'base'
    }
  )
}

export default function RankingView({
  students,
  student,
  role,
  onBack,
  onLogout
}) {
  const isStudent = role === 'student'

  const [rankingType, setRankingType] =
    useState('salon')

  const [selectedGroup, setSelectedGroup] =
    useState('')

  const [selectedGrade, setSelectedGrade] =
    useState(1)

  const groups = useMemo(() => {
    return [...new Set(
      students
        .map((item) => item.grupo)
        .filter(Boolean)
    )].sort((a, b) =>
      a.localeCompare(b, 'es', {
        numeric: true,
        sensitivity: 'base'
      })
    )
  }, [students])

  useEffect(() => {
    if (!selectedGroup && groups.length) {
      setSelectedGroup(groups[0])
    }
  }, [groups, selectedGroup])

  const activeGroup = isStudent
    ? student?.grupo
    : selectedGroup

  const activeGrade = isStudent
    ? obtenerGrado(student?.grupo)
    : selectedGrade

  const completeRanking = useMemo(() => {
    return students
      .filter((item) => {
        if (rankingType === 'salon') {
          return item.grupo === activeGroup
        }

        return obtenerGrado(item.grupo) === activeGrade
      })
      .sort(ordenarRanking)
  }, [
    students,
    rankingType,
    activeGroup,
    activeGrade
  ])

  const topTen = completeRanking.slice(0, 10)
  const podium = topTen.slice(0, 3)
  const remaining = topTen.slice(3)

  const studentPosition = isStudent
    ? completeRanking.findIndex(
        (item) => item.id === student?.id
      ) + 1
    : 0

  return (
    <main className="app-shell ranking-page">
      {isStudent ? (
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
      ) : (
        <header>
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label="Volver"
          >
            <ArrowLeft size={21} />
          </button>

          <h1>Ranking MathCoins</h1>

          <span className="header-trophy">
            <Trophy size={21} />
          </span>
        </header>
      )}

      <div className="page-content">
        {isStudent && (
          <button
            type="button"
            className="ranking-back-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Volver a mi perfil
          </button>
        )}

        <section className="ranking-controls-card">
          <div className="ranking-type-buttons">
            <button
              type="button"
              className={
                rankingType === 'salon'
                  ? 'active'
                  : ''
              }
              onClick={() => setRankingType('salon')}
            >
              {isStudent ? 'Mi salón' : 'Por salón'}
            </button>

            <button
              type="button"
              className={
                rankingType === 'grado'
                  ? 'active'
                  : ''
              }
              onClick={() => setRankingType('grado')}
            >
              {isStudent ? 'Mi año' : 'Por año'}
            </button>
          </div>

          {isStudent ? (
            <div className="student-ranking-scope">
              <span>
                {rankingType === 'salon'
                  ? 'Ranking seleccionado'
                  : 'Año escolar seleccionado'}
              </span>

              <strong>
                {rankingType === 'salon'
                  ? student?.grupo
                  : activeGrade === 1
                    ? 'Primero de secundaria'
                    : 'Segundo de secundaria'}
              </strong>
            </div>
          ) : rankingType === 'salon' ? (
            <label className="ranking-select-field">
              <span>Selecciona el salón</span>

              <select
                value={selectedGroup}
                onChange={(event) =>
                  setSelectedGroup(event.target.value)
                }
              >
                {groups.map((group) => (
                  <option value={group} key={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="ranking-select-field">
              <span>Selecciona el año escolar</span>

              <select
                value={selectedGrade}
                onChange={(event) =>
                  setSelectedGrade(
                    Number(event.target.value)
                  )
                }
              >
                <option value={1}>
                  Primero de secundaria
                </option>

                <option value={2}>
                  Segundo de secundaria
                </option>
              </select>
            </label>
          )}
        </section>

        {podium.length ? (
          <>
            <section className="podium">
              {podium[1] && (
                <PodiumStudent
                  student={podium[1]}
                  position={2}
                />
              )}

              {podium[0] && (
                <PodiumStudent
                  student={podium[0]}
                  position={1}
                />
              )}

              {podium[2] && (
                <PodiumStudent
                  student={podium[2]}
                  position={3}
                />
              )}
            </section>

            {remaining.length > 0 && (
              <section className="ranking-rest-card">
                <div className="ranking-section-title">
                  <Award size={20} />
                  <h2>Top 10</h2>
                </div>

                <div className="ranking-results-list">
                  {remaining.map((item, index) => (
                    <article key={item.id}>
                      <span className="ranking-number">
                        {index + 4}
                      </span>

                      <span className="ranking-avatar">
                        {item.nombre?.[0]}
                        {item.apellido_paterno?.[0]}
                      </span>

                      <div>
                        <strong>
                          {nombreCompleto(item)}
                        </strong>

                        <small>{item.grupo}</small>
                      </div>

                      <b>
                        {Number(
                          item.saldo || 0
                        ).toLocaleString('es-MX')}

                        <small> MC</small>
                      </b>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {isStudent && studentPosition > 0 && (
              <section className="my-ranking-position">
                <span className="my-position-number">
                  {studentPosition}
                </span>

                <div>
                  <small>Tu posición actual</small>

                  <strong>
                    {nombreCompleto(student)}
                  </strong>

                  <span>
                    {rankingType === 'salon'
                      ? student.grupo
                      : `${activeGrade}° de secundaria`}
                  </span>
                </div>

                <b>
                  {Number(
                    student.saldo || 0
                  ).toLocaleString('es-MX')}

                  <small> MC</small>
                </b>
              </section>
            )}
          </>
        ) : (
          <div className="ranking-empty">
            No hay alumnos disponibles para este ranking.
          </div>
        )}
      </div>
    </main>
  )
}

function PodiumStudent({
  student,
  position
}) {
  return (
    <article
      className={`podium-place podium-${position}`}
    >
      <div className="podium-medal">
        {position === 1
          ? <Trophy size={25} />
          : <Medal size={23} />}
      </div>

      <span className="podium-avatar">
        {student.nombre?.[0]}
        {student.apellido_paterno?.[0]}
      </span>

      <strong>{nombreCompleto(student)}</strong>
      <small>{student.grupo}</small>

      <b>
        <Coins size={16} />

        {Number(
          student.saldo || 0
        ).toLocaleString('es-MX')}
      </b>

      <div className="podium-base">
        {position}
      </div>
    </article>
  )
}