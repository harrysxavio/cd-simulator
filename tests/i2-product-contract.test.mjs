import test from 'node:test';
import assert from 'node:assert/strict';
import {NODES,DEFAULTS} from '../src/engine.js';
import {SKU_CATALOG} from '../src/sku.js';
import {DECISION_OPTIONS} from '../src/sku-decision.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {measuredCount,addMeasuredCounts} from '../src/measurements.js';
import {
 I2_AREAS,I2_RECOVERIES,I2_PRODUCT_SCOPE,
 createI2Decision,i2CanonicalChoice,i2MeasuredKpi
} from '../src/i2-product-contract.js';

const campaignId='CD-I2-01';

/** I2 presents canonical options; never clone the calculations behind them. */
test('I2-01: 8 canonical areas, their choice IDs, 3 SKU and <=2 visible KPI',()=>{
 assert.equal(I2_AREAS.length,8);
 assert.deepEqual(I2_AREAS.map(a=>a.id),NODES.map(a=>a.id));
 assert.deepEqual(I2_PRODUCT_SCOPE.areaIds,NODES.map(a=>a.id));
 assert.deepEqual(I2_PRODUCT_SCOPE.skuIds,SKU_CATALOG.map(s=>s.id));
 assert.deepEqual(I2_PRODUCT_SCOPE.skuIds,['A','B','C']);
 assert.equal(I2_PRODUCT_SCOPE.scope,'sku-cohort');
 assert.equal(I2_PRODUCT_SCOPE.horizonDays,12);
 for(const [index,area] of I2_AREAS.entries()){
  assert.equal(area.index,index);
  assert.equal(area.title,NODES[index].title);
  assert.ok(area.question.length>12);
  assert.equal(area.readModel,'campaignAreaReadModel.rows');
  assert.equal(area.primarySignal,'headline');
  assert.equal(area.primarySignalVisibleAfter,'demand-reveal');
  assert.equal(area.preRevealSignal,'planning-only');
  assert.ok(1+(area.secondarySignal===null?0:1)<=area.visibleKpiLimit);
  assert.ok(area.visibleKpiLimit<=2);
  assert.deepEqual(area.choices.map(x=>x.optionId),NODES[index].choices.map(x=>x.id));
  assert.ok(Object.isFrozen(area)&&Object.isFrozen(area.choices));
  assert.ok(area.choices.every(x=>Object.isFrozen(x)));
 }
 assert.ok(Object.isFrozen(I2_PRODUCT_SCOPE.skuIds));
 assert.throws(()=>{I2_AREAS[0].choices[0].optionId='forged'},TypeError);
});

/** The fifth alternative is not synthesized by joining independent deltas. */
test('I2-01: 5 recovery options are canonical, ordered and separately validated',()=>{
 assert.equal(I2_RECOVERIES.length,5);
 assert.deepEqual(I2_RECOVERIES.map(x=>x.optionId),DECISION_OPTIONS);
 for(const row of I2_RECOVERIES){
  assert.equal(row.kind,'sku-recovery');
  assert.ok(row.label.length>=5);
  const input=createI2Decision({campaignId,area:'recovery',optionId:row.optionId,logicalStep:50});
  assert.deepEqual(i2CanonicalChoice(input),{option:row.optionId});
  assert.equal(input.confirmation,'preview-only');
 }
 assert.throws(()=>createI2Decision({campaignId,area:'recovery',optionId:'custom',logicalStep:50}),/opción/);
});

