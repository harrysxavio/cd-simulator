import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2CommercialForecastLesson,i2CommercialOutcomeReading} from '../src/i2-commercial-forecast-lesson.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {SKU_CATALOG} from '../src/sku.js';

const OPTIONS=[['under',80],['accurate',100],['over',115]];
test('I2-18: 3 forecast x 3 cohortes, antes del reveal, nunca se conoce la demanda real',()=>{
 for(const plannedOrders of [160,200,240])for(const [option,percent] of OPTIONS){
  const initial=newI2GameState({seed:'alpha-case-04',advanced:{
   ...newI2GameState().advanced,plannedOrders
  }});
  const state=navigateI2GameState({...initial,choices:{...initial.choices,commercial:option}},'start');
  const saved=structuredClone(state);
  const plan=i2CommercialForecastLesson(state);
  assert.equal(plan.percent,percent);
  assert.equal(plan.plannedOrders,plannedOrders);
  assert.equal(plan.forecastOrders,Math.round(plannedOrders*percent/100));
  assert.equal(plan.referenceOrders,plannedOrders);
  assert.equal(plan.deltaVsReference,Math.round(plannedOrders*percent/100)-plannedOrders);
  assert.equal(plan.risk,option==='under'?'under':option==='over'?'over':'reference');
  assert.equal(plan.leadTimes.length,SKU_CATALOG.length);
  assert.deepEqual(plan.leadTimes.map(x=>x.nominalDays),SKU_CATALOG.map(x=>x.leadDays));
  assert.equal(JSON.stringify(state),JSON.stringify(saved),'solo lectura, no decide ni guarda');
  assert.equal(Object.isFrozen(plan),true);
  const text=JSON.stringify(plan);
  for(const forbidden of ['actualOrders','shippedOrders','originalCommittedSkuUnits',
   '300 pedidos','360 pedidos','shockPercent','demandShockPercent','economicProxyDelta'])
   assert.equal(text.includes(forbidden),false,'spoiler: '+forbidden);
  assert.throws(()=>i2CommercialForecastLesson(navigateI2GameState(state,'forward')),
   /I2-18: lectura comercial/);
 }
});

test('I2-18: tres forecasts -> compras SKU originales congeladas, conciliación y resultados físicos',()=>{
 const purchased=[];
 for(const [option,percent] of OPTIONS){
  const choices={...i2DefaultChoices(),commercial:option};
  const args={choices,seed:'alpha-case-01',option:'wait'};
  const result=i2MvpPhysicalResult(args);
  const repeat=i2MvpPhysicalResult(args);
  assert.deepEqual(result,repeat,'replay idéntico');
  const plan=result.commercial;
  assert.equal(plan.phase,'post-reveal');
  assert.equal(plan.scope,'sku-cohort');
  assert.equal(plan.forecastOrders,Math.round(result.plannedOrders*percent/100));
  assert.equal(plan.actualOrders,result.actualOrders);
  assert.equal(plan.varianceVsForecastOrders,result.actualOrders-plan.forecastOrders);
  assert.equal(plan.errorDirection,result.actualOrders>plan.forecastOrders?'under':
   result.actualOrders<plan.forecastOrders?'over':'matched');
  assert.equal(plan.originalCommittedValueCLP,result.committedPurchaseCLP);
  assert.equal(plan.originalRows.length,3);
  assert.equal(plan.originalCommittedSkuUnits,plan.originalRows.reduce((sum,x)=>sum+x.committedSkuUnits,0));
  assert.equal(Object.isFrozen(plan),true);
  assert.equal(Object.isFrozen(plan.originalRows),true);
  purchased.push(plan.originalCommittedSkuUnits);
  const recovered=i2MvpPhysicalResult({...args,option:'emergency',urgentArrivalDay:2});
  assert.deepEqual(recovered.commercial,plan,
   'Comprar urgencia nunca reescribe el compromiso original ni el forecast');
  assert.deepEqual(recovered.originalPurchaseOrders,result.originalPurchaseOrders);
  assert.equal(recovered.actualOrders,result.actualOrders);
 }
 assert.ok(purchased[0]<=purchased[1]&&purchased[1]<=purchased[2],
  'Subir forecast sin cambiar otros inputs no reduce las compras originales SKU');
 assert.ok(purchased[0]<purchased[2],
  'El forecast debe tener un efecto físico de compras, no solo decorativo');
});

test('I2-18: el contrato posreveal se rechaza si se alteran compras, valores o desviación',()=>{
 const valid=i2MvpPhysicalResult().commercial;
 assert.throws(()=>i2CommercialOutcomeReading({...valid,varianceVsForecastOrders:999}),/I2-18/);
 assert.throws(()=>i2CommercialOutcomeReading({...valid,rows:[]}),/I2-18/);
 assert.throws(()=>i2CommercialOutcomeReading({...valid,
  rows:valid.originalRows,actualOrders:-1}),/I2-18/);
});
