import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2SupplierCommitmentPreview,i2SupplierOutcomeReading} from '../src/i2-supplier-purchasing.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';

function stateFor({supplier='cheap',planning='full',commercial='accurate',seed='alpha-case-01'}={}){
 const init=newI2GameState({seed});
 let state=navigateI2GameState(init,'start');
 state={...state,choices:{...state.choices,commercial,planning,purchasing:supplier}};
 state=navigateI2GameState(state,'forward');
 return navigateI2GameState(state,'forward');
}

test('I2-20: 3 proveedores por 3 coberturas, supuesto de proveedor no implica recepción',()=>{
 for(const planning of ['partial','full','buffer']){
  const results=[];
  for(const supplier of ['cheap','reliable','express']){
   const state=stateFor({supplier,planning,seed:'alpha-case-04'});
   const before=JSON.stringify(state);
   const x=i2SupplierCommitmentPreview(state);
   assert.equal(x.phase,'pre-reveal');
   assert.equal(x.scope,'sku-cohort');
   assert.equal(x.rows.length,3);
   assert.equal(x.originalCommittedSkuUnits,
    x.modeledSupplierFulfilledSkuUnits+x.modeledSupplierShortfallSkuUnits);
   assert.equal(x.originalCommittedSkuUnits,x.rows.reduce((n,r)=>n+r.orderedSkuUnits,0));
   assert.equal(x.modeledSupplierFulfilledSkuUnits,x.rows.reduce((n,r)=>n+
    Math.floor(r.orderedSkuUnits*x.supplierFillPercent/100),0));
   assert.equal(JSON.stringify(state),before);
   assert.equal(Object.isFrozen(x.rows),true);
   assert.equal(JSON.stringify(x).includes('actualOrders'),false);
   assert.equal(JSON.stringify(x).includes('warehouseReceivedSkuUnits'),false);
   assert.equal(JSON.stringify(x).includes('shockPercent'),false);
   assert.deepEqual(x,i2SupplierCommitmentPreview(stateFor({supplier,planning,
    seed:'alpha-case-03'})),'Seeding shock must not rewrite provider promise');
   results.push(x.modeledSupplierFulfilledSkuUnits);
   const physical=i2MvpPhysicalResult({choices:{...i2DefaultChoices(),planning,purchasing:supplier}});
   assert.equal(physical.purchasing.totals.orderedSkuUnits,x.originalCommittedSkuUnits);
   assert.equal(physical.purchasing.totals.fulfilledSkuUnits,x.modeledSupplierFulfilledSkuUnits);
   assert.equal(physical.purchasing.totals.supplierShortfallSkuUnits,x.modeledSupplierShortfallSkuUnits);
   assert.ok(physical.purchasing.totals.warehouseReceivedSkuUnits<=
    physical.purchasing.totals.arrivedByCutoffSkuUnits);
  }
  assert.ok(results[0]<=results[1]&&results[1]<=results[2],
   'Increasing supplier fill cannot reduce fulfilled original quantities');
 }
});
test('I2-20: original receipts reconcile and never double count urgent recovery',()=>{
 const choices={...i2DefaultChoices(),purchasing:'reliable',receiving:'low'};
 const baseline=i2MvpPhysicalResult({choices,option:'wait'});
 const urgent=i2MvpPhysicalResult({choices,option:'emergency',urgentArrivalDay:1});
 assert.deepEqual(urgent.purchasing,baseline.purchasing);
 assert.deepEqual(urgent.originalPurchaseOrders,baseline.originalPurchaseOrders);
 const p=baseline.purchasing.totals;
 assert.equal(p.orderedSkuUnits,p.fulfilledSkuUnits+p.supplierShortfallSkuUnits);
 assert.equal(p.fulfilledSkuUnits,p.arrivedByCutoffSkuUnits+p.inTransitSkuUnits);
 assert.equal(p.arrivedByCutoffSkuUnits,p.warehouseReceivedSkuUnits+p.waitingWarehouseSkuUnits);
 assert.equal(baseline.purchasing.rows.length,3);
 for(const row of baseline.purchasing.rows){
  assert.equal(row.orderedSkuUnits,row.fulfilledSkuUnits+row.supplierShortfallSkuUnits);
  assert.equal(row.arrivedByCutoffSkuUnits,row.warehouseReceivedSkuUnits+
   row.waitingWarehouseSkuUnits);
 }
 assert.equal(Object.isFrozen(baseline.purchasing.rows),true);
 assert.throws(()=>i2SupplierOutcomeReading(null),/I2-20/);
 assert.throws(()=>i2SupplierOutcomeReading({originalPurchaseOrders:{rows:[]}}),/I2-20/);
});
test('I2-20: supplier view refuses unconfirmed planning and post-reveal access',()=>{
 const a=stateFor();
 assert.throws(()=>i2SupplierCommitmentPreview({...a,confirmedAreas:['commercial']}),/I2-20/);
 assert.throws(()=>i2SupplierCommitmentPreview({...a,reveal:true}),/I2-20/);
 assert.throws(()=>i2SupplierCommitmentPreview(newI2GameState()),/I2-20/);
});
