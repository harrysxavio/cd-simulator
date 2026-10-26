import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2PickingBOMPreview,i2PickingBOMOutcome} from '../src/i2-picking-bom.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {eventSimulation} from '../src/events.js';

function state(option,seed='alpha-case-01'){
 let x=newI2GameState({seed});
 x={...x,choices:{...x.choices,picking:option}};
 x=navigateI2GameState(x,'start');
 for(let i=0;i<6;i++)x=navigateI2GameState(x,'forward');
 return x;
}
test('I2-24: BOM y 12 días se explican ANTES de demand shock, sin eventos futuros',()=>{
 for(const [option,cap] of [['low',1400],['normal',2300],['reinforce',3000]]){
  const s=state(option);const previous=JSON.stringify(s);
  const model=i2PickingBOMPreview(s);
  assert.equal(model.nominalShiftUnitCapacity,cap);
  assert.equal(model.scope,'illustrative-bom');
  assert.equal(model.skuCount,3);
  assert.equal(model.horizonDays,12);
  assert.equal(model.templateExamples.length,4);
  assert.deepEqual(model.templateExamples.find(x=>x.id==='combo').lines,{A:1,B:1});
  assert.deepEqual(model.templateExamples.find(x=>x.id==='bulk').lines,{A:2,B:1,C:1});
  assert.deepEqual(model.skuLeadDays.map(x=>x.leadDays),[2,5,10]);
  assert.deepEqual(model,i2PickingBOMPreview(state(option,'alpha-case-05')));
  assert.equal(JSON.stringify(s),previous);
  assert.equal(Object.isFrozen(model),true);
  assert.doesNotMatch(JSON.stringify(model),/actualOrders|shippedOrders|demanda real|stock futuro|280 pedidos/);
  const back=navigateI2GameState(navigateI2GameState(s,'forward'),'back');
  assert.equal(back.index,6);
  assert.equal(i2PickingBOMPreview(back).option,option);
 }
 assert.throws(()=>i2PickingBOMPreview(newI2GameState()),/I2-24/);
 assert.throws(()=>i2PickingBOMPreview({...state('normal'),reveal:true}),/I2-24/);
 assert.throws(()=>i2PickingBOMPreview({...state('normal'),confirmedAreas:['commercial']}),/I2-24/);
});

test('I2-24: 5 demandas exógenas × 3 turnos: órdenes completas y eventos originales',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'])
 for(const picking of ['low','normal','reinforce']){
  const choices={...i2DefaultChoices(),picking};
  const baseline=i2MvpPhysicalResult({seed,choices,option:'wait'});
  const emergency=i2MvpPhysicalResult({seed,choices,option:'emergency',urgentArrivalDay:2});
  const data=baseline.picking;
  assert.deepEqual(emergency.picking,data);
  assert.equal(data.scope,'sku-cohort');
  assert.equal(data.horizonDays,12);
  assert.equal(data.rows.length,13);
  assert.equal(data.byTemplate.length,4);
  assert.equal(data.bySku.length,3);
  assert.equal(data.totals.requestedOrders,
   data.totals.preparedOrders+data.totals.unpreparedOrders);
  assert.equal(data.totals.preparedOrders,
   data.totals.shippedOrders+data.totals.awaitingDispatchOrders);
  assert.equal(data.totals.pendingOrders,
   data.totals.unpreparedOrders+data.totals.awaitingDispatchOrders);
  assert.equal(data.totals.shippedOrders,baseline.baselineShipped);
  assert.equal(data.totals.preparedSkuUnits,data.rows.reduce((n,d)=>n+d.preparedSkuUnits,0));
  assert.equal(data.totals.shippedSkuUnits,data.rows.reduce((n,d)=>n+d.shippedSkuUnits,0));
  assert.equal(data.totals.shippedSkuUnits,
   data.bySku.reduce((n,d)=>n+d.shippedSkuUnits,0));
  assert.equal(Object.isFrozen(data.rows),true);
  assert.equal(Object.isFrozen(data.byTemplate),true);
 }
});

test('I2-24: sin capacidad de Picking no se preparan pedidos aunque existan SKU',()=>{
 const replay=eventSimulation({orders:200,days:12,pickingUnitCapacity:0});
 const data=i2PickingBOMOutcome({base:replay});
 assert.equal(data.totals.preparedOrders,0);
 assert.equal(data.totals.shippedOrders,0);
 assert.equal(data.totals.unpreparedOrders,200);
 assert.ok(data.rows.every(d=>d.preparedSkuUnits===0));
});

test('I2-24: staging segregado: preparar no equivale a expedir',()=>{
 const replay=eventSimulation({orders:200,days:12,
  separateTransport:true,transportUnitCapacity:0,pickingUnitCapacity:1000});
 const data=i2PickingBOMOutcome({base:replay});
 assert.ok(data.totals.preparedOrders>0);
 assert.equal(data.totals.shippedOrders,0);
 assert.equal(data.totals.awaitingDispatchOrders,data.totals.preparedOrders);
 assert.ok(data.totals.preparedSkuUnits>0);
 assert.equal(data.totals.shippedSkuUnits,0);
 assert.ok(data.totals.peakStagedOrders>0);
});

test('I2-24: rechaza despacho sin Picking o un pedido BOM falseado',()=>{
 const replay=eventSimulation({orders:200,days:12});
 assert.throws(()=>i2PickingBOMOutcome(null),/I2-24/);
 const altered=structuredClone(replay);
 const day=altered.ledger.find(d=>d.pickEvents.length>0);
 day.pickEvents[0].lines.A++;
 assert.throws(()=>i2PickingBOMOutcome({base:altered}),/I2-24/);
 const missingPick=structuredClone(replay);
 const first=missingPick.ledger.find(d=>d.shipmentEvents.length>0);
 first.pickEvents.shift();
 assert.throws(()=>i2PickingBOMOutcome({base:missingPick}),/I2-24/);
});
