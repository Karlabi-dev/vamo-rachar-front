import {useEffect, useRef, useState} from 'react';
import {Logo} from '../components/UI.jsx';
import {createApiClient} from '../api/client.js';
import {createAdminFirebaseAuth} from '../api/adminFirebase.js';
import {priceInCents, money} from './adminData.js';
import './connected-operations.css';

const isId = value => /^[A-Za-z0-9_-]{1,100}$/.test(value);
const blankProduct = () => ({productId: '', name: '', description: '', priceText: '', sectors: [], available: true, photoUrl: ''});
const sectorLabels = {bar:'Bar', kitchen:'Cozinha'};

export default function ConnectedAdmin() {
  const [restaurantId, setRestaurantId] = useState(import.meta.env.VITE_DEMO_RESTAURANT_ID || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [factors, setFactors] = useState([]);
  const [factorId, setFactorId] = useState('');
  const [stage, setStage] = useState('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [product, setProduct] = useState(blankProduct);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('waiter');
  const [issued, setIssued] = useState(null);
  const auth = useRef(null);
  const api = useRef(null);
  const pendingProductId = useRef(null);
  const pendingEmployeeId = useRef(null);
  useEffect(() => () => { if (auth.current) void auth.current.signOut(); }, []);
  function clearFeedback() { setError(''); setNotice(''); }
  async function connect() {
    if (auth.current && api.current) return;
    auth.current = await createAdminFirebaseAuth({apiKey: import.meta.env.VITE_FIREBASE_API_KEY, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, emulatorUrl: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL});
    api.current = createApiClient({baseUrl: import.meta.env.VITE_API_BASE_URL, getToken: () => auth.current.getToken()});
  }
  async function loadData() {
    const [nextProducts, nextEmployees] = await Promise.all([api.current.listAdminProducts(restaurantId), api.current.listAdminEmployees(restaurantId)]);
    setProducts(nextProducts); setEmployees(nextEmployees);
    if (pendingEmployeeId.current && nextEmployees.some(employee => employee.employeeId === pendingEmployeeId.current)) pendingEmployeeId.current = null;
  }
  async function finishSignIn() {
    try { await loadData(); setStage('ready'); setOtp(''); }
    catch (err) { await auth.current.signOut(); setStage('login'); throw err; }
  }
  async function login(event) {
    event.preventDefault(); if (busy || !isId(restaurantId) || !email.trim() || !password) return;
    const secret = password; setPassword(''); setBusy(true); clearFeedback();
    try {
      await connect();
      const result = await auth.current.signIn(email.trim(), secret);
      if (result.status === 'second-factor') { setFactors(result.factors); setFactorId(result.factors[0].uid); setStage('otp'); }
      else await finishSignIn();
    } catch (err) { setError(err.code ? 'Não foi possível entrar. Confira o acesso e a configuração do autenticador.' : err.message); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault(); if (busy || !/^\d{6,8}$/.test(otp)) return;
    const secret = otp; setOtp(''); setBusy(true); clearFeedback();
    try { await auth.current.verify(factorId, secret); await finishSignIn(); }
    catch (err) { setError(err.code ? 'Não foi possível validar o código do autenticador. Tente novamente.' : err.message); }
    finally { setBusy(false); }
  }
  async function exit() {
    if (busy) return;
    setBusy(true); clearFeedback(); setIssued(null); setProducts([]); setEmployees([]); setProduct(blankProduct()); setOtp('');
    try { await auth.current?.signOut(); } finally { setStage('login'); setBusy(false); }
  }
  async function refresh() {
    if (busy) return; setBusy(true); clearFeedback();
    try { await loadData(); setNotice('Dados atualizados.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function saveProduct(event) {
    event.preventDefault(); if (busy) return;
    const priceCents = priceInCents(product.priceText);
    if (!product.name.trim() || priceCents === null || !product.sectors.length) { setError('Informe nome, preço válido e pelo menos um setor.'); return; }
    const productId = product.productId || pendingProductId.current || crypto.randomUUID();
    pendingProductId.current = productId; setBusy(true); clearFeedback();
    try {
      await api.current.saveAdminProduct({restaurantId, productId, name:product.name, description:product.description, priceCents, sectors:product.sectors, available:product.available, photoUrl:product.photoUrl.trim()});
      pendingProductId.current = null; setProduct(blankProduct()); setNotice('Produto salvo. Atualize a lista se ele ainda não aparecer.');
      try { setProducts(await api.current.listAdminProducts(restaurantId)); } catch { /* A gravação já foi confirmada. */ }
    } catch (err) { setError(`${err.message} Se a resposta não chegou, tente novamente para o mesmo produto.`); }
    finally { setBusy(false); }
  }
  async function createEmployee(event) {
    event.preventDefault(); if (busy || issued || !displayName.trim()) return;
    const employeeId = pendingEmployeeId.current || crypto.randomUUID();
    pendingEmployeeId.current = employeeId; setBusy(true); clearFeedback(); setIssued(null);
    try {
      const result = await api.current.createEmployeeCode({restaurantId, employeeId, displayName:displayName.trim(), role});
      pendingEmployeeId.current = null; setIssued({name:displayName.trim(), code:result.code}); setDisplayName('');
      try { setEmployees(await api.current.listAdminEmployees(restaurantId)); } catch { setNotice('Código criado. Atualize a lista de funcionários.'); }
    } catch (err) { setError(`${err.message} Atualize a lista antes de cadastrar novamente; se o funcionário já existir, troque o código.`); }
    finally { setBusy(false); }
  }
  async function changeEmployee(employee, action) {
    if (busy || issued || !window.confirm(action === 'rotate' ? `Trocar o código de ${employee.displayName}? O anterior deixará de funcionar.` : `Desativar o código de ${employee.displayName}?`)) return;
    setBusy(true); clearFeedback(); setIssued(null);
    try {
      if (action === 'rotate') { const result = await api.current.rotateEmployeeCode(restaurantId, employee.employeeId); setIssued({name:employee.displayName, code:result.code}); }
      else { await api.current.disableEmployeeCode(restaurantId, employee.employeeId); setNotice('Funcionário desativado.'); }
      try { setEmployees(await api.current.listAdminEmployees(restaurantId)); } catch { setNotice('Operação confirmada. Atualize a lista.'); }
    } catch (err) { setError(`${err.message} Atualize a lista para conferir o estado. Se o código de troca se perdeu, será necessário trocá-lo novamente.`); }
    finally { setBusy(false); }
  }
  function edit(item) {
    pendingProductId.current = null;
    setProduct({productId:item.productId, name:item.name, description:item.description || '', priceText:(item.priceCents / 100).toFixed(2).replace('.', ','), sectors:item.sectors || [], available:item.available, photoUrl:item.photoUrl || ''});
    setNotice('Editando produto.'); setError('');
  }
  if (import.meta.env.VITE_APP_MODE !== 'api') return <div className="connected-operations"><main><h1>Ative o modo conectado</h1><p>Configure o aplicativo em modo API para usar esta tela de teste.</p></main></div>;
  return <div className="connected-operations"><header><Logo/><strong>Administrador · teste conectado</strong></header><main>
    <h1>Administração</h1><p>Use um administrador provisionado e um estabelecimento de teste.</p>
    {error && <p role="alert" className="op-error">{error}</p>}{notice && <p role="status" className="op-notice">{notice}</p>}
    {stage === 'login' && <form className="op-card" onSubmit={login}>
      <h2>Entrar com verificação em duas etapas</h2><p>O segundo fator deve estar previamente cadastrado no Firebase.</p>
      <label>ID do restaurante<input required maxLength={100} value={restaurantId} onChange={e=>setRestaurantId(e.target.value.trim())}/></label>
      <label>E-mail<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Senha<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button disabled={busy}>{busy ? 'Entrando…' : 'Continuar'}</button>
    </form>}
    {stage === 'otp' && <form className="op-card" onSubmit={verify}><h2>Confirme no autenticador</h2>
      {factors.length > 1 && <label>Aplicativo<select value={factorId} onChange={e=>setFactorId(e.target.value)}>{factors.map(f=><option key={f.uid} value={f.uid}>{f.name}</option>)}</select></label>}
      <label>Código do autenticador<input required type="password" inputMode="numeric" pattern="[0-9]{6,8}" maxLength={8} autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)}/></label>
      <button disabled={busy}>{busy ? 'Verificando…' : 'Confirmar código'}</button> <button type="button" disabled={busy} onClick={exit}>Cancelar</button>
    </form>}
    {stage === 'ready' && <>
      <p>Estabelecimento: <strong>{restaurantId}</strong></p><button className="op-secondary" disabled={busy} onClick={refresh}>Atualizar dados</button> <button className="op-secondary" disabled={busy} onClick={exit}>Sair</button>
      <section className="op-card"><h2>Produtos</h2>
        {products.length === 0 ? <p>Nenhum produto cadastrado.</p> : <div className="op-list">{products.map(item=><article key={item.productId}><h3>{item.name}</h3><p>{money(item.priceCents / 100)} · {(item.sectors || []).map(s=>sectorLabels[s] || s).join(' + ')} · {item.available ? 'Disponível' : 'Indisponível'}</p><button disabled={busy} onClick={()=>edit(item)}>Editar {item.name}</button></article>)}</div>}
        <form onSubmit={saveProduct}><h3>{product.productId ? 'Editar produto' : 'Novo produto'}</h3>
          <label>Nome<input required maxLength={120} value={product.name} onChange={e=>setProduct({...product,name:e.target.value})}/></label>
          <label>Descrição<textarea maxLength={1000} value={product.description} onChange={e=>setProduct({...product,description:e.target.value})}/></label>
          <label>Preço em reais<input required inputMode="decimal" value={product.priceText} onChange={e=>setProduct({...product,priceText:e.target.value})}/></label>
          <fieldset><legend>Setores</legend>{Object.entries(sectorLabels).map(([value,label])=><label className="op-check" key={value}><input type="checkbox" checked={product.sectors.includes(value)} onChange={e=>setProduct({...product,sectors:e.target.checked?[...product.sectors,value]:product.sectors.filter(x=>x!==value)})}/>{label}</label>)}</fieldset>
          <label>Link HTTPS da foto (opcional)<input type="url" value={product.photoUrl} onChange={e=>setProduct({...product,photoUrl:e.target.value})}/></label><p>Por enquanto, o envio de imagens ainda não está disponível.</p>
          <label className="op-check"><input type="checkbox" checked={product.available} onChange={e=>setProduct({...product,available:e.target.checked})}/>Disponível para pedidos</label>
          <button disabled={busy}>{busy ? 'Salvando…' : 'Salvar produto'}</button>{product.productId && <button type="button" disabled={busy} onClick={()=>{setProduct(blankProduct());pendingProductId.current=null;}}>Cancelar edição</button>}
        </form>
      </section>
      <section className="op-card"><h2>Códigos da equipe</h2><p>O código será mostrado uma única vez. Entregue-o ao funcionário de forma segura.</p>
        {issued && <div className="op-notice" role="status"><strong>Código de {issued.name}: <span className="op-issued">{issued.code}</span></strong><p>Ao fechar, ele não poderá ser recuperado. Se necessário, troque o código.</p><button type="button" onClick={()=>setIssued(null)}>Fechar código</button></div>}
        <form onSubmit={createEmployee}><label>Nome do funcionário<input required maxLength={120} value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>Função<select value={role} onChange={e=>setRole(e.target.value)}><option value="waiter">Garçom</option><option value="manager">Gerente</option></select></label><button disabled={busy || !!issued}>{busy ? 'Criando…' : 'Criar código'}</button></form>
        {employees.length === 0 ? <p>Nenhum funcionário cadastrado.</p> : <div className="op-list">{employees.map(employee=><article key={employee.employeeId}><h3>{employee.displayName}</h3><p>{employee.role === 'manager' ? 'Gerente' : 'Garçom'} · {employee.active ? 'Ativo' : 'Desativado'}</p>{employee.active && <><button disabled={busy || !!issued} onClick={()=>changeEmployee(employee,'rotate')}>Trocar código</button> <button disabled={busy || !!issued} onClick={()=>changeEmployee(employee,'disable')}>Desativar</button></>}</article>)}</div>}
      </section>
    </>}
  </main></div>;
}
