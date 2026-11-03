import test from 'node:test';
import assert from 'node:assert/strict';
import {priceInCents,historyCsv} from '../src/operations/adminData.js';
test('price field accepts Brazilian currency and rejects invalid or nonpositive amounts',()=>{assert.equal(priceInCents('R$ 1.234,56'),123456);assert.equal(priceInCents('32,90'),3290);assert.equal(priceInCents('0,01'),1);for(const input of ['',0,'-1,00','1,234','abc','Infinity','9.9'])assert.equal(priceInCents(input),null);});
test('audit CSV escapes quotes and spreadsheet formulas in user provided fields',()=>{const csv=historyCsv([{id:'EVT-1',time:'12:39',author:'Marina',device:'AD-01',action:'Produto atualizado',target:'=1+1',reason:'Texto com "aspas"; e separador',result:'Publicado'}]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"Texto com ""aspas""; e separador"'));});
