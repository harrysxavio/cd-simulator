import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuAudit} from '../src/audit.js';
import {supplyBridge} from '../src/supply-bridge.js';

const base={decisions:{commercial:'accurate',planning:'full',purchasing:'reliable',receiving:'normal',quality:'normal',inventory:'normal',picking:'normal',transport:'normal'},actions:{},scenario:{demand:1000,actualDemand:1300,lockUpstream:true}};

test('eight area choices produce a single immutable SKU input contract',()=>{
 const x=campaignSkuContract({...base,campaignId:'CD-example'});
 assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.skuInputs)&&Object.isFrozen(x.skuInputs.supplierFill));
 assert.equal(x.trace.plannedCampaignUnits,1000);
 assert.equal(x.trace.actualCampaignUnits,1300);
 assert.equal(x.plannedSampleOrders,200);
 assert.equal(x.actualSampleOrders,260);
 assert.equal(x.trace.scope,'sample-not-accounting');
 assert.equal(x.skuInputs.plannedOrders,200);
 assert.equal(x.skuInputs.actualOrders,260);
 assert.equal(x.skuInputs.receivingUnitCapacity,x.area.receivingCapacity);
 assert.equal(x.skuInputs.pickingUnitCapacity,x.area.pickingCapacity);
 assert.equal(x.skuInputs.transportUnitCapacity,x.area.stages[7].capacity);
 assert.equal(x.skuInputs.plannedForecastPercent,x.commercialForecast);
 assert.equal(x.skuInputs.planningCoveragePercent,x.planningCoverage);
 assert.deepEqual(Object.values(x.skuInputs.supplierFill),[x.supplierRate,x.supplierRate,x.supplierRate]);
 assert.throws(()=>{x.skuInputs.supplierFill.A=0},TypeError);
});

test('demand shock scales only SKU sample size, not frozen planning inputs',()=>{
 const nominal=campaignSkuContract({...base,scenario:{demand:1000,actualDemand:1000,lockUpstream:false}});
 const increased=campaignSkuContract({...base,scenario:{demand:1000,actualDemand:1500,lockUpstream:true}});
 const decreased=campaignSkuContract({...base,scenario:{demand:1000,actualDemand:500,lockUpstream:true}});
 for(const outcome of [increased,decreased]){
  assert.equal(outcome.skuInputs.plannedForecastPercent,nominal.skuInputs.plannedForecastPercent);
  assert.equal(outcome.skuInputs.planningCoveragePercent,nominal.skuInputs.planningCoveragePercent);
  assert.deepEqual(outcome.skuInputs.supplierFill,nominal.skuInputs.supplierFill);
  assert.equal(outcome.skuInputs.plannedOrders,nominal.skuInputs.plannedOrders);
 }
 assert.equal(increased.actualSampleOrders,300);
 assert.equal(decreased.actualSampleOrders,100);
});

test('warehouse limits, release choices and supplier late arrivals are mapped once',()=>{
 const opts={...base,policy:'lean',supplierDelay:true,actions:{receiving:100,picking:150,transport:100,quality:10}};
 const x=campaignSkuContract(opts);
 assert.deepEqual(x.skuInputs.delayDays,{A:8});
 assert.equal(x.skuInputs.qualityReleasePercent,100);
 assert.ok(x.skuInputs.receivingUnitCapacity>=100);
 assert.equal(x.skuInputs.transportUnitCapacity,x.area.stages[7].capacity);
 assert.ok(x.skuInputs.pickingUnitCapacity>0);
});

test('shared replay reconciles identical orders, receipts and purchase manifest across views',()=>{
 const c=campaignSkuContract({...base,campaignId:'CD-unique'});
 const inputs={...c.skuInputs,option:'combined',urgentArrivalDay:2,purchaseCoveragePercent:75};
 const comparison=recoveryComparison(inputs);
 const bridge=supplyBridge({...inputs,campaignId:c.campaignId,comparisonResult:comparison});
 const audit=skuAudit({...inputs,comparisonResult:comparison});
 assert.equal(bridge.campaign.campaignId,c.campaignId);
 assert.equal(bridge.campaign.passed,true);
 assert.equal(audit.passed,true);
 assert.equal(audit.recovery,comparison,'audit must reuse exact reference, not recompute');
 assert.equal(bridge.campaign.shipments.length,audit.orders.completed);
 assert.deepEqual(bridge.campaign.plan.originalPurchase,audit.recovery.originalPurchase);
 assert.equal(comparison.integrated.actual,comparison.base);
 assert.equal(comparison.integrated.planned.orders,c.plannedSampleOrders);
 assert.equal(bridge.procurementLedger.totals.waitingReceiving,comparison.recovered.waitingReceiving);
});

test('mismatched audit and bridge replays are rejected to prevent misleading reports',()=>{
 const c=campaignSkuContract(base);
 const x={...c.skuInputs,option:'emergency',urgentArrivalDay:1,purchaseCoveragePercent:100};
 const comparison=recoveryComparison(x);
 assert.throws(()=>supplyBridge({...x,option:'wait',comparisonResult:comparison}),/no coincide/);
 assert.throws(()=>skuAudit({...x,option:'wait',comparisonResult:comparison}),/no coincide/);
 assert.throws(()=>supplyBridge({...x,actualOrders:c.actualSampleOrders+1,comparisonResult:comparison}),/no coincide/);
});

test('contract rejects malformed campaign metadata without silently changing values',()=>{
 assert.throws(()=>campaignSkuContract({...base,campaignId:'bad id'}),/Identificador/);
 assert.throws(()=>campaignSkuContract({...base,plannedSampleOrders:0}),/muestra/);
 assert.throws(()=>campaignSkuContract({...base,plannedSampleOrders:1.5}),/muestra/);
 assert.throws(()=>campaignSkuContract({...base,policy:'unknown'}),/Política/);
});
