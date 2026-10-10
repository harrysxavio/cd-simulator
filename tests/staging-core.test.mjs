import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSimulation} from '../src/events.js';
import {stagingIntegrityReadModel} from '../src/staging-ledger.js';

const check=(r)=>{
 assert.equal(r.stagingAudit.passed,true);
 assert.equal(r.stagingAudit.mode,'independent-staging');
 assert.equal(r.stagingAudit.daily.length,r.days+1);
 assert.ok(r.stagingAudit.daily.every(d=>d.stagingOrders>=0&&d.stagingSkuUnits>=0));
 assert.ok(r.stagingAudit.daily.every(d=>d.preparedSkuUnits<=(r.pickingUnitCapacity??Infinity)));
 assert.ok(r.stagingAudit.daily.every(d=>d.shippedSkuUnits<=(r.transportUnitCapacity??Infinity)));
 const ids=Object.keys(r.initial);
 for(const id of ids){
  const arrivals=r.ledger.reduce((n,d)=>n+d.received[id],0);
  const dispatched=r.ledger.reduce((n,d)=>n+d.shipmentEvents.reduce((v,s)=>v+(s.lines[id]??0),0),0);
  assert.equal(r.initial[id]+arrivals,dispatched+r.endingStock[id]+r.endingStagingStock[id]+r.endingReserveStock[id]+r.heldQuality[id]);
  assert.equal(r.consumed[id],dispatched);
 }
};
test('M3-12a: truck capacity zero builds a real FIFO staging queue, not fictional dispatch',()=>{
 const r=eventSimulation({separateTransport:true,policy:'service',transportUnitCapacity:0,pickingUnitCapacity:12,orders:120,days:4});
 check(r);
 assert.equal(r.completed,0);
 assert.equal(r.ledger.reduce((n,d)=>n+d.shipmentEvents.length,0),0);
 assert.ok(r.ordersDetail.some(o=>o.pickedDay!==null&&o.fulfilledDay===null));
 assert.ok(r.ledger.some(d=>d.stagingOrders>0));
 assert.ok(r.stagingAudit.totals.preparedOrders>0);
 assert.equal(r.stagingAudit.totals.shippedOrders,0);
 assert.equal(r.stagingAudit.totals.stagingOrders,r.stagingAudit.totals.preparedOrders);
 assert.equal(r.pending,r.orders);
});

test('M3-12a: low carrier capacity dispatches picked kits from earlier days, never before picking',()=>{
 const r=eventSimulation({separateTransport:true,policy:'service',transportUnitCapacity:2,pickingUnitCapacity:12,orders:120,days:12});
 check(r);
 assert.ok(r.ledger.some(d=>d.stagingOrders>0));
 assert.ok(r.ordersDetail.some(o=>o.fulfilledDay!==null&&o.pickedDay<o.fulfilledDay),
  'some order must genuinely wait for carrier capacity');
 assert.ok(r.ledger.every(d=>d.shippedUnits<=2));
 assert.ok(r.ledger.every(d=>d.pickedUnits<=12));
 assert.ok(r.completed>0);
 assert.ok(r.stagingAudit.totals.preparedOrders>=r.completed);
 for(const d of r.ledger)for(const e of d.shipmentEvents){
  const o=r.ordersDetail.find(x=>x.id===e.orderId);
  assert.ok(o.pickedDay<=e.day);
  assert.equal(o.fulfilledDay,e.day);
 }
});

test('M3-12a: picking zero cannot create staging or dispatch even with trucks',()=>{
 const r=eventSimulation({separateTransport:true,pickingUnitCapacity:0,transportUnitCapacity:100,orders:120,days:4});
 check(r);
 assert.equal(r.stagingAudit.totals.preparedOrders,0);
 assert.equal(r.stagingAudit.totals.stagingOrders,0);
 assert.equal(r.completed,0);
 assert.ok(r.ledger.every(d=>d.stagingUnits===0&&d.pickedUnits===0));
});

