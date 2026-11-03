// Dados fictícios apenas em emuladores locais. Usa dois navegadores independentes.
const assert=require('node:assert/strict');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {spawn}=require('node:child_process');
const {createRequire}=require('node:module');
const {chromium}=require('@playwright/test');
const frontend=path.resolve(__dirname,'..');
const backend=path.resolve(frontend,process.env.VAMO_BACKEND_PATH||'../vamo-rachar-backend-divisao');
const projectId=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT;
const local=value=>/^(localhost|127\.0\.0\.1):\d+$/.test(value||'');
if(!projectId?.startsWith('demo-')||!local(process.env.FIRESTORE_EMULATOR_HOST)||!local(process.env.FIREBASE_AUTH_EMULATOR_HOST))throw new Error('Execute apenas em projeto demo com emuladores locais.');
process.env.CORS_ORIGINS='http://127.0.0.1:5180';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;delete process.env.FIREBASE_PROJECT_ID;
const app=require(path.join(backend,'functions/src/server.js'));
const backendRequire=createRequire(path.join(backend,'functions/package.json'));
const {getFirestore}=backendRequire('firebase-admin/firestore');
async function main(){
 const restaurantId=`split-${randomUUID()}`,sessionId='sessao-teste';
 const rest=getFirestore().collection('restaurants').doc(restaurantId);
 await rest.set({name:'Restaurante fictício'});
 await rest.collection('tables').doc('mesa-13').set({activeSessionId:sessionId});
 await rest.collection('sessions').doc(sessionId).set({tableId:'mesa-13',status:'open'});
 await rest.collection('menuItems').doc('fritas').set({name:'Fritas de teste',priceCents:3101,sector:'kitchen',available:true});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const vite=spawn(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5180','--strictPort'],{cwd:frontend,env:{...process.env,VITE_APP_MODE:'api',VITE_API_BASE_URL:`http://127.0.0.1:${server.address().port}`,VITE_FIREBASE_API_KEY:'demo-key',VITE_FIREBASE_PROJECT_ID:projectId,VITE_FIREBASE_AUTH_EMULATOR_URL:`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,VITE_DEMO_RESTAURANT_ID:'',VITE_DEMO_TABLE_ID:''},stdio:'ignore'});
 let browser;
 try{
  let ready=false;for(let i=0;i<60;i++){if(vite.exitCode!==null)throw new Error('Vite encerrou.');try{if((await fetch('http://127.0.0.1:5180')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
  browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const url=`http://127.0.0.1:5180/?restaurantId=${restaurantId}&tableId=mesa-13`;
  async function enter(name){const context=await browser.newContext();const page=await context.newPage();await page.goto(url);await page.getByLabel('Como podemos te chamar?').fill(name);await page.getByRole('button',{name:'Entrar na mesa'}).click();await page.getByText('Fritas de teste',{exact:true}).waitFor({timeout:20000});return page;}
  const ana=await enter('Ana'),bruno=await enter('Bruno');
  async function invite(){await ana.getByRole('button',{name:'Dividir Fritas de teste'}).click();await ana.getByLabel('Bruno').check();await ana.getByRole('button',{name:'Enviar convites'}).click();await ana.getByText(/Convites para Fritas de teste enviados/).waitFor({timeout:20000});}
  await invite();assert.equal((await rest.collection('workQueue').get()).size,0);
  await bruno.getByRole('button',{name:'Atualizar convites'}).click();await bruno.getByRole('button',{name:'Recusar Fritas de teste'}).click();await bruno.getByText(/Convite recusado/).waitFor();
  await ana.getByRole('button',{name:'Atualizar pedidos'}).click();ana.once('dialog',dialog=>dialog.accept());await ana.getByRole('button',{name:'Assumir Fritas de teste'}).click();await ana.getByText(/Você assumiu o item integralmente/).waitFor();
  assert.equal((await rest.collection('workQueue').get()).size,1);
  await invite();assert.equal((await rest.collection('workQueue').get()).size,1);
  await bruno.getByRole('button',{name:'Atualizar convites'}).click();await bruno.getByRole('button',{name:'Aceitar Fritas de teste'}).click();await bruno.getByText(/Sua parte foi aceita/).waitFor();
  assert.equal((await rest.collection('workQueue').get()).size,2);
  const orderDocs=await rest.collection('sessions').doc(sessionId).collection('orders').get();
  const amounts=[];
  for(const order of orderDocs.docs){const entries=await order.ref.collection('items').get();for(const item of entries.docs){const shares=await item.ref.collection('shares').get();if(shares.size===2&&item.data().status==='received')amounts.push(...shares.docs.map(d=>d.data().amountCents));}}
  assert.deepEqual(amounts.sort((a,b)=>a-b),[1550,1551]);
  await ana.getByRole('button',{name:'Pedir 1 unidade'}).click();await rest.collection('menuItems').doc('fritas').update({priceCents:3201});
  await ana.getByRole('button',{name:'Confirmar pedido'}).click();await ana.getByRole('alert').getByText(/pedido não foi criado/).waitFor();
  assert.equal((await rest.collection('workQueue').get()).size,2);assert.equal((await rest.collection('sessions').doc(sessionId).collection('orders').get()).size,2);
  console.log('Dois clientes, recusa/assunção, aceite, centavos e recusa de preço alterado: OK.');
 }finally{if(browser)await browser.close();vite.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
