import { test, expect } from '@playwright/test';
const jwt = (() => {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'none', typ: 'JWT' })}.${part({ iss: 'https://securetoken.google.com/demo-vamo', aud: 'demo-vamo', sub: 'participante1', user_id: 'participante1', iat: 1900000000, exp: 4100000000, auth_time: 1900000000, firebase: { sign_in_provider: 'anonymous' } })}.teste`;
})();
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };
test('entra na mesa e exibe cardápio retornado pelo servidor', async ({ page }) => {
  const seen = [];
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = route.request().url().includes('accounts:lookup') ? { users: [{ localId: 'participante1', providerUserInfo: [], createdAt: '1700000000000', lastLoginAt: '1700000000000' }] } : { idToken: jwt, refreshToken: 'refresh-test', localId: 'participante1', expiresIn: '3600' };
    await route.fulfill({ status: 200, headers: cors, json });
  });
  await page.route('https://api.example.test/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    seen.push({ url: route.request().url(), authorization: route.request().headers().authorization, data: route.request().postDataJSON() });
    const result = route.request().url().endsWith('joinTable') ? { sessionId: 'sessao1', participantId: 'participante1' } : { items: [{ id: 'suco', name: 'Suco da casa', description: 'Natural', priceCents: 1250 }] };
    await route.fulfill({ status: 200, headers: cors, json: { result } });
  });
  await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');
  await page.getByLabel('Como podemos te chamar?').fill('Ana');
  await page.getByRole('button', { name: 'Entrar na mesa' }).click();
  await expect(page.getByText('Suco da casa',{exact:true})).toBeVisible();
  await expect(page.getByText('R$ 12,50')).toBeVisible();
  await expect(page.getByText(/O pagamento ainda não está conectado/)).toBeVisible();
  expect(seen).toHaveLength(2);
  expect(seen[0].authorization).toBe(`Bearer ${jwt}`);
  expect(seen[0].data).toEqual({ restaurantId: 'restaurante-teste', tableId: 'mesa-13', displayName: 'Ana' });
  expect(seen[1].data).toEqual({ restaurantId: 'restaurante-teste', sessionId: 'sessao1' });
});
test('não mostra entrada ou cardápio quando QR ou API falham', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Não foi possível identificar a mesa/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar na mesa' })).toHaveCount(0);
});

test('mesa fechada exibe erro e não apresenta cardápio', async ({ page }) => {
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = route.request().url().includes('accounts:lookup') ? { users: [{ localId: 'participante1', providerUserInfo: [] }] } : { idToken: jwt, refreshToken: 'refresh-test', localId: 'participante1', expiresIn: '3600' };
    await route.fulfill({ status: 200, headers: cors, json });
  });
  await page.route('https://api.example.test/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    await route.fulfill({ status: 400, headers: cors, json: { error: 'failed-precondition' } });
  });
  await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');
  await page.getByLabel('Como podemos te chamar?').fill('Ana');
  await page.getByRole('button', { name: 'Entrar na mesa' }).click();
  await expect(page.getByRole('alert')).toContainText('A mesa não está aberta');
  await expect(page.getByRole('heading', { name: 'Cardápio' })).toHaveCount(0);
});

test('falha do cardápio permite tentar novamente sem criar nova entrada', async ({ page }) => {
  let joins = 0;
  let menus = 0;
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = route.request().url().includes('accounts:lookup') ? { users: [{ localId: 'participante1', providerUserInfo: [] }] } : { idToken: jwt, refreshToken: 'refresh-test', localId: 'participante1', expiresIn: '3600' };
    await route.fulfill({ status: 200, headers: cors, json });
  });
  await page.route('https://api.example.test/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().url().endsWith('joinTable')) {
      joins++;
      return route.fulfill({ status: 200, headers: cors, json: { result: { sessionId: 'sessao1', participantId: 'participante1' } } });
    }
    menus++;
    if (menus === 1) return route.fulfill({ status: 503, headers: cors, json: { error: 'unavailable' } });
    await route.fulfill({ status: 200, headers: cors, json: { result: { items: [{ id: 'suco', name: 'Suco da casa', priceCents: 1250 }] } } });
  });
  await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');
  await page.getByLabel('Como podemos te chamar?').fill('Ana');
  await page.getByRole('button', { name: 'Entrar na mesa' }).click();
  await expect(page.getByRole('heading', { name: 'Entrada confirmada' })).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar carregar cardápio' }).click();
  await expect(page.getByText('Suco da casa',{exact:true})).toBeVisible();
  expect(joins).toBe(1);
  expect(menus).toBe(2);
});

test('praça ativa dispositivo e abre mesa com código sem guardar código na interface', async ({page}) => {
  const calls = [];
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({status:204, headers:cors});
    const json = route.request().url().includes('accounts:lookup') ? {users:[{localId:'participante1',providerUserInfo:[]}]} : {idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};
    await route.fulfill({status:200,headers:cors,json});
  });
  await page.route('https://api.example.test/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers:cors});
    const operation = route.request().url().split('/').pop(); calls.push({operation, data:route.request().postDataJSON()});
    const result = operation === 'activateSharedDevice' ? {screen:'plaza',expiresAtMs:4100000000000} : {tableId:'mesa-13',sessionId:'sessao1',status:'open'};
    await route.fulfill({status:200,headers:cors,json:{result}});
  });
  await page.goto('/#/operacao/praca');
  await page.getByLabel('ID do restaurante').fill('restaurante-teste');
  await page.getByLabel('Código do gerente').fill('12345678');
  await page.getByRole('button',{name:'Ativar dispositivo'}).click();
  await expect(page.getByText('Dispositivo ativado.')).toBeVisible();
  await page.getByLabel('ID da mesa').fill('mesa-13');
  await page.getByLabel('Código do funcionário').fill('87654321');
  await page.getByRole('button',{name:'Abrir mesa',exact:true}).click();
  await expect(page.getByRole('img',{name:'QR Code de entrada da mesa mesa-13'})).toBeVisible();
  await expect(page.getByLabel('Código do funcionário')).toHaveValue('');
  await expect(page.getByRole('link',{name:'Abrir entrada do cliente'})).toHaveAttribute('href',/restaurantId=restaurante-teste&tableId=mesa-13/);
  expect(calls[0]).toEqual({operation:'activateSharedDevice',data:{restaurantId:'restaurante-teste',screen:'plaza',code:'12345678'}});
  expect(calls[1].operation).toBe('openTableWithCode');
  expect(calls[1].data).toMatchObject({restaurantId:'restaurante-teste',tableId:'mesa-13',code:'87654321'});
  expect(calls[1].data.requestId).toBeTruthy();
});

test('cozinha consulta fila e envia a transição ao backend', async ({page}) => {
  const calls = [];
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers:cors});
    const json = route.request().url().includes('accounts:lookup') ? {users:[{localId:'participante1',providerUserInfo:[]}]} : {idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};
    await route.fulfill({status:200,headers:cors,json});
  });
  await page.route('https://api.example.test/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers:cors});
    const operation=route.request().url().split('/').pop(); calls.push({operation,data:route.request().postDataJSON()});
    const item={itemId:'item1',tableId:'mesa13',name:'Prato',quantity:1,status:calls.some(c=>c.operation==='transitionItem')?'in_preparation':'received'};
    await route.fulfill({status:200,headers:cors,json:{result:operation==='listWorkQueue'?{items:[item]}:{status:'ok'}}});
  });
  await page.goto('/#/operacao/cozinha');
  await page.getByLabel('ID do restaurante').fill('restaurante-teste');
  await page.getByLabel('Código do gerente').fill('12345678');
  await page.getByRole('button',{name:'Ativar dispositivo'}).click();
  await page.getByRole('button',{name:'Atualizar fila'}).click();
  await page.getByRole('button',{name:'Iniciar preparo'}).click();
  await expect(page.getByRole('button',{name:'Marcar pronto'})).toBeVisible();
  expect(calls.find(c=>c.operation==='transitionItem').data).toEqual({restaurantId:'restaurante-teste',itemId:'item1',sector:'kitchen',action:'start'});
});

test('envia pedido individual e repete a mesma tentativa depois de falha de rede', async ({page}) => {
  const orders=[];
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const json=route.request().url().includes('accounts:lookup')?{users:[{localId:'participante1',providerUserInfo:[]}]}:{idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};
    await route.fulfill({status:200,headers:cors,json});
  });
  await page.route('https://api.example.test/**', async route => {
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const op=route.request().url().split('/').pop();
    if(op==='createOrder'){
      orders.push(route.request().postDataJSON());
      if(orders.length===1)return route.fulfill({status:503,headers:cors,json:{error:'unavailable'}});
      return route.fulfill({status:200,headers:cors,json:{result:{orderId:'pedido1'}}});
    }
    const result=op==='joinTable'?{sessionId:'sessao1',participantId:'participante1'}:{items:[{id:'suco',name:'Suco',priceCents:1250}]};
    await route.fulfill({status:200,headers:cors,json:{result}});
  });
  await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');
  await page.getByLabel('Como podemos te chamar?').fill('Ana');await page.getByRole('button',{name:'Entrar na mesa'}).click();
  await page.getByRole('button',{name:'Pedir 1 unidade'}).click();await page.getByRole('button',{name:'Confirmar pedido'}).click();
  await expect(page.getByRole('alert')).toContainText('mesma tentativa');
  await page.getByRole('button',{name:'Tentar confirmar pedido'}).click();
  await expect(page.getByRole('status')).toContainText('Pedido de Suco enviado');
  expect(orders).toHaveLength(2);expect(orders[0]).toEqual(orders[1]);
  expect(orders[0]).toMatchObject({restaurantId:'restaurante-teste',sessionId:'sessao1',items:[{menuItemId:'suco',quantity:1,expectedUnitPriceCents:1250}]});
});

const adminJwt = (() => {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({alg:'none',typ:'JWT'})}.${part({iss:'https://securetoken.google.com/demo-vamo',aud:'demo-vamo',sub:'admin-1',user_id:'admin-1',iat:1900000000,exp:4100000000,auth_time:1900000000,firebase:{sign_in_provider:'password',sign_in_second_factor:'totp'}})}.teste`;
})();
test('administrador valida segundo fator e salva produto e código da equipe pela API',async({page})=>{
  const calls=[]; let product=null; let employee=null;
  await page.route('https://identitytoolkit.googleapis.com/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const url=route.request().url();
    let json;
    if(url.includes('accounts:signInWithPassword')) json={localId:'admin-1',email:'admin@example.test',mfaPendingCredential:'desafio-ficticio',mfaInfo:[{mfaEnrollmentId:'totp-id',displayName:'Autenticador',enrolledAt:'2026-01-01T00:00:00Z',totpInfo:{}}]};
    else if(url.includes('mfaSignIn:finalize')) json={idToken:adminJwt,refreshToken:'refresh-admin'};
    else if(url.includes('accounts:lookup')) json={users:[{localId:'admin-1',email:'admin@example.test',providerUserInfo:[]}]};
    else throw new Error(`Operação Auth inesperada: ${url}`);
    await route.fulfill({status:200,headers:cors,json});
  });
  await page.route('https://api.example.test/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const operation=route.request().url().split('/').pop();const data=route.request().postDataJSON();
    calls.push({operation,data,authorization:route.request().headers().authorization});
    let result;
    if(operation==='listAdminProducts')result={products:product?[product]:[]};
    else if(operation==='listAdminEmployees')result={employees:employee?[employee]:[]};
    else if(operation==='saveAdminProduct'){product={...data};result={productId:data.productId};}
    else if(operation==='createEmployeeCode'){employee={...data,active:true};result={employeeId:data.employeeId,code:'87451239'};}
    else throw new Error(`Operação API inesperada: ${operation}`);
    await route.fulfill({status:200,headers:cors,json:{result}});
  });
  await page.goto('/#/operacao/admin');
  await page.getByLabel('ID do restaurante').fill('teste');
  await page.getByLabel('E-mail').fill('admin@example.test');
  await page.getByLabel('Senha').fill('senha-ficticia');
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByRole('heading',{name:'Confirme no autenticador'})).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByLabel('Código do autenticador').fill('123456');
  await page.getByRole('button',{name:'Confirmar código'}).click();
  await expect(page.getByRole('heading',{name:'Produtos',exact:true})).toBeVisible();
  await page.getByLabel('Nome',{exact:true}).fill('Combo de teste');
  await page.getByLabel('Preço em reais').fill('12,50');
  await page.getByLabel('Bar',{exact:true}).check();await page.getByLabel('Cozinha',{exact:true}).check();
  await page.getByRole('button',{name:'Salvar produto'}).click();
  await expect(page.getByRole('heading',{name:'Combo de teste'})).toBeVisible();
  const saved=calls.find(c=>c.operation==='saveAdminProduct');
  expect(saved.authorization).toBe(`Bearer ${adminJwt}`);expect(saved.data).toMatchObject({restaurantId:'teste',name:'Combo de teste',priceCents:1250,sectors:['bar','kitchen'],available:true});
  await page.getByLabel('Nome do funcionário').fill('Luana');await page.getByLabel('Função').selectOption('manager');
  await page.getByRole('button',{name:'Criar código'}).click();
  await expect(page.getByText('87451239')).toBeVisible();
  expect(calls.find(c=>c.operation==='createEmployeeCode').data).toMatchObject({restaurantId:'teste',displayName:'Luana',role:'manager'});
  await page.getByRole('button',{name:'Fechar código'}).click();await expect(page.getByText('87451239')).toHaveCount(0);
  await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByRole('heading',{name:'Entrar com verificação em duas etapas'})).toBeVisible();
});

