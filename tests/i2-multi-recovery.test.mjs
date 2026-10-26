import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {RECOVERY_OPTIONS} from '../src/recovery.js';
import {i2NormalizeMultiRecovery,i2EmptyRecoveryActions,
 i2LegacyRecoveryToMultiActions,i2CompareMultiRecovery
} from '../src/i2-multi-recovery.js';

function state(seed='alpha-case-04',advanced=I2_DEFAULT_ADVANCED){
 let s=newI2GameState({seed,advanced});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
const plan=({buy=false,arrival=2,coverage=100,reserve=false,release=2,boost=false}={})=>({
 urgentPurchase:{enabled:buy,arrivalDay:arrival,coveragePercent:coverage},
 reserveTransfer:{enabled:reserve,releaseDay:release},
 capacityBoost:{enabled:boost}
});

test('I2-28: contrato versionado canónico, migración opciones históricas y no-acción exclusivo',()=>{
 assert.deepEqual(Object.keys(RECOVERY_OPTIONS),['wait','overtime','reserve','emergency','combined']);
 const none=i2EmptyRecoveryActions();
 assert.equal(none.schema,1);
 assert.deepEqual(i2NormalizeMultiRecovery(none),none);
 assert.deepEqual(i2LegacyRecoveryToMultiActions({option:'wait'}),none);
 assert.equal(i2LegacyRecoveryToMultiActions({option:'combined'}).capacityBoost.enabled,true);
 assert.equal(i2LegacyRecoveryToMultiActions({option:'combined'}).urgentPurchase.enabled,true);
 assert.equal(i2LegacyRecoveryToMultiActions({option:'reserve'}).reserveTransfer.enabled,true);
 assert.equal(i2LegacyRecoveryToMultiActions({option:'overtime'}).capacityBoost.enabled,true);
 assert.deepEqual(i2NormalizeMultiRecovery(plan({arrival:13,coverage:0,release:13})),none,
  'Las fechas inactivas no deben cambiar la simulación');
 for(const invalid of [
  {...plan(),fake:true},{...plan(),capacityBoost:{enabled:1}},
  {...plan(),urgentPurchase:{enabled:true,arrivalDay:0,coveragePercent:100}},
  {...plan(),reserveTransfer:{enabled:true,releaseDay:-1}},
  {...plan(),urgentPurchase:{enabled:true,arrivalDay:2,coveragePercent:200}},
  {...plan(),schema:2}
 ])assert.throws(()=>i2NormalizeMultiRecovery(invalid),/I2-28/);
 assert.throws(()=>i2LegacyRecoveryToMultiActions({option:'not-a-choice'}),/I2-28/);
});
test('I2-28: una base física compartida, cinco retos y acciones 0/1/2 y 3',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05']){
  const s=state(seed);
  const before=JSON.stringify(s);
  const plans=[
   plan(),plan({buy:true}),plan({boost:true}),
   plan({buy:true,boost:true}),
   plan({buy:true,boost:true,arrival:13})
  ];
  const compared=i2CompareMultiRecovery({state:s,plans});
  assert.equal(compared.schema,1);
  assert.equal(compared.results.length,5);
  assert.ok(Object.isFrozen(compared)&&Object.isFrozen(compared.baseline));
  assert.equal(compared.baselineComparison.recovered,compared.baseline.integrated.actual);
  assert.equal(compared.baselineComparison.option,'wait');
  const v1=i2MvpPhysicalResult({choices:s.choices,seed,advanced:s.advanced,option:'wait'});
  assert.equal(compared.baselineKey,v1.baselineKey);
  assert.equal(compared.baselineComparison.base.completed,v1.baselineShipped);
  assert.equal(compared.baselineComparison.committedPurchaseValue,v1.committedPurchaseCLP);
  assert.equal(compared.results[0].comparison,compared.baselineComparison);
  assert.equal(compared.results[0].reading.incrementalExpenseCLP,0);
  assert.equal(compared.results[0].reading.recoveredOrders,0);
  for(const {comparison,reading} of compared.results){
   assert.equal(comparison.baselineSnapshot,compared.baseline);
   assert.equal(comparison.base,compared.baselineComparison.base);
   assert.equal(reading.baselineKey,compared.baselineKey);
   assert.equal(reading.actualOrders,comparison.base.orders);
   assert.equal(reading.pendingOrders+reading.dispatchedOrders,reading.actualOrders);
   assert.equal(reading.dispatchedOrders,comparison.recovered.shipmentEvents?.length??reading.dispatchedOrders);
   assert.equal(reading.incrementalExpenseCLP,
    reading.urgentPurchaseValueCLP+reading.urgentSurchargeCLP+reading.extraCapacityCostCLP);
   assert.equal(reading.originalPurchaseCommitmentCLP,compared.baselineComparison.committedPurchaseValue);
   assert.equal(reading.totalOperatingCostCLP,null);
   assert.ok(Object.isFrozen(reading));
   assert.equal(comparison.recovered.completed,
    comparison.recovered.ledger.at(-1).shipmentEvents.length+
    comparison.recovered.ledger.slice(0,-1).reduce((n,d)=>n+d.shipmentEvents.length,0));
  }
  assert.equal(JSON.stringify(s),before);
 }
});
test('I2-28: compra + reserva + refuerzo usan una sola corrida, sin stock fabricado ni doble PO',()=>{
 const s=state('alpha-case-04',{...I2_DEFAULT_ADVANCED,stockProfile:'low'});
 const plans=[
  plan(),plan({buy:true}),plan({reserve:true}),plan({boost:true}),
  plan({buy:true,reserve:true,boost:true}),plan({buy:true,reserve:true,arrival:5,release:2})
 ];
 const model=i2CompareMultiRecovery({state:s,plans,reservePercent:25});
 const original=model.baselineComparison.originalPurchaseOrders;
 const opening=model.baseline.openingState;
 assert.ok(opening.totals.reserveSkuUnits>0);
 assert.equal(opening.totals.pickFaceSkuUnits+opening.totals.reserveSkuUnits,
  opening.totals.physicalSkuUnits);
 for(const row of model.results){
  assert.deepEqual(row.comparison.originalPurchaseOrders,original);
  assert.deepEqual(row.comparison.recovered.openingReserve,opening.reserveBySku);
  const moved=row.reading.physicallyMovedReserveSkuUnits;
  assert.ok(moved<=opening.totals.reserveSkuUnits);
  assert.equal(row.reading.chargedExtraCapacityShifts,
   row.comparison.operationalCost.totals.chargeableShifts);
  const ordered=row.comparison.urgent.reduce((n,x)=>n+x.qty,0);
  assert.equal(row.reading.orderedUrgentSkuUnits,ordered);
  assert.equal(row.comparison.recovered.extraDeliveries.length,row.comparison.urgent.length);
  const last=row.comparison.recovered.ledger.at(-1);
  const shippedSku=Object.values(row.comparison.recovered.consumed).reduce((n,v)=>n+v,0);
  assert.ok(shippedSku>=0);
  for(const id of ['A','B','C']){
   const openingUnits=opening.openingBySku[id];
   const received=row.comparison.recovered.ledger.reduce((n,d)=>n+d.received[id],0);
   const onSite=last.stock[id]+last.reserveStock[id]+last.heldQuality[id]+last.stagingStock[id];
   const shipped=row.comparison.recovered.ledger.reduce((n,d)=>
    n+d.shipmentEvents.reduce((a,e)=>a+(e.lines[id]??0),0),0);
   assert.equal(openingUnits+received,onSite+shipped);
  }
 }
 const combination=model.results[4];
 assert.equal(combination.reading.actions.reserveTransfer.enabled,true);
 assert.equal(combination.reading.actions.urgentPurchase.enabled,true);
 assert.equal(combination.reading.actions.capacityBoost.enabled,true);
 assert.equal(combination.reading.urgentOrders.every(o=>o.day===2),true);
 assert.equal(combination.comparison.baselineKey,model.results[0].comparison.baselineKey);
 assert.equal(combination.reading.recoveredOrders,
  combination.comparison.recovered.completed-model.baselineComparison.base.completed);
});
test('I2-28: día 13 cuesta si hay compra necesaria pero NO rescata cohorte día 12',()=>{
 const s=state('alpha-case-04',{...I2_DEFAULT_ADVANCED,stockProfile:'low'});
 const model=i2CompareMultiRecovery({state:s,plans:[
  plan(),plan({buy:true,arrival:13}),plan({buy:true,arrival:2})
 ]});
 const baseline=model.results[0].reading;
 const late=model.results[1].reading;
 assert.equal(late.recoveredOrders,0);
 assert.equal(late.dispatchedOrders,baseline.dispatchedOrders);
 if(late.orderedUrgentSkuUnits>0)assert.ok(late.incrementalExpenseCLP>0);
 assert.equal(late.urgentOrders.every(x=>x.day===13),true);
 assert.deepEqual(model.results[1].comparison.originalPurchaseOrders,
  model.results[0].comparison.originalPurchaseOrders);
});
test('I2-28: rechaza sin reveal, reserva inexistente, duplicados y elección inválida',()=>{
 const before=newI2GameState(),s=state();
 assert.throws(()=>i2CompareMultiRecovery({state:before,plans:[plan()]}),/I2-26|I2-28/);
 assert.throws(()=>i2CompareMultiRecovery({state:s,plans:[plan({reserve:true})]}),/I2-28/);
 assert.throws(()=>i2CompareMultiRecovery({state:s,plans:[]}),/I2-28/);
 assert.throws(()=>i2CompareMultiRecovery({state:s,plans:[plan(),plan()]}),/I2-28/);
 assert.throws(()=>i2CompareMultiRecovery({state:s,plans:[plan()],reservePercent:55}),/I2-28/);
});
