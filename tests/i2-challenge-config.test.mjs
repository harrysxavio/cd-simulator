import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_CHALLENGES,i2ChallengeForSeed,i2ChallengeReveal} from '../src/i2-challenge-config.js';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';

test('I2-14: catálogo de cinco retos con demanda exógena creciente y decreciente',()=>{
 assert.equal(I2_CHALLENGES.length,5);
 assert.equal(new Set(I2_CHALLENGES.map(c=>c.seed)).size,5);
 assert.deepEqual(I2_CHALLENGES.map(c=>i2ChallengeReveal(c.seed).actualOrders),
  [280,220,170,300,130]);
 assert.ok(I2_CHALLENGES.some(c=>c.shockPercent<0));
 assert.ok(I2_CHALLENGES.some(c=>c.shockPercent>0));
 assert.throws(()=>i2ChallengeForSeed('forged'),/semilla/);
 assert.throws(()=>i2ChallengeReveal('alpha-case-01',NaN),/muestra/);
});

test('I2-14: replays usan el MISMO motor físico y conservan las compras originales',()=>{
 const choices=i2DefaultChoices();
 for(const challenge of I2_CHALLENGES){
  const input={choices,seed:challenge.seed,option:'wait'};
  const a=i2MvpPhysicalResult(input),b=i2MvpPhysicalResult(input);
  const score=i2SafeScorecard(a);
  assert.deepEqual(a,b,'Misma semilla y elecciones producen mismo resultado');
  assert.equal(a.actualOrders,i2ChallengeReveal(challenge.seed).actualOrders);
  assert.equal(score.actualOrders.value,a.actualOrders);
  assert.equal(score.shippedOrders.value+score.pendingOrders.value,a.actualOrders);
  assert.equal(a.recoveredOrders,0);
  assert.deepEqual(a.skuIds,['A','B','C']);
  const intervention=i2MvpPhysicalResult({...input,option:'emergency',urgentArrivalDay:13});
  assert.equal(intervention.baselineKey,a.baselineKey);
  assert.deepEqual(intervention.originalPurchaseOrders,a.originalPurchaseOrders);
  assert.equal(intervention.recoveredOrders,0,'Día 13 no modifica el cierre del día 12');
  assert.equal(intervention.actualOrders,a.actualOrders);
 }
 assert.throws(()=>i2MvpPhysicalResult({seed:'invalid'}),/semilla/);
});

test('I2-14: semillas persistentes sin modificar partidas antiguas ni el storage V1',()=>{
 const db=new Map([['supply-lab-v90','V1 protected']]);
 const store={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
 const latest=newI2GameState({seed:'alpha-case-03'});
 saveI2GameState(store,latest);
 assert.equal(loadI2GameState(store).seed,'alpha-case-03');
 assert.equal(db.get('supply-lab-v90'),'V1 protected');
 const old={...newI2GameState(),schema:1};
 delete old.seed;delete old.campaignId;
 assert.equal(normalizeI2GameState(old).seed,'alpha-case-01');
 const legacy=newI2GameState();
 assert.equal(normalizeI2GameState(legacy).seed,'alpha-case-01');
 assert.equal(normalizeI2GameState({...legacy,seed:'forged'}),null);
});
