import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {newI2GameState,normalizeI2GameState,saveI2GameState,loadI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState,i2FooterLabels} from '../src/i2-game-navigation.js';

const step=(s,a)=>navigateI2GameState(s,a);
const makePlan=()=>{
 let s=step(newI2GameState(),'start');
 for(let i=0;i<8;i++)s=step(s,'forward');
 return s;
};
test('I2-09: exactly one footer action and one optional back action by phase',()=>{
 for(const [phase,secondary,action,back] of [
  ['intro',null,'start',null],
  ['area','← Atrás','forward','back'],
  ['reveal','← Revisar Transporte','reveal','back'],
  ['recover','← Revisar plan','finish','back'],
  ['review',null,'return-to-recovery',null],
  ['result',null,'restart',null]
 ]){
  let s=makePlan();
  if(phase==='intro')s=newI2GameState();
  if(phase==='area')s=step(newI2GameState(),'start');
  if(['recover','review','result'].includes(phase))s=step(s,'reveal');
  if(phase==='review')s=step(s,'back');
  if(phase==='result')s=step(s,'finish');
  const ui=i2FooterLabels(s);
  assert.equal(ui.action,action);
  assert.equal(ui.back,back);
  assert.equal(ui.secondary,secondary);
  assert.ok(ui.primary.length>6);
  assert.ok(Object.isFrozen(ui));
 }
});

test('I2-09: eight sequential decisions remain sealed when reviewing a past area',()=>{
 let s=step(newI2GameState(),'start');
 const frozenInput=structuredClone(s);
 assert.equal(s.index,0);
 assert.deepEqual(frozenInput,s);
 assert.equal(i2FooterLabels(s).primary,'Confirmar y siguiente →');
 s=step(s,'forward');
 assert.deepEqual(s.confirmedAreas,['commercial']);
 assert.equal(s.index,1);
 const prior=s;
 s=step(s,'back');
 assert.equal(s.index,0);
 assert.equal(i2FooterLabels(s).primary,'Siguiente área →');
 assert.deepEqual(s.confirmedAreas,['commercial']);
 s=step(s,'forward');
 assert.equal(s.index,1);
 assert.deepEqual(s.confirmedAreas,['commercial']);
 assert.deepEqual(prior,s,'Back / forward must not rewrite the original decisions');
 assert.deepEqual(frozenInput,newI2GameState().phase==='intro'?step(newI2GameState(),'start'):null);
 for(let i=1;i<8;i++)s=step(s,'forward');
 assert.equal(s.phase,'reveal');
 assert.deepEqual(s.confirmedAreas,I2_AREAS.map(a=>a.id));
 s=step(s,'back');
 assert.equal(s.phase,'area');
 assert.equal(s.index,7);
 assert.equal(i2FooterLabels(s).primary,'Cerrar planificación →');
 assert.equal(s.confirmedAreas.length,8);
 s=step(s,'forward');
 assert.equal(s.phase,'reveal');
 assert.equal(s.reveal,false);
});

test('I2-09: reveal is one-way; post-reveal plan review cannot edit or hide the surprise',()=>{
 let s=makePlan();
 const choices=structuredClone(s.choices),confirmed=[...s.confirmedAreas];
 assert.equal(s.phase,'reveal');
 assert.throws(()=>step(s,'finish'),/transición no permitida/);
 s=step(s,'reveal');
 assert.equal(s.phase,'recover');
 assert.equal(s.reveal,true);
 assert.throws(()=>step(s,'reveal'),/transición no permitida/);
 s=step(s,'back');
 assert.equal(s.phase,'review');
 assert.equal(s.substep,'plan-review');
 assert.equal(s.reveal,true);
 assert.deepEqual(s.choices,choices);
 assert.deepEqual(s.confirmedAreas,confirmed);
 assert.throws(()=>step(s,'back'),/transición no permitida/);
 assert.throws(()=>step(s,'forward'),/transición no permitida/);
 assert.throws(()=>step(s,'finish'),/transición no permitida/);
 let stored;
 const fake={setItem(k,v){stored=v},getItem(){return stored}};
 saveI2GameState(fake,s);
 assert.deepEqual(loadI2GameState(fake),s);
 s=step(s,'return-to-recovery');
 assert.equal(s.phase,'recover');
 assert.deepEqual(s.choices,choices);
 assert.deepEqual(s.confirmedAreas,confirmed);
 s=step(s,'finish');
 assert.equal(s.phase,'result');
 assert.equal(s.reveal,true);
 assert.throws(()=>step(s,'back'),/transición no permitida/);
 s=step(s,'restart');
 assert.deepEqual(s,newI2GameState());
});

test('I2-09: forged phase, missing confirmations, bad transitions rejected',()=>{
 const initial=newI2GameState();
 for(const [candidate,action] of [
  [null,'start'],[{...initial,phase:'recover'},'finish'],
  [{...initial,phase:'review',reveal:true},'return-to-recovery'],
  [initial,'forward'],[initial,'reveal'],[initial,'back'],
  [initial,'finish'],[initial,'unknown'],[initial,42]
 ])assert.throws(()=>step(candidate,action),/I2-09/);
 assert.equal(normalizeI2GameState({...initial,phase:'review',reveal:true}),null);
 assert.deepEqual(initial,newI2GameState());
});
