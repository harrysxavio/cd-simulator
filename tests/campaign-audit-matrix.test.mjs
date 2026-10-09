import test from 'node:test';
import assert from 'node:assert/strict';
import {flow,ACTIONS} from '../src/flow.js';
import {DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO,finance,cleanScenario} from '../src/scenario.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuAudit} from '../src/audit.js';
import {campaignSnapshot} from '../src/campaign.js';

test('aggregate campaign: decision/demand matrix maintains bounded physical flow and economic identities',()=>{
 let cases=0;
 const scenarios=[
  {demand:1000,actualDemand:1000,initialStock:250},
  {demand:1000,actualDemand:1500,initialStock:0},
  {demand:1000,actualDemand:100,initialStock:1000},
  {demand:200,actualDemand:1,initialStock:50},
  {demand:4000,actualDemand:6000,initialStock:150}
 ];
 const decisions=[
  {...DEFAULTS},
  {...DEFAULTS,commercial:'under',planning:'partial',purchasing:'cheap',quality:'slow',picking:'low',transport:'low'},
  {...DEFAULTS,commercial:'over',planning:'buffer',purchasing:'express',quality:'priority',receiving:'extra',picking:'reinforce',transport:'extra'},
  {...DEFAULTS,values:{commercial:100,planning:90,purchasing:75,receiving:100,picking:800,transport:500}}
 ];
 for(const raw of scenarios)for(const decision of decisions)for(const actions of [
  {},{receiving:100,picking:150,transport:100,quality:5},
  {receiving:500,picking:600,transport:600,inventory:100}
 ]){
  const scenario=cleanScenario({...DEFAULT_SCENARIO,...raw,lockUpstream:true});
  const r=flow(decision,actions,scenario),f=finance(r,scenario);
  assert.ok(r.dispatched>=0&&r.dispatched<=r.picked&&r.picked<=r.available);
  assert.ok(r.dispatched<=r.demand&&r.pending>=0);
  assert.equal(r.pending,r.demand-r.dispatched);
  assert.ok(r.received<=r.delivered&&r.released<=r.received);
  assert.ok(r.delivered<=r.ordered);
  assert.ok(r.stages.every(step=>step.input>=0&&step.output>=0&&step.capacity>=0));
  for(const key of ['purchase','cashOutflow','total','revenue','margin','costOfGoods','operationalExpenses','laborTotal','transport','packaging']){
   assert.ok(Number.isFinite(f[key]),'Nonfinite '+key+' at case '+cases);
  }
  assert.equal(f.total,f.costOfGoods+f.operationalExpenses);
  assert.equal(f.cashOutflow,f.purchase+f.operationalExpenses);
  assert.equal(f.margin,f.revenue-f.total);
  assert.equal(f.initialConsumed+f.newlyConsumed,r.dispatched);
  assert.ok(f.costPerUnit===null||f.costPerUnit>=0);
  cases++;
 }
 assert.equal(cases,60);
});

test('SKU recovery and procurement: cross-policy matrix maintains order, stock, lead-time and cash invariants',()=>{
 let count=0;
 for(const policy of ['lean','balanced','service']){
  for(const option of ['wait','overtime','emergency','combined']){
   for(const profile of [
    {actualOrders:200,qualityReleasePercent:100,urgentArrivalDay:1,receivingUnitCapacity:500},
    {actualOrders:260,qualityReleasePercent:50,urgentArrivalDay:2,receivingUnitCapacity:20,supplierFill:{A:60,B:75,C:80}},
    {actualOrders:140,qualityReleasePercent:0,urgentArrivalDay:13,receivingUnitCapacity:0,purchaseCoveragePercent:25}
   ]){
    const args={policy,plannedOrders:200,option,...profile};
    const comparison=recoveryComparison(args);
    const audit=skuAudit({...args,comparisonResult:comparison});
    const canonical=campaignSnapshot({comparison,plannedOrders:200,campaignId:'AUDIT-MATRIX'});
    assert.equal(audit.passed,true,'SKU audit failed for '+JSON.stringify(args)+' '+JSON.stringify(audit.checks));
    assert.equal(canonical.passed,true,'Canonical model failed for '+JSON.stringify(args)+' '+JSON.stringify(canonical.checks));
    assert.equal(canonical.shipments.length,comparison.recovered.completed);
    assert.equal(canonical.orders.length,comparison.recovered.orders);
    assert.equal(comparison.recovered.pending+comparison.recovered.completed,comparison.recovered.orders);
    assert.equal(comparison.netCashDelta,comparison.incrementalRevenue-comparison.incrementalExpense);
    assert.equal(canonical.purchaseOrders.filter(p=>p.source==='original').length,3);
    assert.ok(canonical.inventory.bySku.every(sku=>sku.available>=0&&sku.held>=0));
    assert.ok(canonical.receipts.every(receipt=>receipt.day>=canonical.purchaseOrders.find(po=>po.id===receipt.purchaseOrderId).expectedArrivalDay));
    count++;
   }
  }
 }
 assert.equal(count,36);
});

test('additional capacity cannot physically reduce dispatch when every other operational input remains equal',()=>{
 for(const category of ['receiving','picking','transport']){
  for(const actualDemand of [500,1000,1400]){
   const scenario={...DEFAULT_SCENARIO,actualDemand,demand:1000};
   const initial=flow(DEFAULTS,{},scenario);
   const reinforced=flow(DEFAULTS,{[category]:ACTIONS[category][2]},scenario);
   assert.ok(reinforced.dispatched>=initial.dispatched,category+' decreased dispatch');
  }
 }
});
