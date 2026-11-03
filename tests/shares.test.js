import test from 'node:test';
import assert from 'node:assert/strict';
import {splitAmounts} from '../src/utils/shares.js';
test('calcula centavos restantes na ordem de IDs, sem modificar a entrada',()=>{
 const people=['p3','p1','p2'];const result=splitAmounts(3100,people);
 assert.deepEqual(result,[{participantId:'p1',amountCents:1034},{participantId:'p2',amountCents:1033},{participantId:'p3',amountCents:1033}]);
 assert.equal(result.reduce((s,p)=>s+p.amountCents,0),3100);assert.deepEqual(people,['p3','p1','p2']);
});
test('rejeita IDs repetidos e valores inválidos',()=>{assert.throws(()=>splitAmounts(1,['a','a']));assert.throws(()=>splitAmounts(-1,['a']));assert.throws(()=>splitAmounts(1,[]));});
