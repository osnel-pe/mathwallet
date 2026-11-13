export default function StarJourney({ student, compact = false }) {
  const records = student?.estrellas || []
  const current = records.filter(record => record.actual)
  const count = Math.min(3, current.length)
  if (compact) return count ? <span className="mw-stars-mini" aria-label={`${count} estrellas del curso`}>{'★'.repeat(count)}{count === 3 ? ' · Exento' : ''}</span> : null
  const history = records.filter(record => !record.actual)
  return <section className={`mw-star-journey ${count === 3 ? 'mw-exempt' : ''}`}>
    <div className="mw-star-heading"><span className="eyebrow">TU CONSTELACIÓN DE LOGROS</span><b>{count}/3</b></div>
    <div className="mw-star-track">{[2,4,6].map((period, i) => {
      const earned = current.find(record => Number(record.periodo) === period)
      return <div key={period} className={earned ? 'is-earned' : ''}><span aria-hidden="true">★</span><small>Cierre {i + 1}</small><b>{earned ? '¡Conseguida!' : `Periodo ${period}`}</b></div>
    })}</div>
    <h3>{count === 3 ? '¡Tres estrellas! Estás exento de la prueba final' : count ? '¡Tu esfuerzo ya tiene estrella!' : 'Tu próxima estrella comienza hoy'}</h3>
    <p>{count === 3 ? 'Matemáticas · Conserva este gran logro de tu curso.' : 'Entra al Top 10 de tu grado al cerrar los periodos 2, 4 y 6. Los empates también cuentan.'}</p>
    {history.length > 0 && <details><summary>Ver estrellas de cursos anteriores</summary><ul>{history.map(record => <li key={`${record.ciclo_escolar}-${record.periodo}`}>★ {record.ciclo_escolar} · cierre del periodo {record.periodo}</li>)}</ul></details>}
  </section>
}
