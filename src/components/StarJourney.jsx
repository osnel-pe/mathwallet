export default function StarJourney({ student, compact = false }) {
  const records = student?.estrellas || []
  const current = records.filter(record => record.actual)
  const count = Math.min(3, current.length)

  if (compact) {
    return count ? (
      <span className="mw-stars-mini" aria-label={`${count} estrellas del curso`}>
        {'★'.repeat(count)}{count === 3 ? ' · Exento' : ''}
      </span>
    ) : null
  }

  const history = records.filter(record => !record.actual)

  return (
    <section className={`mw-star-journey ${count === 3 ? 'mw-exempt' : ''}`} aria-label="Estrellas del alumno">
      <details>
        <summary className="mw-star-strip" title="Ver detalles de las estrellas">
          <span className="mw-star-label">Mis estrellas</span>
          <span className="mw-star-icons" aria-label={`${count} de 3 estrellas obtenidas`}>
            {[2, 4, 6].map(period => {
              const earned = current.some(record => Number(record.periodo) === period)
              return (
                <span key={period} className={earned ? 'is-earned' : ''} aria-hidden="true"
                  title={`Periodo ${period}: ${earned ? 'conseguida' : 'pendiente'}`}>★</span>
              )
            })}
          </span>
          <span className="mw-star-count">{count}/3</span>
          {count === 3 && <span className="mw-star-badge" title="Exento de la prueba final de Matemáticas">Exento</span>}
          <span className="mw-star-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="mw-star-details">
          <p>{count === 3
            ? '¡Tres estrellas! Estás exento de la prueba final de Matemáticas.'
            : 'Gana una estrella al quedar en el Top 10 de tu grado al cerrar los periodos 2, 4 y 6. Los empates cuentan. Con tres estrellas quedas exento de la prueba final.'}</p>
          {history.length > 0 && <>
            <b>Cursos anteriores</b>
            <ul>{history.map(record => (
              <li key={`${record.ciclo_escolar}-${record.periodo}`}>
                ★ {record.ciclo_escolar} · periodo {record.periodo}
              </li>
            ))}</ul>
          </>}
        </div>
      </details>
    </section>
  )
}
