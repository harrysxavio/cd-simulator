import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SCOPE_DEFINITIONS,SKU_UNIT_CONVENTIONS,measuredCount,
 addMeasuredCounts,skuServiceMeasurements
} from '../src/measurements.js';

// M2-01: day 0 is a real simulated day, so a 12-day close describes
// the inclusive interval [0, 12]. It is NOT a one-shift snapshot.
const orders=(value,horizonDays=12)=>measuredCount(value,{scope:'sku-cohort',unit:'orders',horizonDays});
const units=(value,horizonDays=12)=>measuredCount(value,{scope:'sku-cohort',unit:'sku-units',horizonDays});

test('M2-01: order and SKU quantities keep explicit immutable meaning',()=>{
 const contract=skuServiceMeasurements({
  horizonDays:12,actualOrders:200,shippedOrders:140,pendingOrders:60,shippedSkuUnits:420
 });
 assert.equal(contract.scope,'sku-cohort');
 assert.equal(contract.firstDay,0);
 assert.equal(contract.lastDay,12);
 assert.equal(contract.inclusive,true);
 assert.equal(contract.actualOrders.value,200);
 assert.equal(contract.shippedOrders.unit,'orders');
 assert.equal(contract.shippedSkuUnits.unit,'sku-units');
 assert.equal(addMeasuredCounts(contract.shippedOrders,contract.pendingOrders).value,200);
 assert.equal(SCOPE_DEFINITIONS.aggregate.horizonUnit,'shift');
 assert.equal(SKU_UNIT_CONVENTIONS.currency,'CLP');
 assert.ok(Object.isFrozen(contract));
 assert.ok(Object.isFrozen(contract.shippedOrders));
});

test('M2-01: never add orders to physical SKU units or shift equivalents',()=>{
 const shift=measuredCount(1000,{scope:'aggregate-shift',unit:'shift-equivalent-units'});
 assert.throws(()=>addMeasuredCounts(orders(10),units(20)),/No sumar/);
 assert.throws(()=>addMeasuredCounts(orders(10),shift),/No sumar/);
 assert.throws(()=>addMeasuredCounts(orders(10,12),orders(10,1)),/No sumar/);
 assert.throws(()=>measuredCount(10,{scope:'aggregate-shift',unit:'orders'}),/Dimensión incompatible/);
 assert.throws(()=>measuredCount(10,{scope:'aggregate-shift',unit:'shift-equivalent-units',horizonDays:12}),/no tiene horizonte/);
});

test('M2-01: zero demand, inconsistent orders and invalid horizons',()=>{
 assert.equal(skuServiceMeasurements({
  horizonDays:0,actualOrders:0,shippedOrders:0,pendingOrders:0,shippedSkuUnits:0
 }).lastDay,0);
 assert.throws(()=>skuServiceMeasurements({
  horizonDays:12,actualOrders:100,shippedOrders:50,pendingOrders:10,shippedSkuUnits:200
 }),/no concilian/);
 for(const horizonDays of [-1,1.5,366,undefined]){
  assert.throws(()=>measuredCount(1,{scope:'sku-cohort',unit:'orders',horizonDays}),/Horizonte SKU inválido/);
 }
 for(const value of [-1,NaN,Infinity,1.3,Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>orders(value),/entera requerida/);
 }
 assert.throws(()=>addMeasuredCounts(),/al menos una/);
});

test('M2-01: returned values do not alias mutable caller objects',()=>{
 const a=orders(3),b=orders(4);
 assert.equal(addMeasuredCounts(a,b).value,7);
 assert.throws(()=>addMeasuredCounts(a,undefined),/No sumar/);
});
