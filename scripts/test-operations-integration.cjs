// Testa apenas dados fictícios em emuladores locais; nunca acessa Firebase real.
const assert = require('node:assert/strict');
const path = require('node:path');
const {createHmac, randomUUID} = require('node:crypto');
const {spawn} = require('node:child_process');
const {createRequire} = require('node:module');
const {chromium} = require('@playwright/test');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, process.env.VAMO_BACKEND_PATH || '../Vamo-Rachar-');
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const local = value => /^(localhost|127\.0\.0\.1):\d+$/.test(value || '');
if (!projectId?.startsWith('demo-') || !local(process.env.FIRESTORE_EMULATOR_HOST) || !local(process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Execute apenas em projeto demo com emuladores locais.');
process.env.CORS_ORIGINS = 'http://127.0.0.1:5178';
process.env.STAFF_CODE_PEPPER = 'segredo-ficticio-apenas-para-testes-locais';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.FIREBASE_PROJECT_ID;
const app = require(path.join(backend, 'functions/src/server.js'));
const backendRequire = createRequire(path.join(backend, 'functions/package.json'));
const {getFirestore} = backendRequire('firebase-admin/firestore');
async function main() {
 const restaurantId = `integration-${randomUUID()}`;
 const rest = getFirestore().collection('restaurants').doc(restaurantId);
 await rest.set({name:'Restaurante fictício'});
 await rest.collection('tables').doc('mesa-13').set({number:13});
 await rest.collection('menuItems').doc('combo').set({name:'Combo fictício',description:'Teste',available:true,priceCents:1250,sectors:['bar','kitchen']});
 for (const [employeeId,code,role] of [['gerente','12345678','manager'],['garcom','87654321','waiter']]) {
  const digest=createHmac('sha256',process.env.STAFF_CODE_PEPPER).update(JSON.stringify([restaurantId,code])).digest('hex');
  await rest.collection('employees').doc(employeeId).set({displayName:employeeId,role,active:true,codeDigest:digest});
  await rest.collection('employeeCodeIndex').doc(digest).set({employeeId,active:true});
 }
 const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
 const apiRoot=`http://127.0.0.1:${server.address().port}`;
 const vite=spawn(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5178','--strictPort'],{cwd:frontend,env:{...process.env,VITE_APP_MODE:'api',VITE_API_BASE_URL:apiRoot,VITE_FIREBASE_API_KEY:'demo-key',VITE_FIREBASE_PROJECT_ID:projectId,VITE_FIREBASE_AUTH_EMULATOR_URL:`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,VITE_DEMO_RESTAURANT_ID:''},stdio:'ignore'});
 let browser;
 try {
  let ready=false;
  for(let i=0;i<60;i++){if(vite.exitCode!==null)throw new Error('Vite encerrou.');try{if((await fetch('http://127.0.0.1:5178')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready,'Vite não iniciou.');
  browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext();
  const plaza=await context.newPage(); await plaza.goto('http://127.0.0.1:5178/#/operacao/praca');
  async function activate(page){await page.getByLabel('ID do restaurante').fill(restaurantId);await page.getByLabel('Código do gerente').fill('12345678');await page.getByRole('button',{name:'Ativar dispositivo'}).click();await page.getByText('Dispositivo ativado.').waitFor({timeout:20000});}
  await activate(plaza);await plaza.getByLabel('ID da mesa').fill('mesa-13');await plaza.getByLabel('Código do funcionário').fill('87654321');await plaza.getByRole('button',{name:'Abrir mesa',exact:true}).click();await plaza.getByRole('img',{name:'QR Code de entrada da mesa mesa-13'}).waitFor({timeout:20000});
  const link=await plaza.getByRole('link',{name:'Abrir entrada do cliente'}).getAttribute('href');
  const client=await context.newPage();await client.goto(link);await client.getByLabel('Como podemos te chamar?').fill('Ana');await client.getByRole('button',{name:'Entrar na mesa'}).click();await client.getByText('Combo fictício').waitFor({timeout:20000});
  await client.getByRole('button',{name:'Pedir 1 unidade'}).click();
  await client.getByText(/Pedido de Combo fictício enviado/).waitFor({timeout:20000});
  for(const sector of ['cozinha','bar']){
   const page=await context.newPage();await page.goto(`http://127.0.0.1:5178/#/operacao/${sector}`);await activate(page);await page.getByRole('button',{name:'Atualizar fila'}).click();await page.getByRole('heading',{name:'1× Combo fictício'}).waitFor();await page.getByRole('button',{name:'Iniciar preparo'}).click();await page.getByRole('button',{name:'Marcar pronto'}).click();await page.getByText('Pronto para retirada').waitFor();
  }
  await plaza.getByRole('button',{name:'Atualizar fila'}).click();await plaza.getByRole('button',{name:'Registrar retirada'}).first().click();await plaza.getByRole('button',{name:'Registrar entrega'}).first().click();await plaza.getByRole('button',{name:'Registrar entrega'}).waitFor({state:'detached'});
  assert.equal((await rest.collection('workQueue').where('status','==','delivered').get()).size,1);
  assert.equal((await rest.collection('workQueue').where('status','==','ready').get()).size,1);
  console.log('Praça, cliente, pedido, cozinha, bar e entrega parcial com Auth/API/Firestore emulados: OK.');
 } finally {if(browser)await browser.close();vite.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
