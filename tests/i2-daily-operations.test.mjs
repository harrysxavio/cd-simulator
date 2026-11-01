import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,loadI2GameState,
 saveI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2DailyOperationsSnapshot} from '../src/i2-daily-operations.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';

function ready(seed){
 let state=newI2GameState({seed:'alpha-case-04',eventSeed:seed});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'reveal');
}
function firstResponse(seed,kind='wait'){
 const prepared=ready(seed),first=i2ConfirmIncidentResponse(prepared,kind);
 return normalizeI2GameState({
  ...first,...(seed==='ops-combined-01'?{incidentStep:1}:{}),
  incidentViewDay:seed==='ops-quality-01'?5:3
 });
}

test('I2-35.5c3b: day-3 journal reflects first commitment but no future incident',()=>{
 const state=firstResponse('ops-combined-01','urgent-fast');
 const reading=i2DailyOperationsSnapshot(state);
 const physical=i2CompareMultiRecovery({
  state,plans:[state.recoveryConfirmation.actions]
 }).results[0].comparison.recovered.ledger[3];
 assert.equal(reading.day,3);
 assert.equal(reading.shippedOrdersToDate,physical.completed);
 assert.equal(reading.newlyShippedOrders,physical.shipped);
 assert.equal(reading.pendingOrders,physical.backlog);
 assert.equal(reading.waitingDockSkuUnits,physical.waitingReceiving);
 assert.equal(reading.waitingQualitySkuUnits,physical.waitingQuality);
 assert.equal(reading.activeIncidents.length,0);
 assert.doesNotMatch(JSON.stringify(reading),/EVT-QUALITY|quality-stop|day.?12|originalPurchaseOrders|future/);
 assert.ok(Object.isFrozen(reading));
 assert.throws(()=>navigateI2GameState(state,'finish'),/jornadas|segunda decisión/);
 const atSecond=navigateI2GameState(state,'advance-incident-day');
 assert.equal(atSecond.incidentStep,1);
 assert.equal(atSecond.incidentViewDay,undefined);
 assert.equal(atSecond.phase,'recover');
 assert.throws(()=>navigateI2GameState(atSecond,'finish'),/segunda decisión/);
 assert.throws(()=>i2DailyOperationsSnapshot(atSecond),/I2-35.5c3b/);
});

test('I2-35.5c3b: after second decision, daily journal advances 5..12 and persists',()=>{
 const first=firstResponse('ops-combined-01','wait');
 const atSecond=navigateI2GameState(first,'advance-incident-day');
 const completed=i2ConfirmNextIncidentResponse(atSecond,'hold');
 let state=normalizeI2GameState({...completed,incidentViewDay:5});
 assert.equal(state.incidentStep,2);
 for(let day=5;day<=12;day++){
  const journal=i2DailyOperationsSnapshot(state);
  assert.equal(journal.day,day);
  assert.ok(journal.shippedOrdersToDate>=0);
  assert.ok(journal.pendingOrders>=0);
  assert.ok(journal.receivedSkuUnits>=0);
  assert.ok(!JSON.stringify(journal).includes('completedAtEnd'));
  const memory=new Map();
  const storage={
   getItem:k=>memory.get(k)??null,
   setItem:(k,value)=>memory.set(k,value)
  };
  saveI2GameState(storage,state);
  assert.deepEqual(loadI2GameState(storage),state);
  if(day<12){
   assert.throws(()=>navigateI2GameState(state,'finish'),/jornadas/);
   state=navigateI2GameState(state,'advance-incident-day');
  }
 }
 const ending=navigateI2GameState(state,'finish');
 assert.equal(ending.phase,'result');
 assert.equal(ending.incidentViewDay,undefined);
 assert.equal(ending.incidentStep,2);
 assert.throws(()=>navigateI2GameState(ending,'advance-incident-day'),/transición/);
});

test('I2-35.5c3b: single incident journals retain old missions with and without incident',()=>{
 for(const seed of ['ops-dock-01','ops-quality-01']){
  let state=firstResponse(seed);
  assert.equal(state.incidentStep,undefined);
  let last=seed==='ops-quality-01'?5:3;
  while(last<12){
   assert.equal(i2DailyOperationsSnapshot(state).day,last);
   state=navigateI2GameState(state,'advance-incident-day');
   last++;
  }
  assert.equal(i2DailyOperationsSnapshot(state).day,12);
  assert.equal(navigateI2GameState(state,'finish').phase,'result');
 }
 const legacy=ready('ops-dock-01');
 assert.equal(Object.hasOwn(legacy,'incidentViewDay'),false);
});

test('I2-35.5c3b: impossible saved journal dates cannot bypass incident stage',()=>{
 const first=firstResponse('ops-combined-01');
 for(const day of [-1,0,2,4,5,13,1.5]){
  assert.equal(normalizeI2GameState({...first,incidentViewDay:day}),null);
 }
 const second=navigateI2GameState(first,'advance-incident-day');
 assert.equal(normalizeI2GameState({...second,incidentViewDay:4}),null);
 const firstOnly=firstResponse('ops-dock-01');
 assert.equal(normalizeI2GameState({...firstOnly,incidentViewDay:13}),null);
 assert.equal(normalizeI2GameState({...firstOnly,phase:'result'}),null);
 const tampered={...first,incidentViewDay:3,recoveryConfirmation:undefined};
 assert.equal(normalizeI2GameState(tampered),null);
});
