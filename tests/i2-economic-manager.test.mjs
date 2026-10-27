import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {i2EconomicEvidence,i2EconomicManagerReading} from '../src/i2-economic-manager.js';
import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmMultiRecovery,i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';

const seeds=['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'];
function revealed(seed,advanced=I2_DEFAULT_ADVANCED){
 let s=newI2GameState({seed,advanced});s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
const physical=(s,option='wait',urgentArrivalDay=2)=>i2MvpPhysicalResult({
 seed:s.seed,advanced:s.advanced,choices:s.choices,option,urgentArrivalDay
});
const evaluate=(s,selected,original)=>i2EconomicManagerReading({
 state:s,scorecard:i2SafeScorecard(selected),
 selected:selected.economicEvidence,original:original.economicEvidence
});
const sums=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);
test('I2-33: real audited V1 campaign for five seeds and all classic recovery choices',()=>{
 for(const seed of seeds){
  let s=revealed(seed);s=navigateI2GameState(s,'finish');
  const base=physical(s),stateJSON=JSON.stringify(s);
  for(const option of ['wait','overtime','reserve','emergency','combined']){
   const selected=physical(s,option),e=selected.economicEvidence;
   const view=evaluate(s,selected,base);
   assert.equal(e.kind,'i2-v1-economic-audit-evidence');
   assert.equal(e.source.includes('skuEconomicAuditReadModel'),true);
   assert.equal(view.kind,'i2-economic-manager-reading');
   assert.equal(view.original.baselineKey,view.selected.baselineKey);
   assert.equal(e.ordersShipped,selected.shippedOrders);
   assert.equal(e.illustrativeDispatchValueCLP-e.shippedMaterialStandardCostCLP-
    e.activatedExtraShiftsCLP,e.partialContributionCLP);
   assert.equal(e.openingStockValueCLP+e.receivedStockValueCLP,
    e.shippedMaterialStandardCostCLP+e.closingStockValueCLP);
   assert.equal(e.originalPurchaseCommitmentCLP,selected.committedPurchaseCLP);
   assert.equal(e.modeledIncrementalExpenseCLP,selected.incrementalExpenseCLP);
   assert.equal(e.activatedExtraShiftsCLP>=0,true);
   assert.equal(sums(e.days,'shippedOrders'),selected.shippedOrders);
   assert.equal(sums(e.days,'illustrativeDispatchValueCLP'),
    e.illustrativeDispatchValueCLP);
   assert.equal(sums(e.days,'shippedMaterialStandardCostCLP'),
    e.shippedMaterialStandardCostCLP);
   assert.equal(sums(e.days,'partialContributionCLP'),e.partialContributionCLP);
   assert.equal(sums(e.purchaseRows,'committedCLP'),e.originalPurchaseCommitmentCLP+
    e.urgentPurchaseCommitmentCLP);
   assert.equal(e.unknown.paidSupplierCLP,null);
   assert.equal(e.unknown.netProfitCLP,null);
   assert.equal(e.unknown.ebitdaCLP,null);
   assert.equal(e.unknown.personHours,null);
   assert.equal(Object.isFrozen(e),true);
   assert.equal(Object.isFrozen(e.days),true);
   assert.equal(Object.isFrozen(e.purchaseRows[0]),true);
   assert.equal(view.change.recoveredOrders,selected.recoveredOrders);
   assert.equal(view.change.costPerRecoveredOrderCLP,selected.recoveredOrders>0
    ?selected.incrementalExpenseCLP/selected.recoveredOrders:null);
   assert.equal(view.selected.urgentSurchargeCommitmentCLP>=0,true);
   assert.match(view.concepts.contribution,/expedido/);
  }
  assert.equal(JSON.stringify(s),stateJSON);
 }
});
test('I2-33: confirmed 0/1/2/3 levers use one audited V1 campaign for each replay',()=>{
 for(const seed of seeds){
  const g=revealed(seed,{...I2_DEFAULT_ADVANCED,reservePercent:25});
  for(const [buy,reserve,boost] of [[false,false,false],[true,false,false],
   [true,false,true],[true,true,true]]){
   const actions=i2NormalizeMultiRecovery({
    urgentPurchase:{enabled:buy,arrivalDay:2,coveragePercent:75},
    reserveTransfer:{enabled:reserve,releaseDay:2},
    capacityBoost:{enabled:boost}
   });
   const done=navigateI2GameState(i2ConfirmMultiRecovery(g,actions),'finish');
   const outcome=i2ConfirmedMultiOutcome(done);
   const baseline=physical(done);
   const e=outcome.economicEvidence;
   const view=i2EconomicManagerReading({state:done,scorecard:outcome.scorecard,
    selected:e,original:baseline.economicEvidence});
   assert.equal(view.selected.ordersShipped,outcome.reading.dispatchedOrders);
   assert.equal(view.change.incrementalExpenseCLP,outcome.reading.incrementalExpenseCLP);
   assert.equal(e.urgentPurchaseCommitmentCLP,outcome.reading.urgentPurchaseValueCLP);
   assert.equal(e.urgentSurchargeCommitmentCLP,outcome.reading.urgentSurchargeCLP);
   assert.equal(e.activatedExtraShiftsCLP,outcome.reading.extraCapacityCostCLP);
   assert.equal(view.change.recoveredOrders,outcome.reading.recoveredOrders);
   assert.equal(view.highlights.purchaseCommitmentExcludedFromContribution,true);
   assert.equal(view.highlights.extraShiftsOnlyWhenActivated,true);
   assert.equal(view.unknown.totalOperatingCostCLP,null);
  }
 }
});
test('I2-33: no-acting zero extra cost is not mislabeled as unit total cost',()=>{
 const s=navigateI2GameState(revealed('alpha-case-03'),'finish');
 const wait=physical(s),view=evaluate(s,wait,wait);
 assert.equal(view.change.recoveredOrders,0);
 assert.equal(view.change.costPerRecoveredOrderCLP,null);
 assert.equal(view.change.incrementalExpenseCLP,0);
 assert.equal(view.selected.activatedExtraShiftsCLP,0);
 assert.equal(view.selected.urgentPurchaseCommitmentCLP,0);
 assert.equal(view.change.partialContributionDeltaCLP,0);
});
test('I2-33: scenario changes, invalid payments or forged score are rejected',()=>{
 const g=revealed('alpha-case-04'),done=navigateI2GameState(g,'finish'),
  a=physical(done),b=physical(done,'combined');
 const score=i2SafeScorecard(b);
 assert.throws(()=>i2EconomicManagerReading({state:g,scorecard:score,
  selected:b.economicEvidence,original:a.economicEvidence}),/I2-33/);
 assert.throws(()=>i2EconomicManagerReading({state:done,scorecard:score,
  selected:{...b.economicEvidence,baselineKey:'tampered'},original:a.economicEvidence}),/I2-33/);
 assert.throws(()=>i2EconomicManagerReading({state:done,scorecard:score,
  selected:{...b.economicEvidence,originalPurchaseCommitmentCLP:999},
  original:a.economicEvidence}),/I2-33/);
 assert.throws(()=>i2EconomicManagerReading({state:done,scorecard:score,
  selected:b.economicEvidence,original:{...a.economicEvidence,modeledIncrementalExpenseCLP:1000}}),/I2-33/);
 assert.throws(()=>i2EconomicEvidence({campaign:{passed:true},comparison:{},baselineKey:'a'}),/I2-33/);
});
