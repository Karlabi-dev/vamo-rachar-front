import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, initialItems, screens } from '../src/data/screens.js';
test('bill includes the shared portion and optional 10% service charge',()=>{assert.deepEqual(totals(initialItems),{individual:42,shared:12,subtotal:54,fee:5.4,total:59.4});assert.equal(totals(initialItems,12,false).total,54);});
test('cancelling a split never charges the other participants',()=>{assert.equal(totals(initialItems,0,false).total,42);});
test('fractional amounts are rounded in cents',()=>{assert.equal(totals([{price:10.01,quantity:3}],1.33).total,34.5);});
test('all 29 user screens have unique routes',()=>{assert.equal(screens.length,29);assert.equal(new Set(screens.map(s=>s.path)).size,29);});
