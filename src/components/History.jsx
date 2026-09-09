import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { fechaCorta } from '../lib/dates'

export default function History({ items, loading }) {
  if (loading) return <div className="empty">Cargando movimientos…</div>
  if (!items.length) return <div className="empty">No hay movimientos en este periodo.</div>
  return <div className="history-list">{items.map((item) => {
    const positive = item.cantidad > 0
    return <article className="history-row" key={item.id}>
      <span className={`movement-icon ${positive ? 'positive' : 'negative'}`}>
        {positive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
      </span>
      <div className="history-copy"><strong>{item.causa || (positive ? 'MathCoins agregados' : 'MathCoins retirados')}</strong><small>{fechaCorta(item.created_at)}</small></div>
      <b className={positive ? 'positive-text' : 'negative-text'}>{positive ? '+' : ''}{item.cantidad}</b>
    </article>
  })}</div>
}
