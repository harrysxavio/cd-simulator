import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2ConfirmDay3ReceivingFollowup} from '../src/i2-day3-receiving-followup.js';
import {i2Day3UrgentPurchaseQuote,i2ConfirmDay3UrgentPurchase} from '../src/i2-day3-urgent-purchase.js';
import {i2DailyOperationsSnapshot} from '../src/i2-daily-operations.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2DatedOrdersForObservedDay} from '../src/i2-dated-operational-orders.js';

function day3(eventSeed='ops-dock-01',option='wait'){
 let state=newI2GameState({seed:'alpha-case-04',eventSeed});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 state=navigateI2GameState(state,'reveal');
 state=i2ConfirmIncidentResponse(state,option);
 return normalizeI2GameState({...state,
  ...(eventSeed==='ops-combined-01'?{incidentStep:1}:{}),
  incidentViewDay:3});
}
const run=state=>i2CompareMultiRecovery({
 state,plans:[state.recoveryConfirmation.actions]
}).results[0];

test('I2-35.8b: compra día 3 para día 4, costo SKU y causalidad física auditados',()=>{
 const original=day3(),before=run(original);
 const observed=i2DailyOperationsSnapshot(original);
 const quote=i2Day3UrgentPurchaseQuote(original);
 assert.ok(quote.skuUnits>0);
 assert.ok(quote.totalCLP>0);
 const next=i2ConfirmDay3UrgentPurchase(original);
 assert.equal(next.urgentFollowupIssuedDay,3);
 assert.equal(next.recoveryConfirmation.actions.urgentPurchase.arrivalDay,4);
 assert.deepEqual(i2DailyOperationsSnapshot(next),observed);
 const after=run(next);
 assert.deepEqual(after.comparison.recovered.ledger.slice(0,4),
  before.comparison.recovered.ledger.slice(0,4));
 assert.deepEqual(after.comparison.originalPurchaseOrders,
  before.comparison.originalPurchaseOrders);
 assert.equal(after.reading.urgentPurchaseValueCLP,quote.purchaseCLP);
 assert.equal(after.reading.urgentSurchargeCLP,quote.surchargeCLP);
 assert.equal(after.reading.incrementalExpenseCLP-before.reading.incrementalExpenseCLP,
  quote.totalCLP);
 assert.equal(after.reading.actualOrders,before.reading.actualOrders);
 assert.deepEqual(i2DatedOrdersForObservedDay(next).orders.map(x=>[x.areaId,x.issuedDay,x.effectiveDay]),
  [['purchasing',3,4]]);
});

test('I2-35.8b: conserva intervención de Recepción y usa motor combinado',()=>{
 const base=i2ConfirmDay3ReceivingFollowup(day3());
 const quote=i2Day3UrgentPurchaseQuote(base);
 const next=i2ConfirmDay3UrgentPurchase(base);
 assert.equal(next.receivingFollowupIssuedDay,3);
 assert.equal(next.receivingResponse.day,4);
 const before=run(base),after=run(next);
 assert.deepEqual(before.comparison.recovered.ledger.slice(0,4),
  after.comparison.recovered.ledger.slice(0,4));
 assert.equal(after.reading.incrementalExpenseCLP-before.reading.incrementalExpenseCLP,
  quote.totalCLP);
 assert.deepEqual(i2DatedOrdersForObservedDay(next).orders.map(x=>x.areaId),
  ['purchasing','receiving']);
});

test('I2-35.8b: no admite compra duplicada, adelantada ni evento ajeno',()=>{
 assert.throws(()=>i2ConfirmDay3UrgentPurchase(day3('ops-dock-01','urgent-fast')),
  /I2-35.8b/);
 const first=i2ConfirmDay3UrgentPurchase(day3());
 assert.throws(()=>i2ConfirmDay3UrgentPurchase(first),/I2-35.8b/);
 const later=navigateI2GameState(first,'advance-incident-day');
 assert.throws(()=>i2ConfirmDay3UrgentPurchase(later),/I2-35.8b/);
 assert.equal(day3('ops-quality-01'),null);
});

test('I2-35.8b: marcador autorizado persiste y rechaza falsificación básica',()=>{
 const saved=i2ConfirmDay3UrgentPurchase(day3());
 const removed={...saved};delete removed.urgentFollowupIssuedDay;
 // Sin marcador es una compra válida genérica de recuperación; la bitácora
 // no debe fingir que fue emitida día 3.
 assert.equal(i2DatedOrdersForObservedDay(normalizeI2GameState(removed)).orders[0].issuedDay,2);
 assert.equal(normalizeI2GameState({...saved,urgentFollowupIssuedDay:2}),null);
 assert.equal(normalizeI2GameState({...saved,incidentViewDay:2}),null);
 assert.equal(normalizeI2GameState({...saved,recoveryConfirmation:{
  ...saved.recoveryConfirmation,actions:{
   ...saved.recoveryConfirmation.actions,
   urgentPurchase:{enabled:true,arrivalDay:5,coveragePercent:100}
  }
 }}),null);
 const memory=new Map(),storage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,value)
 };
 saveI2GameState(storage,saved);
 assert.deepEqual(loadI2GameState(storage),saved);
});

test('I2-35.8b: compra emitida día 3 no desaparece ante segundo incidente Calidad',()=>{
 let state=i2ConfirmDay3UrgentPurchase(day3('ops-combined-01'));
 state=navigateI2GameState(state,'advance-incident-day');
 const next=i2ConfirmNextIncidentResponse(state,'quality-bridge');
 assert.equal(next.urgentFollowupIssuedDay,3);
 assert.equal(next.recoveryConfirmation.actions.urgentPurchase.arrivalDay,4);
 assert.equal(next.operationalResponse.day,5);
 const observed=normalizeI2GameState({...next,incidentViewDay:5});
 const orders=i2DatedOrdersForObservedDay(observed).orders;
 assert.deepEqual(orders.map(x=>[x.areaId,x.issuedDay]),
  [['purchasing',3],['quality',4]]);
});
