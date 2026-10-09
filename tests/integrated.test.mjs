import test from 'node:test';
import assert from 'node:assert/strict';
import {integratedDemand} from '../src/integrated.js';

test('surprise does not retroactively change procurement',()=>{
 const low=integratedDemand({actualOrders:140}),high=integratedDemand({actualOrders:260});
 assert.deepEqual(low.purchase,high.purchase);
 assert.equal(low.committedPurchaseValue,high.committedPurchaseValue);
 assert.equal(high.committedPurchaseValue,530900);
});
test('higher demand creates actual backlog with fixed purchases',()=>{
 const r=integratedDemand({actualOrders:260});
 assert.equal(r.planned.completed,200);
 assert.equal(r.actual.completed,200);
 assert.equal(r.actual.pending,60);
 assert.equal(r.impact.pending,60);
});
test('no surprise reconciles exactly',()=>{
 const r=integratedDemand({actualOrders:200});
 assert.deepEqual(r.impact,{orders:0,onTime:0,completed:0,pending:0,late:0});
});
test('supplier delay affects delivery timing but not fixed purchase value',()=>{
 const normal=integratedDemand({actualOrders:260});
 const late=integratedDemand({actualOrders:260,delayDays:{A:8}});
 assert.equal(normal.committedPurchaseValue,late.committedPurchaseValue);
 assert.equal(late.actual.ledger[2].shipped,0);
 assert.ok(late.actual.ledger[10].shipped>0);
});
test('invalid order demand rejected',()=>{
 assert.throws(()=>integratedDemand({actualOrders:0}),/inválida/);
});
