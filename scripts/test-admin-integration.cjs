// SOMENTE EMULADORES: o segundo fator deste teste é simulado e não comprova MFA real.
const assert=require('node:assert/strict');
const path=require('node:path');
const {randomUUID,createHmac}=require('node:crypto');
const {spawn}=require('node:child_process');
const {createRequire}=require('node:module');
const {chromium}=require('@playwright/test');
const frontend=path.resolve(__dirname,'..');
const backend=path.resolve(frontend,process.env.VAMO_BACKEND_PATH||'../Vamo-Rachar-');
const projectId=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT;
const local=value=>/^(localhost|127\.0\.0\.1):\d+$/.test(value||'');
if(!projectId?.startsWith('demo-')||!local(process.env.FIRESTORE_EMULATOR_HOST)||!local(process.env.FIREBASE_AUTH_EMULATOR_HOST))throw new Error('Execute apenas em projeto demo e emuladores locais.');
process.env.CORS_ORIGINS='http://127.0.0.1:5179';
process.env.STAFF_CODE_PEPPER='segredo-ficticio-apenas-para-testes-locais';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;delete process.env.FIREBASE_PROJECT_ID;
const app=require(path.join(backend,'functions/src/server.js'));
const backendRequire=createRequire(path.join(backend,'functions/package.json'));
const {getFirestore}=backendRequire('firebase-admin/firestore');
const {getAuth}=backendRequire('firebase-admin/auth');
const fakeJwt=(uid,factor)=>{
 const now=Math.floor(Date.now()/1000), part=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 return `${part({alg:'none',typ:'JWT'})}.${part({iss:`https://securetoken.google.com/${projectId}`,aud:projectId,sub:uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,firebase:{sign_in_provider:'password',...(factor?{sign_in_second_factor:'totp'}:{})}})}.`;
};
async function main(){
 const restaurantId=`admin-test-${randomUUID()}`,uid=`admin-${randomUUID()}`;
 const restaurant=getFirestore().collection('restaurants').doc(restaurantId);
 await restaurant.set({name:'Restaurante fictício'});await restaurant.collection('admins').doc(uid).set({active:true});
 await getAuth().createUser({uid,email:`${uid}@example.test`,password:'senha-ficticia-123'});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const apiRoot=`http://127.0.0.1:${server.address().port}`;
 const vite=spawn(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5179','--strictPort'],{cwd:frontend,env:{...process.env,VITE_APP_MODE:'api',VITE_API_BASE_URL:apiRoot,VITE_FIREBASE_API_KEY:'demo-key',VITE_FIREBASE_PROJECT_ID:projectId,VITE_FIREBASE_AUTH_EMULATOR_URL:`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`},stdio:'ignore'});
 let browser;
 try{
  let ready=false;for(let i=0;i<60;i++){if(vite.exitCode!==null)throw new Error('Vite encerrou.');try{if((await fetch('http://127.0.0.1:5179')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
  const denied=await fetch(`${apiRoot}/api/listAdminProducts`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${fakeJwt(uid,false)}`},body:JSON.stringify({restaurantId})});
  assert.equal(denied.status,403,'API precisa recusar token sem segundo fator.');
  browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.route(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/**`,async route=>{
   const url=route.request().url();let json;
   if(url.includes('accounts:signInWithPassword'))json={localId:uid,email:`${uid}@example.test`,mfaPendingCredential:'desafio-ficticio',mfaInfo:[{mfaEnrollmentId:'totp-id',displayName:'Autenticador fictício',enrolledAt:'2026-01-01T00:00:00Z',totpInfo:{}}]};
   else if(url.includes('mfaSignIn:finalize'))json={idToken:fakeJwt(uid,true),refreshToken:'ficticio'};
   else if(url.includes('accounts:lookup'))json={users:[{localId:uid,email:`${uid}@example.test`,providerUserInfo:[]}]};
   else throw new Error(`Chamada inesperada ao Auth emulado: ${url}`);
   await route.fulfill({status:200,json,headers:{'access-control-allow-origin':'*'}});
  });
  await page.goto('http://127.0.0.1:5179/#/operacao/admin');
  await page.getByLabel('ID do restaurante').fill(restaurantId);await page.getByLabel('E-mail').fill(`${uid}@example.test`);await page.getByLabel('Senha').fill('senha-ficticia-123');await page.getByRole('button',{name:'Continuar'}).click();
  await page.getByLabel('Código do autenticador').fill('123456');await page.getByRole('button',{name:'Confirmar código'}).click();
  await page.getByRole('heading',{name:'Produtos',exact:true}).waitFor({timeout:20000});
  await page.getByLabel('Nome',{exact:true}).fill('Combo fictício');await page.getByLabel('Preço em reais').fill('12,50');await page.getByLabel('Bar',{exact:true}).check();await page.getByLabel('Cozinha',{exact:true}).check();await page.getByRole('button',{name:'Salvar produto'}).click();
  await page.getByRole('heading',{name:'Combo fictício'}).waitFor({timeout:20000});
  const products=await restaurant.collection('menuItems').get();assert.equal(products.size,1);assert.equal(products.docs[0].data().priceCents,1250);assert.deepEqual(products.docs[0].data().sectors,['bar','kitchen']);
  await page.getByLabel('Nome do funcionário').fill('Gerente fictício');await page.getByLabel('Função').selectOption('manager');await page.getByRole('button',{name:'Criar código'}).click();
  const codeNode=page.locator('.op-issued');await codeNode.waitFor({timeout:20000});const code=await codeNode.textContent();assert.match(code,/^\d{8}$/);
  const employees=await restaurant.collection('employees').get();assert.equal(employees.size,1);
  const stored=employees.docs[0].data();assert.equal(stored.role,'manager');assert.equal(stored.codeDigest,createHmac('sha256',process.env.STAFF_CODE_PEPPER).update(JSON.stringify([restaurantId,code])).digest('hex'));assert.ok(!JSON.stringify(stored).includes(code));
  console.log('Admin, produtos, código da equipe e recusa sem segundo fator pela API/Firestore emulados: OK. MFA foi simulado.');
 }finally{if(browser)await browser.close();vite.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
