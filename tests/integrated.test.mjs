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


test('Comercial forecast and Planning coverage determine a frozen SKU procurement manifest',()=>{
 const base=integratedDemand({policy:'service',plannedOrders:200,actualOrders:260});
 const conservative=integratedDemand({policy:'service',plannedOrders:200,actualOrders:260,plannedForecastPercent:80,planningCoveragePercent:60});
 const protective=integratedDemand({policy:'service',plannedOrders:200,actualOrders:260,plannedForecastPercent:110,planningCoveragePercent:120});
 assert.equal(base.committedPurchaseValue,530900);
 assert.equal(base.forecastOrders,200);
 assert.equal(conservative.forecastOrders,160);
 assert.equal(protective.forecastOrders,220);
 assert.ok(conservative.committedPurchaseValue<base.committedPurchaseValue);
 assert.ok(protective.committedPurchaseValue>base.committedPurchaseValue);
 assert.deepEqual(base.purchase,{A:160,B:17,C:29});
});
test('the same planned campaign cannot repurchase retroactively after demand surprise',()=>{
 const config={policy:'service',plannedOrders:200,plannedForecastPercent:85,planningCoveragePercent:75};
 const low=integratedDemand({...config,actualOrders:140});
 const high=integratedDemand({...config,actualOrders:300});
 assert.deepEqual(low.purchase,high.purchase);
 assert.equal(low.committedPurchaseValue,high.committedPurchaseValue);
 assert.equal(low.forecastOrders,high.forecastOrders);
 assert.ok(high.actual.pending>=low.actual.pending);
 for(const extra of [{plannedForecastPercent:0},{plannedForecastPercent:201},{planningCoveragePercent:-1},{planningCoveragePercent:151}]){
  assert.throws(()=>integratedDemand({...config,...extra}),/inválid/);
 }
});
