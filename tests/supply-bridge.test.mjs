import test from 'node:test';
import assert from 'node:assert/strict';
import {supplyBridge} from '../src/supply-bridge.js';

test('urgent purchasing enters inventory only on receipt date',()=>{
 const r=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:5});
 const baseline=supplyBridge({actualOrders:260,option:'wait'});
 assert.ok(r.purchasing.extraUnits>0);
 assert.equal(r.receiving.receivedExtraUnits,r.purchasing.extraUnits);
 assert.equal(r.receiving.outsideHorizonUnits,0);
 assert.equal(r.receipts[0].received.A>=0,true);
 for(const sku of r.purchasing.orders){
  assert.equal(r.receiving.arrivals[sku.id],5);
  for(const day of r.receipts.filter(x=>x.day<5)){
   const original=baseline.receipts.find(x=>x.day===day.day);
   assert.equal(day.received[sku.id],original.received[sku.id],`SKU ${sku.id} received urgent units prematurely on day ${day.day}`);
   assert.deepEqual(day.stock,original.stock,`SKU stock changed before urgent receipt on day ${day.day}`);
  }
  const day5=r.receipts.find(x=>x.day===5);
  assert.ok(day5.received[sku.id]>=sku.qty);
 }
});
test('purchase arriving after horizon costs money but cannot improve fulfillment',()=>{
 const wait=supplyBridge({actualOrders:260,option:'wait'});
 const late=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:13});
 assert.equal(late.receiving.receivedExtraUnits,0);
 assert.equal(late.receiving.outsideHorizonUnits,late.purchasing.extraUnits);
 assert.equal(late.picking.completed,wait.picking.completed);
 assert.equal(late.picking.improvement,0);
 assert.ok(late.purchasing.extraCost>0);
});
test('physical inventory reconciles per SKU',()=>{
 const r=supplyBridge({actualOrders:260,option:'combined',urgentArrivalDay:2});
 for(const [id,initial] of Object.entries(r.inventory.initial)){
  const received=r.receipts.reduce((sum,day)=>sum+day.received[id],0);
  assert.equal(initial+received-r.inventory.consumed[id],r.inventory.ending[id]);
 }
 assert.equal(r.picking.completed+r.picking.pending,r.actualOrders);
});

test('procurement verdict distinguishes late purchases from effective arrivals',()=>{
 const late=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:13});
 assert.equal(late.decision.quality,'late');
 assert.equal(late.decision.firstUrgentReceiptDay,null);
 assert.equal(late.decision.serviceGain,false);
 assert.ok(late.decision.urgentSpent>0);
 const timely=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1});
 assert.equal(timely.decision.firstUrgentReceiptDay,1);
 assert.equal(timely.decision.serviceGain,timely.picking.improvement>0);
 assert.equal(timely.decision.quality,timely.picking.improvement>0?'effective':'no-gain');
 const noPurchase=supplyBridge({actualOrders:260,option:'wait'});
 assert.equal(noPurchase.decision.quality,'no-order');
 assert.equal(noPurchase.decision.extraUnits,0);
});

test('partial purchases preserve the causal stock and cash trade-off',()=>{
 const original=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:100});
 const partial=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:50});
 const none=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:0});
 assert.ok(original.purchasing.extraUnits>partial.purchasing.extraUnits);
 assert.ok(partial.purchasing.extraUnits>none.purchasing.extraUnits);
 assert.equal(none.decision.quality,'no-order');
 assert.equal(none.decision.extraUnits,0);
 assert.ok(partial.purchasing.extraCost<original.purchasing.extraCost);
 assert.equal(partial.purchaseCoveragePercent,50);
 assert.ok(partial.picking.completed<=original.picking.completed);
 assert.equal(partial.receipts[0].completed,original.receipts[0].completed);
 for(const [id,initial] of Object.entries(partial.inventory.initial)){
  const received=partial.receipts.reduce((n,day)=>n+day.received[id],0);
  assert.equal(initial+received-partial.inventory.consumed[id],partial.inventory.ending[id]);
 }
});


test('shared campaign Receiving capacity prevents premature SKU purchases from entering stock',()=>{
 const blocked=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:0});
 assert.equal(blocked.receiving.receivedExtraUnits,0);
 assert.ok(blocked.receiving.outsideHorizonUnits>0);
 assert.ok(blocked.receiving.waitingReceiving>0);
 assert.equal(blocked.decision.quality,'receiving-blocked');
 assert.equal(blocked.picking.improvement,0);
 assert.equal(blocked.purchasing.extraUnits,blocked.receiving.outsideHorizonUnits);
 const constrained=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:10});
 assert.ok(constrained.receipts.every(d=>Object.values(d.received).reduce((n,x)=>n+x,0)<=10));
 assert.equal(constrained.purchasing.extraUnits,constrained.receiving.receivedExtraUnits+constrained.receiving.outsideHorizonUnits);
});
test('shared picking and transport constraints propagate to complete orders',()=>{
 const base=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1});
 const pickBlocked=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1,pickingUnitCapacity:0});
 const transportBlocked=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1,transportUnitCapacity:0});
 assert.equal(pickBlocked.picking.completed,0);
 assert.equal(transportBlocked.picking.completed,0);
 assert.ok(base.picking.completed>0);
 const limited=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:1,pickingUnitCapacity:4,transportUnitCapacity:3});
 assert.ok(limited.receipts.every(d=>d.shippedUnits<=3));
 assert.ok(limited.picking.completed<base.picking.completed);
});
