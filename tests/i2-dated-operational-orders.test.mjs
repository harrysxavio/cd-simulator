import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2ConfirmIncidentResponse,i2ConfirmNextIncidentResponse} from '../src/i2-incident-response.js';
import {i2DatedOrdersForObservedDay} from '../src/i2-dated-operational-orders.js';
import {I2_RECEIVING_SHIFT} from '../src/i2-receiving-shift.js';
import {I2_QUALITY_BRIDGE} from '../src/i2-quality-bridge.js';

function ready(seed){
 let state=newI2GameState({seed:'alpha-case-04',eventSeed:seed});
 state=navigateI2GameState(state,'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'reveal');
}
function dayAfterFirst(seed,kind){
 const first=i2ConfirmIncidentResponse(ready(seed),kind);
 return normalizeI2GameState({
  ...first,...(seed==='ops-combined-01'?{incidentStep:1}:{}),
  incidentViewDay:seed==='ops-quality-01'?5:3
 });
}

test('I2-35.7a: no confirma ni inventa órdenes al elegir no intervenir',()=>{
 const state=dayAfterFirst('ops-dock-01','wait');
 const before=JSON.stringify(state),result=i2DatedOrdersForObservedDay(state);
 assert.equal(result.day,3);
 assert.equal(result.committedCount,0);
 assert.equal(result.waitingForDate,0);
 assert.ok(Object.isFrozen(result));
 assert.equal(JSON.stringify(state),before);
 assert.throws(()=>i2DatedOrdersForObservedDay(ready('ops-dock-01')),/I2-35.7a/);
});

test('I2-35.7a: compra emitida en día 2 conserva la fecha efectiva y estado por jornada',()=>{
 const state=dayAfterFirst('ops-dock-01','urgent-fast');
 const result=i2DatedOrdersForObservedDay(state);
 assert.equal(result.committedCount,1);
 const [buy]=result.orders;
 assert.deepEqual([buy.id,buy.areaId,buy.issuedDay,buy.effectiveDay],
  ['OPS-1-BUY','purchasing',2,3]);
 assert.equal(buy.status,'jornada-objetivo');
 assert.equal(buy.extraCostCLP,null,'el precio no se inventa en la bitácora');
 assert.ok(Object.isFrozen(buy));
 const next=navigateI2GameState(state,'advance-incident-day');
 assert.equal(i2DatedOrdersForObservedDay(next).orders[0].status,'fecha-objetivo-transcurrida');
});

test('I2-35.7a: turno de muelle es una orden fechada con costo comprometido real del modelo',()=>{
 const state=dayAfterFirst('ops-dock-01','dock-shift');
 const result=i2DatedOrdersForObservedDay(state);
 assert.equal(result.committedCount,1);
 assert.equal(result.orders[0].areaId,'receiving');
 assert.equal(result.orders[0].effectiveDay,I2_RECEIVING_SHIFT.day);
 assert.equal(result.orders[0].extraCostCLP,I2_RECEIVING_SHIFT.shiftCostCLP);
 assert.match(result.orders[0].boundary,/no comprobante/);
});

test('I2-35.7a: no se filtra segundo incidente hasta autorizarlo, conserva primera orden',()=>{
 let state=dayAfterFirst('ops-combined-01','urgent-fast');
 let snapshot=i2DatedOrdersForObservedDay(state);
 assert.equal(snapshot.orders.length,1);
 assert.equal(snapshot.orders[0].issuedDay,2);
 assert.doesNotMatch(JSON.stringify(snapshot),/bridge|quality|segundo|día 4/i);
 state=navigateI2GameState(state,'advance-incident-day');
 const committed=i2ConfirmNextIncidentResponse(state,'quality-bridge');
 const viewed=normalizeI2GameState({...committed,incidentViewDay:5});
 const after=i2DatedOrdersForObservedDay(viewed);
 assert.equal(after.orders.length,2);
 assert.deepEqual(after.orders.map(x=>x.areaId),['purchasing','quality']);
 assert.equal(after.orders[1].issuedDay,4);
 assert.equal(after.orders[1].effectiveDay,5);
 assert.equal(after.orders[1].extraCostCLP,I2_QUALITY_BRIDGE.shiftCostCLP);
 assert.equal(after.objectiveToday,1);
 assert.equal(after.orders[0].extraCostCLP,null);
 assert.ok(Object.isFrozen(after.orders[1]));
});

test('I2-35.7a: fecha alterada y órdenes ajenas al estado no se aceptan',()=>{
 const state=dayAfterFirst('ops-dock-01','wait');
 assert.throws(()=>i2DatedOrdersForObservedDay({...state,incidentViewDay:13}),
  /I2-35.7a/);
 assert.throws(()=>i2DatedOrdersForObservedDay({...state,phase:'intro'}),
  /I2-35.7a/);
 assert.equal(Object.hasOwn(state,'operationalOrders'),false);
});
