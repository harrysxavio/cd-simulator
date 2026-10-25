import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2PlanningCoveragePreview,i2PlanningCoverageOutcome} from '../src/i2-planning-coverage.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {SKU_CATALOG} from '../src/sku.js';

const planState=({commercial='accurate',planning='full',seed='alpha-case-01',
 plannedOrders=200,stockProfile='standard'}={})=>{
 const initial=newI2GameState({seed,advanced:{
  ...newI2GameState().advanced,plannedOrders,stockProfile
 }});
 const withChoices={...initial,choices:{...initial.choices,commercial,planning}};
 return navigateI2GameState(navigateI2GameState(withChoices,'start'),'forward');
};
const PLANS=['partial','full','buffer'];

test('I2-19: 3 coberturas × 3 forecast × 3 tamaños × 3 inventarios, sin demanda real',()=>{
 for(const stockProfile of ['low','standard','high'])
 for(const plannedOrders of [160,200,240])
 for(const commercial of ['under','accurate','over']){
  const estimates=[];
  for(const planning of PLANS){
   const state=planState({commercial,planning,plannedOrders,stockProfile,seed:'alpha-case-04'});
   const before=structuredClone(state);
   const preview=i2PlanningCoveragePreview(state);
   assert.deepEqual(state,before);
   assert.equal(preview.scope,'sku-cohort');
   assert.equal(preview.phase,'pre-reveal');
   assert.equal(preview.rows.length,3);
   assert.equal(preview.totalCommittedSkuUnits,
    preview.rows.reduce((n,r)=>n+r.plannedPurchaseSkuUnits,0));
   assert.equal(preview.totalCommittedValueCLP,
    preview.rows.reduce((n,r)=>n+r.commitmentCLP,0));
   assert.ok(preview.rows.every(r=>Number.isSafeInteger(r.plannedPurchaseSkuUnits)
    &&r.plannedPurchaseSkuUnits>=0));
   assert.equal(preview.rows.map(r=>r.skuId).join(','),'A,B,C');
   assert.deepEqual(preview.rows.map(r=>r.nominalLeadDays),SKU_CATALOG.map(s=>s.leadDays));
   assert.equal(preview.rows.some(r=>r.committedValueCLP!==undefined),false);
   assert.equal(Object.isFrozen(preview),true);
   assert.equal(Object.isFrozen(preview.rows),true);
   const serialized=JSON.stringify(preview);
   for(const forbidden of ['actualOrders','shippedOrders','recoveredOrders',
    'shockPercent','baselineKey','actualDemand','300 pedidos','360 pedidos'])
    assert.equal(serialized.includes(forbidden),false,'spoiler '+forbidden);
   // El reto no puede cambiar compras planificadas antes del shock.
   assert.deepEqual(preview,i2PlanningCoveragePreview(planState({
    commercial,planning,plannedOrders,stockProfile,seed:'alpha-case-03'
   })));
   estimates.push(preview.totalCommittedSkuUnits);
   const actual=i2MvpPhysicalResult({seed:'alpha-case-04',choices:{
    ...i2DefaultChoices(),commercial,planning
   },advanced:state.advanced});
   const frozen=actual.planning;
   assert.equal(frozen.totalCommittedSkuUnits,preview.totalCommittedSkuUnits);
   assert.equal(frozen.totalCommittedValueCLP,preview.totalCommittedValueCLP);
   assert.equal(frozen.forecastOrders,preview.forecastOrders);
   assert.equal(frozen.coveragePercent,preview.coveragePercent);
   assert.deepEqual(frozen.rows.map(r=>r.originalCommittedSkuUnits),
    preview.rows.map(r=>r.plannedPurchaseSkuUnits));
   assert.deepEqual(frozen.rows.map(r=>r.openingSkuUnits),
    preview.rows.map(r=>r.openingSkuUnits));
  }
  assert.ok(estimates[0]<=estimates[1]&&estimates[1]<=estimates[2],
   'Al ampliar la cobertura no pueden bajar unidades comprometidas');
 }
});

test('I2-19: el compromiso original no cambia por sorpresa, recuperación o fecha',()=>{
 const choices={...i2DefaultChoices(),commercial:'over',planning:'buffer'};
 const base=i2MvpPhysicalResult({choices,seed:'alpha-case-01'});
 assert.equal(base.planning.phase,'post-reveal');
 assert.equal(base.planning.status,'original-plan-frozen');
 for(const seed of ['alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05']){
  const observed=i2MvpPhysicalResult({choices,seed,option:'wait'});
  assert.deepEqual(observed.planning,base.planning);
  assert.equal(observed.commercial.forecastOrders,base.commercial.forecastOrders);
 }
 for(const option of ['wait','emergency','overtime','reserve','combined']){
  const result=i2MvpPhysicalResult({choices,seed:'alpha-case-01',option,
   urgentArrivalDay:13,purchaseCoveragePercent:50});
  assert.deepEqual(result.planning,base.planning);
  assert.deepEqual(result.originalPurchaseOrders,base.originalPurchaseOrders);
 }
 const state=planState();
 assert.throws(()=>i2PlanningCoveragePreview({...state,index:0}),/I2-19/);
 assert.throws(()=>i2PlanningCoveragePreview({...state,reveal:true}),/I2-19/);
 assert.throws(()=>i2PlanningCoveragePreview(newI2GameState()),/I2-19/);
});

test('I2-19: se rechaza el manifiesto posrevelación alterado',()=>{
 const output=i2MvpPhysicalResult({choices:i2DefaultChoices()});
 assert.equal(output.planning.totalCommittedValueCLP,output.commercial.originalCommittedValueCLP);
 assert.deepEqual(output.planning.rows.map(x=>x.originalCommittedSkuUnits),
  output.commercial.originalRows.map(x=>x.committedSkuUnits));
 assert.throws(()=>i2PlanningCoverageOutcome(null),/I2-19/);
 assert.throws(()=>i2PlanningCoverageOutcome({scope:'aggregate-shift'}),/I2-19/);
 const fake={
  scope:'sku-cohort',commitmentStage:'before-demand-reveal',
  forecastOrders:200,planningCoveragePercent:100,totalCommittedSkuUnits:0,
  totalCommittedValueCLP:0,
  rows:SKU_CATALOG.map(s=>({
   skuId:s.id,purchaseOrderId:'PO-'+s.id,unitCostCLP:s.unitCost,
   openingSkuUnits:10,policyNeedSkuUnits:1,committedSkuUnits:0,
   expectedArrivalDay:s.leadDays,committedValueCLP:0
  })),
  originalPurchaseOrders:SKU_CATALOG.map(s=>({
   skuId:s.id,id:'PO-'+s.id,orderedQty:0,expectedArrivalDay:s.leadDays
  }))
 };
 assert.throws(()=>i2PlanningCoverageOutcome(fake),/I2-19/);
});
