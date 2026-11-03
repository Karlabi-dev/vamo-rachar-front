import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneOrders,kitchenOrders,describeOrder} from '../src/operations/kitchenData.js';
test('a partially delivered fixture remains visible and shows its pending item',()=>{const order=kitchenOrders.find(x=>x.id==='1042');const view=describeOrder(order);assert.equal(view.complete,false);assert.equal(view.partial,true);assert.equal(view.label,'2 de 3 itens entregues');});
test('only delivery of every local item completes a mock order',()=>{const order=cloneOrders(kitchenOrders)[2];order.changed=true;order.items[2].status='Pronto';assert.equal(describeOrder(order).complete,false);order.items[2].status='Entregue ao garçom';assert.equal(describeOrder(order).complete,true);assert.equal(kitchenOrders[2].items[2].status,'Em preparo');});
