import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2WhySkuAndDays,i2PickingCapacityPreview,i2PickingFulfillmentReading} from '../src/i2-picking-bom.js';
import {i2ManagerOrientation,I2_MANAGER_CHAPTERS} from '../src/i2-manager-orientation.js';
import {i2ManagerAreaGuide} from '../src/i2-manager-area-guides.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {eventSimulation} from '../src/events.js';

function pickingState(picking='normal',seed='alpha-case-01'){
 let state=newI2GameState({seed});
 state={...state,choices:{...state.choices,picking}};
 state=navigateI2GameState(state,'start');
 for(let i=0;i<6;i++)state=navigateI2GameState(state,'forward');
 return state;
}
test('I2-24: catálogo muestra cuatro BOM con SKU A/B/C, día 0–12',()=>{
 const info=i2WhySkuAndDays();
 assert.equal(info.templates.length,4);
 assert.deepEqual(info.skus.map(x=>x.skuId),['A','B','C']);
 const bulk=info.templates.find(x=>x.id==='bulk');
 assert.deepEqual(bulk.lines,{A:2,B:1,C:1});
 assert.equal(bulk.unitsPerOrder,4);
 assert.match(info.timing,/día 13/);
 assert.match(info.consumer,/no la entrega real/);
 assert.equal(Object.isFrozen(info.templates),true);
});
test('I2-24: capacidad visible 1400/2300/3000, no predicción de demanda',()=>{
 for(const [option,expected] of [['low',1400],['normal',2300],['reinforce',3000]]){
  const state=pickingState(option),before=JSON.stringify(state);
  const preview=i2PickingCapacityPreview(state);
  assert.equal(preview.nominalSkuUnitsPerDay,expected);
  assert.equal(preview.deltaSkuUnitsPerDay,expected-2300);
  assert.equal(preview.separatePhysicalSkuLimitPerDay,null);
  assert.deepEqual(preview,i2PickingCapacityPreview(pickingState(option,'alpha-case-05')));
  assert.equal(JSON.stringify(state),before);
  assert.doesNotMatch(JSON.stringify(preview),/actualOrders|shippedOrders|280 pedidos|shockPercent/);
  assert.equal(Object.isFrozen(preview),true);
  const back=navigateI2GameState(navigateI2GameState(state,'forward'),'back');
  assert.equal(i2PickingCapacityPreview(back).nominalSkuUnitsPerDay,expected);
 }
 assert.throws(()=>i2PickingCapacityPreview(newI2GameState()),/I2-24/);
 assert.throws(()=>i2PickingCapacityPreview({...pickingState(),reveal:true}),/I2-24/);
});
test('I2-24: gestor aprende en 7 capítulos, guía para ocho áreas, todo read-only',()=>{
 const intro=i2ManagerOrientation();
 assert.equal(intro.chapters.length,7);
 assert.match(intro.chapters[3].body,/día 12/);
 assert.equal(intro.skuExample.formula,'1× SKU A + 1× SKU B');
 assert.equal(Object.isFrozen(intro.chapters),true);
 for(const id of ['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']){
  const guide=i2ManagerAreaGuide(id);
  assert.match(guide.title,/Nico/);
  for(const key of ['what','manager','kpi','tradeoff','example','question'])
   assert.ok(guide[key].length>65,'Profundidad gerencial: '+id+'/'+key);
  assert.match(guide.question,/\?$/);
  assert.equal(Object.isFrozen(guide),true);
  assert.doesNotMatch(JSON.stringify(guide),/actualOrders|shockPercent|280 pedidos/);
 }
});
test('I2-24: 5 semillas × 3 dotaciones, pedidos completos y eventos reconciliados',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'])
 for(const picking of ['low','normal','reinforce']){
  const choices={...i2DefaultChoices(),picking};
  const baseline=i2MvpPhysicalResult({seed,choices,option:'wait'});
  const emergency=i2MvpPhysicalResult({seed,choices,option:'emergency',urgentArrivalDay:1});
  const actual=baseline.picking;
  assert.deepEqual(actual,emergency.picking,'Las decisiones reactivas no reescriben preparación original');
  assert.equal(actual.phase,'post-reveal');
  assert.equal(actual.rows.length,13);
  assert.equal(actual.byTemplate.length,4);
  assert.equal(actual.totals.dispatchedOrders,baseline.comparison?.base?.completed??baseline.picking.totals.dispatchedOrders);
  assert.equal(actual.totals.dispatchedOrders,
   actual.byTemplate.reduce((n,x)=>n+x.dispatched,0));
  assert.equal(actual.totals.preparedOrders,
   actual.byTemplate.reduce((n,x)=>n+x.prepared,0));
  assert.equal(actual.totals.preparedSkuUnits,actual.totals.dispatchedSkuUnits,
   'En campaña estándar pick y salida son mismo día; no inferirlo fuera de este modo');
  assert.equal(actual.totals.preparedNotDispatchedOrders,0);
  assert.equal(actual.totals.dispatchedOrders+baseline.picking.totals.neverPreparedOrders,
   actual.totals.requestedOrders);
 }
});
test('I2-24: staging real separa pedidos completos preparados de expedidos',()=>{
 const sim=eventSimulation({orders:200,days:12,separateTransport:true,
  pickingUnitCapacity:300,transportUnitCapacity:0});
 const x=i2PickingFulfillmentReading({base:sim});
 assert.equal(x.totals.dispatchedOrders,0);
 assert.ok(x.totals.preparedOrders>0);
 assert.equal(x.totals.preparedNotDispatchedOrders,x.totals.preparedOrders);
 assert.ok(x.totals.preparedSkuUnits>0);
 assert.equal(x.totals.dispatchedSkuUnits,0);
 assert.ok(x.rows.some(r=>r.preparedNotDispatchedOrders>0));
});
test('I2-24: no aceptar falsa preparación, BOM, cantidad o salida sin picking',()=>{
 const x=eventSimulation({orders:200,days:12});
 assert.throws(()=>i2PickingFulfillmentReading(null),/I2-24/);
 const broken=structuredClone(x);
 const day=broken.ledger.find(r=>r.pickEvents.length);
 day.pickEvents[0].units+=1;
 assert.throws(()=>i2PickingFulfillmentReading({base:broken}),/I2-24/);
 const fake=structuredClone(x);
 fake.ordersDetail[0].lines.C=999;
 assert.throws(()=>i2PickingFulfillmentReading({base:fake}),/I2-24/);
 const duplicated=structuredClone(x);
 const first=duplicated.ledger.find(r=>r.shipmentEvents.length);
 first.shipmentEvents.push({...first.shipmentEvents[0]});
 assert.throws(()=>i2PickingFulfillmentReading({base:duplicated}),/I2-24/);
});
