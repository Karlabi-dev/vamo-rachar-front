// Entirely fictional, in-memory fixtures for the kitchen UI. No service calls.
const item = (id, name, quantity, status = 'Recebido', note = '') => ({ id, name, quantity, status, note });
export const itemStatuses = ['Recebido', 'Em preparo', 'Pronto', 'Entregue ao garçom'];
export const kitchenOrders = [
  { id: '1054', table: '09', received: '12:37', minutes: 20, due: '12:57', label: 'Novo pedido', tone: 'blue', items: [item('a', 'Burger da casa', 1), item('b', 'Batata rústica', 1)] },
  { id: '1051', table: '07', received: '12:31', minutes: 25, due: '12:56', label: '1 observação nos itens', tone: 'blue', items: [item('a', 'Burger da casa', 2, 'Em preparo', 'Um dos burgers sem cebola.'), item('b', 'Batata rústica', 1, 'Em preparo')] },
  { id: '1042', table: '12', received: '12:18', minutes: 25, due: '12:43', label: '2 de 3 itens entregues', tone: 'yellow', partial: true, summary: ['1× Batata rústica em preparo', 'Burger e salada entregues'], items: [item('a', 'Burger da casa', 1, 'Entregue ao garçom'), item('b', 'Salada da horta', 1, 'Entregue ao garçom'), item('c', 'Batata rústica', 1, 'Em preparo')] },
  { id: '1046', table: '08', received: '12:24', minutes: 15, due: '12:39', label: 'Aguardando garçom · 2 min', tone: 'green', items: [item('a', 'Burger da casa', 1, 'Pronto'), item('b', 'Batata rústica', 1, 'Pronto')] },
  { id: '1053', table: '03', received: '12:35', minutes: 15, due: '12:50', label: 'Sem observações', tone: 'blue', items: [item('a', 'Salada da horta', 2, 'Em preparo')] },
  { id: '1050', table: '01', received: '12:29', minutes: 20, due: '12:49', label: 'Sem observações', tone: 'blue', items: [item('a', 'Risoto de cogumelos', 1, 'Em preparo')] },
  { id: '1040', table: '04', received: '12:10', minutes: 20, due: '12:30', label: 'Atrasado há 8 min', tone: 'red', items: [item('a', 'Risoto de cogumelos', 2, 'Em preparo')] },
  { id: '1044', table: '02', received: '12:21', minutes: 15, due: '12:36', label: 'Aguardando garçom · 4 min', tone: 'green', items: [item('a', 'Salada da horta', 2, 'Pronto')] },
];
export const barOrders = [
  { id: '1055', table: '05', received: '12:38', minutes: 5, due: '12:43', label: 'Novo pedido', tone: 'blue', items: [item('a', 'Limonada natural', 2)] },
  { id: '1052', table: '07', received: '12:32', minutes: 8, due: '12:40', label: 'Sem observações', tone: 'blue', items: [item('a', 'Suco de laranja', 1, 'Em preparo')] },
];
export const cloneOrders = orders => orders.map(order => ({ ...order, items: order.items.map(i => ({ ...i })) }));

export function describeOrder(order) {
  const delivered = order.items.filter(i => i.status === 'Entregue ao garçom').length;
  if (delivered === order.items.length) return { complete: true };
  if (!order.changed) return { complete: false, label: order.label, tone: order.tone, partial: !!order.partial, summary: order.summary || order.items.map(i => `${i.quantity}× ${i.name}`) };
  const partial = delivered > 0;
  return {
    complete: false,
    label: partial ? `${delivered} de ${order.items.length} itens entregues` : order.items.every(i => i.status === 'Pronto') ? 'Aguardando garçom' : 'Status atualizado',
    tone: partial ? 'yellow' : order.items.every(i => i.status === 'Pronto') ? 'green' : 'blue', partial,
    summary: order.items.filter(i => i.status !== 'Entregue ao garçom').map(i => `${i.quantity}× ${i.name}`),
  };
}
