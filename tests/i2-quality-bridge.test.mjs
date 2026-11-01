import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,
 loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';
import {i2DailyOperationsSnapshot} from '../src/i2-daily-operations.js';
import {I2_QUALITY_BRIDGE,i2ValidateQualityBridge} from '../src/i2-quality-bridge.js';
import {i2OperationalEventsForSeed} from '../src/operational-event-schedule.js';

function atDay4(first='wait'){
 let s=newI2GameState({seed:'alpha-case-04',eventSeed:'ops-combined-01'});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 s=navigateI2GameState(s,'reveal');
 s=i2ConfirmIncidentResponse(s,first);
 s=normalizeI2GameState({...s,incidentStep:1,incidentViewDay:3});
 s=navigateI2GameState(s,'advance-incident-day');
 assert.equal(s.incidentViewDay,undefined);
 return s;
}
test('I2-35.5c3c: bridge is one immutable bounded dated cost commitment',()=>{
 assert.ok(Object.isFrozen(I2_QUALITY_BRIDGE));
 assert.deepEqual(i2ValidateQualityBridge(I2_QUALITY_BRIDGE,
  i2OperationalEventsForSeed('ops-combined-01')),I2_QUALITY_BRIDGE);
 for(const value of [
  {...I2_QUALITY_BRIDGE,day:4},
  {...I2_QUALITY_BRIDGE,capacitySkuUnits:100000},
  {...I2_QUALITY_BRIDGE,shiftCostCLP:0},
  {...I2_QUALITY_BRIDGE,kind:'close-quality-stop'},
  {...I2_QUALITY_BRIDGE,admin:true}
 ])assert.throws(()=>i2ValidateQualityBridge(value,
  i2OperationalEventsForSeed('ops-combined-01')),/I2-35.5c3c/);
 assert.throws(()=>i2ValidateQualityBridge(I2_QUALITY_BRIDGE,
  i2OperationalEventsForSeed('ops-dock-01')),/I2-35.5c3c/);
});

test('I2-35.5c3c: second Quality shift never changes day 0–4, old POs or external stop',()=>{
 for(const first of ['wait','urgent-fast','urgent-conservative']){
  const state=atDay4(first);
  const before=i2CompareMultiRecovery({
   state,plans:[state.recoveryConfirmation.actions]
  });
  const noBridge=i2ConfirmNextIncidentResponse(state,'hold');
  const bridge=i2ConfirmNextIncidentResponse(state,'quality-bridge');
  assert.equal(bridge.incidentSecondDecision,'quality-bridge');
  assert.deepEqual(bridge.operationalResponse,I2_QUALITY_BRIDGE);
  assert.deepEqual(bridge.incidentFirstActions,state.recoveryConfirmation.actions);
  assert.deepEqual(bridge.recoveryConfirmation.actions,noBridge.recoveryConfirmation.actions);
  const recovered=i2CompareMultiRecovery({
   state:bridge,plans:[bridge.recoveryConfirmation.actions]
  });
  const baseline=i2CompareMultiRecovery({
   state:noBridge,plans:[noBridge.recoveryConfirmation.actions]
  });
  const actual=recovered.results[0].comparison.recovered.ledger;
  const original=before.results[0].comparison.recovered.ledger;
  for(let day=0;day<=4;day++){
   assert.deepEqual(actual[day],original[day],'retroactive change day '+day);
   assert.deepEqual(actual[day],baseline.results[0].comparison.recovered.ledger[day]);
  }
  assert.equal(actual[4].qualityStopped,true);
  assert.equal(actual[5].qualityStopped,true,'main Quality line must remain stopped');
  assert.deepEqual(actual[5].activeOperationalEvents,
   baseline.results[0].comparison.recovered.ledger[5].activeOperationalEvents);
  assert.equal(actual[5].qualityBridgeCostCLP,I2_QUALITY_BRIDGE.shiftCostCLP);
  assert.ok(actual[5].qualityBridgeReleasedSkuUnits>=0);
  assert.ok(actual[5].qualityBridgeReleasedSkuUnits<=I2_QUALITY_BRIDGE.capacitySkuUnits);
  assert.equal(actual[5].qualityBridgeCapacitySkuUnits,I2_QUALITY_BRIDGE.capacitySkuUnits);
  assert.equal(actual[4].qualityBridgeCostCLP,0);
  assert.equal(actual[6].qualityBridgeCostCLP,0);
  assert.equal(recovered.baselineKey,before.baselineKey);
  assert.deepEqual(recovered.results[0].comparison.originalPurchaseOrders,
   before.results[0].comparison.originalPurchaseOrders);
  const reading=recovered.results[0].reading;
  const no=baseline.results[0].reading;
  assert.equal(reading.qualityBridgeCostCLP,70000);
  assert.equal(reading.incrementalExpenseCLP-no.incrementalExpenseCLP,70000);
  assert.equal(reading.dispatchedOrders+reading.pendingOrders,reading.actualOrders);
  assert.equal(reading.qualityBridgeReleasedSkuUnits,
   actual[5].qualityBridgeReleasedSkuUnits);
  const outcome=i2ConfirmedMultiOutcome({...bridge,phase:'result'});
  assert.equal(outcome.scorecard.incrementalExpense.value,reading.incrementalExpenseCLP);
  assert.equal(outcome.reading.qualityBridgeCostCLP,70000);
  const day5=normalizeI2GameState({...bridge,incidentViewDay:5});
  const observable=i2DailyOperationsSnapshot(day5);
  assert.equal(observable.day,5);
  assert.equal(observable.qualityBridgeCostCLP,70000);
  assert.equal(observable.qualityBridgeReleasedSkuUnits,actual[5].qualityBridgeReleasedSkuUnits);
  assert.doesNotMatch(JSON.stringify(observable),/originalPurchaseOrders|day.?12.?shipped/i);
 }
});

test('I2-35.5c3c: state persistence accepts only authentic day5 bridge response',()=>{
 const at4=atDay4('urgent-fast');
 const bridge=i2ConfirmNextIncidentResponse(at4,'quality-bridge');
 const safe=normalizeI2GameState({...bridge,incidentViewDay:5});
 const memory=new Map();
 const storage={getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,value)};
 saveI2GameState(storage,safe);
 assert.deepEqual(loadI2GameState(storage),safe);
 for(const fake of [
  {...bridge,operationalResponse:{...bridge.operationalResponse,day:4}},
  {...bridge,operationalResponse:{...bridge.operationalResponse,shiftCostCLP:1}},
  {...bridge,operationalResponse:{...bridge.operationalResponse,capacitySkuUnits:900}},
  {...bridge,operationalResponse:undefined},
  {...bridge,incidentSecondDecision:'hold'},
  {...at4,operationalResponse:I2_QUALITY_BRIDGE}
 ])assert.equal(normalizeI2GameState(fake),null);
 assert.throws(()=>i2ConfirmNextIncidentResponse(bridge,'quality-bridge'),/no habilitado/);
});

test('I2-35.5c3c: V1 and ordinary incident choices never gain a Quality charge',()=>{
 const initial=atDay4();
 const normal=i2ConfirmNextIncidentResponse(initial,'hold');
 const result=i2CompareMultiRecovery({
  state:normal,plans:[normal.recoveryConfirmation.actions]
 });
 assert.equal(result.results[0].reading.qualityBridgeCostCLP,0);
 assert.equal(result.results[0].reading.qualityBridgeReleasedSkuUnits,0);
 assert.equal(normal.operationalResponse,undefined);
});
