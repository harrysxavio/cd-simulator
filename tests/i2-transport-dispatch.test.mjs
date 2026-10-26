import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2TransportCapacityPreview,i2TransportDispatchReading} from '../src/i2-transport-dispatch.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {eventSimulation} from '../src/events.js';

function atTransport(choice='normal',seed='alpha-case-01'){
 let state=newI2GameState({seed});
 state={...state,choices:{...state.choices,transport:choice}};
 state=navigateI2GameState(state,'start');
 for(let i=0;i<7;i++)state=navigateI2GameState(state,'forward');
 return state;
}

test('I2-25: tres capacidades sin resultados futuros y sin modificar el estado',()=>{
 for(const [choice,cap] of [['low',500],['normal',800],['extra',1000]]){
  const state=atTransport(choice),before=JSON.stringify(state);
  const preview=i2TransportCapacityPreview(state);
  assert.equal(preview.nominalDispatchSkuUnitsPerDay,cap);
  assert.equal(preview.deltaDispatchSkuUnitsPerDay,cap-800);
  assert.equal(preview.scope,'sku-cohort');
  assert.equal(JSON.stringify(state),before);
  assert.deepEqual(preview,i2TransportCapacityPreview(atTransport(choice,'alpha-case-05')));
  assert.doesNotMatch(JSON.stringify(preview),/actualOrders|shippedOrders|shockPercent|280 pedidos/);
  assert.ok(Object.isFrozen(preview));
 }
 assert.throws(()=>i2TransportCapacityPreview(newI2GameState()),/I2-25/);
 assert.throws(()=>i2TransportCapacityPreview({...atTransport(),reveal:true}),/I2-25/);
});

test('I2-25: cinco seeds y tres capacidades conservan físico original en todas las recuperaciones',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'])
 for(const transport of ['low','normal','extra']){
  const choices={...i2DefaultChoices(),transport};
  const baseline=i2MvpPhysicalResult({seed,choices,option:'wait'});
  const recovered=i2MvpPhysicalResult({seed,choices,option:'emergency',urgentArrivalDay:1});
  const physical=baseline.transport;
  assert.deepEqual(physical,recovered.transport,'La recuperación no reescribe el escenario original');
  assert.equal(physical.rows.length,13);
  assert.equal(physical.totals.dispatchedOrders,baseline.baselineShipped);
  assert.equal(physical.totals.pendingOrders,baseline.baselinePending);
  assert.equal(physical.totals.dispatchedOrders+physical.totals.pendingOrders,baseline.actualOrders);
  assert.equal(physical.totals.dispatchedSkuUnits,baseline.picking.totals.dispatchedSkuUnits);
  assert.equal(physical.totals.preparedAwaitingDispatchOrders,
   baseline.picking.totals.preparedNotDispatchedOrders);
  assert.equal(physical.capacitySkuUnitsPerDay,{low:500,normal:800,extra:1000}[transport]);
  assert.ok(physical.rows.every(d=>d.dispatchedSkuUnits<=physical.capacitySkuUnitsPerDay));
  assert.ok(Object.isFrozen(physical.rows));
 }
});

test('I2-25: staging separado es una cola física real, con transporte cero',()=>{
 const physical=eventSimulation({orders:200,days:12,separateTransport:true,
  pickingUnitCapacity:500,transportUnitCapacity:0});
 const reading=i2TransportDispatchReading({base:physical});
 assert.equal(reading.mode,'transport-separated-staging');
 assert.equal(reading.totals.dispatchedOrders,0);
 assert.equal(reading.totals.pendingOrders,200);
 assert.ok(reading.totals.preparedAwaitingDispatchOrders>0);
 assert.equal(reading.totals.nominalCapacityUsedPercent,null);
 assert.ok(reading.rows.some(d=>d.preparedAwaitingDispatchOrders>0));
 assert.equal(reading.rows.at(-1).dispatchedOrders,0);
});

test('I2-25: rechazar diarios alterados y resultados de horizonte incompatible',()=>{
 assert.throws(()=>i2TransportDispatchReading(null),/I2-25/);
 const source=eventSimulation({orders:200,days:12,transportUnitCapacity:800});
 const altered=structuredClone(source);
 altered.ledger.at(-1).backlog+=1;
 assert.throws(()=>i2TransportDispatchReading({base:altered}),/I2-25/);
 const alteredUnits=structuredClone(source);
 const active=alteredUnits.ledger.find(d=>d.shipmentEvents.length);
 assert.ok(active);
 active.shippedUnits+=1;
 // El auditor físico reutilizado de Picking también puede detectar el evento corrupto.
 assert.throws(()=>i2TransportDispatchReading({base:alteredUnits}),/I2-2[45]/);
 const impossible=structuredClone(source);
 impossible.transportUnitCapacity=0;
 assert.throws(()=>i2TransportDispatchReading({base:impossible}),/I2-25/);
});
