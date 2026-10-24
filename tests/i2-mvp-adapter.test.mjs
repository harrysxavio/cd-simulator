import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_AREAS,I2_RECOVERIES} from '../src/i2-product-contract.js';
import {i2CanonicalChoices,i2DefaultChoices,i2MvpPhysicalResult,I2_MVP_CASE} from '../src/i2-mvp-adapter.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {createSkuSessionCache} from '../src/sku-session.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';

test('I2 MVP: decisions are canonical 8 area choices, three SKU, day 12',()=>{
 const choices=i2DefaultChoices();
 assert.equal(Object.keys(choices).length,8);
 assert.deepEqual(Object.keys(choices),I2_AREAS.map(a=>a.id));
 assert.deepEqual(i2CanonicalChoices(choices),choices);
 assert.throws(()=>i2CanonicalChoices({...choices,fake:'value'}),/inválido/);
 assert.throws(()=>i2CanonicalChoices({...choices,planning:'unlicensed'}),/opción/);
 const result=i2MvpPhysicalResult({choices});
 assert.equal(result.scope,'sku-cohort');
 assert.equal(result.horizonDays,12);
 assert.deepEqual(result.skuIds.sort(),['A','B','C']);
 assert.equal(result.plannedOrders,200);
 assert.equal(result.actualOrders,280);
 assert.equal(result.shippedOrders+result.pendingOrders,280);
 assert.equal(result.baselineShipped+result.baselinePending,280);
 assert.equal(result.recoveredOrders,0);
 assert.equal(result.areaRows.length,8);
 assert.equal(result.unknownTotalCost,true);
});

test('I2 MVP: physical results match V1 canonical adapter, never second engine',()=>{
 const choices={...i2DefaultChoices(),commercial:'under',planning:'partial',purchasing:'reliable'};
 const game=i2MvpPhysicalResult({choices,option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:75});
 const canonical=campaignSkuContract({
  campaignId:I2_MVP_CASE.campaignId,decisions:i2CanonicalChoices(choices),
  scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,demandShockPercent:40,lockUpstream:true},
  plannedSampleOrders:200,policy:'balanced'
 });
 const projection=createSkuSessionCache().getProjection({
  contract:canonical,skuInputs:canonical.skuInputs,option:'emergency',
  urgentArrivalDay:2,purchaseCoveragePercent:75
 });
 assert.equal(game.shippedOrders,projection.comparison.recovered.completed);
 assert.equal(game.baselineShipped,projection.comparison.base.completed);
 assert.deepEqual(game.originalPurchaseOrders,projection.comparison.originalPurchaseOrders);
 assert.deepEqual(game.areaRows,projection.areaModel.rows);
 assert.equal(game.incrementalExpenseCLP,projection.comparison.incrementalExpense);
});

test('I2 MVP: all five recovered scenarios share immutable purchase manifest',()=>{
 const choices=i2DefaultChoices();
 const wait=i2MvpPhysicalResult({choices,option:'wait'});
 for(const option of I2_RECOVERIES.map(x=>x.optionId)){
  const x=i2MvpPhysicalResult({choices,option,urgentArrivalDay:13,purchaseCoveragePercent:100});
  assert.equal(x.baselineKey,wait.baselineKey);
  assert.deepEqual(x.originalPurchaseOrders,wait.originalPurchaseOrders);
  assert.equal(x.shippedOrders+x.pendingOrders,x.actualOrders);
  if(option==='emergency')assert.equal(x.recoveredOrders,0,'day 13 cannot rescue before cutoff');
 }
});

test('I2 MVP: preview rejects forged options and invalid day/coverage',()=>{
 const choices=i2DefaultChoices();
 assert.throws(()=>i2MvpPhysicalResult({choices,option:'magic'}),/recuperación/);
 assert.throws(()=>i2MvpPhysicalResult({choices,urgentArrivalDay:0}),/plazo/);
 assert.throws(()=>i2MvpPhysicalResult({choices,purchaseCoveragePercent:71}),/cobertura/);
});
