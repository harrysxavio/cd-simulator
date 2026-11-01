import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,
 saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {i2IncidentDecisionCheckpoint,i2ConfirmIncidentResponse,
 i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';

function atFirst({reserve=false,seed='alpha-case-04'}={}){
 let state=newI2GameState({seed,eventSeed:'ops-combined-01',
  advanced:reserve?{...I2_DEFAULT_ADVANCED,reservePercent:25}:I2_DEFAULT_ADVANCED});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'reveal');
}
const firstChoice=(state,kind)=>normalizeI2GameState({
 ...i2ConfirmIncidentResponse(state,kind),incidentStep:1
});

test('I2-35.5c3a: segundo incidente se observa sin ver nada posterior',()=>{
 const state=firstChoice(atFirst(),'urgent-fast');
 const pre=i2CompareMultiRecovery({state,plans:[state.recoveryConfirmation.actions]});
 const actual=pre.results[0].comparison.recovered.ledger[4];
 const c=i2IncidentDecisionCheckpoint(state,{index:1});
 assert.equal(c.checkpoint,2);
 assert.equal(c.decisionDay,4);
 assert.equal(c.incidentKind,'quality-stop');
 assert.equal(c.canBuyUrgent,false);
 assert.equal(c.reserveAvailable,false);
 assert.equal(c.waitingDockSkuUnits,actual.waitingReceiving);
 assert.equal(c.waitingQualitySkuUnits,actual.waitingQuality);
 assert.equal(c.shippedOrdersToDate,actual.completed);
 assert.equal(c.pendingOrdersAtDay,actual.backlog);
 assert.doesNotMatch(JSON.stringify(c),/day12|completedAtEnd|finalShipped/);
 assert.deepEqual(c, i2IncidentDecisionCheckpoint(state,{index:1}));
 // No se acepta saltar directamente desde el segundo incidente al cierre.
 assert.throws(()=>navigateI2GameState(state,'finish'),/segunda decisión/);
 assert.equal(normalizeI2GameState({...state,phase:'result'}),null);
 assert.ok(Object.isFrozen(c));
 assert.throws(()=>i2IncidentDecisionCheckpoint(atFirst(),{index:1}),/I2-35.5c2/);
});

test('I2-35.5c3a: primera compra no se puede repetir y su fecha no cambia',()=>{
 const first=firstChoice(atFirst({reserve:true}),'urgent-fast');
 const noExtra=i2ConfirmNextIncidentResponse(first,'hold');
 const reserve=i2ConfirmNextIncidentResponse(first,'reserve-next');
 assert.equal(noExtra.incidentStep,2);
 assert.equal(noExtra.incidentSecondDecision,'hold');
 assert.equal(reserve.incidentFirstActions.urgentPurchase.arrivalDay,3);
 assert.equal(reserve.recoveryConfirmation.actions.urgentPurchase.arrivalDay,3);
 assert.equal(reserve.recoveryConfirmation.actions.reserveTransfer.releaseDay,5);
 assert.throws(()=>i2ConfirmNextIncidentResponse(first,'urgent-next'),/ya comprometida/);
 assert.throws(()=>i2ConfirmNextIncidentResponse(first,'urgent-and-reserve'),/ya comprometida/);
 assert.throws(()=>i2ConfirmNextIncidentResponse(noExtra,'hold'),/no habilitado/);
 const broken={...reserve,recoveryConfirmation:{
  ...reserve.recoveryConfirmation,actions:{
   ...reserve.recoveryConfirmation.actions,
   urgentPurchase:{enabled:true,arrivalDay:5,coveragePercent:100}
  }
 }};
 assert.equal(normalizeI2GameState(broken),null);
});

test('I2-35.5c3a: primera reserva no se puede movilizar dos veces',()=>{
 const first=firstChoice(atFirst({reserve:true}),'reserve-next');
 const second=i2ConfirmNextIncidentResponse(first,'urgent-next');
 assert.equal(second.recoveryConfirmation.actions.reserveTransfer.releaseDay,3);
 assert.equal(second.recoveryConfirmation.actions.urgentPurchase.arrivalDay,5);
 assert.throws(()=>i2ConfirmNextIncidentResponse(first,'reserve-next'),/ya movilizada/);
 assert.throws(()=>i2ConfirmNextIncidentResponse(first,'urgent-and-reserve'),/ya movilizada/);
});

test('I2-35.5c3a: ambas decisiones preservan física antes de día 4',()=>{
 for(const [firstKind,secondKind] of [
  ['wait','hold'],['wait','urgent-next'],['wait','reserve-next'],
  ['wait','urgent-and-reserve'],['urgent-fast','reserve-next'],
  ['reserve-next','urgent-next'],['buy-and-reserve','hold']
 ]){
  const first=firstChoice(atFirst({reserve:true}),firstKind);
  const before=i2CompareMultiRecovery({
   state:first,plans:[first.recoveryConfirmation.actions]
  });
  const after=i2ConfirmNextIncidentResponse(first,secondKind);
  const comparison=i2CompareMultiRecovery({
   state:after,plans:[after.recoveryConfirmation.actions]
  });
  for(let day=0;day<=4;day++)
   assert.deepEqual(comparison.results[0].comparison.recovered.ledger[day],
    before.results[0].comparison.recovered.ledger[day],
    'No modificar día '+day+' por '+firstKind+' / '+secondKind);
  assert.equal(comparison.baselineKey,before.baselineKey);
  assert.deepEqual(comparison.results[0].comparison.originalPurchaseOrders,
   before.results[0].comparison.originalPurchaseOrders);
  const result=i2ConfirmedMultiOutcome({...after,phase:'result'});
  assert.equal(result.reading.actualOrders,comparison.baseline.actualOrders);
  assert.equal(result.reading.dispatchedOrders+result.reading.pendingOrders,
   result.reading.actualOrders);
  assert.equal(result.event.baselineKey,before.baselineKey);
  const storage=new Map();
  const adapter={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  saveI2GameState(adapter,{...after,phase:'result'});
  assert.deepEqual(loadI2GameState(adapter),normalizeI2GameState({...after,phase:'result'}));
 }
});

test('I2-35.5c3a: las misiones con solo un evento no tienen segundo punto',()=>{
 let state=newI2GameState({eventSeed:'ops-quality-01'});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 state=navigateI2GameState(state,'reveal');
 const confirmed=i2ConfirmIncidentResponse(state,'wait');
 assert.throws(()=>i2ConfirmNextIncidentResponse(confirmed,'hold'),/I2-35.5c2/);
 assert.equal(normalizeI2GameState({...confirmed,incidentStep:1}),null);
});
