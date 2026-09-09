import { useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import {
  AlertCircle,
  Camera,
  Keyboard,
  LoaderCircle,
  ScanLine
} from 'lucide-react'

export default function ScannerQR({
  onRead,
  title = '¡Cuenta tus MathCoins!',
  allowManual = false
}) {
  const [manual, setManual] = useState(false)
  const [id, setId] = useState('')
  const [locked, setLocked] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const processingRef = useRef(false)
  const errorReportedRef = useRef(false)

  function unlockScanner() {
    processingRef.current = false
    setLocked(false)
  }

  async function accept(value) {
    const cleanId = String(value || '').trim()

    if (processingRef.current) return

    if (!/^\d+$/.test(cleanId)) {
      setCameraError(
        'El QR leído no contiene un ID numérico válido.'
      )
      return
    }

    processingRef.current = true
    setLocked(true)
    setCameraError('')

    try {
      const opened = await onRead(cleanId)

      if (opened === false) {
        unlockScanner()
      }
    } catch (error) {
      console.error(
        'No se pudo abrir el alumno:',
        error
      )

      setCameraError(
        'No encontramos un alumno asociado con este código.'
      )

      unlockScanner()
    }
  }

  function handleScan(results) {
    if (processingRef.current) return

    const detected = results?.find(
      (result) => result?.rawValue
    )

    if (detected?.rawValue) {
      accept(detected.rawValue)
    }
  }

  function handleCameraError(error) {
    console.error(
      'Error del escáner:',
      error
    )

    if (errorReportedRef.current) return

    errorReportedRef.current = true

    setCameraError(
      allowManual
        ? 'No se pudo abrir la cámara. Autoriza el permiso o utiliza el ID manual.'
        : 'No se pudo abrir la cámara. Autoriza el permiso para escanear tu tarjeta.'
    )
  }

  function changeMode() {
    if (!allowManual) return

    processingRef.current = false
    errorReportedRef.current = false

    setLocked(false)
    setCameraError('')
    setManual((current) => !current)
  }

  return (
    <section className="scanner-card scanner-pro-card">
      <div className="section-heading scanner-heading">
        <div>
          <span className="eyebrow">
            CHECA TU MATHWALLET
          </span>

          <h2>{title}</h2>
        </div>

        {allowManual && (
          <button
            type="button"
            className="icon-button scanner-mode"
            onClick={changeMode}
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
        )}
      </div>

      {manual && allowManual ? (
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
              setId(
                event.target.value.replace(/\D/g, '')
              )

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
            {locked ? (
              <LoaderCircle
                className="scanner-spinner"
                size={20}
              />
            ) : (
              'Buscar'
            )}
          </button>
        </form>
      ) : (
        <div className="qr-portal">
          <Scanner
            formats={['qr_code']}
            constraints={{
              facingMode: {
                ideal: 'environment'
              }
            }}
            scanDelay={100}
            retryDelay={200}
            allowMultiple={false}
            paused={locked}
            onScan={handleScan}
            onError={handleCameraError}
            components={{
              audio: false,
              finder: false,
              onOff: false,
              torch: false,
              zoom: false
            }}
          />

          <div
            className="qr-shade"
            aria-hidden="true"
          />

          <div
            className="qr-target"
            aria-hidden="true"
          >
            <i className="corner corner-tl" />
            <i className="corner corner-tr" />
            <i className="corner corner-bl" />
            <i className="corner corner-br" />

            {!locked && (
              <span className="laser-line" />
            )}

            <ScanLine
              className="target-symbol"
              size={25}
            />
          </div>

          <div className="camera-status">
            <span className="live-dot" />
            Cámara activa
          </div>

          {locked && (
            <div
              className="scanner-processing"
              aria-live="polite"
            >
              <LoaderCircle
                className="scanner-spinner"
                size={28}
              />

              <strong>QR reconocido</strong>
              <small>Abriendo perfil…</small>
            </div>
          )}
        </div>
      )}

      {cameraError && (
        <div
          className="scanner-error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{cameraError}</span>
        </div>
      )}

      <p className="helper">
        Centra el código QR dentro del marco dorado.
      </p>
    </section>
  )
}