import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {integratedDemand} from '../src/integrated.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {freezeOriginalPurchaseOrders,assertFrozenOriginalPurchases} from '../src/original-purchase.js';
import {createSkuRecoveryDecision,skuDecisionStatus} from '../src/sku-decision.js';

const plan={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70,delayDays:{A:8},supplierFill:{A:65,B:90,C:100}};
const snapshot=(option='wait',extra={})=>{
 const comparison=recoveryComparison({...plan,option,urgentArrivalDay:2,purchaseCoveragePercent:100,...extra});
 return {comparison,campaign:campaignSnapshot({comparison,campaignId:'M2-03',plannedOrders:200})};
};

test('M2-03: original PO IDs, ordered quantities, supplier dates and values are frozen before demand shock',()=>{
 const a=integratedDemand({...plan,actualOrders:120});
 const b=integratedDemand({...plan,actualOrders:340});
 assert.equal(a.originalPurchaseOrders.scope,'sku-cohort');
 assert.equal(a.originalPurchaseOrders.commitmentStage,'before-demand-reveal');
 assert.deepEqual(a.originalPurchaseOrders,b.originalPurchaseOrders);
 assert.ok(a.originalPurchaseOrders.rows.every(po=>po.id==='PO-'+po.skuId&&po.source==='original'));
 assert.ok(a.originalPurchaseOrders.rows.every(po=>Number.isInteger(po.expectedArrivalDay)));
 assert.equal(a.originalPurchaseOrders.committedValueCLP,a.committedPurchaseValue);
 assert.equal(a.originalPurchaseOrders.rows.reduce((n,po)=>n+po.orderedQty*po.unitCost,0),a.committedPurchaseValue);
 assert.equal(assertFrozenOriginalPurchases(a.originalPurchaseOrders,a.planned),true);
 assert.equal(assertFrozenOriginalPurchases(a.originalPurchaseOrders,b.actual),true);
 assert.ok(Object.isFrozen(a.originalPurchaseOrders)&&Object.isFrozen(a.originalPurchaseOrders.rows[0]));
 assert.throws(()=>{a.originalPurchaseOrders.rows[0].orderedQty=777},TypeError);
});

test('M2-03: original manifest is unchanged by reserve, overtime, urgent purchase or combined recovery',()=>{
 const choices=['wait','reserve','overtime','emergency','combined'];
 let first;
 for(const option of choices){
  const {comparison,campaign}=snapshot(option);
  assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
  const original=campaign.purchaseOrders.filter(x=>x.source==='original');
  assert.deepEqual(original,campaign.plan.originalPurchaseOrders);
  assert.equal(campaign.plan.originalPurchaseOrders.length,3);
  assert.deepEqual(original,comparison.originalPurchaseOrders.rows);
  assert.equal(comparison.originalPurchaseOrders,comparison.integrated.originalPurchaseOrders);
  assert.equal(assertFrozenOriginalPurchases(comparison.originalPurchaseOrders,comparison.recovered),true);
  if(first)assert.deepEqual(original,first,'a recovery must never rewrite the original supplier PO');
  first=original;
  if(option==='emergency'||option==='combined'){
   assert.ok(campaign.purchaseOrders.some(x=>x.source==='urgent'));
  }else assert.ok(!campaign.purchaseOrders.some(x=>x.source==='urgent'));
 }
});

test('M2-03: counterfeit receipt or altered due date is rejected by the campaign',()=>{
 const {comparison}=snapshot('emergency');
 const first=comparison.recovered.deliveries[0];
 const altered={...comparison,recovered:{...comparison.recovered,deliveries:comparison.recovered.deliveries.map((d,i)=>i?d:{...d,arrivalDay:d.arrivalDay+1})}};
 assert.throws(()=>campaignSnapshot({comparison:altered,campaignId:'M2-03',plannedOrders:200}),/compra original cambió/);
 const tampered={...comparison,originalPurchaseOrders:{...comparison.originalPurchaseOrders,rows:comparison.originalPurchaseOrders.rows.map((p,i)=>i? p:{...p,orderedQty:p.orderedQty+1})}};
 assert.throws(()=>campaignSnapshot({comparison:tampered,campaignId:'M2-03',plannedOrders:200}),/compra original cambió/);
 assert.equal(first.arrivalDay,comparison.recovered.deliveries[0].arrivalDay);
});

test('M2-03: invalid or duplicated plan rows cannot masquerade as committed POs',()=>{
 const p=integratedDemand(plan),o=p.originalPurchaseOrders;
 assert.throws(()=>freezeOriginalPurchaseOrders({planned:p.planned,purchase:{A:-1,B:0,C:0},committedValueCLP:0,plannedOrders:200,forecastOrders:p.forecastOrders}),/manifiesto|Compromiso/);
 assert.throws(()=>freezeOriginalPurchaseOrders({planned:p.planned,purchase:{...p.purchase,D:1},committedValueCLP:p.committedPurchaseValue,plannedOrders:200,forecastOrders:p.forecastOrders}),/manifiesto/);
 assert.throws(()=>freezeOriginalPurchaseOrders({planned:p.planned,purchase:p.purchase,committedValueCLP:p.committedPurchaseValue+1,plannedOrders:200,forecastOrders:p.forecastOrders}),/Valorización/);
 assert.throws(()=>assertFrozenOriginalPurchases(o,{...p.planned,deliveries:[p.planned.deliveries[0],p.planned.deliveries[0],p.planned.deliveries[2]]}),/duplicadas|cambió/);
});

test('M2-03: confirmed recovery retains original PO identities after JSON persistence',()=>{
 const c=campaignSkuContract({decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},scenario:{demand:1000,actualDemand:1400,lockUpstream:true},campaignId:'M2-03-RELOAD',policy:'service'});
 const d=createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'emergency',urgentArrivalDay:2});
 const restored=JSON.parse(JSON.stringify(d));
 assert.equal(skuDecisionStatus({decision:restored,contract:c}),'current');
 assert.equal(restored.originalPurchaseOrders.length,3);
 assert.ok(restored.originalPurchaseOrders.every(po=>po.id==='PO-'+po.skuId&&po.orderedQty===restored.originalPurchase[po.skuId]));
 assert.ok(Object.isFrozen(d.originalPurchaseOrders)&&Object.isFrozen(d.originalPurchaseOrders[0]));
 assert.equal(skuDecisionStatus({decision:{...restored,originalPurchaseOrders:restored.originalPurchaseOrders.map((po,i)=>i?po:{...po,orderedQty:-1})},contract:c}),'invalid');
 // Old valid v1 saved decisions remain loadable when PO details were absent.
 delete restored.originalPurchaseOrders;
 assert.equal(skuDecisionStatus({decision:restored,contract:c}),'current');
});
