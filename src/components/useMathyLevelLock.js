import { useEffect, useState } from 'react'
import { obtenerBloqueos } from '../services/mathwallet'
export default function useMathyLevelLock(adventure, level) {
  const [status,setStatus] = useState({ loading:true, locked:false, error:'' })
  useEffect(() => {
    let alive = true
    setStatus({loading:true,locked:false,error:''})
    const load = () => obtenerBloqueos().then(rows => {
      if(alive) setStatus({loading:false,locked:!!rows.find(r => r.aventura === adventure && r.nivel === Number(level))?.bloqueado,error:''})
    }).catch(() => {if(alive) setStatus({loading:false,locked:true,error:'No se pudo comprobar la disponibilidad. Vuelve a Aventuras para reintentar.'})})
    load(); const timer = setInterval(load,10000); window.addEventListener('focus',load)
    return () => {alive=false;clearInterval(timer);window.removeEventListener('focus',load)}
  },[adventure,level])
  return status
}