/** Player actions must never silently rewrite V1 choices or generate purchase events. */
test('I2-01: area decisions map to V1's exact IDs without mutating either view',()=>{
 const original={...DEFAULTS};
 const decisions=I2_AREAS.map((area,index)=>createI2Decision({
  campaignId,area:area.id,optionId:NODES[index].choices[2].id,logicalStep:index,
  confirmed:true
 }));
 const selection=Object.assign({},...decisions.map(d=>i2CanonicalChoice(d)));
 for(const [index,row] of I2_AREAS.entries()){
  assert.equal(selection[row.id],NODES[index].choices[2].id);
  assert.equal(decisions[index].confirmation,'confirmed-in-simulator');
  assert.ok(Object.isFrozen(decisions[index]));
 }
 const canonical=campaignSkuContract({campaignId,decisions:selection,scenario:{demand:1000,actualDemand:1400,lockUpstream:true}});
 const control=campaignSkuContract({campaignId,decisions:{...selection},scenario:{demand:1000,actualDemand:1400,lockUpstream:true}});
 assert.deepEqual(canonical.skuInputs,control.skuInputs);
 assert.deepEqual(canonical.openingState,control.openingState);
 assert.deepEqual(selection,Object.fromEntries(NODES.map((n,i)=>[n.id,n.choices[2].id])));
 assert.deepEqual(DEFAULTS,original);
});

/** All campaign metadata and choices have an explicit validated scope. */
test('I2-01: invalid area, forged choice, campaign, phase or time fails closed',()=>{
 const valid={campaignId,area:'commercial',optionId:'accurate',logicalStep:0};
 for(const bad of [
  {...valid,campaignId:'ID with spaces'},
  {...valid,area:'shipping'},
  {...valid,area:'planning',optionId:'accurate'},
  {...valid,logicalStep:-1},
  {...valid,logicalStep:0.2},
  {...valid,source:'browser-eval'},
  {...valid,scope:'aggregate-shift'},
  {...valid,horizonDays:1},
  {...valid,confirmed:'true'}
 ])assert.throws(()=>createI2Decision(bad),/I2:/);
 const preview=createI2Decision(valid);
 assert.deepEqual(i2CanonicalChoice(preview),{commercial:'accurate'});
 assert.throws(()=>i2CanonicalChoice({...preview,scope:'aggregate-shift'}),/I2:/);
 assert.throws(()=>i2CanonicalChoice({...preview,optionId:'made-up'}),/I2:/);
});

/** A read-only tooltip is not a confirmed operation or an accounting record. */
test('I2-01: preview and confirmed are separately tagged and immutable',()=>{
 const args={campaignId,area:'planning',optionId:'buffer',logicalStep:4};
 const preview=createI2Decision(args);
 const accepted=createI2Decision({...args,confirmed:true});
 assert.equal(preview.confirmation,'preview-only');
 assert.equal(accepted.confirmation,'confirmed-in-simulator');
 assert.deepEqual(i2CanonicalChoice(preview),i2CanonicalChoice(accepted));
 assert.deepEqual(accepted,{...preview,confirmation:'confirmed-in-simulator'});
 assert.ok(!('purchaseOrders' in accepted));
 assert.ok(!('stock' in accepted));
 assert.ok(!('actualOrders' in accepted));
});

/** Compare quantities only within one physical campaign and one dimension. */
test('I2-01: SKU counts retain 12-day unit and reject aggregate cost/quantity conversion',()=>{
 const shipped=i2MeasuredKpi(80,{unit:'orders'});
 const pending=i2MeasuredKpi(20,{unit:'orders'});
 assert.deepEqual(shipped,measuredCount(80,{scope:'sku-cohort',unit:'orders',horizonDays:12}));
 assert.equal(addMeasuredCounts(shipped,pending).value,100);
 const physical=i2MeasuredKpi(120,{unit:'sku-units'});
 assert.throws(()=>addMeasuredCounts(shipped,physical),/alcances diferentes/);
 assert.throws(()=>i2MeasuredKpi(10,{scope:'aggregate-shift'}),/I2:/);
 assert.throws(()=>i2MeasuredKpi(10,{horizonDays:1}),/I2:/);
 assert.throws(()=>i2MeasuredKpi(10,{unit:'CLP'}),/Dimensión incompatible/);
 assert.throws(()=>i2MeasuredKpi(-1),/Cantidad/);
 assert.match(I2_PRODUCT_SCOPE.serviceBoundary,/entregado al cliente/);
 assert.match(I2_PRODUCT_SCOPE.revealBoundary,/evento explícito/);
 assert.match(I2_PRODUCT_SCOPE.costBoundary,/desconocido/);
});
