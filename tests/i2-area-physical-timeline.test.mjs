import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {i2AreaPhysicalTimeline} from '../src/i2-area-physical-timeline.js';
import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2ConfirmMultiRecovery,i2ConfirmedMultiOutcome} from '../src/i2-recovery-confirmation.js';
import {I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
const seeds=['alpha-case-01','alpha-case-02','alpha-case-03','alpha-case-04','alpha-case-05'];
function revealed(seed,advanced=I2_DEFAULT_ADVANCED){
 let s=newI2GameState({seed,advanced});s=navigateI2GameState(s,'start');
 for(let i=0;i<8;i++)s=navigateI2GameState(s,'forward');
 return navigateI2GameState(s,'reveal');
}
const result=(state,option='wait')=>i2MvpPhysicalResult({
 choices:state.choices,seed:state.seed,advanced:state.advanced,option
});
const model=(state,baseline,scorecard)=>i2AreaPhysicalTimeline({state,baseline,scorecard});

test('I2-32: cinco retos × recuperaciones clásicas mantienen días, lotes y pedidos reales',()=>{
 for(const seed of seeds){
  let s=revealed(seed);s=navigateI2GameState(s,'finish');
  const baseline=result(s),base=JSON.stringify(baseline),before=JSON.stringify(s);
  for(const option of ['wait','overtime','emergency','combined']){
   const selected=result(s,option);
   const trace=model(s,baseline,i2SafeScorecard(selected));
   assert.deepEqual(trace.steps.map(x=>x.id),[
    'commercial','planning','purchasing','receiving','quality','inventory','picking','transport'
   ]);
   assert.equal(trace.days.length,13);
   assert.deepEqual(trace.days.map(x=>x.day),Array.from({length:13},(_,i)=>i));
   assert.equal(trace.days.reduce((n,x)=>n+x.dispatchedOrders,0),baseline.baselineShipped);
   assert.equal(trace.days.at(-1).pendingOrders,baseline.baselinePending);
   assert.equal(trace.days.at(-1).completedOrders,baseline.baselineShipped);
   assert.equal(trace.comparison.chosenDispatchedOrders,selected.shippedOrders);
   assert.equal(trace.comparison.changeOrders,selected.recoveredOrders);
   assert.equal(trace.bySku.length,3);
   for(const sku of trace.bySku){
    assert.equal(sku.openingSkuUnits+sku.warehouseReceivedSkuUnits,
     sku.physicallyOnSiteSkuUnits+sku.shippedSkuUnits);
   }
   assert.ok(trace.steps.every(x=>x.source&&x.managerQuestion&&x.consumerRisk&&x.role&&x.observed));
   assert.ok(Object.isFrozen(trace)&&Object.isFrozen(trace.days[0])
    &&Object.isFrozen(trace.steps[0]));
   assert.match(trace.intro,/ORIGINAL/);
   assert.match(trace.boundary,/NO tracking|NO tracking/i);
   if(trace.sampleLot){
    assert.equal(trace.sampleLot.receivedSkuUnits,
     trace.sampleLot.releasedSkuUnits+trace.sampleLot.heldSkuUnits);
    assert.ok(trace.sampleLot.purchaseOrderId);
    const l=baseline.quality.lots.find(q=>q.lotId===trace.sampleLot.lotId);
    assert.equal(trace.sampleLot.receivedDay,l.receivedDay);
   }
   if(trace.sampleOrder){
    assert.ok(trace.sampleOrder.id);
    assert.ok(trace.sampleOrder.unitsPerOrder>0);
    const expected=Object.values(trace.sampleOrder.lines).reduce((n,v)=>n+v,0);
    assert.equal(expected,trace.sampleOrder.unitsPerOrder);
    if(trace.sampleOrder.shippedDay!==null)
     assert.ok(trace.sampleOrder.shippedDay>=trace.sampleOrder.pickedDay);
   }
  }
  assert.equal(JSON.stringify(s),before);
  assert.equal(JSON.stringify(baseline),base);
 }
});
test('I2-32: resultados de combinación reutilizan solo hechos originales y comparan beneficio agregado',()=>{
 for(const seed of seeds){
  const g=revealed(seed,{...I2_DEFAULT_ADVANCED,reservePercent:25});
  const actions=i2NormalizeMultiRecovery({
   urgentPurchase:{enabled:true,arrivalDay:2,coveragePercent:75},
   reserveTransfer:{enabled:true,releaseDay:2},
   capacityBoost:{enabled:true}
  });
  const done=navigateI2GameState(i2ConfirmMultiRecovery(g,actions),'finish');
  const score=i2ConfirmedMultiOutcome(done).scorecard;
  const baseline=result(done,'wait');
  const trace=model(done,baseline,score);
  assert.equal(trace.comparison.originalDispatchedOrders,baseline.baselineShipped);
  assert.equal(trace.comparison.chosenDispatchedOrders,score.shippedOrders.value);
  assert.equal(trace.comparison.changeOrders,score.recoveredOrders.value);
  assert.equal(trace.mode,'original-baseline-only');
  assert.equal(trace.steps[7].value,baseline.baselinePending);
  assert.equal(trace.bySku.reduce((n,v)=>n+v.shippedSkuUnits,0),
   baseline.inventory.totals.dispatchedSkuUnits);
 }
});
test('I2-32: no spoilear, no aceptar cronologías físicas falsas ni resumir pedidos como SKU',()=>{
 const r=revealed('alpha-case-04'),b=result(r);
 const done=navigateI2GameState(r,'finish');
 const card=i2SafeScorecard(b);
 assert.throws(()=>model(r,b,card),/I2-32/);
 assert.throws(()=>model(done,b,{...card,actualOrders:{...card.actualOrders,value:999}}),/I2-32/);
 assert.throws(()=>model(done,{...b,baselinePending:999},card),/I2-27|I2-32/);
 assert.throws(()=>model(done,{...b,physicalExamples:{...b.physicalExamples,
  lot:{...b.physicalExamples.lot,receivedSkuUnits:999}}},card),/I2-32/);
 assert.throws(()=>model(done,{...b,receiving:{...b.receiving,
  rows:b.receiving.rows.map((x,i)=>i===4?{...x,receivedSkuUnits:999}:x)}},card),/I2-32/);
 const examples=model(done,b,card);
 assert.equal(examples.scope,'sku-cohort');
 assert.match(examples.comparison.label,/NO reasignar/);
});
