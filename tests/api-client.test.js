import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, tableFromUrl } from '../src/api/client.js';

test('lê identificadores do QR e rejeita caminhos inválidos', () => {
  assert.deepEqual(tableFromUrl('https://app.example/?restaurantId=rest-a&tableId=mesa-13#/entrada'), { restaurantId: 'rest-a', tableId: 'mesa-13' });
  assert.deepEqual(tableFromUrl('https://app.example/#/entrada?restaurantId=rest-b&tableId=13'), { restaurantId: 'rest-b', tableId: '13' });
  assert.equal(tableFromUrl('https://app.example/?restaurantId=rest-a&tableId=../bad'), null);
  assert.equal(tableFromUrl('https://app.example/'), null);
});
test('envia token e usa o sessionId retornado para consultar o cardápio', async () => {
  const requests = [];
  const api = createApiClient({ baseUrl: 'https://api.example/', getToken: async () => 'token-teste', fetchImpl: async (url, options) => {
    requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return { ok: true, json: async () => url.endsWith('/joinTable') ? { result: { sessionId: 'sessao-1', participantId: 'pessoa-1' } } : { result: { items: [{ id: 'suco', name: 'Suco', priceCents: 900 }] } } };
  } });
  const joined = await api.joinTable({ restaurantId: 'rest-a', tableId: '13' }, '  Ana  ');
  const items = await api.listMenu('rest-a', joined.sessionId);
  assert.equal(requests[0].headers.authorization, 'Bearer token-teste');
  assert.deepEqual(requests[0].body, { restaurantId: 'rest-a', tableId: '13', displayName: 'Ana' });
  assert.deepEqual(requests[1].body, { restaurantId: 'rest-a', sessionId: 'sessao-1' });
  assert.equal(items[0].priceCents, 900);
});
test('não inventa sucesso quando a API nega ou devolve dados inválidos', async () => {
  const bad = createApiClient({ baseUrl: 'https://api.example', getToken: async () => 'token', fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'failed-precondition' }) }) });
  await assert.rejects(() => bad.joinTable({ restaurantId: 'a', tableId: '13' }, 'Ana'), /mesa não está aberta/);
  const malformed = createApiClient({ baseUrl: 'https://api.example', getToken: async () => 'token', fetchImpl: async () => ({ ok: true, json: async () => ({ result: { items: [{ id: 'x', name: 'X', priceCents: '9' }] } }) }) });
  await assert.rejects(() => malformed.listMenu('a', 'b'), /cardápio inválida/);
  assert.throws(() => createApiClient({ baseUrl: 'http://public.example', getToken: async () => 'x' }), /HTTPS/);
});
