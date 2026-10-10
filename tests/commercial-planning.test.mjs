import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {integratedDemand} from '../src/integrated.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {freezeCommercialPlanning,commercialPlanningReading} from '../src/commercial-planning.js';

const plan={policy:'service',plannedOrders:200,plannedForecastPercent:80,planningCoveragePercent:70,actualOrders:280,stock:{A:150,B:90,C:55}};
const sum=x=>x.reduce((n,row)=>n+row.committedSkuUnits,0);

test('M3-06: forecast and purchasing cover a planned SKU cohort, never units from one shift',()=>{
 const x=integratedDemand(plan),p=x.planningCommitment;
 assert.equal(p.scope,'sku-cohort');
 assert.equal(p.commitmentStage,'before-demand-reveal');
 assert.equal(p.plannedOrders,200);
 assert.equal(p.forecastOrders,160);
 assert.equal(p.plannedForecastPercent,80);
 assert.equal(p.planningCoveragePercent,70);
 assert.equal(p.rows.length,3);
 assert.equal(p.totalCommittedSkuUnits,sum(p.rows));
 assert.equal(p.totalCommittedValueCLP,x.committedPurchaseValue);
 assert.deepEqual(Object.fromEntries(p.rows.map(r=>[r.skuId,r.committedSkuUnits])),x.purchase);
 assert.deepEqual(Object.fromEntries(p.rows.map(r=>[r.skuId,r.openingSkuUnits])),plan.stock);
 assert.equal(p.rows[0].purchaseOrderId,'PO-A');
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.rows)&&Object.isFrozen(p.rows[0]));
 assert.throws(()=>{p.rows[0].committedSkuUnits=9999},TypeError);
});

test('M3-06: under-, over- and accurate shocks change only actual demand, never the original plan',()=>{
 const a=integratedDemand({...plan,actualOrders:120});
 const b=integratedDemand({...plan,actualOrders:160});
 const c=integratedDemand({...plan,actualOrders:280});
 for(const x of [b,c]){
  assert.deepEqual(x.planningCommitment,a.planningCommitment);
  assert.deepEqual(x.originalPurchaseOrders,a.originalPurchaseOrders);
  assert.deepEqual(x.planned.deliveries,a.planned.deliveries);
  assert.deepEqual(x.purchase,a.purchase);
 }
 assert.equal(commercialPlanningReading(a.planningCommitment,{actualOrders:120,originalPurchaseOrders:a.originalPurchaseOrders}).forecastDirection,'over');
 assert.equal(commercialPlanningReading(b.planningCommitment,{actualOrders:160,originalPurchaseOrders:b.originalPurchaseOrders}).forecastDirection,'matched');
 const reading=commercialPlanningReading(c.planningCommitment,{actualOrders:280,originalPurchaseOrders:c.originalPurchaseOrders});
 assert.equal(reading.forecastDirection,'under');
 assert.equal(reading.varianceVsForecastOrders,120);
 assert.equal(reading.varianceVsPlannedOrders,80);
 assert.equal(reading.totalCommittedSkuUnits,a.planningCommitment.totalCommittedSkuUnits);
});

test('M3-06: each recovery option and the eight areas reuse the committed management plan',()=>{
 const choices=['wait','emergency','reserve','overtime','combined'];
 let reference=null;
 for(const option of choices){
  const cmp=recoveryComparison({...plan,option,reservePercent:option==='reserve'?20:0,urgentArrivalDay:2});
  const snapshot=campaignSnapshot({comparison:cmp,campaignId:'M3-06',plannedOrders:plan.plannedOrders});
  const areas=campaignAreaReadModel({comparison:cmp,campaign:snapshot,campaignId:'M3-06',plannedOrders:plan.plannedOrders});
  assert.equal(snapshot.passed,true);
  assert.equal(areas.passed,true);
  assert.equal(areas.checks.commercialPlanning,true);
  assert.equal(snapshot.plan.commercialPlanning,areas.commercialPlanning);
  assert.equal(snapshot.plan.commercialPlanning.forecastOrders,160);
  assert.equal(snapshot.plan.commercialPlanning.actualOrders,280);
  assert.equal(snapshot.plan.commercialPlanning.totalCommittedSkuUnits,areas.metrics.originalPurchaseSkuUnits);
  assert.equal(areas.stages[0].id,'commercial');
  assert.equal(areas.stages[0].scope,'plan');
  assert.equal(areas.stages[0].input,200);
  assert.equal(areas.stages[0].output,160);
  assert.equal(areas.stages[1].id,'planning');
  assert.equal(areas.stages[1].input,160);
  assert.equal(areas.stages[1].output,areas.metrics.originalPurchaseSkuUnits);
  assert.ok(areas.stages[1].causal.includes('varias unidades SKU'));
  if(reference)assert.deepEqual(cmp.planningCommitment,reference);
  reference=cmp.planningCommitment;
 }
});

