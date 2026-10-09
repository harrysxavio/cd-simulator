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


test('supplier fill from purchasing reduces actual arrivals but never changes committed order',()=>{
 const all=eventSimulation({policy:'service',supplierFill:{A:100,B:100,C:100}});
 const short=eventSimulation({policy:'service',supplierFill:{A:50,B:50,C:50}});
 for(const d of short.deliveries){
  const original=all.deliveries.find(x=>x.id===d.id);
  assert.equal(d.ordered,original.ordered);
  assert.equal(d.received,Math.floor(d.ordered*0.5));
  assert.equal(d.received+d.unreceived,d.ordered);
 }
 assert.ok(short.completed<=all.completed);
 assert.ok(short.ledger.every(d=>d.waitingReceiving>=0));
});
test('Quality holds receipts in quarantine before they can become pickable',()=>{
 const opts={policy:'service',orders:100,days:2,stock:{A:0,B:0,C:0},fixedPurchases:{A:100,B:0,C:0}};
 const half=eventSimulation({...opts,qualityReleasePercent:50});
 const full=eventSimulation({...opts,qualityReleasePercent:100});
 assert.equal(half.ledger[2].received.A,100);
 assert.equal(half.ledger[2].released.A,50);
 assert.equal(half.ledger[2].waitingQuality,50);
 assert.equal(half.heldQuality.A,50);
 assert.ok(half.completed<full.completed);
 for(const [id,opening] of Object.entries(half.initial)){
  const received=half.ledger.reduce((n,d)=>n+d.received[id],0);
  assert.equal(opening+received,half.consumed[id]+half.endingStock[id]+half.heldQuality[id]);
 }
});
test('Quality backlog releases progressively, never manufactures stock or ignores zero release',()=>{
 const opts={orders:100,days:6,stock:{A:0,B:0,C:0},fixedPurchases:{A:100,B:0,C:0}};
 const slow=eventSimulation({...opts,qualityReleasePercent:50});
 assert.ok(slow.ledger[3].released.A>0);
 assert.ok(slow.ledger[3].waitingQuality<slow.ledger[2].waitingQuality);
 const blocked=eventSimulation({...opts,qualityReleasePercent:0});
 assert.equal(blocked.ledger.reduce((n,d)=>n+d.shipped,0),0);
 assert.equal(blocked.heldQuality.A,100);
 assert.equal(blocked.endingStock.A,0);
 for(const pct of [-1,101,NaN])assert.throws(()=>eventSimulation({...opts,qualityReleasePercent:pct}),/Calidad inválido/);
});
