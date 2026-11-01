import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {i2IncidentDecisionCheckpoint,i2IncidentResponseActions,
 i2ConfirmIncidentResponse} from '../src/i2-incident-response.js';
import {i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';
import {i2CompareMultiRecovery,i2EmptyRecoveryActions} from '../src/i2-multi-recovery.js';

function ready(eventSeed,{reserve=false,seed='alpha-case-04'}={}){
 let s=newI2GameState({seed,eventSeed,
  advanced:reserve?{...I2_DEFAULT_ADVANCED,reservePercent:25}:I2_DEFAULT_ADVANCED});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}

test('I2-35.5c2: solo comunica la jornada del primer incidente, nunca el futuro',()=>{
 const state=ready('ops-combined-01');
 const before=JSON.stringify(state);
 const check=i2IncidentDecisionCheckpoint(state);
 assert.equal(check.status,'incident-observed');
 assert.equal(check.decisionDay,2);
 assert.equal(check.incidentKind,'receiving-stop');
 assert.ok(check.pendingOrdersAtDay>=0);
 assert.ok(check.waitingDockSkuUnits>=0);
 assert.ok(check.waitingQualitySkuUnits>=0);
 assert.ok(check.shippedOrdersToDate>=check.previousShippedOrders);
 assert.equal(check.reserveAvailable,false);
 assert.equal(check.nextDay,3);
 assert.equal(check.conservativeDay,5);
 assert.doesNotMatch(JSON.stringify(check),/quality-stop|EVT-QUALITY|day.?12.?completed/);
 assert.equal(JSON.stringify(state),before);
 assert.ok(Object.isFrozen(check));
 const quality=i2IncidentDecisionCheckpoint(ready('ops-quality-01'));
 assert.equal(quality.incidentKind,'quality-stop');
 assert.equal(quality.decisionDay,4);
 assert.throws(()=>i2IncidentDecisionCheckpoint(newI2GameState()),/I2-35.5c2/);
});

test('I2-35.5c2: compra tardía y rápida solo empiezan DESPUÉS de observar',()=>{
 const state=ready('ops-quality-01');
 const checkpoint=i2IncidentDecisionCheckpoint(state);
 for(const kind of ['wait','urgent-fast','urgent-conservative']){
  const a=i2IncidentResponseActions(state,kind);
  assert.equal(a.capacityBoost.enabled,false);
  if(a.urgentPurchase.enabled)
   assert.ok(a.urgentPurchase.arrivalDay>checkpoint.decisionDay);
  else assert.equal(kind,'wait');
  assert.equal(a.reserveTransfer.enabled,false);
 }
 assert.equal(i2IncidentResponseActions(state,'urgent-fast').urgentPurchase.arrivalDay,5);
 assert.equal(i2IncidentResponseActions(state,'urgent-conservative').urgentPurchase.arrivalDay,7);
 assert.throws(()=>i2IncidentResponseActions(state,'reserve-next'),/reserva/);
 assert.throws(()=>i2IncidentResponseActions(state,'buy-and-reserve'),/reserva/);
 assert.throws(()=>i2IncidentResponseActions(state,'overtime'),/desconocida/);
});

test('I2-35.5c2: una orden fechada preserva PO, incidente, física y un único baseline',()=>{
 for(const seed of ['ops-dock-01','ops-quality-01','ops-combined-01']){
  const s=ready(seed,{reserve:true});
  const checkpoint=i2IncidentDecisionCheckpoint(s);
  const pre=i2CompareMultiRecovery({state:s,plans:[i2EmptyRecoveryActions()]});
  for(const kind of ['wait','urgent-fast','urgent-conservative','reserve-next','buy-and-reserve']){
   const confirmed=i2ConfirmIncidentResponse(s,kind);
   assert.ok(Object.isFrozen(confirmed));
   assert.equal(confirmed.eventSeed,seed);
   assert.equal(confirmed.recoveryConfirmation.actions.capacityBoost.enabled,false);
   const action=confirmed.recoveryConfirmation.actions;
   if(action.urgentPurchase.enabled)
    assert.ok(action.urgentPurchase.arrivalDay>checkpoint.decisionDay);
   if(action.reserveTransfer.enabled)
    assert.ok(action.reserveTransfer.releaseDay>checkpoint.decisionDay);
   assert.equal(confirmed.recoveryConfirmation.baselineKey,pre.baselineKey);
   const result=i2ConfirmedMultiOutcome({...confirmed,phase:'result'});
   assert.equal(result.reading.actualOrders,pre.baseline.actualOrders);
   assert.equal(result.event.baselineKey,pre.baselineKey);
   assert.equal(result.scorecard.shippedOrders.value+result.scorecard.pendingOrders.value,
    result.scorecard.actualOrders.value);
   assert.equal(result.reading.originalPurchaseCommitmentCLP,
    pre.baselineComparison.committedPurchaseValue);
   // A purchase or reserve move issued after the incident MUST NOT
   // change any earlier day in the canonical physical journal.
   const scenario=i2CompareMultiRecovery({state:s,plans:[action]});
   const ledger=scenario.results[0].comparison.recovered.ledger;
   for(let day=0;day<=checkpoint.decisionDay;day++)
    assert.deepEqual(ledger[day],pre.baseline.integrated.actual.ledger[day],
     'retroactive physical mutation on day '+day+' for '+kind);
  }
 }
});

test('I2-35.5c2: sin incidente no se habilita una respuesta exógena',()=>{
 const s=ready('ops-dock-01');
 const noEvent={...s};delete noEvent.eventSeed;
 assert.throws(()=>i2ConfirmIncidentResponse(noEvent,'wait'),/I2-35.5c2/);
});
