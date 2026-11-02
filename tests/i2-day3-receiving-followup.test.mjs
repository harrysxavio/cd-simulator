import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2ConfirmDay3ReceivingFollowup} from '../src/i2-day3-receiving-followup.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2DailyOperationsSnapshot} from '../src/i2-daily-operations.js';
import {i2DatedOrdersForObservedDay} from '../src/i2-dated-operational-orders.js';
import {I2_RECEIVING_FOLLOWUP_SHIFT} from '../src/i2-receiving-shift.js';

function atDay3(eventSeed='ops-dock-01',response='wait'){
 let state=newI2GameState({seed:'alpha-case-04',eventSeed});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 state=navigateI2GameState(state,'reveal');
 state=i2ConfirmIncidentResponse(state,response);
 return normalizeI2GameState({
  ...state,...(eventSeed==='ops-combined-01'?{incidentStep:1}:{}),
  incidentViewDay:3
 });
}
const simulate=state=>i2CompareMultiRecovery({
 state,plans:[state.recoveryConfirmation.actions]
}).results[0];

test('I2-35.8a: autorizar en día 3 solo afecta día 4, sin mutar nada anterior',()=>{
 const state=atDay3(),before=simulate(state);
 const beforeDay3=i2DailyOperationsSnapshot(state);
 const updated=i2ConfirmDay3ReceivingFollowup(state);
 assert.equal(updated.receivingFollowupIssuedDay,3);
 assert.equal(updated.receivingResponse.day,4);
 assert.equal(updated.receivingResponse.shiftCostCLP,55000);
 assert.deepEqual(i2DailyOperationsSnapshot(updated),beforeDay3);
 const after=simulate(updated);
 assert.deepEqual(after.comparison.recovered.ledger.slice(0,4),
  before.comparison.recovered.ledger.slice(0,4),
  'Nunca tocar jornadas 0..3');
 assert.deepEqual(after.comparison.originalPurchaseOrders,
  before.comparison.originalPurchaseOrders);
 assert.equal(after.comparison.recovered.ledger[4].receivingShiftCostCLP,55000);
 assert.equal(after.reading.incrementalExpenseCLP-before.reading.incrementalExpenseCLP,55000);
 assert.equal(after.reading.actualOrders,before.reading.actualOrders);
 const orders=i2DatedOrdersForObservedDay(updated);
 assert.equal(orders.orders.length,1);
 assert.deepEqual([orders.orders[0].issuedDay,orders.orders[0].effectiveDay],
  [3,4]);
 assert.equal(orders.orders[0].status,'programada');
 assert.ok(Object.isFrozen(updated));
});

test('I2-35.8a: no permite segunda orden ni retroceder, tampoco evita elegir no intervenir',()=>{
 const state=atDay3();
 assert.equal(i2DatedOrdersForObservedDay(state).orders.length,0);
 const confirmed=i2ConfirmDay3ReceivingFollowup(state);
 assert.throws(()=>i2ConfirmDay3ReceivingFollowup(confirmed),/I2-35.8a/);
 const later=navigateI2GameState(confirmed,'advance-incident-day');
 assert.equal(later.incidentViewDay,4);
 assert.throws(()=>i2ConfirmDay3ReceivingFollowup(later),/I2-35.8a/);
 const oldShift=atDay3('ops-dock-01','dock-shift');
 assert.throws(()=>i2ConfirmDay3ReceivingFollowup(oldShift),/I2-35.8a/);
 const quality=atDay3('ops-quality-01');
 assert.equal(quality,null,'un día 3 sin incidente temprano no es una jornada válida');
});

test('I2-35.8a: el save exige la fecha de emisión real y sobrevive a recarga',()=>{
 const confirmed=i2ConfirmDay3ReceivingFollowup(atDay3());
 const tampered={...confirmed};delete tampered.receivingFollowupIssuedDay;
 assert.equal(normalizeI2GameState(tampered),null);
 assert.equal(normalizeI2GameState({...confirmed,receivingFollowupIssuedDay:2}),null);
 const memory=new Map(),storage={
  getItem:k=>memory.get(k)??null,
  setItem:(k,value)=>memory.set(k,value)
 };
 saveI2GameState(storage,confirmed);
 assert.deepEqual(loadI2GameState(storage),confirmed);
});

test('I2-35.8a: segundo incidente no borra turno tardío ni compra original',()=>{
 let state=i2ConfirmDay3ReceivingFollowup(atDay3('ops-combined-01','urgent-fast'));
 state=navigateI2GameState(state,'advance-incident-day');
 assert.equal(state.incidentStep,1);
 assert.equal(state.incidentViewDay,undefined);
 const committed=i2ConfirmNextIncidentResponse(state,'quality-bridge');
 assert.equal(committed.receivingFollowupIssuedDay,3);
 assert.equal(committed.receivingResponse.day,I2_RECEIVING_FOLLOWUP_SHIFT.day);
 assert.equal(committed.operationalResponse.day,5);
 const next=normalizeI2GameState({...committed,incidentViewDay:5});
 const orders=i2DatedOrdersForObservedDay(next);
 assert.deepEqual(orders.orders.map(x=>x.areaId),['purchasing','receiving','quality']);
 assert.deepEqual(orders.orders.map(x=>x.issuedDay),[2,3,4]);
 assert.ok(i2DailyOperationsSnapshot(next).qualityBridgeCostCLP>0);
});
