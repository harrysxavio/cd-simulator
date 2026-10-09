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
