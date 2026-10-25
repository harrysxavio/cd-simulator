import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2QualityReleasePreview,i2QualityReleaseOutcomeReading} from '../src/i2-quality-release.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {eventSimulation} from '../src/events.js';

function qualityState(quality,seed='alpha-case-01'){
 let state=newI2GameState({seed});
 state={...state,choices:{...state.choices,quality}};
 state=navigateI2GameState(state,'start');
 for(let i=0;i<4;i++)state=navigateI2GameState(state,'forward');
 return state;
}

test('I2-22: tres supuestos, sin spoilers ni cambios al estado, navegación de regreso',()=>{
 const opts=[['slow',75],['normal',95],['priority',100]];
 for(const [quality,pct] of opts){
  const state=qualityState(quality);
  const before=structuredClone(state);
  const lesson=i2QualityReleasePreview(state);
  assert.equal(lesson.phase,'pre-reveal');
  assert.equal(lesson.selectedReleasePercent,pct);
  assert.equal(lesson.referenceReleasePercent,95);
  assert.equal(lesson.differencePoints,pct-95);
  assert.match(lesson.example,/No están perdidas/);
  assert.deepEqual(i2QualityReleasePreview(qualityState(quality,'alpha-case-05')),lesson,
   'La demanda sorpresa es exógena y no aparece en la vista previa');
  assert.equal(Object.isFrozen(lesson),true);
  assert.deepEqual(state,before);
  assert.doesNotMatch(JSON.stringify(lesson),/actualOrders|shockPercent|shippedOrders|280 pedidos|waitingQuality|releaseEvents/);
  const next=navigateI2GameState(state,'forward');
  const back=navigateI2GameState(next,'back');
  assert.equal(back.index,4);
  assert.equal(i2QualityReleasePreview(back).selectedReleasePercent,pct);
 }
 assert.throws(()=>i2QualityReleasePreview(newI2GameState()),/I2-22/);
 assert.throws(()=>i2QualityReleasePreview({...qualityState('normal'),reveal:true}),/I2-22/);
 assert.throws(()=>i2QualityReleasePreview({...qualityState('normal'),confirmedAreas:['commercial']}),/I2-22/);
});

test('I2-22: conservación por día, SKU y lote con cinco semillas y tres capacidades',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'])
 for(const quality of ['slow','normal','priority']){
  const choices={...i2DefaultChoices(),quality};
  const base=i2MvpPhysicalResult({seed,choices,option:'wait'});
  const urgent=i2MvpPhysicalResult({seed,choices,option:'emergency',urgentArrivalDay:2});
  const q=base.quality;
  assert.deepEqual(urgent.quality,q,'compras de emergencia no cambian el registro original');
  assert.equal(q.scope,'sku-cohort');
  assert.equal(q.phase,'post-reveal');
  assert.equal(q.rows.length,13);
  assert.equal(q.totals.receivedSkuUnits,q.receiving??base.receiving.totals.receivedSkuUnits);
  assert.equal(q.totals.receivedSkuUnits,q.totals.releasedSkuUnits+q.totals.heldAtCutoffSkuUnits);
  assert.equal(q.totals.heldAtCutoffSkuUnits,q.rows.at(-1).heldEndOfDaySkuUnits);
  assert.equal(q.bySku.length,3);
  assert.equal(q.lots.reduce((n,r)=>n+r.receivedSkuUnits,0),q.totals.receivedSkuUnits);
  assert.equal(q.lots.reduce((n,r)=>n+r.releasedSkuUnits,0),q.totals.releasedSkuUnits);
  assert.equal(q.lots.reduce((n,r)=>n+r.heldSkuUnits,0),q.totals.heldAtCutoffSkuUnits);
  assert.equal(Object.isFrozen(q),true);
  assert.equal(Object.isFrozen(q.lots),true);
  let pending=0;
  for(const day of q.rows){
   assert.equal(pending+day.receivedSkuUnits-day.releasedSkuUnits,day.heldEndOfDaySkuUnits);
   pending=day.heldEndOfDaySkuUnits;
  }
 }
});

test('I2-22: 0 % libera cero y retiene lo recibido; 100 % libera sin demora',()=>{
 for(const [pct,fullyReleased] of [[0,false],[100,true]]){
  const replay=eventSimulation({orders:240,days:12,qualityReleasePercent:pct});
  const q=i2QualityReleaseOutcomeReading({base:replay});
  assert.ok(q.totals.receivedSkuUnits>0);
  assert.equal(q.totals.releasedSkuUnits,fullyReleased?q.totals.receivedSkuUnits:0);
  assert.equal(q.totals.heldAtCutoffSkuUnits,fullyReleased?0:q.totals.receivedSkuUnits);
  assert.equal(q.totals.meanDaysToRelease,fullyReleased?0:null);
  assert.equal(q.totals.peakHeldSkuUnits>0,!fullyReleased);
  assert.ok(q.lots.every(l=>l.releasedSkuUnits+l.heldSkuUnits===l.receivedSkuUnits));
 }
});

test('I2-22: rechazar liberaciones falsas, retenidos negativos o diarios alterados',()=>{
 const replay=eventSimulation({orders:200,days:12,qualityReleasePercent:75});
 assert.throws(()=>i2QualityReleaseOutcomeReading(null),/I2-22/);
 const wrong=structuredClone(replay);
 wrong.ledger[0].waitingQuality++;
 assert.throws(()=>i2QualityReleaseOutcomeReading({base:wrong}),/I2-22/);
 const mismatch=structuredClone(replay);
 const line=mismatch.ledger.find(x=>x.releaseEvents.length>0);
 line.releaseEvents[0].qty++;
 assert.throws(()=>i2QualityReleaseOutcomeReading({base:mismatch}),/I2-22/);
});
