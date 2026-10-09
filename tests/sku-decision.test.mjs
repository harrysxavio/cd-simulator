import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {createSkuRecoveryDecision,skuDecisionSignature,skuDecisionStatus} from '../src/sku-decision.js';

const contract=({decisions={...DEFAULTS,commercial:'under',planning:'partial',purchasing:'reliable'},actualDemand=1400,policy='service'}={})=>campaignSkuContract({
 decisions,scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand,lockUpstream:true},
 policy,plannedSampleOrders:200,campaignId:'CD-U2CASE'
});
const compare=(c,option='emergency',arrival=1,coverage=100)=>recoveryComparison({...c.skuInputs,option,urgentArrivalDay:arrival,purchaseCoveragePercent:coverage});

test('U2: 40% demand shock commits a separate physical PO without rewriting original SKU procurement',()=>{
 const c=contract(),preview=compare(c);
 const snapshot=campaignSnapshot({comparison:preview,campaignId:c.campaignId});
 assert.equal(preview.base.completed,139);
 assert.equal(preview.recovered.completed,279);
 const decision=createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'emergency',urgentArrivalDay:1,purchaseCoveragePercent:100,comparisonResult:preview});
 assert.equal(decision.action,'extraordinary-purchase');
 assert.deepEqual(decision.originalPurchase,{A:70,B:0,C:9});
 assert.equal(decision.orderedExtraUnits,247);
 assert.equal(decision.recoveredOrders,140);
 assert.equal(decision.receivedExtraUnits,247);
 assert.equal(decision.completedAfter+decision.pendingAfter,280);
 assert.equal(decision.urgentPurchaseOrders.length,3);
 assert.deepEqual(decision.urgentPurchaseOrders.map(p=>[p.skuId,p.quantity]),[['A',218],['B',22],['C',7]]);
 assert.ok(decision.urgentPurchaseOrders.every(po=>po.id.startsWith('CD-U2CASE-URG-')&&po.supplier.includes('no confirmado')));
 assert.ok(decision.urgentPurchaseOrders.every(po=>snapshot.purchaseOrders.some(p=>p.id===po.eventPurchaseOrderId&&p.orderedQty===po.quantity)));
 assert.ok(snapshot.receipts.every(r=>r.day>=snapshot.purchaseOrders.find(p=>p.id===r.purchaseOrderId).expectedArrivalDay));
 assert.equal(skuDecisionStatus({decision,contract:c}),'current');
 assert.ok(Object.isFrozen(decision)&&Object.isFrozen(decision.originalPurchase)&&Object.isFrozen(decision.urgentPurchaseOrders[0]));
 assert.equal(snapshot.passed,true);
});

test('U2: preview and confirm are separate; the decision can be reconstructed deterministically',()=>{
 const c=contract();
 const input={campaignId:c.campaignId,skuInputs:c.skuInputs,option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:50};
 const before=JSON.stringify(c);
 const d1=createSkuRecoveryDecision(input),d2=createSkuRecoveryDecision(input);
 assert.deepEqual(d1,d2);
 assert.equal(JSON.stringify(c),before);
 assert.equal(skuDecisionStatus({decision:JSON.parse(JSON.stringify(d1)),contract:c}),'current');
 assert.equal(d1.scenarioSignature,skuDecisionSignature(c));
 assert.equal(d1.completedAfter+d1.pendingAfter,280);
 assert.ok(d1.orderedExtraUnits>0&&d1.orderedExtraUnits<247);
});

test('U2: explicit wait commitment never purchases and preserves backlog',()=>{
 const c=contract(),preview=compare(c,'wait');
 const decision=createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'wait',comparisonResult:preview});
 assert.equal(decision.action,'wait-without-purchase');
 assert.deepEqual(decision.urgentPurchaseOrders,[]);
 assert.equal(decision.urgentOrderCommitmentCLP,0);
 assert.equal(decision.completedAfter,decision.completedBefore);
 assert.equal(decision.pendingAfter,decision.pendingBefore);
 assert.equal(skuDecisionStatus({decision,contract:c}),'current');
});

test('U2: late purchase records an obligation but no fictitious receipt or recovery',()=>{
 const c=contract(),preview=compare(c,'emergency',13);
 const decision=createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'emergency',urgentArrivalDay:13,purchaseCoveragePercent:100,comparisonResult:preview});
 assert.equal(decision.orderedExtraUnits,247);
 assert.equal(decision.receivedExtraUnits,0);
 assert.equal(decision.firstReceivedDay,null);
 assert.equal(decision.recoveredOrders,0);
 assert.ok(decision.urgentOrderCommitmentCLP>0);
 assert.ok(decision.urgentPurchaseOrders.every(x=>x.expectedArrivalDay>decision.horizonDays));
});

test('U2: receiving/quality/transport still limit an urgent PO after commitment',()=>{
 const c=contract();
 for(const constraints of [{receivingUnitCapacity:0},{qualityReleasePercent:0},{transportUnitCapacity:0}]){
  const params={...c.skuInputs,...constraints};
  const comparison=recoveryComparison({...params,option:'emergency',urgentArrivalDay:1,purchaseCoveragePercent:100});
  const decision=createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:params,option:'emergency',urgentArrivalDay:1,purchaseCoveragePercent:100,comparisonResult:comparison});
  assert.equal(decision.recoveredOrders,0,'A zero-capacity downstream step must stop recovery');
  assert.ok(decision.orderedExtraUnits>0);
  assert.ok(decision.receivedExtraUnits>=0);
 }
});

test('U2: a changed scenario is stale and a forged or mismatched comparison is rejected',()=>{
 const c=contract(),d=createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'emergency'});
 const changed=contract({actualDemand:1500});
 assert.equal(skuDecisionStatus({decision:d,contract:changed}),'stale');
 assert.equal(skuDecisionStatus({decision:{...d,campaignId:'CD-OTHER'},contract:c}),'stale');
 assert.equal(skuDecisionStatus({decision:{...d,orderedExtraUnits:-1},contract:c}),'invalid');
 assert.equal(skuDecisionStatus({decision:null,contract:c}),'none');
 assert.throws(()=>createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'combined'}),/aún no soportada/);
 assert.throws(()=>createSkuRecoveryDecision({campaignId:c.campaignId,skuInputs:c.skuInputs,option:'emergency',comparisonResult:compare(c,'wait')}),/diferente/);
});
