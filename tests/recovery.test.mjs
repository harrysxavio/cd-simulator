import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';

test('no intervention leaves purchases and backlog unchanged',()=>{
 const r=recoveryComparison({option:'wait'});
 assert.equal(r.base.completed,r.recovered.completed);
 assert.equal(r.incrementalExpense,0);
 assert.equal(r.recovered.pending,60);
});
test('urgent stock is received after day zero and conserves stock',()=>{
 const r=recoveryComparison({option:'emergency'});
 assert.equal(r.recovered.ledger[0].shipped,r.base.ledger[0].shipped);
 assert.equal(r.recovered.completed,260);
 assert.equal(r.recovered.pending,0);
 assert.ok(r.urgent.every(x=>x.day===1));
 for(const [id,initial] of Object.entries(r.recovered.initial)){
  const ordinary=r.recovered.deliveries.filter(x=>x.id===id&&x.arrivalDay<=r.recovered.days).reduce((n,x)=>n+x.received,0);
  const urgent=r.urgent.filter(x=>x.id===id&&x.day<=r.recovered.days).reduce((n,x)=>n+x.qty,0);
  assert.equal(initial+ordinary+urgent,r.recovered.endingStock[id]+r.recovered.consumed[id]);
 }
});
test('capacity alone cannot fix missing SKU',()=>{
 const r=recoveryComparison({option:'overtime'});
 assert.equal(r.recovered.completed,r.base.completed);
 assert.ok(r.extraLabor>0);
});
test('cash arithmetic and invalid option',()=>{
 const r=recoveryComparison({option:'combined'});
 assert.equal(r.netCashDelta,r.incrementalRevenue-r.incrementalExpense);
 assert.equal(r.incrementalExpense,r.urgentBase+r.urgentSurcharge+r.extraLabor);
 assert.throws(()=>recoveryComparison({option:'other'}),/desconocida/);
});
