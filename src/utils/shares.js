// Mesma regra do servidor: ordem lexicográfica dos IDs recebe os centavos restantes.
export function splitAmounts(totalCents, participantIds) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0 || !Array.isArray(participantIds) || !participantIds.length || participantIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) || new Set(participantIds).size !== participantIds.length) throw new Error('Dados de divisão inválidos.');
  const sorted = [...participantIds].sort();
  const base = Math.floor(totalCents / sorted.length), remainder = totalCents % sorted.length;
  return sorted.map((participantId, index) => ({participantId, amountCents: base + (index < remainder ? 1 : 0)}));
}
