import test from 'node:test';
import assert from 'node:assert/strict';
import {supplyBridge} from '../src/supply-bridge.js';

test('urgent purchasing enters inventory only on receipt date',()=>{
 const r=supplyBridge({actualOrders:260,option:'emergency',urgentArrivalDay:5});
 assert.ok(r.purchasing.extraUnits>0);
 assert.equal(r.receiving.receivedExtraUnits,r.purchasing.extraUnits);
 assert.equal(r.receiving.outsideHorizonUnits,0);
 assert.equal(r.receipts[0].received.A>=0,true);
 for(const sku of r.purchasing.orders){
  assert.equal(r.receiving.arrivals[sku.id],5);
  for(const day of r.receipts.filter(x=>x.day<5))assert.equal(day.received[sku.id]>=0,true);
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
