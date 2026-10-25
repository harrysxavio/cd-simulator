import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {I2_NICO_LEVELS,I2_NICO_LEVEL_KEY,i2ValidateNicoLevel,
 i2NicoTutorial,i2NicoCoachTip,saveI2NicoLevel,readI2NicoLevel} from '../src/i2-nico-tutorial.js';

test('I2-16: tres perfiles, tutoriales breves y preferencia aislada de V1 y campaña',()=>{
 assert.deepEqual(I2_NICO_LEVELS.map(x=>x.id),['novato','intermedio','avanzado']);
 const db=new Map([['supply-lab-v90','legacy'],['supply-lab-i2-v1','campaign']]);
 const store={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
 assert.equal(readI2NicoLevel(store),'novato');
 for(const level of I2_NICO_LEVELS){
  saveI2NicoLevel(store,level.id);
  assert.equal(readI2NicoLevel(store),level.id);
  const steps=i2NicoTutorial(level.id);
  assert.equal(steps.length,3);
  for(const step of steps)assert.ok(step.length<=160);
 }
 assert.equal(db.get('supply-lab-v90'),'legacy');
 assert.equal(db.get('supply-lab-i2-v1'),'campaign');
 assert.equal(db.get(I2_NICO_LEVEL_KEY),'avanzado');
 assert.throws(()=>i2ValidateNicoLevel('inspector'),/I2-16/);
 assert.equal(readI2NicoLevel({getItem(){return 'bad'}}),'novato');
});

test('I2-16: 3 niveles x 8 áreas no revelan resultados ni cambian las decisiones',()=>{
 const initial=newI2GameState({seed:'alpha-case-04'});
 let state=navigateI2GameState(initial,'start');
 const original=JSON.stringify(state);
 const hints=[];
 for(let i=0;i<8;i++){
  for(const {id} of I2_NICO_LEVELS){
   const hint=i2NicoCoachTip(state,id);
   assert.equal(hint.name,'Nico');
   assert.ok(hint.text.length<=135);
   assert.ok(hint.example.length>=50&&hint.example.length<=220,
    'Nico debe explicar con un ejemplo concreto, no repetir el KPI');
   assert.ok(hint.question.length>20&&hint.question.endsWith('?'),
    'Nico deja una pregunta para pensar antes de decidir');
   assert.ok(['welcome','explanation','hint','doubt','alert','reveal',
    'analysis','good','improvement','deviation','recovery','result'].includes(hint.pose));
   assert.doesNotMatch(JSON.stringify(hint),/actualOrders|actualDemand|shippedOrders|economicProxyDelta|280 pedidos|300 pedidos/);
   assert.doesNotMatch(hint.text,/\b(40|50|280|300)\s*%|280 pedidos|300 pedidos|actualDemand|shippedOrders/);
   hints.push(hint.text);
  }
  state=navigateI2GameState(state,'forward');
 }
 assert.equal(hints.length,24);
 assert.equal(new Set(hints).size,24);
 assert.equal(JSON.stringify(navigateI2GameState(initial,'start')),original);
 const a=i2MvpPhysicalResult({seed:'alpha-case-04'});
 for(const {id} of I2_NICO_LEVELS){
  assert.equal(i2NicoCoachTip(state,id).name,'Nico');
  assert.deepEqual(i2MvpPhysicalResult({seed:'alpha-case-04'}),a);
 }
});

test('Nico mantiene tono cercano por fase, sin spoilers ni cambiar el escenario',()=>{
 let state=newI2GameState({seed:'alpha-case-04'});
 const before=JSON.stringify(state);
 const intro=i2NicoCoachTip(state,'novato');
 assert.match(intro.text,/¡Hola!|vamos/i);
 assert.ok(intro.example&&intro.question&&intro.pose==='welcome');
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 const reveal=i2NicoCoachTip(state,'novato');
 assert.equal(reveal.pose,'alert');
 assert.doesNotMatch(JSON.stringify(reveal),/actualOrders|280 pedidos|300 pedidos/);
 state=navigateI2GameState(state,'reveal');
 const recovery=i2NicoCoachTip(state,'novato');
 assert.equal(recovery.pose,'recovery');
 assert.match(recovery.text,/responder|recuperar|costará/);
 assert.equal(JSON.stringify(newI2GameState({seed:'alpha-case-04'})),before);
});
