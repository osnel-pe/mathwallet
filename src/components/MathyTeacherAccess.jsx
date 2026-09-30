import { useState } from 'react'
import { generarClaveMathy } from '../services/mathy'

export default function MathyTeacherAccess({ alumnoId }) {
  const [clave, setClave] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function generar() {
    if (clave && !window.confirm('¿Reemplazar la clave? La anterior dejará de funcionar. El avance se conserva.')) return
    setBusy(true)
    setMessage('')
    try {
      const data = await generarClaveMathy(alumnoId)
      setClave(data.clave)
      setMessage('Entrega esta clave únicamente a este alumno. Si ya tenía otra, ha sido reemplazada.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mathy-teacher">
      <strong>Acceso personal a Mathy</strong>
      <p>La clave permite jugar y recibir premios. Se introduce una sola vez por dispositivo.</p>
      <button type="button" onClick={generar} disabled={busy}>
        {busy ? 'Generando…' : 'Generar / reemplazar clave de Mathy'}
      </button>
      {clave && (
        <label>
          Clave del alumno (selecciona y copia)
          <input readOnly value={clave} onFocus={(event) => event.target.select()} />
        </label>
      )}
      <p role="status">{message}</p>
    </section>
  )
}
