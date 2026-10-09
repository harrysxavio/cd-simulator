import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSimulation} from '../src/events.js';

test('service policy keeps backlog and ships on arrival day',()=>{
 const r=eventSimulation({policy:'service'});
 assert.equal(r.onTime,97);
 assert.equal(r.ledger[1].shipped,0);
 assert.equal(r.ledger[2].shipped,103);
 assert.equal(r.completed,200);
 assert.equal(r.late,103);
 assert.equal(r.pending,0);
});
test('high rotation supplier delay moves fulfillment to day 10',()=>{
 const r=eventSimulation({policy:'service',delayDays:{A:8}});
 assert.equal(r.ledger[2].shipped,0);
 assert.equal(r.ledger[10].shipped,103);
 assert.equal(r.completed,200);
});
test('daily capacity constrains throughput and no order ships twice',()=>{
 const r=eventSimulation({policy:'service',dailyCapacity:20,days:12});
 assert.ok(r.ledger.every(day=>day.shipped<=20));
 assert.equal(r.completed+r.pending,200);
 assert.equal(r.ledger.reduce((n,d)=>n+d.shipped,0),r.completed);
});
test('physical SKU conservation across actual arrivals and dispatches',()=>{
 const r=eventSimulation({policy:'service',supplierFill:{C:50}});
 for(const [id,initial] of Object.entries(r.initial)){
  const receipts=r.deliveries.filter(d=>d.id===id&&d.arrivalDay<=r.days).reduce((n,d)=>n+d.received,0);
  assert.equal(initial+receipts,r.endingStock[id]+r.consumed[id]);
  assert.ok(r.endingStock[id]>=0);
 }
});
test('zero capacity retains backlog and invalid horizons fail',()=>{
 const r=eventSimulation({dailyCapacity:0,days:2});
 assert.equal(r.completed,0);
 assert.equal(r.pending,200);
 assert.throws(()=>eventSimulation({days:-1}),/inválidos/);
});


test('receiving capacity queues arrivals without fabricating usable stock',()=>{
 const unlimited=eventSimulation({policy:'service'});
 const zero=eventSimulation({policy:'service',receivingUnitCapacity:0});
 assert.equal(zero.ledger.reduce((n,d)=>n+Object.values(d.received).reduce((a,x)=>a+x,0),0),0);
 assert.equal(zero.ledger[0].shipped,unlimited.ledger[0].shipped);
 assert.equal(zero.ledger[2].shipped,0);
 assert.ok(zero.waitingReceiving>0);
 const restricted=eventSimulation({policy:'service',receivingUnitCapacity:15});
 for(const d of restricted.ledger)assert.ok(Object.values(d.received).reduce((n,x)=>n+x,0)<=15);
 assert.ok(restricted.ledger[2].waitingReceiving>0);
 for(const [id,n] of Object.entries(restricted.initial)){
  const total=restricted.ledger.reduce((acc,d)=>acc+d.received[id],0);
  assert.equal(n+total,restricted.endingStock[id]+restricted.consumed[id]);
 }
});
test('picking and transport are capped by physical SKU units, not order counts',()=>{
 const pickZero=eventSimulation({pickingUnitCapacity:0});
 const transportZero=eventSimulation({transportUnitCapacity:0});
 assert.equal(pickZero.completed,0);
 assert.equal(transportZero.completed,0);
 const limited=eventSimulation({policy:'service',pickingUnitCapacity:3,transportUnitCapacity:2});
 assert.ok(limited.ledger.every(d=>d.shippedUnits<=2));
 assert.ok(limited.ledger.every(d=>d.shipped<=1));
 assert.equal(limited.ledger.reduce((sum,d)=>sum+d.shipped,0),limited.completed);
 for(const [id,n] of Object.entries(limited.initial)){
  const incoming=limited.ledger.reduce((sum,d)=>sum+d.received[id],0);
  assert.equal(n+incoming,limited.endingStock[id]+limited.consumed[id]);
 }
 for(const name of ['receivingUnitCapacity','pickingUnitCapacity','transportUnitCapacity']){
  assert.throws(()=>eventSimulation({[name]:-1}),/Capacidad física por área inválida/);
  assert.throws(()=>eventSimulation({[name]:1.5}),/Capacidad física por área inválida/);
 }
});
