import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuDecisionSignature,createSkuRecoveryDecision,skuDecisionStatus} from '../src/sku-decision.js';
import {skuDecisionPhysicalWitness} from '../src/sku-decision-witness.js';
import {serializeSession,deserializeSession} from '../src/session-state.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';

const ID='CD-M5-27';
const contract=()=>campaignSkuContract({
 campaignId:ID,policy:'service',plannedSampleOrders:200,
 decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
 scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,lockUpstream:true}
});
const prepare=(option,opts={})=>{
 const c=contract();
 const skuInputs={...c.skuInputs,reservePercent:20,...opts};
 const comparison=recoveryComparison({...skuInputs,option,
  urgentArrivalDay:opts.urgentArrivalDay??2,purchaseCoveragePercent:opts.purchaseCoveragePercent??100});
 const decision=createSkuRecoveryDecision({
  campaignId:ID,skuInputs,option,urgentArrivalDay:opts.urgentArrivalDay??2,
  purchaseCoveragePercent:opts.purchaseCoveragePercent??100,
  comparisonResult:comparison,confirmationVersion:2
 });
 return {c:{...c,skuInputs},comparison,decision};
};
test('M5-27: all five recovery options may be explicitly confirmed against the selected replay',()=>{
 for(const option of ['wait','reserve','overtime','emergency','combined']){
  const {c,comparison,decision}=prepare(option);
  assert.equal(decision.version,2);
  assert.equal(decision.option,option);
  assert.equal(decision.scenarioSignature,skuDecisionSignature(c));
  assert.equal(decision.physicalWitness.version,1);
  assert.match(decision.physicalWitness.scenarioDigest,/^[a-f0-9]{16}$/);
  assert.equal(decision.physicalWitness.baselineKey,comparison.baselineSnapshot.scenarioKey);
  assert.equal(decision.completedAfter,comparison.recovered.completed);
  assert.equal(decision.pendingAfter,comparison.recovered.pending);
  assert.equal(decision.incrementalExpenseCLP,comparison.incrementalExpense);
  assert.equal(decision.netCashDeltaCLP,comparison.netCashDelta);
  assert.equal(decision.economicProxyDeltaCLP,comparison.economicProxyDelta);
  assert.equal(skuDecisionStatus({decision,contract:c,comparison}),'current');
  assert.equal(skuDecisionStatus({decision,contract:c}),'invalid','v2 cannot be trusted without replay');
  assert.ok(Object.isFrozen(decision)&&Object.isFrozen(decision.physicalWitness));
  assert.equal(decision.completedAfter+decision.pendingAfter,comparison.recovered.orders);
  if(option==='combined'){
   assert.ok(decision.urgentPurchaseOrders.length>0);
   assert.ok(decision.operationalReinforcementCLP>0);
   assert.equal(decision.action,'urgent-purchase-plus-reinforcement');
  }
  if(option==='overtime'){
   assert.deepEqual(decision.urgentPurchaseOrders,[]);
   assert.equal(decision.orderedExtraUnits,0);
   assert.equal(decision.action,'capacity-reinforcement');
  }
  if(option==='reserve')assert.ok(decision.releasedReserveUnits>0);
 }
});
test('M5-27: v2 persistence survives JSON and reconstructs same physical result, not event ledger',()=>{
 const {c,comparison,decision}=prepare('combined');
 const session={schemaVersion:3,campaignId:ID,currentSection:'recovery',
  revealed:true,phase:'recover',shockDirection:1,scenario:{...DEFAULT_SCENARIO,demand:1000},
  skuRecovery:'combined',skuUrgentArrival:2,skuPurchaseCoverage:100,
  skuDecisions:[decision]};
 const saved=serializeSession(session);
 assert.ok(!saved.includes('ordersDetail'));
 assert.ok(!saved.includes('"ledger"'));
 const restore=deserializeSession(saved,{fallbackCampaignId:ID});
 assert.equal(restore.status,'restored');
 assert.deepEqual(restore.state.skuDecisions,[JSON.parse(JSON.stringify(decision))]);
 assert.equal(skuDecisionStatus({decision:restore.state.skuDecisions[0],contract:c,comparison}),'current');
 assert.equal(skuDecisionPhysicalWitness({comparison}).scenarioDigest,decision.physicalWitness.scenarioDigest);
});
test('M5-27: altered order count, real movement, date, price and scenario are rejected',()=>{
 const {c,comparison,decision}=prepare('combined');
 for(const update of [
  {completedAfter:decision.completedAfter+1},
  {pendingAfter:decision.pendingAfter+1},
  {incrementalExpenseCLP:decision.incrementalExpenseCLP+1},
  {netCashDeltaCLP:decision.netCashDeltaCLP+1},
  {operationalReinforcementCLP:decision.operationalReinforcementCLP+1},
  {urgentArrivalDay:3},
  {urgentPurchaseOrders:[]},
  {physicalWitness:{...decision.physicalWitness,scenarioDigest:'0000000000000000'}}
 ])assert.equal(skuDecisionStatus({decision:{...decision,...update},contract:c,comparison}),'invalid');
 const changed=recoveryComparison({...c.skuInputs,option:'combined',urgentArrivalDay:5,purchaseCoveragePercent:100});
 assert.equal(skuDecisionStatus({decision,contract:c,comparison:changed}),'invalid');
 const different={...c,skuInputs:{...c.skuInputs,actualOrders:c.skuInputs.actualOrders+1}};
 assert.equal(skuDecisionStatus({decision,contract:different,comparison}),'stale');
 const other={...c,campaignId:'CD-OTHER'};
 assert.equal(skuDecisionStatus({decision,contract:other,comparison}),'stale');
});
test('M5-27: v1 confirmations remain loadable, but combined only accepts v2',()=>{
 const {c,comparison}=prepare('combined');
 assert.throws(()=>createSkuRecoveryDecision({campaignId:ID,skuInputs:c.skuInputs,
  option:'combined',comparisonResult:comparison}),/aún no soportada/);
 const baseline=recoveryComparison({...c.skuInputs,option:'wait'});
 const legacy=createSkuRecoveryDecision({campaignId:ID,skuInputs:c.skuInputs,option:'wait',
  comparisonResult:baseline});
 assert.equal(legacy.version,1);
 assert.equal(skuDecisionStatus({decision:legacy,contract:c}),'current');
 const saved=serializeSession({campaignId:ID,skuDecisions:[legacy]});
 const out=deserializeSession(saved,{fallbackCampaignId:ID});
 assert.equal(out.state.skuDecisions[0].version,1);
});