test('acesso administrativo sem segundo fator é recusado antes de acessar a API',async({page})=>{
 let calls=0;
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const json=route.request().url().includes('accounts:lookup')?{users:[{localId:'participante1',providerUserInfo:[]}]}:{idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};
  await route.fulfill({status:200,headers:cors,json});
 });
 await page.route('https://api.example.test/**',async route=>{calls++;await route.abort();});
 await page.goto('/#/operacao/admin');await page.getByLabel('ID do restaurante').fill('teste');await page.getByLabel('E-mail').fill('admin@example.test');await page.getByLabel('Senha').fill('senha-ficticia');await page.getByRole('button',{name:'Continuar'}).click();
 await expect(page.getByRole('alert')).toContainText('duas etapas');await expect(page.getByRole('heading',{name:'Produtos',exact:true})).toHaveCount(0);expect(calls).toBe(0);
});

test('cliente revisa divisão, envia convites e recebe resposta de aceite', async ({page})=>{
 const calls=[];
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const json=route.request().url().includes('accounts:lookup')?{users:[{localId:'participante1',providerUserInfo:[]}]}:{idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};await route.fulfill({status:200,headers:cors,json});
 });
 await page.route('https://api.example.test/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const op=route.request().url().split('/').pop(),data=route.request().postDataJSON();calls.push({op,data});
  const responses={joinTable:{sessionId:'sessao1',participantId:'participante1'},listMenu:{items:[{id:'fritas',name:'Fritas',priceCents:3101}]},listSessionParticipants:{participants:[{participantId:'participante1',displayName:'Ana'},{participantId:'participante2',displayName:'Bruno'}]},createOrder:{orderId:'pedido1'},listInvitations:{invitations:[{orderId:'pedido2',itemId:'item2',name:'Suco',quantity:1,totalCents:1000,amountCents:500}]},respondToShare:{acceptanceStatus:'accepted',status:'received'}};
  if(!responses[op])throw new Error(`Operação inesperada: ${op}`);await route.fulfill({status:200,headers:cors,json:{result:responses[op]}});
 });
 await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');await page.getByLabel('Como podemos te chamar?').fill('Ana');await page.getByRole('button',{name:'Entrar na mesa'}).click();
 await page.getByRole('button',{name:'Dividir Fritas'}).click();await page.getByLabel('Bruno').check();
 await expect(page.getByText(/Sua parte:/).first()).toContainText('R$');await page.getByRole('button',{name:'Enviar convites'}).click();
 await expect(page.getByRole('status')).toContainText('aguarda o aceite de todos');
 expect(calls.find(c=>c.op==='createOrder').data).toMatchObject({restaurantId:'restaurante-teste',sessionId:'sessao1',items:[{menuItemId:'fritas',quantity:1,expectedUnitPriceCents:3101,inviteeIds:['participante2']}]});
 await page.getByRole('button',{name:'Atualizar convites'}).click();await expect(page.getByText(/Total do item:/)).toContainText('R$');
 await page.getByRole('button',{name:'Aceitar Suco'}).click();await expect(page.getByRole('status')).toContainText('Sua parte foi aceita');
 expect(calls.find(c=>c.op==='respondToShare').data).toEqual({restaurantId:'restaurante-teste',sessionId:'sessao1',orderId:'pedido2',itemId:'item2',accept:true});
});

