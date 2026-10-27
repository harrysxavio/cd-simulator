import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_DEFAULT_ADVANCED,i2ValidateAdvanced,i2AdvancedPhysicalOptions} from '../src/i2-advanced-settings.js';
import {newI2GameState,normalizeI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2MultiLeverPreview} from '../src/i2-multilever-preview.js';
import {I2_DEFAULT_OBJECTIVES} from '../src/i2-management-objectives.js';

function game(seed='alpha-case-04',advanced=I2_DEFAULT_ADVANCED){
 let s=newI2GameState({seed,advanced});
 s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
const combo=({buy=false,day=2,coverage=100,reserve=false,release=2,boost=false}={})=>
 i2NormalizeMultiRecovery({
  urgentPurchase:{enabled:buy,arrivalDay:day,coveragePercent:coverage},
  reserveTransfer:{enabled:reserve,releaseDay:release},
  capacityBoost:{enabled:boost}
 });
const p=(state,actions,objectives=I2_DEFAULT_OBJECTIVES)=>i2MultiLeverPreview({state,actions,objectives});
test('I2-29: reserva pre-reveal es opt-in, no cambia las partidas heredadas',()=>{
 assert.deepEqual(i2ValidateAdvanced(I2_DEFAULT_ADVANCED),I2_DEFAULT_ADVANCED);
 assert.equal(i2AdvancedPhysicalOptions().reservePercent,0);
 assert.equal(i2AdvancedPhysicalOptions({...I2_DEFAULT_ADVANCED,reservePercent:25}).reservePercent,25);
 assert.throws(()=>i2ValidateAdvanced({...I2_DEFAULT_ADVANCED,reservePercent:50}),/I2-15/);
 const before=game('alpha-case-03');
 const old=i2MvpPhysicalResult({choices:before.choices,seed:before.seed,advanced:before.advanced});
 const opt=game('alpha-case-03',{...I2_DEFAULT_ADVANCED,reservePercent:25});
 const reserved=i2MvpPhysicalResult({choices:opt.choices,seed:opt.seed,advanced:opt.advanced});
 assert.equal(normalizeI2GameState(opt).advanced.reservePercent,25);
 assert.equal(reserved.actualOrders,old.actualOrders);
 assert.notEqual(reserved.baselineKey,old.baselineKey);
 assert.deepEqual(reserved.originalPurchaseOrders,old.originalPurchaseOrders);
 assert.deepEqual(reserved.skuIds,old.skuIds);
});
test('I2-29: cinco escenarios ±, servicio/costo y baseline coinciden con la vista I2 de la misión',()=>{
 for(const seed of ['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05']){
  const state=game(seed),original=JSON.stringify(state);
  const model=p(state,combo({buy:true,boost:true,day:2}));
  const classic=i2MvpPhysicalResult({choices:state.choices,seed,advanced:state.advanced,option:'wait'});
  assert.equal(model.scope,'sku-cohort');
  assert.equal(model.selectedCount,2);
  assert.equal(model.rows.length,4);
  assert.equal(model.baselineKey,classic.baselineKey);
  assert.equal(model.rows[0].dispatchedOrders,classic.baselineShipped);
  assert.equal(model.selected.actualOrders,classic.actualOrders);
  assert.equal(model.selected.pendingOrders+model.selected.dispatchedOrders,classic.actualOrders);
  assert.equal(model.selected.incrementalExpenseCLP,
   model.selected.urgentPurchaseValueCLP+model.selected.urgentSurchargeCLP+
   model.selected.extraCapacityCostCLP);
  assert.equal(model.selected.totalOperatingCostCLP,null);
  assert.ok(model.selected.dispatchPercent>=0&&model.selected.dispatchPercent<=100);
  assert.equal(JSON.stringify(state),original);
  assert.ok(Object.isFrozen(model)&&Object.isFrozen(model.rows)&&Object.isFrozen(model.selected));
 }
});
test('I2-29: 0, 1, 2 y 3 palancas, mismo costo parcial y sin sumar efectos aislados',()=>{
 const g=game('alpha-case-04',{...I2_DEFAULT_ADVANCED,stockProfile:'low',reservePercent:25});
 for(const [a,expected] of [
  [combo(),1],
  [combo({buy:true}),2],
  [combo({buy:true,boost:true}),4],
  [combo({buy:true,reserve:true,boost:true}),6]
 ]){
  const model=p(g,a);
  assert.equal(model.rows.length,expected);
  assert.equal(model.selectedCount,[a.urgentPurchase.enabled,a.reserveTransfer.enabled,
   a.capacityBoost.enabled].filter(Boolean).length);
  assert.equal(model.selected.originalPurchaseCommitmentCLP,
   model.rows[0].originalPurchaseCommitmentCLP);
  assert.equal(model.selected.recoveredOrders,
   model.selected.dispatchedOrders-model.rows[0].dispatchedOrders);
  if(model.selectedCount>=2){
   assert.equal(model.selected.label,'Combinación conjunta');
   const withoutLast=model.rows.find(r=>JSON.stringify(r.actions)===
    JSON.stringify(combo({buy:a.urgentPurchase.enabled,reserve:a.reserveTransfer.enabled,
     day:a.urgentPurchase.arrivalDay,coverage:a.urgentPurchase.coveragePercent,
     release:a.reserveTransfer.releaseDay,boost:false})));
   assert.ok(withoutLast);
   assert.equal(model.marginal.extraDispatchedOrders,
    model.selected.dispatchedOrders-withoutLast.dispatchedOrders);
  }
 }
});
test('I2-29: llegada día 13 no rescata servicio, puede costar; presupuesto alerta pero no impide',()=>{
 const g=game('alpha-case-04',{...I2_DEFAULT_ADVANCED,stockProfile:'low'});
 const input=combo({buy:true,day:13});
 const model=p(g,input,{goal:'cost',incrementalBudgetCLP:0});
 assert.equal(model.selected.dispatchedOrders,model.rows[0].dispatchedOrders);
 assert.equal(model.selected.recoveredOrders,0);
 assert.ok(model.warnings.some(s=>s.includes('después del corte')));
 if(model.selected.incrementalExpenseCLP>0){
  assert.equal(model.selected.expenseWithinTarget,false);
  assert.ok(model.warnings.some(s=>s.includes('límite')));
 }
});
test('I2-29: no adelanta información; reserva no existente rechazada, sin costo integral inventado',()=>{
 assert.throws(()=>p(newI2GameState(),combo({buy:true})),/I2-29|I2-26/);
 assert.throws(()=>p(game(),combo({reserve:true})),/I2-28/);
 const state=game('alpha-case-04',{...I2_DEFAULT_ADVANCED,reservePercent:25});
 const m=p(state,combo({reserve:true,release:13}));
 assert.equal(m.selected.physicallyMovedReserveSkuUnits,0);
 assert.equal(m.selected.dispatchedOrders,m.rows[0].dispatchedOrders);
 assert.equal(m.selected.customerDeliveredOrders,null);
 assert.equal(m.selected.totalOperatingCostCLP,null);
});
