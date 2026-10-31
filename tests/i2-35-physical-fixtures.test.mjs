import test from 'node:test';
import assert from 'node:assert/strict';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';

/**
 * I2-35.1: exploratory physical fixtures, NOT certification of eight distinct missions.
 * All runs use the canonical SKU engine and compare one change at a time.
 * A monotonicity check is insufficient to claim the altered stage was binding:
 * such a claim needs witnessed positive changes and physical ledger attribution.
 */
const base=i2DefaultChoices();
const advanced=(extra={})=>({...I2_DEFAULT_ADVANCED,...extra});
const fixtures=[
 {id:'ARC-01',title:'Demanda baja y compras comprometidas',seed:'alpha-case-05',choices:{},options:{}},
 {id:'ARC-02',title:'Demanda alta con stock bajo',seed:'alpha-case-04',choices:{},options:{stockProfile:'low'}},
 {id:'ARC-03',title:'Proveedor con menor cumplimiento',seed:'alpha-case-04',choices:{purchasing:'cheap'},options:{}},
 {id:'ARC-04',title:'Recepción con capacidad reducida',seed:'alpha-case-04',choices:{receiving:'low'},options:{}},
 {id:'ARC-05',title:'Liberación lenta de Calidad',seed:'alpha-case-04',choices:{quality:'slow'},options:{}},
 {id:'ARC-06',title:'Picking limitado por SKU',seed:'alpha-case-04',choices:{},options:{pickingLimitSkuPerDay:'10'}},
 {id:'ARC-07',title:'Transporte con capacidad reducida',seed:'alpha-case-04',choices:{transport:'low'},options:{}},
 {id:'ARC-08',title:'Refuerzo caro aguas abajo de otra restricción',seed:'alpha-case-04',choices:{quality:'slow'},options:{extraCapacityDailyCostCLP:100000}}
];

function run(fixture,option='wait'){
 return i2MvpPhysicalResult({
  seed:fixture.seed,choices:{...base,...fixture.choices},advanced:advanced(fixture.options),option
 });
}
test('I2-35.1: eight candidates obey physical orders and preserve deterministic replay',()=>{
 assert.equal(fixtures.length,8);
 for(const f of fixtures){
  const first=run(f),again=run(f);
  assert.deepEqual(first,again,f.id+' deterministic');
  assert.equal(first.shippedOrders+first.pendingOrders,first.actualOrders,f.id);
  assert.equal(first.baselineShipped+first.baselinePending,first.actualOrders,f.id);
  assert.equal(first.recoveredOrders,0,f.id);
  assert.equal(first.horizonDays,12,f.id);
  assert.equal(first.unknownTotalCost,true,f.id);
  assert.ok(first.originalPurchaseOrders!==null && typeof first.originalPurchaseOrders==='object',f.id);
 }
});

test('I2-35.1: all candidate changes preserve the externally fixed demand',()=>{
 const reference=run(fixtures[2]);
 for(const f of fixtures.slice(2)){
  const result=run(f);
  assert.equal(result.actualOrders,reference.actualOrders,f.id);
  assert.equal(result.plannedOrders,reference.plannedOrders,f.id);
 }
 assert.ok(run(fixtures[0]).actualOrders<run(fixtures[1]).actualOrders);
});

test('I2-35.1: nonbinding interventions cannot create goods or change event seed',()=>{
 for(const f of fixtures){
  const before=run(f),expensive=run(f,'overtime');
  assert.equal(expensive.actualOrders,before.actualOrders,f.id);
  assert.deepEqual(expensive.originalPurchaseOrders,before.originalPurchaseOrders,f.id);
  assert.equal(expensive.baselineKey,before.baselineKey,f.id);
  assert.equal(expensive.shippedOrders+expensive.pendingOrders,expensive.actualOrders,f.id);
  // Positive gains cannot be assumed: report actual deltas in future arquetype matrix.
 }
});

test('I2-35.1: restrictive picking limit is passed into physical results',()=>{
 const f=fixtures.find(x=>x.id==='ARC-06');
 const bounded=run(f);
 const unbounded=run({...f,options:{}});
 assert.equal(bounded.actualOrders,unbounded.actualOrders);
 assert.equal(bounded.plannedOrders,unbounded.plannedOrders);
 assert.ok(bounded.shippedOrders<=unbounded.shippedOrders,
  'Removing a physical picking cap must not reduce order output');
});

test('I2-35.1: late purchase cannot improve day-12 result',()=>{
 const f=fixtures[1];
 const wait=run(f,'wait');
 const late=i2MvpPhysicalResult({
  seed:f.seed,choices:{...base,...f.choices},
  advanced:advanced(f.options),option:'emergency',urgentArrivalDay:13
 });
 assert.equal(late.recoveredOrders,0);
 assert.equal(late.shippedOrders,wait.shippedOrders);
});