test('preço alterado recusa pedido e libera nova revisão',async({page})=>{
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const json=route.request().url().includes('accounts:lookup')?{users:[{localId:'participante1',providerUserInfo:[]}]}:{idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};await route.fulfill({status:200,headers:cors,json});
 });
 await page.route('https://api.example.test/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const op=route.request().url().split('/').pop();
  if(op==='createOrder')return route.fulfill({status:400,headers:cors,json:{error:'failed-precondition'}});
  const result=op==='joinTable'?{sessionId:'sessao1',participantId:'participante1'}:{items:[{id:'suco',name:'Suco',priceCents:1250}]};
  await route.fulfill({status:200,headers:cors,json:{result}});
 });
 await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');await page.getByLabel('Como podemos te chamar?').fill('Ana');await page.getByRole('button',{name:'Entrar na mesa'}).click();
 await page.getByRole('button',{name:'Pedir 1 unidade'}).click();await page.getByRole('button',{name:'Confirmar pedido'}).click();
 await expect(page.getByRole('alert')).toContainText('pedido não foi criado');await expect(page.getByRole('button',{name:'Pedir 1 unidade'})).toBeEnabled();await expect(page.getByRole('button',{name:'Tentar confirmar pedido'})).toHaveCount(0);
});

test('retoma resolução recusada usando o mesmo identificador após resposta perdida',async({page})=>{
 const requests=[];
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const json=route.request().url().includes('accounts:lookup')?{users:[{localId:'participante1',providerUserInfo:[]}]}:{idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};await route.fulfill({status:200,headers:cors,json});
 });
 await page.route('https://api.example.test/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const op=route.request().url().split('/').pop();let result;
  if(op==='joinTable')result={sessionId:'sessao1',participantId:'participante1'};
  else if(op==='listMenu')result={items:[{id:'fritas',name:'Fritas',priceCents:3100}]};
  else if(op==='listMyOrders')result={orderIds:['pedido1']};
  else if(op==='listMyOrderItems')result={isOwner:true,items:[{itemId:'item1',name:'Fritas',quantity:1,totalCents:3100,amountCents:1550,status:requests.length>1?'cancelled':'split_rejected'}]};
  else if(op==='resolveRejectedSplit'){
   requests.push(route.request().postDataJSON());if(requests.length===1)return route.fulfill({status:503,headers:cors,json:{error:'unavailable'}});
   result={itemId:'novo-item',action:'assume'};
  } else throw new Error(`Operação inesperada: ${op}`);
  await route.fulfill({status:200,headers:cors,json:{result}});
 });
 await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');await page.getByLabel('Como podemos te chamar?').fill('Ana');await page.getByRole('button',{name:'Entrar na mesa'}).click();await page.getByRole('button',{name:'Atualizar pedidos'}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Assumir Fritas'}).click();await expect(page.getByRole('alert')).toContainText('mesma operação');
 await page.getByRole('button',{name:'Tentar confirmar alteração'}).click();await expect(page.getByRole('status')).toContainText('assumiu o item integralmente');
 expect(requests).toHaveLength(2);expect(requests[0]).toEqual(requests[1]);expect(requests[0]).toMatchObject({orderId:'pedido1',itemId:'item1',action:'assume',inviteeIds:[]});
});