test('M3-06: changing Commercial or Planning before shock legitimately changes committed purchases',()=>{
 const low=integratedDemand(plan);
 const high=integratedDemand({...plan,plannedForecastPercent:110,planningCoveragePercent:100});
 assert.equal(low.planningCommitment.forecastOrders,160);
 assert.equal(high.planningCommitment.forecastOrders,220);
 assert.notDeepEqual(low.planningCommitment.rows,high.planningCommitment.rows);
 assert.ok(high.planningCommitment.totalCommittedSkuUnits>low.planningCommitment.totalCommittedSkuUnits);
});

test('M3-06: read-only contract rejects forged forecast, coverage or original PO',()=>{
 const x=integratedDemand(plan),p=x.planningCommitment;
 const common={plannedOrders:plan.plannedOrders,forecastOrders:x.forecastOrders,plannedForecastPercent:plan.plannedForecastPercent,planningCoveragePercent:plan.planningCoveragePercent};
 const planPolicy={orders:x.forecastOrders,policy:'service',perSku:p.rows.map(r=>({
  id:r.skuId,stock:r.openingSkuUnits,ordered:r.policyNeedSkuUnits,targetUnits:r.targetSkuUnits,reorderPoint:0,unitCost:r.unitCostCLP
 }))};
 assert.throws(()=>freezeCommercialPlanning({...common,forecastOrders:999,planningPolicy:planPolicy,originalPurchaseOrders:x.originalPurchaseOrders}),/no concilian/);
 assert.throws(()=>freezeCommercialPlanning({...common,planningCoveragePercent:120,planningPolicy:planPolicy,originalPurchaseOrders:x.originalPurchaseOrders}),/no coincide/);
 const forgedPO={...x.originalPurchaseOrders,rows:x.originalPurchaseOrders.rows.map((po,i)=>i?po:{...po,orderedQty:po.orderedQty+1})};
 assert.throws(()=>commercialPlanningReading(p,{actualOrders:280,originalPurchaseOrders:forgedPO}),/no coincide/);
 const mismatch={...recoveryComparison(plan),planningCommitment:{...p,forecastOrders:180}};
 assert.throws(()=>campaignSnapshot({comparison:mismatch,campaignId:'M3-06',plannedOrders:200}),/no coincide/);
});

test('M3-06: Commercial/Planning SKU view matches the same adjusted eight-area campaign',()=>{
 for(const direction of [0,40,-40]){
  const contract=campaignSkuContract({
   campaignId:'M3-06-CAMPAIGN',policy:'service',
   decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
   scenario:{demand:1000,actualDemand:1000+direction*10,lockUpstream:true}
  });
  const cmp=recoveryComparison({...contract.skuInputs,option:'wait'});
  const campaign=campaignSnapshot({comparison:cmp,campaignId:contract.campaignId,plannedOrders:contract.plannedSampleOrders});
  const areas=campaignAreaReadModel({comparison:cmp,campaign,campaignId:contract.campaignId,plannedOrders:contract.plannedSampleOrders});
  assert.equal(campaign.plan.commercialPlanning.forecastOrders,160);
  assert.equal(campaign.plan.commercialPlanning.actualOrders,contract.actualSampleOrders);
  assert.equal(areas.commercialPlanning, campaign.plan.commercialPlanning);
  assert.equal(areas.checks.commercialPlanning,true);
 }
});
