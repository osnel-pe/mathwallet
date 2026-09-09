import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import {
  AlertCircle,
  Camera,
  Keyboard
} from 'lucide-react'

export default function ScannerQR({
  onRead,
  title = 'Escanear tarjeta'
}) {
  const [manual, setManual] = useState(false)
  const [id, setId] = useState('')
  const [locked, setLocked] = useState(false)
  const [cameraError, setCameraError] = useState('')

  function accept(value) {
    const cleanId = String(value || '').trim()

    if (locked) return

    if (!/^\d+$/.test(cleanId)) {
      setCameraError(
        'El QR leído no contiene un ID numérico válido.'
      )
      return
    }

    setCameraError('')
    setLocked(true)

    // Al detectar el ID se abre inmediatamente el perfil.
    onRead(cleanId)
  }

  function handleScan(results) {
    const detectedValue = results?.[0]?.rawValue

    if (detectedValue) {
      accept(detectedValue)
    }
  }

  function handleCameraError(error) {
    console.error('Error del escáner:', error)

    setCameraError(
      'No se pudo abrir la cámara. Autoriza el permiso de cámara o escribe el ID manualmente.'
    )
  }

  return (
    <section className="scanner-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LECTOR QR</span>
          <h2>{title}</h2>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={() => {
            setManual((current) => !current)
            setCameraError('')
          }}
          aria-label={
            manual
              ? 'Abrir cámara'
              : 'Escribir ID manualmente'
          }
        >
          {manual
            ? <Camera size={20} />
            : <Keyboard size={20} />}
        </button>
      </div>

      {manual ? (
        <form
          className="manual-id"
          onSubmit={(event) => {
            event.preventDefault()
            accept(id)
          }}
        >
          <input
            inputMode="numeric"
            enterKeyHint="go"
            value={id}
            onChange={(event) => {
              setId(event.target.value.replace(/\D/g, ''))
              setCameraError('')
            }}
            placeholder="ID del alumno"
            autoFocus
          />

          <button
            className="primary"
            type="submit"
            disabled={!id || locked}
          >
            Buscar
          </button>
        </form>
      ) : (
        <div className="camera-frame">
          <Scanner
            formats={['qr_code']}
            constraints={{
              facingMode: {
                ideal: 'environment'
              }
            }}
            scanDelay={250}
            allowMultiple={false}
            paused={locked}
            onScan={handleScan}
            onError={handleCameraError}
            components={{
              audio: false,
              finder: false
            }}
          />

          <div
            className="scan-corners"
            aria-hidden="true"
          />

          {locked && (
            <div className="scan-success">
              QR detectado
            </div>
          )}
        </div>
      )}

      {cameraError && (
        <div className="scanner-error" role="alert">
          <AlertCircle size={19} />
          <span>{cameraError}</span>
        </div>
      )}

      <p className="helper">
        Coloca dentro del recuadro el QR que contiene el ID del alumno.
      </p>
    </section>
  )
}