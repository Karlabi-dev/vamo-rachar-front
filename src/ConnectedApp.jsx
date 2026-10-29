import { useState } from 'react';
import { Button, Heading, Logo, Notice, Shell, State } from './components/UI.jsx';
import { createApiClient, tableFromUrl } from './api/client.js';
import { createFirebaseTokenProvider } from './api/firebase.js';

const currency = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
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
  const [client] = useState(() => {
    try {
      const getToken = createFirebaseTokenProvider({ apiKey: import.meta.env.VITE_FIREBASE_API_KEY, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, emulatorUrl: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL });
      return { api: createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL, getToken }) };
    } catch {
      return { error: 'A configuração de conexão está incompleta. Procure a equipe do estabelecimento.' };
    }
  });
  async function enter(event) {
    event.preventDefault();
    if (busy || !table || client.error) return;
    setBusy(true); setError('');
    try {
      const joined = await client.api.joinTable(table, name);
      setSession(joined);
      const menu = await client.api.listMenu(table.restaurantId, joined.sessionId);
      setItems(menu);
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
        {items.length === 0 ? <State title="Cardápio indisponível" icon="help" tone="blue">Ainda não há produtos disponíveis. Peça ajuda à equipe.</State> : <div className="product-list">{items.map(item => <article className="product-card" key={item.id}>{safePhoto(item.photoUrl) && <img src={safePhoto(item.photoUrl)} alt="" />}<span className="product-copy"><b>{item.name}</b><small>{item.description}</small><strong>{currency(item.priceCents)}</strong></span></article>)}</div>}
        <Notice icon="help">A entrada e a consulta ao cardápio estão conectadas. A criação de pedidos será disponibilizada na próxima etapa.</Notice>
        <div className="actions"><Button kind="secondary" disabled={busy} onClick={refreshMenu}>{busy ? 'Atualizando...' : 'Atualizar cardápio'}</Button></div>
      </>}
    </div>
  </Shell>;
}
