import test from 'node:test';
import assert from 'node:assert/strict';
import {SKU_CATALOG} from '../src/sku.js';
import {SKU_COST_DEFAULTS,skuCostCatalogReadModel} from '../src/sku-cost-catalog.js';
import {recoveryComparison} from '../src/recovery.js';
import {skuProcurementReconciliation} from '../src/sku-procurement.js';

test('M4-14: costs are an immutable, complete CLP catalog for exactly the three physical SKU',()=>{
 const x=skuCostCatalogReadModel({catalog:SKU_CATALOG});
 assert.equal(x.passed,true);
 assert.equal(x.currency,'CLP');
 assert.equal(x.scope,'sku-cohort');
 assert.equal(x.period,'days-0-12');
 assert.equal(x.accountingStatus,'assumptions-only');
 assert.deepEqual(x.productCosts.map(y=>[y.id,y.rateCLPPerPhysicalUnit]),[
  ['A',1800],['B',3200],['C',6500]
 ]);
 assert.equal(x.activityRates.length,5);
 assert.deepEqual(x.activityRates.map(y=>y.id),[
  'order-revenue','urgent-surcharge','extra-capacity','backlog-penalty','inventory-holding'
 ]);
 assert.ok(x.activityRates.every(y=>!y.cashConfirmed&&y.source.startsWith('SKU_COST_DEFAULTS.')));
 assert.ok(x.unpricedOperations.some(y=>y.id==='receiving'));
 assert.ok(x.unpricedOperations.some(y=>y.id==='picking'));
 assert.ok(x.unpricedOperations.some(y=>y.id==='transport'));
 assert.ok(x.exclusions.includes('aggregate-shift-finance'));
 assert.ok(x.exclusions.includes('actual-payments'));
 assert.ok(Object.isFrozen(SKU_COST_DEFAULTS)&&Object.isFrozen(SKU_COST_DEFAULTS.recovery));
 assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.productCosts[0])
  &&Object.isFrozen(x.activityRates[0])&&Object.isFrozen(x.unpricedOperations[0]));
 assert.throws(()=>{x.productCosts[0].rateCLPPerPhysicalUnit=1},TypeError);
 assert.throws(()=>{SKU_COST_DEFAULTS.recovery.urgentSurchargeRate=1},TypeError);
});

test('M4-14: only catalog-backed product costs may be used for physical inventory valuation',()=>{
 const copy=SKU_CATALOG.map(p=>({...p}));
 const f=(list,defaults)=>skuCostCatalogReadModel({catalog:list,defaults});
 assert.equal(f(copy).passed,true);
 assert.throws(()=>f([{...copy[0],unitCost:900000},...copy.slice(1)]),/no coinciden/);
 assert.throws(()=>f([...copy,{...copy[0]}]),/no coinciden/);
 assert.throws(()=>f(copy.slice(1)),/no coinciden/);
 assert.throws(()=>f(copy,{...SKU_COST_DEFAULTS,currency:'USD'}),/moneda/);
 assert.throws(()=>f(copy,{...SKU_COST_DEFAULTS,recovery:{...SKU_COST_DEFAULTS.recovery,urgentSurchargeRate:-1}}),/inválida/);
 assert.throws(()=>f(copy,{...SKU_COST_DEFAULTS,recovery:{...SKU_COST_DEFAULTS.recovery,unknown:0}}),/incompletas/);
});

test('M4-14: default rates reproduce existing recovery economics without rebooking stock or cash',()=>{
 const rates=SKU_COST_DEFAULTS.recovery;
 const baseline=recoveryComparison({option:'combined',actualOrders:260});
 const explicit=recoveryComparison({
  option:'combined',actualOrders:260,
  unitRevenue:rates.revenueCLPPerShippedOrder,
  emergencySurchargeRate:rates.urgentSurchargeRate,
  extraCapacityDailyCost:rates.addedCapacityCLPPerDay,
  latePenaltyPerOrderDay:rates.backlogPenaltyCLPPerOrderDay,
  holdingRatePerDay:rates.holdingFractionPerCLPDay
 });
 assert.equal(baseline.committedPurchaseValue,explicit.committedPurchaseValue);
 assert.deepEqual(baseline.originalPurchase,explicit.originalPurchase);
 assert.deepEqual(baseline.urgent,explicit.urgent);
 assert.deepEqual(baseline.recovered.ledger,explicit.recovered.ledger);
 for(const prop of [
  'urgentBase','urgentSurcharge','extraLabor','incrementalRevenue','incrementalExpense',
  'netCashDelta','holdingDelta','penaltySaved','economicProxyDelta'
 ])assert.equal(baseline[prop],explicit[prop],prop);
 const procurement=skuProcurementReconciliation(baseline);
 assert.equal(procurement.passed,true);
 assert.equal(procurement.obligations.originalCommitment,baseline.committedPurchaseValue);
 assert.equal(procurement.obligations.urgentCommitment,baseline.urgentBase);
 assert.equal(procurement.obligations.urgentSurcharge,baseline.urgentSurcharge);
 assert.equal(procurement.obligations.totalCommitment,
  procurement.obligations.originalCommitment+procurement.obligations.urgentCommitment+procurement.obligations.urgentSurcharge);
 assert.ok(!Object.hasOwn(procurement.obligations,'realizedPayment'));
});

test('M4-14: missing per-activity rates are marked unpriced, never fabricated as zero cost',()=>{
 const x=skuCostCatalogReadModel({catalog:SKU_CATALOG});
 for(const operation of x.unpricedOperations){
  assert.equal(operation.rate,undefined);
  assert.equal(operation.unit.length>0,true);
 }
 for(const p of x.productCosts)assert.equal(p.recognition,'unit-valuation-not-cash');
 assert.ok(x.note.includes('no equivale a pago'));
});