test('M3-12a: original same-day mode remains unchanged unless option is explicitly enabled',()=>{
 const options={policy:'service',pickingUnitCapacity:10,transportUnitCapacity:0,orders:100,days:3};
 const legacy=eventSimulation(options);
 assert.equal(legacy.separateTransport,false);
 assert.equal(legacy.completed,0);
 assert.ok(legacy.ledger.every(d=>d.pickedOrders===0&&d.stagingUnits===0));
 assert.equal(legacy.stagingAudit,undefined);
 const separate=eventSimulation({...options,separateTransport:true});
 check(separate);
 assert.ok(separate.stagingAudit.totals.preparedOrders>0);
 assert.equal(separate.completed,0);
 assert.deepEqual(legacy.initial,separate.initial);
 assert.deepEqual(legacy.deliveries,separate.deliveries);
});

test('M3-12a: unchanged physical stock under Quality hold, reserve location and unverified picking',()=>{
 const r=eventSimulation({
  separateTransport:true,policy:'service',orders:100,days:6,
  stock:{A:80,B:35,C:15},reserveStock:{A:20,B:8,C:4},reserveReleaseDay:2,
  receivingUnitCapacity:12,qualityReleasePercent:30,inventoryAccuracyPercent:55,
  transportUnitCapacity:1,pickingUnitCapacity:8
 });
 check(r);
 assert.ok(r.ledger.every(d=>Object.values(d.heldQuality).every(x=>x>=0)));
 assert.ok(r.ledger.every(d=>Object.values(d.reserveStock).every(x=>x>=0)));
 assert.ok(r.ledger.every(d=>Object.values(d.unverifiedStock).every(x=>x>=0)));
 assert.equal(r.endingStagingOrders,r.ordersDetail.filter(o=>o.pickedDay!==null&&o.fulfilledDay===null).length);
});

test('M3-12a: reject falsified staging inventory, pickup order, capacity or departure day',()=>{
 const r=eventSimulation({separateTransport:true,transportUnitCapacity:8,pickingUnitCapacity:10,orders:80,days:4});
 check(r);
 const badStaging={...r,ledger:r.ledger.map((d,i)=>i!==0?d:{
  ...d,stagingStock:{...d.stagingStock,A:d.stagingStock.A+1}
 })};
 assert.throws(()=>stagingIntegrityReadModel(badStaging),/Staging SKU/);
 const firstDay=r.ledger.find(d=>d.pickEvents.length);
 const tamperedPick={...r,ledger:r.ledger.map(d=>d.day!==firstDay.day?d:{
  ...d,pickEvents:d.pickEvents.map((p,i)=>i?p:{...p,day:p.day+1})
 })};
 assert.throws(()=>stagingIntegrityReadModel(tamperedPick),/Staging SKU/);
 const wrongCapacity={...r,pickingUnitCapacity:0};
 assert.throws(()=>stagingIntegrityReadModel(wrongCapacity),/Staging SKU/);
 const a=r.ordersDetail.find(o=>o.fulfilledDay!==null);
 assert.ok(a);
 const early={...r,ordersDetail:r.ordersDetail.map(o=>o.id!==a.id?o:{...o,pickedDay:o.fulfilledDay+1})};
 assert.throws(()=>stagingIntegrityReadModel(early),/Staging SKU/);
});

test('M3-12a: deterministic staging with an empty cohort',()=>{
 const a=eventSimulation({separateTransport:true,orders:0,days:0});
 const b=eventSimulation({separateTransport:true,orders:0,days:0});
 assert.deepEqual(a,b);
 assert.equal(a.stagingAudit.totals.preparedOrders,0);
 assert.equal(a.stagingAudit.totals.stagingOrders,0);
 assert.equal(a.stagingAudit.totals.shippedOrders,0);
 assert.throws(()=>eventSimulation({separateTransport:'yes'}),/Separación física/);
});
