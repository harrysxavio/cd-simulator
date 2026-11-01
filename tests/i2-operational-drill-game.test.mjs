import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState}
 from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2CompareMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2OperationalEventsForSeed} from '../src/operational-event-schedule.js';
import {i2ChallengeReplayMatrix} from '../src/i2-challenge-replay-matrix.js';

/** El calendario externo es opcional: nunca alterar silenciosamente saves anteriores. */
test('I2-35.5c: state migration is opt-in and independently persisted',()=>{
 const legacy=newI2GameState({seed:'alpha-case-04'});
 assert.equal(Object.hasOwn(legacy,'eventSeed'),false);
 assert.equal(Object.hasOwn(normalizeI2GameState(legacy),'eventSeed'),false);
 const state=newI2GameState({seed:'alpha-case-04',eventSeed:'ops-quality-01'});
 assert.equal(state.eventSeed,'ops-quality-01');
 const data=new Map(),storage={getItem:key=>data.get(key)??null,
  setItem:(key,value)=>data.set(key,value)};
 const saved=saveI2GameState(storage,state);
 assert.deepEqual(loadI2GameState(storage),saved);
 assert.equal(navigateI2GameState(saved,'restart').eventSeed,state.eventSeed);
 assert.deepEqual(loadI2GameState(storage).choices,legacy.choices);
 const damaged={...state,eventSeed:'an-invalid-incident'};
 assert.equal(normalizeI2GameState(damaged),null);
 assert.throws(()=>newI2GameState({eventSeed:'made-up'}),/desconocido/);
});

test('I2-35.5c: incident changes physical replay, not demand or original PO',()=>{
 const inputs={seed:'alpha-case-04',operationalEvents:i2OperationalEventsForSeed('ops-dock-01')};
 const normal=i2MvpPhysicalResult({seed:inputs.seed});
 const affected=i2MvpPhysicalResult(inputs);
 assert.equal(affected.actualOrders,normal.actualOrders);
 assert.equal(affected.plannedOrders,normal.plannedOrders);
 assert.deepEqual(affected.originalPurchaseOrders,normal.originalPurchaseOrders);
 assert.notEqual(affected.baselineKey,normal.baselineKey);
 assert.equal(affected.shippedOrders+affected.pendingOrders,affected.actualOrders);
 assert.equal(affected.receiving.scope,normal.receiving.scope);
 assert.deepEqual(i2MvpPhysicalResult(inputs),affected);
});

test('I2-35.5c: multi-action and classic comparisons retain the same event',()=>{
 let s=newI2GameState({seed:'alpha-case-04',eventSeed:'ops-quality-01'});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 s=navigateI2GameState(s,'reveal');
 const noAction={urgentPurchase:{enabled:false,arrivalDay:2,coveragePercent:100},
  reserveTransfer:{enabled:false,releaseDay:2},capacityBoost:{enabled:false}};
 const combined=i2CompareMultiRecovery({state:s,plans:[noAction]});
 assert.deepEqual(combined.baseline.integrated.actual.operationalEvents,
  i2OperationalEventsForSeed(s.eventSeed));
 const classic=i2MvpPhysicalResult({choices:s.choices,seed:s.seed,advanced:s.advanced,
  operationalEvents:i2OperationalEventsForSeed(s.eventSeed)});
 assert.equal(classic.baselineKey,combined.baselineKey);
 const lab=i2ChallengeReplayMatrix({seed:s.seed,choices:s.choices,advanced:s.advanced,
  operationalEvents:i2OperationalEventsForSeed(s.eventSeed)})[0];
 assert.equal(lab.recoveries[0].shippedOrders,classic.baselineShipped);
 assert.equal(lab.actualOrders,classic.actualOrders);
});
