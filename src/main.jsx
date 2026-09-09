import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import App from './App.jsx'

import './styles.css'
import './pro-theme.css'
import './dashboard.css'
import './native-mobile.css'
import './periods.css'
import './app-fixes.css'

const UPDATE_INTERVAL =
  60 * 1000

let serviceWorkerRegistration = null
let checkingUpdate = false

async function checkForUpdates(
  swUrl,
  registration
) {
  if (
    checkingUpdate ||
    !registration ||
    registration.installing ||
    !navigator.onLine
  ) {
    return
  }

  checkingUpdate = true

  try {
    /*
      Comprueba el archivo sin utilizar
      una copia almacenada anteriormente.
    */
    const response = await fetch(swUrl, {
      cache: 'no-store',

      headers: {
        'Cache-Control':
          'no-cache, no-store, must-revalidate'
      }
    })

    if (response.ok) {
      await registration.update()
    }
  } catch (error) {
    /*
      Si no hay conexión, la aplicación
      continúa funcionando normalmente.
    */
    console.info(
      'Actualización pendiente:',
      error
    )
  } finally {
    checkingUpdate = false
  }
}

const updateSW = registerSW({
  immediate: true,

  onRegisteredSW(
    swUrl,
    registration
  ) {
    if (!registration) return

    serviceWorkerRegistration =
      registration

    /*
      Revisión inmediata al abrir la app.
    */
    checkForUpdates(
      swUrl,
      registration
    )

    /*
      Revisión cada 60 segundos.
    */
    window.setInterval(() => {
      checkForUpdates(
        swUrl,
        registration
      )
    }, UPDATE_INTERVAL)

    /*
      Revisión cuando el usuario
      vuelve a abrir la aplicación.
    */
    window.addEventListener(
      'focus',
      () => {
        checkForUpdates(
          swUrl,
          registration
        )
      }
    )

    /*
      También revisa cuando la PWA
      vuelve a estar visible.
    */
    document.addEventListener(
      'visibilitychange',
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          checkForUpdates(
            swUrl,
            registration
          )
        }
      }
    )

    /*
      Revisa al recuperar internet.
    */
    window.addEventListener(
      'online',
      () => {
        checkForUpdates(
          swUrl,
          registration
        )
      }
    )
  },

  /*
    Si hay una nueva versión,
    la activa y recarga automáticamente.
  */
  onNeedRefresh() {
    updateSW(true)
  },

  onRegisterError(error) {
    console.error(
      'No se pudo registrar la PWA:',
      error
    )
  }
})

/*
  Cuando el Service Worker nuevo toma
  el control, garantiza una sola recarga.
*/
let refreshing = false

navigator.serviceWorker?.addEventListener(
  'controllerchange',
  () => {
    if (refreshing) return

    refreshing = true
    window.location.reload()
  }
)

/*
  Comprueba nuevamente antes de cerrar
  o minimizar la aplicación.
*/
window.addEventListener(
  'pageshow',
  () => {
    if (
      serviceWorkerRegistration
    ) {
      serviceWorkerRegistration
        .update()
        .catch(() => {})
    }
  }
)

createRoot(
  document.getElementById('root')
).render(
  <StrictMode>
    <App />
  </StrictMode>
)