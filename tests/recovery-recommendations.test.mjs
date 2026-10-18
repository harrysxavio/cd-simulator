import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {consolidatedRecoveryComparisonReadModel} from '../src/recovery-consolidated.js';
import {evidenceBasedRecoveryRecommendationsReadModel} from '../src/recovery-recommendations.js';

const standard={policy:'service',plannedOrders:200,actualOrders:280,days:12,
 plannedForecastPercent:80,planningCoveragePercent:70,reservePercent:20};
const zeroStock={A:0,B:0,C:0};
const make=(changes={},selectedOption='combined',urgentArrivalDay=2)=>{
 const i={...standard,...changes},baseline=createRecoveryBaseline(i);
 const comparisons=['wait','reserve','overtime','emergency','combined'].map(option=>
  recoveryComparison({...i,option,urgentArrivalDay,
   purchaseCoveragePercent:100,baselineSnapshot:baseline}));
 const summary=consolidatedRecoveryComparisonReadModel({comparisons,selectedOption});
 return {baseline,comparisons,summary};
};

test('M6-31: recommendation reads the same five reconciled alternatives without replaying',()=>{
 const {baseline,summary}=make();
 const before=JSON.stringify(baseline);
 const guidance=evidenceBasedRecoveryRecommendationsReadModel({comparison:summary});
 assert.equal(guidance.passed,true);
 assert.equal(guidance.type,'conditional-recovery-guidance');
 assert.equal(guidance.baselineKey,baseline.scenarioKey);
 assert.equal(guidance.alternatives.length,5);
 assert.deepEqual(guidance.alternatives.map(x=>x.option),['wait','reserve','overtime','emergency','combined']);
 assert.equal(guidance.baseline.dispatched,summary.baseline.completed);
 assert.ok(Object.values(guidance.checks).every(Boolean));
 assert.ok(guidance.alternatives.every(x=>x.dispatched+x.pending===summary.demandOrders));
 assert.equal(JSON.stringify(baseline),before);
 assert.equal(guidance.guardrails.operationalExecutionValidated,false);
 assert.equal(guidance.guardrails.customerDeliveriesMeasured,false);
 assert.ok(Object.isFrozen(guidance)&&Object.isFrozen(guidance.alternatives[1]));
 assert.throws(()=>{guidance.alternatives[0].pending=99},TypeError);
});

test('M6-31: service lens prioritizes actual shipped orders and waiting days, not economic proxy',()=>{
 const {summary}=make();
 const guidance=evidenceBasedRecoveryRecommendationsReadModel({comparison:summary,priority:'service'});
 const improving=guidance.alternatives.filter(x=>x.gainedOrders>0);
 if(improving.length){
  assert.equal(guidance.outcome,'conditional-recommendation');
  const max=Math.max(...improving.map(x=>x.dispatched));
  assert.equal(guidance.recommended.dispatched,max);
  const minBacklog=Math.min(...improving.filter(x=>x.dispatched===max).map(x=>x.backlogOrderDays));
  assert.equal(guidance.recommended.backlogOrderDays,minBacklog);
 }else{
  assert.equal(guidance.outcome,'no-observed-gain');
  assert.equal(guidance.recommendedOption,'wait');
 }
 assert.equal(guidance.alternatives.find(x=>x.option==='reserve').costCoverage,
  'unpriced-reserve-transfer');
 assert.equal(guidance.alternatives.find(x=>x.option==='reserve').fullIncrementalCostCLP,null);
});

test('M6-31: minimum commitment excludes unpriced reserve from financial leadership',()=>{
 const {summary}=make();
 const rec=evidenceBasedRecoveryRecommendationsReadModel({comparison:summary,priority:'commitments'});
 const comparable=rec.alternatives.filter(x=>
  x.gainedOrders>0&&x.costCoverage==='partially-modeled');
 if(comparable.length){
  assert.equal(rec.outcome,'conditional-recommendation');
  assert.notEqual(rec.recommendedOption,'reserve');
  assert.equal(rec.recommended.modeledCommitmentCLP,
   Math.min(...comparable.map(x=>x.modeledCommitmentCLP)));
 }else if(rec.optionsWithObservedGain){
  assert.equal(rec.outcome,'cost-information-insufficient');
  assert.equal(rec.recommended,null);
 }else{
  assert.equal(rec.recommendedOption,'wait');
 }
 assert.equal(rec.guardrails.fullCostKnown,false);
 assert.equal(rec.alternatives[0].costCoverage,'no-new-modeled-intervention');
 assert.equal(rec.alternatives.find(x=>x.option==='reserve').executionFeasibility,'not-verified');
});

test('M6-31: no improved shipments -> wait, even when urgent PO adds commitment',()=>{
 const {summary}=make({stock:zeroStock,receivingUnitCapacity:0,
  qualityReleasePercent:0,days:3,actualOrders:260},'emergency');
 for(const priority of ['service','commitments']){
  const rec=evidenceBasedRecoveryRecommendationsReadModel({comparison:summary,priority});
  assert.equal(rec.outcome,'no-observed-gain');
  assert.equal(rec.recommendedOption,'wait');
  assert.equal(rec.optionsWithObservedGain,0);
  assert.equal(rec.recommended.modeledCommitmentCLP,0);
  assert.ok(rec.alternatives.find(x=>x.option==='emergency').modeledCommitmentCLP>0);
 }
});

test('M6-31: late emergency PO is not a service recommendation on time-insensitive total',()=>{
 const {summary}=make({stock:zeroStock,supplierFill:{A:0,B:0,C:0},
  actualOrders:260,days:2},'emergency',13);
 const rec=evidenceBasedRecoveryRecommendationsReadModel({comparison:summary});
 const urgent=rec.alternatives.find(x=>x.option==='emergency');
 assert.equal(urgent.gainedOrders,0);
 assert.ok(urgent.urgentPurchaseCommitmentCLP>0);
 assert.equal(urgent.customerDeliveryVerified,false);
});

test('M6-31: rejects missing audit, false checks and malformed monetary claims',()=>{
 const {summary}=make({days:3});
 const bad=patch=>assert.throws(()=>
  evidenceBasedRecoveryRecommendationsReadModel({comparison:patch}),
  /Recomendación SKU/);
 bad({...summary,passed:false});
 bad({...summary,checks:{...summary.checks,sameOriginalPurchaseManifest:false}});
 bad({...summary,alternatives:summary.alternatives.slice(0,4)});
 bad({...summary,alternatives:summary.alternatives.map(x=>({...x,
  pendingOrders:x.pendingOrders+1}))});
 bad({...summary,alternatives:summary.alternatives.map(x=>
  x.option==='emergency'?{...x,incrementalCommitmentAndCostProxyCLP:-1}:x)});
 assert.throws(()=>evidenceBasedRecoveryRecommendationsReadModel({
  comparison:summary,priority:'economic-max'
 }),/Recomendación SKU/);
});
