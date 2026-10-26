import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_CHALLENGES} from '../src/i2-challenge-config.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2DefaultChoices,i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2ManagementDiagnosis} from '../src/i2-management-diagnosis.js';

function afterReveal(seed='alpha-case-01',plannedOrders=200){
 let s=newI2GameState({seed,advanced:{...I2_DEFAULT_ADVANCED,plannedOrders}});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
const build=(state,choices=state.choices,option='wait')=>
 i2MvpPhysicalResult({choices,seed:state.seed,advanced:state.advanced,option});

test('I2-27: cinco retos y tres tamaños concilian servicio, forecast y colas originales',()=>{
 for(const {seed} of I2_CHALLENGES)
 for(const plannedOrders of [160,200,240]){
  const state=afterReveal(seed,plannedOrders),baseline=build(state);
  const before=JSON.stringify({state,baseline});
  const model=i2ManagementDiagnosis(state,baseline);
  assert.equal(model.mode,'baseline-original-no-recovery');
  assert.equal(model.kpis.actualOrders,baseline.actualOrders);
  assert.equal(model.kpis.pendingOrders+model.kpis.dispatchedOrders,baseline.actualOrders);
  assert.equal(model.kpis.forecastVarianceOrders,baseline.actualOrders-baseline.commercial.forecastOrders);
  assert.equal(model.kpis.dispatchServicePercent,100*baseline.baselineShipped/baseline.actualOrders);
  assert.equal(model.economics.originalPurchaseCommitmentCLP,baseline.committedPurchaseCLP);
  assert.equal(model.economics.totalOperatingCostCLP,null);
  assert.equal(model.economics.incrementalExpenseCLP,0);
  assert.equal(model.queues.neverPreparedOrders+model.queues.preparedNotDispatchedOrders,model.kpis.pendingOrders);
  assert.equal(model.queues.waitingReceivingSkuUnits,baseline.receiving.totals.waitingAtCutoffSkuUnits);
  assert.equal(model.queues.heldQualitySkuUnits,baseline.quality.totals.heldAtCutoffSkuUnits);
  assert.equal(model.evidence.length,6);
  assert.deepEqual(model.signals,model.evidence.filter(x=>x.value>0).map(x=>x.id));
  assert.ok(model.evidence.every(x=>x.source&&x.guidance));
  assert.ok(Object.isFrozen(model)&&Object.isFrozen(model.evidence)&&Object.isFrozen(model.evidence[0]));
  assert.equal(JSON.stringify({state,baseline}),before);
 }
});
test('I2-27: diagnosis no usa recuperación para reescribir plan original',()=>{
 const state=afterReveal('alpha-case-04',240),base=build(state);
 const changed=build(state,state.choices,'emergency');
 const initial=i2ManagementDiagnosis(state,base);
 assert.throws(()=>i2ManagementDiagnosis(state,changed),/I2-27/);
 const changedState={...state,recovery:'emergency',arrivalDay:13,coverage:75};
 assert.deepEqual(i2ManagementDiagnosis(changedState,base),initial);
 assert.equal(initial.economics.originalPurchaseCommitmentCLP,base.committedPurchaseCLP);
});
test('I2-27: bloquea spoiler y entradas corruptas o mezclas de cohortes',()=>{
 let state=newI2GameState();
 assert.throws(()=>i2ManagementDiagnosis(state,{}),/I2-26|I2-27/);
 state=afterReveal('alpha-case-01',200);
 const original=build(state);
 assert.throws(()=>i2ManagementDiagnosis(state,{...original,seed:'alpha-case-05'}),/I2-27/);
 assert.throws(()=>i2ManagementDiagnosis(state,{...original,actualOrders:999}),/I2-27/);
 assert.throws(()=>i2ManagementDiagnosis(state,{...original,option:'emergency'}),/I2-27/);
 assert.throws(()=>i2ManagementDiagnosis(state,{...original,baselinePending:999}),/I2-27/);
 assert.throws(()=>i2ManagementDiagnosis(state,{...original,committedPurchaseCLP:999}),/I2-27/);
 assert.throws(()=>i2ManagementDiagnosis(state,{...original,
  picking:{...original.picking,totals:{...original.picking.totals,neverPreparedOrders:999}}
 }),/I2-27/);
});
test('I2-27: no convierte señales simultáneas en diagnósticos causales definitivos',()=>{
 const state=afterReveal('alpha-case-05',200),m=i2ManagementDiagnosis(state,build(state));
 assert.equal(m.coach.observation.includes('pedidos'),true);
 assert.match(m.boundary,/SIN recuperación/);
 assert.match(m.riskSummary,/señal|colas/i);
 assert.ok(m.hypotheses.length>=3);
 assert.ok(m.hypotheses.every(x=>x.includes('¿')));
 assert.match(m.coach.consumer,/no la entrega final/);
});
