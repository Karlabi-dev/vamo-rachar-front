import { useState } from 'react';
import { Button, Heading, Logo, Notice, Shell, State } from './components/UI.jsx';
import { createApiClient, tableFromUrl } from './api/client.js';
import { createFirebaseTokenProvider } from './api/firebase.js';
import { splitAmounts } from './utils/shares.js';
import './connected-client.css';

const pendingOrderKey = 'vamo-pending-order-v1';
const pendingResolutionKey = 'vamo-pending-resolution-v1';
const currency = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const statusNames = {awaiting_split:'Aguardando aceite', split_rejected:'Divisão recusada', received:'Recebido', in_preparation:'Em preparo', ready:'Pronto', picked_up:'Retirado', delivered:'Entregue', cancelled:'Cancelado', unavailable:'Indisponível', attention_required:'Em revisão'};
function safePhoto(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; } catch { return null; }
}

export default function ConnectedApp() {
  const [table] = useState(() => tableFromUrl(window.location.href, { restaurantId: import.meta.env.VITE_DEMO_RESTAURANT_ID, tableId: import.meta.env.VITE_DEMO_TABLE_ID }));
  const [name, setName] = useState('');
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [pendingResolution, setPendingResolution] = useState(null);
  const [message, setMessage] = useState('');
  const [choice, setChoice] = useState(null);
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState([]);
  const [invitations, setInvitations] = useState(null);
  const [orders, setOrders] = useState(null);
  const [client] = useState(() => {
    try {
      const getToken = createFirebaseTokenProvider({ apiKey: import.meta.env.VITE_FIREBASE_API_KEY, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, emulatorUrl: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL });
      return { api: createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL, getToken }) };
    } catch { return { error: 'A configuração de conexão está incompleta. Procure a equipe do estabelecimento.' }; }
  });
  const matchesSession = (saved, joined) => saved?.restaurantId === table.restaurantId && saved?.sessionId === joined.sessionId && saved?.participantId === joined.participantId && saved?.requestId;
  async function enter(event) {
    event.preventDefault();
    if (busy || !table || client.error) return;
    setBusy(true); setError('');
    try {
      const joined = await client.api.joinTable(table, name);
      setSession(joined);
      try {
        const saved = JSON.parse(sessionStorage.getItem(pendingOrderKey) || 'null');
        if (matchesSession(saved, joined) && saved?.item?.menuItemId) setPendingOrder(saved);
        const resolution = JSON.parse(sessionStorage.getItem(pendingResolutionKey) || 'null');
        if (matchesSession(resolution, joined) && resolution?.orderId && resolution?.itemId) setPendingResolution(resolution);
      } catch { /* A entrada continua disponível mesmo sem armazenamento. */ }
      setItems(await client.api.listMenu(table.restaurantId, joined.sessionId));
    } catch (e) { setError(e.message || 'Não foi possível conectar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function refreshMenu() {
    if (busy || !session) return;
    setBusy(true); setError('');
    try { setItems(await client.api.listMenu(table.restaurantId, session.sessionId)); }
    catch (e) { setError(e.message || 'Não foi possível carregar o cardápio.'); }
    finally { setBusy(false); }
  }
  async function choose(item, mode, target) {
    if (busy || pendingOrder || pendingResolution) return;
    setError(''); setMessage(''); setSelected([]);
    if (mode === 'individual') { setPeople([]); setChoice({item, mode}); return; }
    setBusy(true);
    try {
      const participants = await client.api.listParticipants(table.restaurantId, session.sessionId);
      setPeople(participants.filter(p => p.participantId !== session.participantId));
      setChoice({item, mode, target});
    } catch (e) { setError(e.message || 'Não foi possível listar as pessoas da mesa.'); }
    finally { setBusy(false); }
  }
  function selectPerson(id) {
    if (!selected.includes(id) && selected.length >= 19) { setError('Você pode convidar até 19 pessoas por item.'); return; }
    setError(''); setSelected(old => old.includes(id) ? old.filter(person => person !== id) : [...old, id]);
  }
  function beginOrder() {
    if (!choice || busy || (choice.mode === 'split' && selected.length === 0)) return;
    const attempt = {restaurantId: table.restaurantId, sessionId: session.sessionId, participantId: session.participantId, requestId: crypto.randomUUID(), item: {menuItemId: choice.item.id, quantity: 1, expectedUnitPriceCents: choice.item.priceCents, ...(selected.length ? {inviteeIds:selected} : {})}, name: choice.item.name};
    sendOrder(attempt);
  }
  async function sendOrder(newAttempt) {
    if (busy || !session) return;
    const attempt = pendingOrder || newAttempt;
    if (!attempt) return;
    try { sessionStorage.setItem(pendingOrderKey, JSON.stringify(attempt)); }
    catch { setError('Não foi possível preparar uma tentativa segura. Verifique o navegador e peça ajuda à equipe.'); return; }
    setPendingOrder(attempt); setBusy(true); setError(''); setMessage('');
    try {
      const {orderId} = await client.api.createOrder({restaurantId: attempt.restaurantId, sessionId: attempt.sessionId, requestId: attempt.requestId, items: [attempt.item]});
      sessionStorage.removeItem(pendingOrderKey); setPendingOrder(null); setChoice(null); setSelected([]);
      setMessage(attempt.item.inviteeIds?.length ? `Convites para ${attempt.name} enviados. O item aguarda o aceite de todos. Código: ${orderId}.` : `Pedido de ${attempt.name} enviado. Código: ${orderId}.`);
    } catch (e) {
      if (e.status === 400 && ['failed-precondition','invalid-argument'].includes(e.code)) {
        try { sessionStorage.removeItem(pendingOrderKey); } catch { /* A mensagem orienta atualizar. */ }
        setPendingOrder(null); setChoice(null); setSelected([]);
        setError('O pedido não foi criado. O produto ou o preço pode ter mudado; atualize o cardápio e revise.');
      } else setError(`${e.message} Se a resposta não chegou, tente novamente para consultar a mesma tentativa.`);
    } finally { setBusy(false); }
  }
  async function refreshInvitations() {
    if (busy) return; setBusy(true); setError('');
    try { setInvitations(await client.api.listInvitations(table.restaurantId, session.sessionId)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function answer(invitation, accept) {
    if (busy) return; setBusy(true); setError(''); setMessage('');
    try {
      await client.api.respondToShare(table.restaurantId, session.sessionId, invitation.orderId, invitation.itemId, accept);
      setInvitations(old => old.filter(i => !(i.orderId === invitation.orderId && i.itemId === invitation.itemId)));
      setMessage(accept ? 'Sua parte foi aceita. O item seguirá para preparo quando todos aceitarem.' : 'Convite recusado. A pessoa que fez o pedido precisará decidir como continuar.');
    } catch (e) { setError(`${e.message} Atualize os convites para conferir o resultado.`); }
    finally { setBusy(false); }
  }
  async function fetchOrders() {
    const orderIds = await client.api.listMyOrders(table.restaurantId, session.sessionId);
    return Promise.all(orderIds.map(async orderId => ({orderId, ...await client.api.listMyOrderItems(table.restaurantId, session.sessionId, orderId)})));
  }
  async function refreshOrders() {
    if (busy) return; setBusy(true); setError('');
    try { setOrders(await fetchOrders()); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function prepareResolution(orderId, item, action, inviteeIds = []) {
    if (busy || pendingOrder || pendingResolution) return;
    if (action === 'assume' && !window.confirm(`Assumir o valor integral de ${item.name}: ${currency(item.totalCents)}?`)) return;
    const attempt = {restaurantId:table.restaurantId, sessionId:session.sessionId, participantId:session.participantId, orderId, itemId:item.itemId, requestId:crypto.randomUUID(), action, inviteeIds, name:item.name};
    sendResolution(attempt);
  }
  async function sendResolution(newAttempt) {
    if (busy) return;
    const attempt = pendingResolution || newAttempt;
    if (!attempt) return;
    try { sessionStorage.setItem(pendingResolutionKey, JSON.stringify(attempt)); }
    catch { setError('Não foi possível preparar uma tentativa segura. Peça ajuda à equipe.'); return; }
    setPendingResolution(attempt); setBusy(true); setError(''); setMessage('');
    try {
      const {restaurantId,sessionId,orderId,itemId,requestId,action,inviteeIds} = attempt;
      await client.api.resolveRejectedSplit({restaurantId,sessionId,orderId,itemId,requestId,action,inviteeIds});
      sessionStorage.removeItem(pendingResolutionKey); setPendingResolution(null); setChoice(null); setSelected([]);
      setMessage(action === 'cancel' ? 'Divisão cancelada.' : action === 'assume' ? 'Você assumiu o item integralmente.' : 'Novos convites enviados.');
      try { setOrders(await fetchOrders()); } catch { setOrders(null); }
    } catch (e) {
      if (e.status === 400 && ['failed-precondition','invalid-argument'].includes(e.code)) {
        try { sessionStorage.removeItem(pendingResolutionKey); } catch { /* O usuário deve atualizar. */ }
        setPendingResolution(null); setChoice(null); setSelected([]);
        setError('A alteração não foi realizada. Atualize seus pedidos para conferir a divisão.');
      } else setError(`${e.message} Se a resposta não chegou, tente confirmar a mesma operação.`);
    }
    finally { setBusy(false); }
  }
  const amounts = choice ? splitAmounts(choice.mode === 'reinvite' ? choice.item.totalCents : choice.item.priceCents, [session.participantId, ...selected]) : [];
  return <Shell title={items ? 'Cardápio' : 'Boas-vindas'} nav={false} entry={!items} go={() => setError('Peça ajuda à equipe do estabelecimento.')}>
    <div className="content">
      <div className="identity"><Logo /></div>
      {!items ? <>
        <Heading title={session ? 'Entrada confirmada' : 'Bora entrar?'}>{session ? 'Sua entrada foi registrada. Vamos carregar o cardápio.' : 'Informe seu nome para entrar na mesa.'}</Heading>
        {!table && <Notice tone="red" icon="help">Não foi possível identificar a mesa. Escaneie o QR da mesa novamente ou peça ajuda à equipe.</Notice>}
        {client.error && <Notice tone="red" icon="help">{client.error}</Notice>}
        {error && <div role="alert"><Notice tone="red" icon="help">{error}</Notice></div>}
        {table && !session && <form onSubmit={enter}>
          <label className="field">Como podemos te chamar?<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" /></label>
          <div className="actions"><Button disabled={busy || !name.trim() || !!client.error} onClick={enter}>{busy ? 'Entrando...' : 'Entrar na mesa'}</Button></div>
        </form>}
        {session && <div className="actions"><Button disabled={busy} onClick={refreshMenu}>{busy ? 'Carregando...' : 'Tentar carregar cardápio'}</Button></div>}
      </> : <>
        <Heading title={`Olá, ${name.trim()}!`}>Veja os produtos disponíveis nesta mesa.</Heading>
        {error && <div role="alert"><Notice tone="red" icon="help">{error}</Notice></div>}
        {message && <div role="status"><Notice tone="green" icon="check">{message}</Notice></div>}
        {pendingOrder && <div className="actions"><Notice icon="help">Pedido de {pendingOrder.name} aguardando confirmação. A repetição usa a mesma tentativa.</Notice><Button disabled={busy} onClick={() => sendOrder()}>Tentar confirmar pedido</Button></div>}
        {pendingResolution && <div className="actions"><Notice icon="help">A alteração da divisão de {pendingResolution.name} aguarda confirmação.</Notice><Button disabled={busy} onClick={() => sendResolution()}>Tentar confirmar alteração</Button></div>}
        {choice && <section className="connected-panel" aria-label="Revisar pedido">
          <h2>{choice.mode === 'reinvite' ? 'Escolha novas pessoas' : choice.mode === 'split' ? 'Quem vai dividir?' : 'Confirme seu pedido'}</h2>
          <p><strong>{choice.item.name}</strong> · {currency(choice.mode === 'reinvite' ? choice.item.totalCents : choice.item.priceCents)}</p>
          {choice.mode !== 'individual' && <><p>Selecione quem vai compartilhar com você.</p>{people.length === 0 ? <p>Nenhuma outra pessoa disponível nesta mesa.</p> : people.map((person,index) => <label className="connected-person" key={person.participantId}><input type="checkbox" checked={selected.includes(person.participantId)} onChange={() => selectPerson(person.participantId)}/>{person.displayName}{people.filter(p => p.displayName === person.displayName).length > 1 ? ` · pessoa ${index + 1}` : ''}</label>)}<p>Se houver nomes iguais, confirme com as pessoas antes de convidar.</p></>}
          {(choice.mode === 'individual' || selected.length > 0) && <div className="connected-shares"><p>Sua parte: <strong>{currency(amounts.find(a => a.participantId === session.participantId).amountCents)}</strong></p>{selected.map(id => <p key={id}>{people.find(p => p.participantId === id)?.displayName}: {currency(amounts.find(a => a.participantId === id).amountCents)}</p>)}</div>}
          <p>{choice.mode === 'individual' ? 'O preço será conferido antes de enviar.' : 'O item aguardará o aceite de todas as pessoas convidadas.'}</p>
          <div className="connected-buttons"><Button kind="secondary" disabled={busy || !!pendingOrder || !!pendingResolution} onClick={() => {setChoice(null); setSelected([]);}}>Voltar</Button><Button disabled={busy || !!pendingOrder || !!pendingResolution || (choice.mode !== 'individual' && !selected.length)} onClick={() => choice.mode === 'reinvite' ? prepareResolution(choice.target.orderId, choice.item, 'reinvite', selected) : beginOrder()}>{choice.mode === 'individual' ? 'Confirmar pedido' : 'Enviar convites'}</Button></div>
        </section>}
        <h2>Cardápio</h2>
        {items.length === 0 ? <State title="Cardápio indisponível" icon="help" tone="blue">Ainda não há produtos disponíveis. Peça ajuda à equipe.</State> : <div className="product-list">{items.map(item => <article className="product-card" key={item.id}>{safePhoto(item.photoUrl) && <img src={safePhoto(item.photoUrl)} alt="" />}<span className="product-copy"><b>{item.name}</b><small>{item.description}</small><strong>{currency(item.priceCents)}</strong><span className="connected-buttons"><Button disabled={busy || !!pendingOrder || !!pendingResolution} onClick={() => choose(item, 'individual')}>Pedir 1 unidade</Button><Button kind="secondary" disabled={busy || !!pendingOrder || !!pendingResolution} onClick={() => choose(item, 'split')}>Dividir {item.name}</Button></span></span></article>)}</div>}
        <div className="actions"><Button kind="secondary" disabled={busy} onClick={refreshMenu}>{busy ? 'Atualizando...' : 'Atualizar cardápio'}</Button></div>
        <section className="connected-panel"><h2>Convites para dividir</h2><Button kind="secondary" disabled={busy} onClick={refreshInvitations}>Atualizar convites</Button>{invitations?.length === 0 && <p>Nenhum convite pendente.</p>}{invitations?.map(invitation => <article className="connected-invitation" key={`${invitation.orderId}-${invitation.itemId}`}><h3>{invitation.quantity}× {invitation.name}</h3><p>Total do item: {currency(invitation.totalCents)} · Sua parte: <strong>{currency(invitation.amountCents)}</strong></p><div className="connected-buttons"><Button disabled={busy} onClick={() => answer(invitation, true)}>Aceitar {invitation.name}</Button><Button kind="secondary" disabled={busy} onClick={() => answer(invitation, false)}>Recusar {invitation.name}</Button></div></article>)}</section>
        <section className="connected-panel"><h2>Meus pedidos</h2><Button kind="secondary" disabled={busy} onClick={refreshOrders}>Atualizar pedidos</Button>{orders?.length === 0 && <p>Você ainda não tem pedidos.</p>}{orders?.flatMap(order => order.items.map(item => <article className="connected-invitation" key={`${order.orderId}-${item.itemId}`}><h3>{item.name}</h3><p>{statusNames[item.status] || item.status} · Sua parte: {currency(item.amountCents)}</p>{item.status === 'split_rejected' && order.isOwner && <><p>Alguém recusou. Escolha como resolver.</p><div className="connected-buttons"><Button disabled={busy || !!pendingOrder || !!pendingResolution} onClick={() => prepareResolution(order.orderId,item,'assume')}>Assumir {item.name}</Button><Button kind="secondary" disabled={busy || !!pendingOrder || !!pendingResolution} onClick={() => prepareResolution(order.orderId,item,'cancel')}>Cancelar divisão de {item.name}</Button><Button kind="secondary" disabled={busy || !!pendingOrder || !!pendingResolution} onClick={() => choose(item,'reinvite',{orderId:order.orderId})}>Convidar novamente para {item.name}</Button></div></>}</article>))}</section>
        <Notice icon="help">Pedidos e divisões estão em teste. O pagamento ainda não está conectado.</Notice>
      </>}
    </div>
  </Shell>;
}
