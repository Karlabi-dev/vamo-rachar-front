// Execute via firebase emulators:exec. Este teste só aceita emuladores locais e projeto demo.
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { chromium } = require('@playwright/test');

const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, process.env.VAMO_BACKEND_PATH || '../Vamo-Rachar-');
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const isLocalHostPort = value => /^(localhost|127\.0\.0\.1):\d+$/.test(value || '');
if (!projectId?.startsWith('demo-') || !isLocalHostPort(process.env.FIRESTORE_EMULATOR_HOST) || !isLocalHostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  throw new Error('Execute apenas em projeto demo com emuladores locais de Auth e Firestore.');
}
process.env.CORS_ORIGINS = 'http://127.0.0.1:5175';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.FIREBASE_PROJECT_ID;
const app = require(path.join(backend, 'functions/src/server.js'));
const backendRequire = createRequire(path.join(backend, 'functions/package.json'));
const { getFirestore } = backendRequire('firebase-admin/firestore');

async function main() {
  const restaurantId = `integration-${randomUUID()}`;
  const rest = getFirestore().collection('restaurants').doc(restaurantId);
  await rest.set({ name: 'Restaurante de teste' });
  await rest.collection('tables').doc('mesa-13').set({ activeSessionId: 'sessao-teste', number: 13 });
  await rest.collection('sessions').doc('sessao-teste').set({ tableId: 'mesa-13', status: 'open' });
  await rest.collection('menuItems').doc('suco').set({ name: 'Suco do teste', description: 'Natural', available: true, priceCents: 1250, sector: 'bar' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const vite = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5175', '--strictPort'], {
    cwd: frontend,
    env: { ...process.env, VITE_APP_MODE: 'api', VITE_API_BASE_URL: `http://127.0.0.1:${server.address().port}`, VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_AUTH_EMULATOR_URL: `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, VITE_DEMO_RESTAURANT_ID: '', VITE_DEMO_TABLE_ID: '' },
    stdio: 'ignore'
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (vite.exitCode !== null) throw new Error('O servidor Vite encerrou antes de iniciar.');
      try { const response = await fetch('http://127.0.0.1:5175'); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'O servidor Vite não iniciou.');
    browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:5175/?restaurantId=${restaurantId}&tableId=mesa-13`);
    await page.getByLabel('Como podemos te chamar?').fill('Ana');
    await page.getByRole('button', { name: 'Entrar na mesa' }).click();
    await page.getByText('Suco do teste').waitFor({ timeout: 20000 });
    assert.equal(await page.getByText('R$ 12,50').count(), 1);
    const people = await rest.collection('sessions').doc('sessao-teste').collection('participants').get();
    assert.equal(people.size, 1);
    assert.equal(people.docs[0].data().displayName, 'Ana');
    console.log('Front + autenticação anônima + API + Firestore nos emuladores: OK.');
  } finally {
    if (browser) await browser.close();
    vite.kill('SIGTERM');
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
