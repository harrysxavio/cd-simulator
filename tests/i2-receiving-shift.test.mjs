import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';
import {i2DailyOperationsSnapshot} from '../src/i2-daily-operations.js';
import {I2_RECEIVING_SHIFT,i2ValidateReceivingShift} from '../src/i2-receiving-shift.js';
import {i2OperationalEventsForSeed} from '../src/operational-event-schedule.js';

function atDock(eventSeed='ops-combined-01'){
 let state=newI2GameState({seed:'alpha-case-04',eventSeed});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'reveal');
}
test('I2-35.5c3d: Receiving commitment is frozen, dated and restricted to an observed dock event',()=>{
 assert.ok(Object.isFrozen(I2_RECEIVING_SHIFT));
 assert.deepEqual(i2ValidateReceivingShift(I2_RECEIVING_SHIFT,
  i2OperationalEventsForSeed('ops-combined-01')),I2_RECEIVING_SHIFT);
 for(const fake of [
  {...I2_RECEIVING_SHIFT,day:2},
  {...I2_RECEIVING_SHIFT,extraCapacitySkuUnits:500000},
  {...I2_RECEIVING_SHIFT,shiftCostCLP:0},
  {...I2_RECEIVING_SHIFT,kind:'dock-uncancel'},
  {...I2_RECEIVING_SHIFT,private:true}
 ])assert.throws(()=>i2ValidateReceivingShift(fake,
  i2OperationalEventsForSeed('ops-combined-01')),/I2-35.5c3d/);
 assert.throws(()=>i2ValidateReceivingShift(I2_RECEIVING_SHIFT,
  i2OperationalEventsForSeed('ops-quality-01')),/I2-35.5c3d/);
 assert.throws(()=>i2ConfirmIncidentResponse(atDock('ops-quality-01'),'dock-shift'),
  /Recepción no corresponde/);
});
test('I2-35.5c3d: SKU FIFO, PO, economics and past day 0–2 remain unchanged',()=>{
 const initial=atDock();
 const ignored=i2ConfirmIncidentResponse(initial,'wait');
 const response=i2ConfirmIncidentResponse(initial,'dock-shift');
 assert.deepEqual(response.receivingResponse,I2_RECEIVING_SHIFT);
 assert.deepEqual(response.recoveryConfirmation.actions,ignored.recoveryConfirmation.actions);
 const normal=i2CompareMultiRecovery({state:ignored,plans:[ignored.recoveryConfirmation.actions]});
 const extra=i2CompareMultiRecovery({state:response,plans:[response.recoveryConfirmation.actions]});
 const before=normal.results[0].comparison.recovered.ledger;
 const after=extra.results[0].comparison.recovered.ledger;
 for(let day=0;day<=2;day++)assert.deepEqual(after[day],before[day],
  'Recepción alteró una jornada anterior '+day);
 assert.equal(after[2].receivingStopped,true);
 assert.equal(after[2].receivingUsedSkuUnits,0);
 assert.deepEqual(extra.results[0].comparison.originalPurchaseOrders,
  normal.results[0].comparison.originalPurchaseOrders);
 assert.equal(extra.baselineKey,normal.baselineKey);
 assert.deepEqual(after[3].activeOperationalEvents,before[3].activeOperationalEvents);
 assert.equal(after[3].receivingShiftCostCLP,55000);
 assert.equal(after[3].receivingShiftExtraCapacitySkuUnits,80);
 assert.ok(after[3].receivingShiftUsedSkuUnits>=0);
 assert.ok(after[3].receivingShiftUsedSkuUnits<=80);
 assert.equal(after[2].receivingShiftCostCLP,undefined);
 assert.equal(after[4].receivingShiftCostCLP,undefined);
 assert.ok(after[3].receivingUsedSkuUnits>=before[3].receivingUsedSkuUnits);
 assert.equal(extra.results[0].reading.incrementalExpenseCLP,
  normal.results[0].reading.incrementalExpenseCLP+55000);
 assert.equal(extra.results[0].reading.receivingShiftCostCLP,55000);
 assert.equal(extra.results[0].reading.receivingShiftUsedSkuUnits,
  after[3].receivingShiftUsedSkuUnits);
 const report=i2ConfirmedMultiOutcome({...response,phase:'result'});
 assert.equal(report.economicEvidence.modeledReceivingShiftCLP,55000);
 assert.equal(report.reading.incrementalExpenseCLP,55000);
 assert.equal(report.scorecard.incrementalExpense.value,55000);
 const day3=i2DailyOperationsSnapshot({...response,incidentViewDay:3,incidentStep:1});
 assert.equal(day3.receivingShiftCostCLP,55000);
 assert.equal(day3.receivingShiftUsedSkuUnits,after[3].receivingShiftUsedSkuUnits);
 assert.doesNotMatch(JSON.stringify(day3),/originalPurchaseOrders|shiftCostCLP.*day.?12/i);
});
test('I2-35.5c3d: Receiving response survives second incident without overwriting first actions',()=>{
 let state=i2ConfirmIncidentResponse(atDock(),'dock-shift');
 state=normalizeI2GameState({...state,incidentStep:1,incidentViewDay:3});
 state=navigateI2GameState(state,'advance-incident-day');
 const final=i2ConfirmNextIncidentResponse(state,'quality-bridge');
 assert.deepEqual(final.receivingResponse,I2_RECEIVING_SHIFT);
 assert.equal(final.incidentSecondDecision,'quality-bridge');
 const result=i2ConfirmedMultiOutcome({...final,phase:'result'});
 assert.equal(result.reading.receivingShiftCostCLP,55000);
 assert.equal(result.reading.qualityBridgeCostCLP,70000);
 assert.equal(result.reading.incrementalExpenseCLP,125000);
});
test('I2-35.5c3d: save rejects forged future shift and retains legacy sessions',()=>{
 const state=i2ConfirmIncidentResponse(atDock('ops-dock-01'),'dock-shift');
 const store=new Map(),storage={
  setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null
 };
 saveI2GameState(storage,state);
 assert.deepEqual(loadI2GameState(storage),normalizeI2GameState(state));
 for(const forged of [
  {...state,receivingResponse:{...I2_RECEIVING_SHIFT,day:2}},
  {...state,receivingResponse:{...I2_RECEIVING_SHIFT,shiftCostCLP:10}},
  {...state,receivingResponse:{...I2_RECEIVING_SHIFT,extraCapacitySkuUnits:4000}},
  {...state,receivingResponse:undefined},
  {...atDock(),receivingResponse:I2_RECEIVING_SHIFT},
  {...state,eventSeed:'ops-quality-01'}
 ])assert.equal(normalizeI2GameState(forged),null);
 assert.equal(normalizeI2GameState(i2ConfirmIncidentResponse(atDock(),'wait'))
  .receivingResponse,undefined);
});
