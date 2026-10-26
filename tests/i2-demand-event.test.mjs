import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_CHALLENGES} from '../src/i2-challenge-config.js';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {newI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2DemandEventSealed,i2DemandEventObserved} from '../src/i2-demand-event.js';

function completePlan(seed='alpha-case-01',plannedOrders=200,variant=false){
 let state=newI2GameState({
  seed,advanced:{...I2_DEFAULT_ADVANCED,plannedOrders}
 });
 if(variant){
  state.choices=Object.fromEntries(I2_AREAS.map(a=>[
   a.id,a.choices.at(-1).optionId
  ]));
 }
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 assert.equal(state.phase,'reveal');
 return state;
}
test('I2-26: estado sellado no incluye dirección, porcentaje ni demanda observada',()=>{
 for(const c of I2_CHALLENGES){
  const state=completePlan(c.seed);
  const before=JSON.stringify(state);
  const sealed=i2DemandEventSealed(state);
  assert.equal(sealed.phase,'pre-reveal');
  assert.equal(sealed.planLocked,true);
  assert.equal(sealed.plannedOrders,200);
  assert.equal(sealed.missionLabel,c.label);
  assert.equal(JSON.stringify(state),before);
  assert.ok(Object.isFrozen(sealed));
  assert.equal('missionSeed' in sealed,false);
  assert.equal('shockPercent' in sealed,false);
  assert.equal('observedOrders' in sealed,false);
  assert.doesNotMatch(JSON.stringify(sealed),/varianceOrders|actualOrders|shockPercent/);
 }
 assert.throws(()=>i2DemandEventSealed(newI2GameState()),/I2-26/);
});
test('I2-26: cinco retos × tres tamaños, signo ± y mismo evento independiente de ocho elecciones',()=>{
 const sizes=[160,200,240],values=new Set();
 for(const c of I2_CHALLENGES)for(const plannedOrders of sizes){
  const one=completePlan(c.seed,plannedOrders),two=completePlan(c.seed,plannedOrders,true);
  const state=navigateI2GameState(one,'reveal'),alternate=navigateI2GameState(two,'reveal');
  const observed=i2DemandEventObserved(state),other=i2DemandEventObserved(alternate);
  assert.equal(observed.phase,'post-reveal');
  assert.equal(observed.observedOrders,Math.round(plannedOrders*(100+c.shockPercent)/100));
  assert.equal(observed.varianceOrders,observed.observedOrders-plannedOrders);
  assert.equal(observed.direction,c.shockPercent>0?'up':'down');
  assert.deepEqual(observed,other,'El reto externo no cambia con decisiones de áreas');
  assert.equal(observed.missionSeed,c.seed);
  assert.ok(Object.isFrozen(observed));
  const again=i2DemandEventObserved(navigateI2GameState(state,'finish'));
  assert.deepEqual(again,observed);
  values.add(observed.direction);
 }
 assert.deepEqual([...values].sort(),['down','up']);
});
test('I2-26: demanda observada concilia con el motor SKU y no se corrige según recuperación',()=>{
 for(const c of I2_CHALLENGES){
  const state=navigateI2GameState(completePlan(c.seed,160),'reveal');
  const info=i2DemandEventObserved(state);
  const wait=i2MvpPhysicalResult({seed:c.seed,advanced:state.advanced,choices:state.choices,option:'wait'});
  const urgent=i2MvpPhysicalResult({seed:c.seed,advanced:state.advanced,choices:state.choices,
   option:'emergency',urgentArrivalDay:13});
  assert.equal(wait.actualOrders,info.observedOrders);
  assert.equal(urgent.actualOrders,info.observedOrders);
  assert.equal(wait.baselineKey,urgent.baselineKey);
  assert.deepEqual(wait.originalPurchaseOrders,urgent.originalPurchaseOrders);
  assert.equal(wait.shippedOrders+wait.pendingOrders,info.observedOrders);
  assert.equal(urgent.shippedOrders+urgent.pendingOrders,info.observedOrders);
 }
});
test('I2-26: revelación irreversible, seed persistente y V1 no modificada',()=>{
 const original=completePlan('alpha-case-05',240);
 assert.throws(()=>i2DemandEventObserved(original),/I2-26/);
 assert.throws(()=>navigateI2GameState(original,'finish'),/I2-09/);
 const beforeChoices=structuredClone(original.choices);
 const recorded=navigateI2GameState(original,'reveal');
 assert.deepEqual(recorded.choices,beforeChoices);
 assert.equal(recorded.seed,original.seed);
 assert.equal(recorded.reveal,true);
 assert.throws(()=>i2DemandEventSealed(recorded),/I2-26/);
 assert.throws(()=>navigateI2GameState(recorded,'reveal'),/I2-09/);
 const map=new Map([['supply-lab-v90','V1-KEEP']]);
 const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 saveI2GameState(store,recorded);
 assert.equal(loadI2GameState(store).seed,'alpha-case-05');
 assert.equal(i2DemandEventObserved(loadI2GameState(store)).observedOrders,156);
 assert.equal(map.get('supply-lab-v90'),'V1-KEEP');
 const retry=navigateI2GameState(recorded,'restart');
 assert.equal(retry.reveal,false);
 assert.equal(retry.seed,'alpha-case-05');
 assert.equal(retry.advanced.plannedOrders,240);
 assert.equal(i2DemandEventSealed(completePlan(retry.seed,retry.advanced.plannedOrders)).plannedOrders,240);
});
