const IDENTIFIER = /^[A-Za-z0-9_-]{1,100}$/;

export function tableFromUrl(href, defaults = {}) {
  const url = new URL(href);
  const hashQuery = url.hash.includes('?') ? new URLSearchParams(url.hash.split('?').slice(1).join('?')) : new URLSearchParams();
  const restaurantId = url.searchParams.get('restaurantId') || hashQuery.get('restaurantId') || defaults.restaurantId;
  const tableId = url.searchParams.get('tableId') || hashQuery.get('tableId') || defaults.tableId;
  if (!IDENTIFIER.test(restaurantId || '') || !IDENTIFIER.test(tableId || '')) return null;
  return { restaurantId, tableId };
}

export function createApiClient({ baseUrl, getToken, fetchImpl = fetch }) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('O endereço da API deve usar HTTPS.');
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Endereço da API inválido.');
  const root = parsed.toString().replace(/\/+$/, '');
  async function call(operation, body) {
    const token = await getToken();
    let response;
    try {
      response = await fetchImpl(`${root}/api/${operation}`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000)
      });
    } catch {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('Não foi possível interpretar a resposta do servidor.'); }
    if (!response.ok) {
      const messages = { 'failed-precondition': operation === 'joinTable' ? 'A mesa não está aberta ou sua entrada não está disponível.' : 'A operação não está disponível no estado atual. Confira os dados e tente novamente.', 'permission-denied': operation === 'joinTable' ? 'Você não tem acesso a esta mesa.' : operation.toLowerCase().includes('admin') || operation.toLowerCase().includes('employee') ? 'Sem permissão administrativa para este estabelecimento.' : 'Acesso não autorizado. Confira o código e a ativação do dispositivo.', 'unauthenticated': 'Sua autenticação expirou. Tente novamente.', 'not-found': 'Mesa ou recurso não encontrado.' };
      throw new Error(messages[data.error] || 'Não foi possível concluir a solicitação. Tente novamente.');
    }
    if (!data.result || typeof data.result !== 'object') throw new Error('Resposta inesperada do servidor.');
    return data.result;
  }
  return {
    async listAdminProducts(restaurantId) {
      const result = await call('listAdminProducts', {restaurantId});
      if (!Array.isArray(result.products) || result.products.some(p => !p || !IDENTIFIER.test(p.productId || '') || typeof p.name !== 'string' || !Number.isSafeInteger(p.priceCents) || p.priceCents < 0 || !Array.isArray(p.sectors) || p.sectors.some(s => !['bar', 'kitchen'].includes(s)) || typeof p.available !== 'boolean')) throw new Error('Resposta de produtos inválida.');
      return result.products;
    },
    async saveAdminProduct(product) {
      const result = await call('saveAdminProduct', product);
      if (result.productId !== product.productId) throw new Error('Resposta de produto inválida.');
      return result;
    },
    async listAdminEmployees(restaurantId) {
      const result = await call('listAdminEmployees', {restaurantId});
      if (!Array.isArray(result.employees) || result.employees.some(e => !e || !IDENTIFIER.test(e.employeeId || '') || typeof e.displayName !== 'string' || !['waiter', 'manager'].includes(e.role) || typeof e.active !== 'boolean')) throw new Error('Resposta de funcionários inválida.');
      return result.employees;
    },
    async createEmployeeCode(employee) {
      const result = await call('createEmployeeCode', employee);
      if (result.employeeId !== employee.employeeId || !/^\d{8}$/.test(result.code || '')) throw new Error('Resposta de código inválida.');
      return result;
    },
    async rotateEmployeeCode(restaurantId, employeeId) {
      const result = await call('rotateEmployeeCode', {restaurantId, employeeId});
      if (result.employeeId !== employeeId || !/^\d{8}$/.test(result.code || '')) throw new Error('Resposta de código inválida.');
      return result;
    },
    async disableEmployeeCode(restaurantId, employeeId) { return call('disableEmployeeCode', {restaurantId, employeeId}); },
    async activateDevice(restaurantId, screen, code) {
      return call('activateSharedDevice', { restaurantId, screen, code });
    },
    async openTableWithCode(restaurantId, tableId, requestId, code) {
      return call('openTableWithCode', { restaurantId, tableId, requestId, code });
    },
    async listWorkQueue(restaurantId, sector) {
      const result = await call('listWorkQueue', { restaurantId, sector });
      if (!Array.isArray(result.items)) throw new Error('Resposta da fila inválida.');
      return result.items;
    },
    async listReadyItems(restaurantId) {
      const result = await call('listReadyItems', { restaurantId });
      if (!Array.isArray(result.items)) throw new Error('Resposta da fila inválida.');
      return result.items;
    },
    async transitionItem(restaurantId, itemId, sector, action) {
      return call('transitionItem', { restaurantId, itemId, sector, action });
    },
    async createOrder(order) {
      const result = await call('createOrder', order);
      if (!IDENTIFIER.test(result.orderId || '')) throw new Error('Resposta do pedido inválida.');
      return result;
    },
    async joinTable(table, name) {
      const displayName = typeof name === 'string' ? name.trim() : '';
      if (!displayName || displayName.length > 80) throw new Error('Informe um nome com até 80 caracteres.');
      const result = await call('joinTable', { ...table, displayName });
      if (!IDENTIFIER.test(result.sessionId || '') || !IDENTIFIER.test(result.participantId || '')) throw new Error('Resposta de entrada inválida.');
      return result;
    },
    async listMenu(restaurantId, sessionId) {
      const result = await call('listMenu', { restaurantId, sessionId });
      if (!Array.isArray(result.items) || result.items.some((item) => !item || !IDENTIFIER.test(item.id || '') || typeof item.name !== 'string' || !Number.isSafeInteger(item.priceCents) || item.priceCents < 0)) throw new Error('Resposta do cardápio inválida.');
      return result.items;
    }
  };
}
