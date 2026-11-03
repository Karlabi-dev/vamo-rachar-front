import {useMemo, useRef, useState} from 'react';
import QRCode from 'qrcode';
import {createApiClient} from '../api/client.js';
import {createFirebaseTokenProvider} from '../api/firebase.js';
import {Logo} from '../components/UI.jsx';
import './connected-operations.css';

const areas = {praca: {screen: 'plaza', title: 'Praça'}, cozinha: {screen: 'kitchen', title: 'Cozinha'}, bar: {screen: 'bar', title: 'Bar'}};
const labels = {received: 'Recebido', in_preparation: 'Em preparo', ready: 'Pronto para retirada', picked_up: 'Retirado'};
const validId = value => /^[A-Za-z0-9_-]{1,100}$/.test(value);
const validCode = value => /^\d{8}$/.test(value);

export default function ConnectedOperations({area}) {
  const current = areas[area];
  const [restaurantId, setRestaurantId] = useState(import.meta.env.VITE_DEMO_RESTAURANT_ID || '');
  const [managerCode, setManagerCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [tableId, setTableId] = useState('');
  const [activated, setActivated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [items, setItems] = useState(null);
  const [opened, setOpened] = useState(null);
  const openingRequest = useRef(null);
  const client = useMemo(() => {
    try {
      const getToken = createFirebaseTokenProvider({apiKey: import.meta.env.VITE_FIREBASE_API_KEY, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, emulatorUrl: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL, appName: `vamo-device-${current.screen}`});
      return {api: createApiClient({baseUrl: import.meta.env.VITE_API_BASE_URL, getToken})};
    } catch { return {error: 'A configuração da API ou do Firebase está incompleta.'}; }
  }, [current.screen]);
  async function activate(event) {
    event.preventDefault();
    if (busy || !validId(restaurantId) || !validCode(managerCode) || !client.api) return;
    setBusy(true); setError(''); setNotice('');
    try { await client.api.activateDevice(restaurantId, current.screen, managerCode); setActivated(true); setNotice('Dispositivo ativado.'); }
    catch (e) { setError(e.message); }
    finally { setManagerCode(''); setBusy(false); }
  }
  async function refresh() {
    if (busy) return;
    setBusy(true); setError('');
    try { setItems(area === 'praca' ? await client.api.listReadyItems(restaurantId) : await client.api.listWorkQueue(restaurantId, current.screen)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function openTable(event) {
    event.preventDefault();
    if (busy || !validId(tableId) || !validCode(employeeCode)) return;
    if (!openingRequest.current || openingRequest.current.tableId !== tableId) openingRequest.current = {tableId, requestId: crypto.randomUUID()};
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.api.openTableWithCode(restaurantId, tableId, openingRequest.current.requestId, employeeCode);
      if (!validId(result.sessionId || '') || result.tableId !== tableId || result.status !== 'open') throw new Error('Resposta de abertura inválida.');
      const link = new URL(window.location.pathname, window.location.origin);
      link.searchParams.set('restaurantId', restaurantId); link.searchParams.set('tableId', tableId);
      setOpened({tableId, link: link.href, qr: await QRCode.toDataURL(link.href, {margin: 2, width: 260})});
      openingRequest.current = null; setNotice('Mesa aberta.');
    } catch (e) { setError(e.message); }
    finally { setEmployeeCode(''); setBusy(false); }
  }
  async function transition(item, action) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await client.api.transitionItem(restaurantId, item.itemId, item.sector || current.screen, action);
      const updated = area === 'praca' ? await client.api.listReadyItems(restaurantId) : await client.api.listWorkQueue(restaurantId, current.screen);
      setItems(updated); setNotice('Andamento atualizado.');
    } catch (e) { setError(e.message + ' Atualize a fila antes de tentar novamente.'); }
    finally { setBusy(false); }
  }
  if (import.meta.env.VITE_APP_MODE !== 'api') return <div className="connected-operations"><main><h1>Ative o modo conectado</h1><p>Configure o aplicativo em modo API para usar esta tela de teste.</p></main></div>;
  return <div className="connected-operations"><header><Logo/><strong>{current.title} · teste conectado</strong></header><main>
    <h1>{current.title}</h1><p>Conectado à API de protótipo. Use apenas dados fictícios.</p>
    {client.error && <p role="alert" className="op-error">{client.error}</p>}
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    {!activated ? <form className="op-card" onSubmit={activate}>
      <h2>Ativar este dispositivo</h2><p>O gerente informa o código para liberar a tela deste setor.</p>
      <label>ID do restaurante<input required value={restaurantId} onChange={e => setRestaurantId(e.target.value.trim())} maxLength={100} autoComplete="off"/></label>
      <label>Código do gerente<input required type="password" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={managerCode} onChange={e => setManagerCode(e.target.value)} autoComplete="off"/></label>
      <button disabled={busy || !client.api}>{busy ? 'Ativando…' : 'Ativar dispositivo'}</button>
    </form> : <>
      <p>Restaurante: <strong>{restaurantId}</strong></p>
      {area === 'praca' && <form className="op-card" onSubmit={openTable}>
        <h2>Abrir mesa</h2><p>Informe o identificador de uma mesa já cadastrada para o teste.</p>
        <label>ID da mesa<input required value={tableId} onChange={e => {setTableId(e.target.value.trim()); setOpened(null);}} maxLength={100} autoComplete="off"/></label>
        <label>Código do funcionário<input required type="password" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} autoComplete="off"/></label>
        <button disabled={busy}>{busy ? 'Abrindo…' : 'Abrir mesa'}</button>
        {opened && <div className="op-qr"><h3>Mesa {opened.tableId} aberta</h3><img src={opened.qr} alt={`QR Code de entrada da mesa ${opened.tableId}`}/><a href={opened.link}>Abrir entrada do cliente</a><p>QR para teste: pode ser compartilhado e não comprova presença física.</p></div>}
      </form>}
      <section className="op-card"><h2>{area === 'praca' ? 'Itens prontos e retirados' : 'Fila do setor'}</h2>
        <button disabled={busy} onClick={refresh}>{busy ? 'Aguarde…' : 'Atualizar fila'}</button>
        {items === null ? <p>Atualize para consultar os itens.</p> : items.length === 0 ? <p>Nenhum item nesta fila.</p> : <div className="op-list">{items.map(item => <article key={`${item.itemId}-${item.sector || current.screen}`}>
          <h3>{item.quantity}× {item.name}</h3><p>Mesa {item.tableId} · {labels[item.status] || item.status}{item.sector ? ` · ${item.sector === 'bar' ? 'Bar' : 'Cozinha'}` : ''}</p>{item.notes && <p>Observação: {item.notes}</p>}
          {area !== 'praca' && item.status === 'received' && <button disabled={busy} onClick={() => transition(item, 'start')}>Iniciar preparo</button>}
          {area !== 'praca' && item.status === 'in_preparation' && <button disabled={busy} onClick={() => transition(item, 'ready')}>Marcar pronto</button>}
          {area === 'praca' && item.status === 'ready' && <button disabled={busy} onClick={() => transition(item, 'pickup')}>Registrar retirada</button>}
          {area === 'praca' && item.status === 'picked_up' && <button disabled={busy} onClick={() => transition(item, 'deliver')}>Registrar entrega</button>}
        </article>)}</div>}
      </section>
    </>}
    <p>Esta tela não registra pagamentos nem encerra mesas.</p>
  </main></div>;
}
