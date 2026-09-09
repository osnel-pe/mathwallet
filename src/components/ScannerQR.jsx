import { useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { AlertCircle, Camera, Keyboard, LoaderCircle } from 'lucide-react'

export default function ScannerQR({ onRead, title = 'Escanear tarjeta' }) {
  const [manual, setManual] = useState(false)
  const [id, setId] = useState('')
  const [locked, setLocked] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const processingRef = useRef(false)
  const errorReportedRef = useRef(false)

  async function accept(value) {
    const cleanId = String(value || '').trim()
    if (processingRef.current) return
    if (!/^\d+$/.test(cleanId)) {
      setCameraError('Este QR no contiene un ID numérico válido.')
      return
    }
    processingRef.current = true
    setLocked(true)
    setCameraError('')
    try {
      const opened = await onRead(cleanId)
      if (opened === false) {
        processingRef.current = false
        setLocked(false)
      }
    } catch (error) {
      console.error('No se pudo abrir el alumno:', error)
      setCameraError('No se encontró un alumno con este código.')
      processingRef.current = false
      setLocked(false)
    }
  }

  function handleScan(results) {
    if (processingRef.current) return
    const result = results?.find((item) => item?.rawValue)
    if (result?.rawValue) accept(result.rawValue)
  }

  function handleCameraError(error) {
    console.error('Error del escáner:', error)
    if (errorReportedRef.current) return
    errorReportedRef.current = true
    setCameraError('No se pudo abrir la cámara. Autoriza el permiso o escribe el ID manualmente.')
  }

  function changeMode() {
    processingRef.current = false
    errorReportedRef.current = false
    setLocked(false)
    setCameraError('')
    setManual((current) => !current)
  }

  return <section className="scanner-card native-card">
    <div className="section-heading scanner-heading"><div><span className="eyebrow">LECTOR QR</span><h2>{title}</h2></div><button type="button" className="icon-button" onClick={changeMode} aria-label={manual ? 'Abrir cámara' : 'Escribir ID'}>{manual ? <Camera size={20} /> : <Keyboard size={20} />}</button></div>
    {manual ? <form className="manual-id" onSubmit={(event) => { event.preventDefault(); accept(id) }}><input inputMode="numeric" enterKeyHint="go" value={id} onChange={(event) => { setId(event.target.value.replace(/\D/g, '')); setCameraError('') }} placeholder="ID del alumno" autoFocus /><button className="primary" type="submit" disabled={!id || locked}>{locked ? <LoaderCircle className="button-spinner" size={20} /> : 'Buscar'}</button></form> : <div className="camera-frame clean-camera"><Scanner formats={['qr_code']} constraints={{ facingMode: { ideal: 'environment' } }} allowMultiple={false} paused={locked} retryDelay={350} onScan={handleScan} onError={handleCameraError} components={{ audio:false, finder:false, onOff:false, torch:false, zoom:false, tracker:undefined }} /><div className="scan-corners" aria-hidden="true" />{locked && <div className="scanner-processing" aria-live="polite"><LoaderCircle className="button-spinner" size={24} /><span>Abriendo perfil…</span></div>}</div>}
    {cameraError && <div className="scanner-error" role="alert"><AlertCircle size={19} /><span>{cameraError}</span></div>}
    <p className="helper">Centra el código QR de la tarjeta dentro del recuadro.</p>
  </section>
}
