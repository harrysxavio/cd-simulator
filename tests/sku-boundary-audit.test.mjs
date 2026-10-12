import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {auditSkuDecisionBoundary} from '../src/sku-boundary-audit.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';

// Business example: 1,000 equivalent shift units do NOT equal 200 SKU orders.
const base={
 decisions:{commercial:'accurate',planning:'full',purchasing:'reliable',receiving:'normal',
  quality:'normal',inventory:'normal',picking:'normal',transport:'normal'},
 actions:{},scenario:{demand:1000,actualDemand:1300,lockUpstream:true}
};
const audit=contract=>auditSkuDecisionBoundary({
 area:contract.area,skuInputs:contract.skuInputs,openingState:contract.openingState,
 plannedSampleOrders:contract.plannedSampleOrders,commercialForecast:contract.commercialForecast,
 planningCoverage:contract.planningCoverage,supplierRate:contract.supplierRate,
 skuAreaCapacity:contract.skuAreaCapacity
});

test('M3-13b: eight managerial proxies are mapped once, frozen and separate from physical stock',()=>{
 const c=campaignSkuContract({...base,campaignId:'M3-13B'});
 assert.equal(c.boundaryAudit.passed,true);
 assert.equal(c.boundaryAudit.scope,'sample-not-accounting');
 assert.equal(c.boundaryAudit.sourceScope,'aggregate-shift');
 assert.equal(c.boundaryAudit.targetScope,'sku-cohort');
 assert.equal(c.boundaryAudit.mappings.length,8);
 assert.deepEqual(c.boundaryAudit.mappings.map(x=>x.area),
  ['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']);
 assert.equal(c.boundaryAudit.sampleOrders.actual,260);
 assert.equal(c.boundaryAudit.physicalStockSource,'catalog-opening-only');
 assert.ok(c.boundaryAudit.excluded.includes('aggregate.dispatched'));
 assert.ok(c.boundaryAudit.excluded.includes('aggregate.eligibleReserve'));
 assert.ok(Object.isFrozen(c.boundaryAudit)&&Object.isFrozen(c.boundaryAudit.mappings[0]));
 assert.throws(()=>{c.boundaryAudit.mappings[0].kind='physical-receipt'},TypeError);
 assert.deepEqual(audit(c),c.boundaryAudit);
});

test('M3-13b: aggregate stock and reserve do not inject physical SKU units',()=>{
 const a=campaignSkuContract(base);
 const b=campaignSkuContract({...base,actions:{inventory:150},
  scenario:{...base.scenario,initialStock:99999,reserveStock:99999}});
 assert.deepEqual(a.skuInputs.stock,b.skuInputs.stock);
 assert.equal(a.boundaryAudit.physicalStockSource,'catalog-opening-only');
 assert.equal(b.boundaryAudit.physicalStockSource,'catalog-opening-only');
 assert.ok(b.area.eligibleReserve>=0);
 assert.equal(b.boundaryAudit.passed,true);
});

test('M3-13b: demand surprise alters only cohort size, not frozen managerial purchase assumptions',()=>{
 const stable=campaignSkuContract({...base,scenario:{...base.scenario,actualDemand:1000}});
 const shock=campaignSkuContract(base);
 assert.equal(stable.skuInputs.actualOrders,200);
 assert.equal(shock.skuInputs.actualOrders,260);
 assert.equal(shock.skuInputs.plannedForecastPercent,stable.skuInputs.plannedForecastPercent);
 assert.equal(shock.skuInputs.planningCoveragePercent,stable.skuInputs.planningCoveragePercent);
 assert.deepEqual(shock.skuInputs.supplierFill,stable.skuInputs.supplierFill);
});

test('M3-13b: fail closed for invented physical stock, new aggregate fields and incorrect day capacities',()=>{
 const c=campaignSkuContract(base);
 assert.throws(()=>auditSkuDecisionBoundary({
  area:c.area,openingState:c.openingState,plannedSampleOrders:c.plannedSampleOrders,
  skuInputs:{...c.skuInputs,stock:{...c.skuInputs.stock,A:c.skuInputs.stock.A+1}},
  commercialForecast:c.commercialForecast,planningCoverage:c.planningCoverage,
  supplierRate:c.supplierRate,skuAreaCapacity:c.skuAreaCapacity
 }),/stock SKU/);
 for(const patch of [
  {dispatched:c.area.dispatched},
  {receivingUnitCapacity:c.skuInputs.receivingUnitCapacity+1},
  {actualOrders:c.skuInputs.actualOrders+1},
  {customerDeliveries:1}
 ]){
  assert.throws(()=>auditSkuDecisionBoundary({
   area:c.area,openingState:c.openingState,plannedSampleOrders:c.plannedSampleOrders,
   skuInputs:{...c.skuInputs,...patch},commercialForecast:c.commercialForecast,
   planningCoverage:c.planningCoverage,supplierRate:c.supplierRate,
   skuAreaCapacity:c.skuAreaCapacity
  }),/Contrato agregado\/SKU/);
 }
});

test('M3-13b: physical campaign and daily audit remain separately reconciled',()=>{
 const c=campaignSkuContract(base);
 const comparison=recoveryComparison({...c.skuInputs,option:'wait',separateTransport:true});
 const physical=campaignSnapshot({comparison,campaignId:c.campaignId,plannedOrders:c.plannedSampleOrders});
 const view=campaignAreaReadModel({comparison,campaign:physical,campaignId:c.campaignId,plannedOrders:c.plannedSampleOrders});
 assert.equal(physical.passed,true);
 assert.equal(view.checks.chainAudit,true);
 assert.equal(c.boundaryAudit.passed,true);
 assert.equal(view.chainAudit.scope,'sku-cohort');
 assert.equal(view.chainAudit.totals.orders,c.boundaryAudit.sampleOrders.actual);
 assert.equal(view.metrics.customerDeliveries,null);
 assert.equal(c.boundaryAudit.excluded.includes('aggregate.dispatched'),true);
});
