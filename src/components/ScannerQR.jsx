import { useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import {
  AlertCircle,
  Camera,
  Keyboard,
  LoaderCircle,
  QrCode,
  X
} from 'lucide-react'

export default function ScannerQR({
  onRead,
  title = 'Escanear tarjeta',
  allowManual = false
}) {
  const [manual, setManual] = useState(false)
  const [manualId, setManualId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const processingRef = useRef(false)
  const cameraErrorRef = useRef(false)

  async function accept(value) {
    const cleanId = String(value || '').trim()

    if (processingRef.current) return

    if (!/^\d+$/.test(cleanId)) {
      setCameraError(
        'El código escaneado no corresponde a una tarjeta válida.'
      )
      return
    }

    processingRef.current = true
    setProcessing(true)
    setCameraError('')

    try {
      const opened = await onRead(cleanId)

      if (opened === false) {
        processingRef.current = false
        setProcessing(false)
      }
    } catch (error) {
      console.error('Error al localizar el alumno:', error)

      setCameraError(
        'No encontramos un alumno asociado con esta tarjeta.'
      )

      processingRef.current = false
      setProcessing(false)
    }
  }

  function handleScan(results) {
    if (processingRef.current) return

    const detectedCode = results?.find(
      (result) =>
        result?.format === 'qr_code' &&
        result?.rawValue
    )

    if (detectedCode) {
      accept(detectedCode.rawValue)
    }
  }

  function handleCameraError(error) {
    console.error('Error de cámara:', error)

    if (cameraErrorRef.current) return

    cameraErrorRef.current = true

    setCameraError(
      'No pudimos abrir la cámara. Revisa que MathWallet tenga permiso para utilizarla.'
    )
  }

  function toggleManualMode() {
    if (!allowManual) return

    processingRef.current = false
    cameraErrorRef.current = false

    setProcessing(false)
    setCameraError('')
    setManualId('')
    setManual((current) => !current)
  }

  function retryCamera() {
    processingRef.current = false
    cameraErrorRef.current = false

    setProcessing(false)
    setCameraError('')
    setManual(false)
  }

  return (
    <section className="pro-scanner-card">
      <div className="pro-scanner-header">
        <div>
          <span className="eyebrow">
            ESCÁNER INTELIGENTE
          </span>

          <h2>{title}</h2>
        </div>

        {allowManual && (
          <button
            type="button"
            className="scanner-mode-button"
            onClick={toggleManualMode}
            aria-label={
              manual
                ? 'Volver a la cámara'
                : 'Escribir ID manualmente'
            }
          >
            {manual
              ? <Camera size={21} />
              : <Keyboard size={21} />}
          </button>
        )}
      </div>

      {manual && allowManual ? (
        <form
          className="teacher-manual-search"
          onSubmit={(event) => {
            event.preventDefault()
            accept(manualId)
          }}
        >
          <label htmlFor="manual-student-id">
            ID del alumno
          </label>

          <div>
            <input
              id="manual-student-id"
              inputMode="numeric"
              enterKeyHint="go"
              value={manualId}
              onChange={(event) => {
                setManualId(
                  event.target.value.replace(/\D/g, '')
                )

                setCameraError('')
              }}
              placeholder="Escribe el ID"
              autoFocus
            />

            <button
              type="submit"
              className="primary"
              disabled={!manualId || processing}
            >
              {processing
                ? (
                  <LoaderCircle
                    className="scanner-spinner"
                    size={20}
                  />
                )
                : 'Buscar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="qr-portal">
          <div className="qr-portal-glow" />

          <div className="qr-camera-square">
            <Scanner
              formats={['qr_code']}
              constraints={{
                facingMode: {
                  ideal: 'environment'
                },
                width: {
                  ideal: 1280
                },
                height: {
                  ideal: 1280
                }
              }}
              allowMultiple={false}
              paused={processing}
              retryDelay={150}
              onScan={handleScan}
              onError={handleCameraError}
              components={{
                audio: false,
                finder: false,
                tracker: undefined,
                onOff: false,
                torch: false,
                zoom: false
              }}
            />

            <div
              className="qr-dark-mask"
              aria-hidden="true"
            />

            <div
              className="qr-focus-frame"
              aria-hidden="true"
            >
              <span className="corner top-left" />
              <span className="corner top-right" />
              <span className="corner bottom-left" />
              <span className="corner bottom-right" />

              {!processing && (
                <span className="qr-scan-line" />
              )}

              <span className="qr-center-symbol">
                <QrCode size={27} />
              </span>
            </div>

            {processing && (
              <div
                className="qr-processing"
                aria-live="polite"
              >
                <LoaderCircle
                  className="scanner-spinner"
                  size={29}
                />

                <strong>Abriendo perfil</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {cameraError && (
        <div className="pro-scanner-error" role="alert">
          <AlertCircle size={20} />

          <span>{cameraError}</span>

          <button
            type="button"
            onClick={retryCamera}
            aria-label="Cerrar mensaje"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {!manual && (
        <p className="scanner-instruction">
          Centra el QR dentro del cuadrado. La lectura
          comenzará automáticamente.
        </p>
      )}

      {!allowManual && (
        <div className="scanner-security-note">
          <QrCode size={16} />
          Acceso exclusivo mediante tarjeta QR
        </div>
      )}
    </section>
  )
}