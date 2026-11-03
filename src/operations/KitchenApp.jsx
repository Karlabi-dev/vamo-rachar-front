import { useEffect, useRef, useState } from 'react';
import { Clock3, RefreshCw, Layers, X, Check, Inbox, CircleAlert } from 'lucide-react';
import { Logo, Button, Badge } from '../components/UI.jsx';
import { kitchenOrders, barOrders, cloneOrders, describeOrder, itemStatuses } from './kitchenData.js';
import './kitchen.css';

const getPath = () => window.location.hash.replace(/^#\/?/, '').split('?')[0];
export default function KitchenApp() {
  const [path, setPath] = useState(getPath);
  const [orders, setOrders] = useState(() => ({ cozinha: cloneOrders(kitchenOrders), bar: cloneOrders(barOrders) }));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  const sector = path.startsWith('bar') ? 'bar' : 'cozinha';
  const label = sector === 'bar' ? 'Bar' : 'Cozinha';
  const [view, id] = path.split('/').slice(1);
  const state = ['loading', 'vazio', 'erro'].includes(view) ? view : busy ? 'loading' : 'normal';
  const data = orders[sector];
  const active = data.filter(order => !describeOrder(order).complete);
  const selected = view === 'pedido' ? data.find(order => order.id === id) : null;
  const go = suffix => { window.location.hash = `/${sector}${suffix ? `/${suffix}` : ''}`; };

  useEffect(() => {
    const onHash = () => setPath(getPath());
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('hashchange', onHash); clearTimeout(timer.current); };
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);
  const refresh = () => {
    clearTimeout(timer.current); setBusy(true);
    timer.current = setTimeout(() => { setBusy(false); go(''); setToast('Fila de demonstração atualizada.'); }, 450);
  };
  const applyStatus = (itemId, status) => {
    setOrders(previous => ({ ...previous, [sector]: previous[sector].map(order => order.id !== selected.id ? order : {
      ...order, changed: true, items: order.items.map(item => item.id === itemId ? { ...item, status } : item),
    }) }));
    setToast('Status atualizado somente nesta demonstração.');
  };

  return <div className="kitchen-shell">
    <header className="kitchen-header">
      <Logo/>
      <div className="kitchen-device"><button className="sector-pill" onClick={() => { window.location.hash = sector === 'cozinha' ? '/bar' : '/cozinha'; }} aria-label={`Setor ${label}. Alternar para ${sector === 'cozinha' ? 'Bar' : 'Cozinha'}`}>{label}</button><span>{label === 'Cozinha' ? 'Tablet cozinha · CZ-01' : 'Tablet bar · BR-01'}</span></div>
    </header>
    <nav className="kitchen-nav" aria-label="Navegação da cozinha"><a aria-current="page" href={`#/${sector}`}>Fila de pedidos</a></nav>
    <main className="kitchen-main">
      <div className="kitchen-title-row"><div className="kitchen-heading"><p className="kitchen-eyebrow">COZINHA / BAR · FILA DO SETOR</p><h1>Cada pedido no seu tempo.</h1><p>Acompanhe a fila e avance os itens sem perder o ritmo da cozinha.</p></div><Button kind="secondary" disabled={busy} onClick={refresh}><RefreshCw size={18} aria-hidden="true" className={busy ? 'refresh-spinning' : ''}/> Atualizar fila</Button></div>
      <p className="kitchen-count" aria-live="polite">{state === 'loading' ? 'Atualizando fila…' : state === 'vazio' ? '0 pedidos ativos · atualizado agora' : state === 'erro' ? 'Não foi possível atualizar a fila' : `${active.length} pedidos ativos · atualizado agora`}</p>
      {state === 'loading' ? <div className="kitchen-grid" role="status" aria-label="Carregando pedidos">{Array.from({ length: 8 }, (_, i) => <div className="kitchen-skeleton" key={i}><span/><span/><span/><span/></div>)}</div> : state === 'erro' ? <section className="kitchen-state" role="alert"><CircleAlert size={36}/><h2>Não foi possível carregar a fila.</h2><p>Tente atualizar novamente para visualizar os pedidos de demonstração.</p><Button kind="secondary" onClick={refresh}>Tentar novamente</Button></section> : state === 'vazio' || active.length === 0 ? <section className="kitchen-state"><Inbox size={36}/><h2>Nenhum pedido por enquanto.</h2><p>Os próximos pedidos deste setor aparecerão aqui.</p><Button kind="secondary" onClick={refresh}>Atualizar fila</Button></section> : <div className="kitchen-grid">{active.map(order => {
        const display = describeOrder(order);
        return <article className={`kitchen-order ${display.partial ? 'is-partial' : ''}`} key={order.id} aria-label={`Mesa ${order.table}, pedido ${order.id}`}>
          <div className="kitchen-order-heading"><h2>Mesa {order.table}</h2><span>#{order.id}</span></div>
          <p className="kitchen-received">Recebido às {order.received}</p>
          <p className="kitchen-time"><Clock3 size={16} aria-hidden="true"/> {order.minutes} min · até {order.due}</p>
          <div className="kitchen-items">{display.summary.map((line, i) => <p key={i}>{line}</p>)}</div>
          <Badge tone={display.tone}>{display.label}</Badge>
          <Button kind="secondary" onClick={() => go(`pedido/${order.id}`)}>Ver detalhes</Button>
        </article>;
      })}</div>}
      <aside className="kitchen-note"><Layers size={20} aria-hidden="true"/><div><strong>Pedido parcialmente entregue continua na fila.</strong><p>O pedido sai apenas quando todos os itens forem entregues ao garçom. A previsão é do pedido completo.</p></div></aside>
    </main>
    {selected && <ItemPreview order={selected} onClose={() => go('')} onApply={applyStatus}/>}
    {view === 'pedido' && !selected && <div className="kitchen-state"><h2>Pedido não encontrado.</h2><Button kind="secondary" onClick={() => go('')}>Voltar à fila</Button></div>}
    {view === 'estados' && <div className="kitchen-examples"><h2>Estados da demonstração</h2><p>Esta área usa dados fictícios e não envia solicitações para serviços.</p><a href={`#/${sector}/loading`}>Carregando</a><a href={`#/${sector}/vazio`}>Fila vazia</a><a href={`#/${sector}/erro`}>Erro de atualização</a><button onClick={refresh}>Atualização com sucesso</button></div>}
    {toast && <div className="kitchen-toast" role="status"><Check size={18} aria-hidden="true"/>{toast}</div>}
  </div>;
}

// Temporary item preview, not a reproduction of the Figma detail page.
// That screen needs its own high-resolution visual reference before implementation.
function ItemPreview({ order, onClose, onApply }) {
  const dialog = useRef(null);
  const [pending, setPending] = useState(null);
  const firstFocus = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal(); firstFocus.current?.focus();
    return () => { element.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} className="kitchen-dialog" aria-labelledby="kitchen-details-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="kitchen-dialog-header"><div><p className="kitchen-eyebrow">PRÉVIA LOCAL DOS ITENS</p><h2 id="kitchen-details-title">Mesa {order.table} · Pedido #{order.id}</h2></div><button ref={firstFocus} className="icon-button" aria-label="Fechar detalhes" onClick={onClose}><X size={22}/></button></div>
    <p className="kitchen-preview-description">Demonstração de status individuais. A tela de detalhes do Figma ainda aguarda referência completa.</p>
    {order.items.map(item => <section className="kitchen-item-row" key={item.id}><div><h3>{item.quantity}× {item.name}</h3>{item.note && <p>{item.note}</p>}<Badge tone={item.status === 'Entregue ao garçom' ? 'green' : item.status === 'Em preparo' ? 'yellow' : 'blue'}>{item.status}</Badge></div><label>Status do item<select aria-label={`Status de ${item.name}`} value={item.status} onChange={e => setPending({ item, status: e.target.value })}>{itemStatuses.map(status => <option key={status}>{status}</option>)}</select></label></section>)}
    {pending && <section className="kitchen-confirm" role="region" aria-label="Confirmar alteração"><h3>Confirmar alteração do item?</h3><p>{pending.item.name}: {pending.item.status} → {pending.status}</p><p>O ajuste será feito somente nesta demonstração local.</p><div><Button kind="secondary" onClick={() => setPending(null)}>Voltar sem alterar</Button><Button onClick={() => { onApply(pending.item.id, pending.status); setPending(null); }}>Confirmar status</Button></div></section>}
    <Button kind="secondary" onClick={onClose}>Voltar à fila</Button>
  </dialog>;
}