test('novo convite abre junto ao item recusado e mostra o resultado no mesmo lugar',async({page})=>{
 await page.setViewportSize({width:390,height:700});const requests=[];let participantAttempts=0;
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const json=route.request().url().includes('accounts:lookup')?{users:[{localId:'participante1',providerUserInfo:[]}]}:{idToken:jwt,refreshToken:'refresh-test',localId:'participante1',expiresIn:'3600'};
  await route.fulfill({status:200,headers:cors,json});
 });
 await page.route('https://api.example.test/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const op=route.request().url().split('/').pop();let result;
  if(op==='joinTable')result={sessionId:'sessao1',participantId:'participante1'};
  else if(op==='listMenu')result={items:Array.from({length:6},(_,i)=>({id:`produto${i}`,name:`Produto ${i}`,priceCents:1250}))};
  else if(op==='listMyOrders')result={orderIds:['pedido1']};
  else if(op==='listMyOrderItems')result={isOwner:true,items:[{itemId:'item1',name:'Suco',quantity:1,totalCents:1250,amountCents:625,status:requests.length?'cancelled':'split_rejected'}]};
  else if(op==='listSessionParticipants'){participantAttempts++;if(participantAttempts===1)return route.fulfill({status:503,headers:cors,json:{error:'unavailable'}});result={participants:[{participantId:'participante1',displayName:'Ana'},{participantId:'participante2',displayName:'Bruno'}]};}
  else if(op==='resolveRejectedSplit'){requests.push(route.request().postDataJSON());result={itemId:'novo-item',action:'reinvite'};}
  else throw new Error(`Operação inesperada: ${op}`);
  await route.fulfill({status:200,headers:cors,json:{result}});
 });
 await page.goto('/?restaurantId=restaurante-teste&tableId=mesa-13');await page.getByLabel('Como podemos te chamar?').fill('Ana');await page.getByRole('button',{name:'Entrar na mesa'}).click();await page.getByRole('button',{name:'Atualizar pedidos'}).click();
 const rejected=page.locator('article.connected-invitation').filter({hasText:'Divisão recusada'});const button=rejected.getByRole('button',{name:'Convidar novamente para Suco'});
 await button.scrollIntoViewIfNeeded();const scrollBefore=await page.evaluate(()=>window.scrollY);expect(scrollBefore).toBeGreaterThan(500);
 await button.click();await expect(rejected.getByRole('alert')).toBeVisible();expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(500);
 await button.click();const panel=rejected.getByRole('region',{name:'Revisar pedido'});await expect(panel.getByRole('heading',{name:'Escolha novas pessoas'})).toBeFocused();
 expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(500);await panel.getByLabel('Bruno').check();await panel.getByRole('button',{name:'Enviar convites'}).click();
 const finalItem=page.locator('article.connected-invitation').filter({has:page.getByRole('heading',{name:'Suco',exact:true})});
 await expect(finalItem).toContainText('Cancelado');await expect(finalItem.getByRole('status')).toContainText('Novos convites enviados');
 expect(requests).toHaveLength(1);expect(requests[0]).toMatchObject({restaurantId:'restaurante-teste',sessionId:'sessao1',orderId:'pedido1',itemId:'item1',action:'reinvite',inviteeIds:['participante2']});
});
