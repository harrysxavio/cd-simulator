import test from 'node:test';
import assert from 'node:assert/strict';
import {NODES,DEFAULTS,PARAMETERS} from '../src/engine.js';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {I2_AREA_TABS,i2AreaPlanningIndicators} from '../src/i2-area-planning-indicators.js';

test('I2-17: ocho áreas, dos parámetros explicables y umbral originado en V1',()=>{
 assert.deepEqual(I2_AREA_TABS.map(t=>t.id),['decision','indicators','nico']);
 let state=navigateI2GameState(newI2GameState(),'start');
 for(const area of I2_AREAS){
  const model=i2AreaPlanningIndicators(state);
  const node=NODES[area.index],param=PARAMETERS[area.id];
  const ref=node.choices.find(c=>c.id===DEFAULTS[area.id])[param.key];
  assert.equal(model.area,area.id);
  assert.equal(model.phase,'pre-reveal');
  assert.equal(model.metrics.length,2);
  assert.equal(model.metrics[0].value,ref);
  assert.equal(model.metrics[1].value,0);
  assert.equal(model.threshold.value,ref);
  assert.equal(model.traffic.kind,'reference');
  assert.match(model.threshold.source,/NODES y DEFAULTS de V1/);
  assert.equal(model.type,'configured-assumptions-not-performance');
  assert.equal(Object.isFrozen(model),true);
  assert.equal(Object.isFrozen(model.metrics),true);
  for(const [i,alternative] of node.choices.entries()){
   const before=JSON.stringify(state);
   const scenario={...state,choices:{...state.choices,[area.id]:alternative.id}};
   const read=i2AreaPlanningIndicators(scenario);
   assert.equal(read.metrics[0].value,alternative[param.key]);
   assert.equal(read.metrics[1].value,alternative[param.key]-ref);
   assert.equal(read.traffic.kind,alternative[param.key]<ref?'under':
    alternative[param.key]>ref?'over':'reference');
   assert.match(read.traffic.meaning,/NO calificación/);
   assert.ok(read.boundaries.length>=3);
   assert.ok(read.consequence.length>15);
   assert.equal(JSON.stringify(state),before,
    'La consulta didáctica nunca guarda ni altera la decisión');
   const flat=JSON.stringify(read);
   for(const banned of ['actualOrders','shippedOrders','pendingOrders','recoveredOrders',
    '300 pedidos','280 pedidos','economicProxy','customerName','trackingNumber'])
    assert.ok(!flat.includes(banned),area.id+' #'+i+' filtró '+banned);
  }
  state=navigateI2GameState(state,'forward');
 }
 assert.equal(state.phase,'reveal');
 assert.throws(()=>i2AreaPlanningIndicators(state),/I2-17/);
});

test('I2-17: la unidad es un supuesto de jornada agregada, no una cohorte SKU',()=>{
 let state=navigateI2GameState(newI2GameState(),'start');
 for(let index=0;index<8;index++){
  const m=i2AreaPlanningIndicators(state);
  const percent=['commercial','planning','purchasing','quality','inventory'].includes(m.area);
  assert.equal(m.metrics[0].scope,percent?'percentage-points':'aggregate-shift-units-per-day');
  assert.equal(m.metrics[1].scope,m.metrics[0].scope);
  assert.ok(m.boundaries.some(b=>percent?/porcentaje/i.test(b):/no equivalen a SKU/i.test(b)));
  state=navigateI2GameState(state,'forward');
 }
});
