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
  await expect(page.getByText('Suco da casa')).toBeVisible();
  await expect(page.getByText('R$ 12,50')).toBeVisible();
  await expect(page.getByText(/criação de pedidos será disponibilizada/)).toBeVisible();
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
  await expect(page.getByText('Suco da casa')).toBeVisible();
  expect(joins).toBe(1);
  expect(menus).toBe(2);
});
