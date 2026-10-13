import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {skuPurchaseCostReadModel} from '../src/sku-purchase-cost.js';
import {skuProcurementReconciliation} from '../src/sku-procurement.js';
import {SKU_COST_DEFAULTS} from '../src/sku-cost-catalog.js';

const make=(input={})=>{
 const comparison=recoveryComparison({policy:'service',plannedOrders:200,
  actualOrders:260,...input});
 const campaign=campaignSnapshot({comparison,campaignId:'M4-16',plannedOrders:200});
 return {comparison,campaign,model:campaign.purchaseCost};
};
const total=(rows,key)=>rows.reduce((n,p)=>n+p[key],0);

test('M4-16: purchase costs reconcile original and urgent commitments, supplier statuses and inventory value',()=>{
 const {comparison,campaign,model}=make({
  option:'combined',urgentArrivalDay:2,receivingUnitCapacity:30,
  supplierFill:{A:70,B:80,C:90},qualityReleasePercent:55,
  reservePercent:20,separateTransport:true,transportUnitCapacity:12
 });
 assert.equal(campaign.passed,true);
 assert.equal(campaign.checks.purchaseCost,true);
 assert.equal(model.passed,true);
 assert.equal(model.accountingStatus,'purchasing-commitment-not-cash');
 assert.equal(model.currency,'CLP');
 assert.equal(model.scope,'sku-cohort');
 assert.equal(model.horizonDays,comparison.recovered.days);
 assert.equal(model.byPurchaseOrder.length,campaign.purchaseOrders.length);
 assert.equal(model.byPurchaseOrder.filter(p=>p.source==='original').length,3);
 assert.ok(model.byPurchaseOrder.some(p=>p.source==='urgent'));
 assert.equal(model.totals.originalCommitmentCLP,comparison.committedPurchaseValue);
 assert.equal(model.totals.urgentCommitmentCLP,comparison.urgentBase);
 assert.equal(model.proxy.urgentSurchargeCLP,comparison.urgentSurcharge);
 assert.equal(model.proxy.incrementalPurchaseOutflowAssumptionCLP,
  comparison.urgentBase+comparison.urgentSurcharge);
 assert.equal(model.proxy.actualSupplierPaymentsCLP,null);
 assert.equal(model.proxy.actualOriginalPurchasePaymentCLP,null);
 assert.equal(model.proxy.actualSupplierInvoicesCLP,null);
 assert.equal(model.proxy.actualCustomerReceiptsCLP,null);
 assert.equal(model.totals.totalPurchaseCommitmentCLP,
  model.totals.supplierShortfallCLP+model.totals.inTransitCLP+
  model.totals.waitingWarehouseCLP+model.totals.warehouseReceivedCLP);
 assert.equal(model.totals.warehouseReceivedCLP,
  campaign.inventoryValuation.totals.receivedToDateCLP);
 assert.equal(model.totals.shippedMaterialAtStandardCostCLP,
  campaign.inventoryValuation.totals.shippedToDateCLP);
 assert.equal(model.totals.openingStockAtStandardCostCLP+model.totals.warehouseReceivedCLP,
  model.totals.shippedMaterialAtStandardCostCLP+model.totals.closingStockAtStandardCostCLP);
 for(const row of model.byPurchaseOrder){
  assert.equal(row.committedCLP,row.supplierShortfallCLP+row.inTransitCLP+
   row.waitingWarehouseCLP+row.warehouseReceivedCLP,row.purchaseOrderId);
  assert.equal(row.committedCLP,row.committedSkuUnits*row.unitCostCLP);
  assert.equal(row.warehouseReceivedCLP,row.warehouseReceivedSkuUnits*row.unitCostCLP);
  assert.equal(row.receiptIds.length,new Set(row.receiptIds).size);
 }
 for(const day of model.daily){
  assert.equal(day.receivedTodayCLP,day.receivedOriginalCLP+day.receivedUrgentCLP);
  assert.equal(day.receivedTodayCLP,campaign.inventoryValuation.daily[day.day].totals.receivedTodayCLP);
  assert.equal(day.receivedToDateCLP,campaign.inventoryValuation.daily[day.day].totals.receivedToDateCLP);
  assert.equal(day.confirmedSupplierPaymentCLP,null);
 }
 assert.equal(total(model.daily,'receivedTodayCLP'),model.totals.warehouseReceivedCLP);
 const audit=skuProcurementReconciliation(comparison);
 assert.equal(audit.passed,true);
 assert.equal(model.totals.originalCommitmentCLP,audit.obligations.originalCommitment);
 assert.equal(model.totals.urgentCommitmentCLP,audit.obligations.urgentCommitment);
 assert.equal(model.totals.warehouseReceivedCLP,audit.obligations.warehouseReceivedCost);
 assert.ok(Object.isFrozen(model)&&Object.isFrozen(model.daily[0])&&Object.isFrozen(model.byPurchaseOrder[0]));
 assert.throws(()=>{model.totals.warehouseReceivedCLP=10},TypeError);
});

test('M4-16: future urgent order raises commitment, never inventory or confirmed cash',()=>{
 const baseline=make({option:'wait',days:12});
 const late=make({option:'emergency',urgentArrivalDay:13,days:12});
 assert.ok(late.model.totals.urgentCommitmentCLP>0);
 assert.equal(late.model.byPurchaseOrder.filter(p=>p.source==='urgent').reduce((n,p)=>n+p.warehouseReceivedCLP,0),0);
 assert.ok(late.model.byPurchaseOrder.filter(p=>p.source==='urgent').every(p=>p.inTransitCLP===p.committedCLP));
 assert.deepEqual(late.campaign.receipts,baseline.campaign.receipts);
 assert.equal(late.model.totals.warehouseReceivedCLP,baseline.model.totals.warehouseReceivedCLP);
 assert.equal(late.model.totals.shippedMaterialAtStandardCostCLP,baseline.model.totals.shippedMaterialAtStandardCostCLP);
 assert.equal(late.model.proxy.actualSupplierPaymentsCLP,null);
 assert.equal(late.model.daily.at(-1).receivedToDateCLP,baseline.model.daily.at(-1).receivedToDateCLP);
});

test('M4-16: empty receiving capacity means purchases arrived at dock, not stock',()=>{
 const {campaign,model}=make({option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:0});
 assert.equal(campaign.passed,true);
 assert.equal(model.totals.warehouseReceivedCLP,0);
 assert.ok(model.totals.waitingWarehouseCLP>0);
 assert.equal(model.daily.every(day=>day.receivedTodayCLP===0),true);
 assert.equal(model.totals.shippedMaterialAtStandardCostCLP,
  campaign.inventoryValuation.totals.shippedToDateCLP);
 assert.equal(model.proxy.actualSupplierPaymentsCLP,null);
});

test('M4-16: supplier shortfall and quality hold are distinct from PO commitment and cash',()=>{
 const {campaign,model}=make({
  option:'wait',supplierFill:{A:0,B:50,C:30},qualityReleasePercent:0
 });
 assert.equal(campaign.passed,true);
 assert.ok(model.totals.supplierShortfallCLP>0);
 assert.ok(model.totals.warehouseReceivedCLP>0);
 assert.ok(campaign.inventoryValuation.totals.qualityHeldCLP>0);
 assert.ok(model.byPurchaseOrder.some(row=>row.supplierShortfallCLP>0));
 assert.equal(model.totals.warehouseReceivedCLP,
  campaign.inventoryValuation.totals.receivedToDateCLP);
 assert.equal(model.proxy.incrementalPurchaseOutflowAssumptionCLP,0);
});

test('M4-16: no order, no timing evidence, and resource-only recovery are not payments',()=>{
 for(const overrides of [
  {option:'wait',days:0,actualOrders:1},
  {option:'reserve',reservePercent:30,urgentArrivalDay:2},
  {option:'overtime',extraCapacityDailyCost:SKU_COST_DEFAULTS.recovery.addedCapacityCLPPerDay}
 ]){
  const {campaign,model}=make(overrides);
  assert.equal(campaign.passed,true);
  assert.equal(model.totals.urgentCommitmentCLP,0);
  assert.equal(model.proxy.incrementalPurchaseOutflowAssumptionCLP,0);
  assert.equal(model.proxy.actualSupplierPaymentsCLP,null);
  assert.equal(model.totals.warehouseReceivedCLP,campaign.inventoryValuation.totals.receivedToDateCLP);
 }
});

test('M4-16: tampered receipt, price, source and missing PO fail closed',()=>{
 const {comparison,campaign}=make({option:'emergency',urgentArrivalDay:2});
 const args={comparison,purchaseOrders:campaign.purchaseOrders,
  supplierLedger:campaign.supplierLedger,receipts:campaign.receipts,
  inventoryValuation:campaign.inventoryValuation,catalog:campaign.catalog};
 assert.equal(skuPurchaseCostReadModel(args).passed,true);
 assert.throws(()=>skuPurchaseCostReadModel({...args,
  purchaseOrders:args.purchaseOrders.map((po,i)=>i?po:{...po,orderedQty:po.orderedQty+1})}),/orden o tarifa/);
 assert.throws(()=>skuPurchaseCostReadModel({...args,
  purchaseOrders:args.purchaseOrders.map((po,i)=>i?po:{...po,unitCost:po.unitCost+1})}),/orden o tarifa/);
 assert.throws(()=>skuPurchaseCostReadModel({...args,
  purchaseOrders:args.purchaseOrders.slice(1)}),/repetidas o fuera/);
 assert.throws(()=>skuPurchaseCostReadModel({...args,
  receipts:args.receipts.map((r,i)=>i? r:{...r,day:0})}),/recepción|día/);
 assert.throws(()=>skuPurchaseCostReadModel({...args,
  inventoryValuation:{...args.inventoryValuation,currency:'USD'}}),/fuentes/);
 assert.throws(()=>skuPurchaseCostReadModel({...args,
  comparison:{...comparison,urgentBase:comparison.urgentBase+100}}),/saldo económico/);
});

test('M4-16: repeatable projection uses only supplied canonical records',()=>{
 const {comparison,campaign,model}=make({
  option:'combined',urgentArrivalDay:2,qualityReleasePercent:40,separateTransport:true
 });
 const copy=skuPurchaseCostReadModel({comparison,purchaseOrders:campaign.purchaseOrders,
  supplierLedger:campaign.supplierLedger,receipts:campaign.receipts,
  inventoryValuation:campaign.inventoryValuation,catalog:campaign.catalog});
 assert.deepEqual(copy,model);
 assert.equal(model.totals.shippedMaterialAtStandardCostCLP,
  campaign.inventoryValuation.totals.shippedToDateCLP);
 assert.equal(Object.hasOwn(model,'incomeStatement'),false);
 assert.equal(Object.hasOwn(model,'bankBalance'),false);
 assert.match(model.note,/no puede atribuirse íntegramente/);
});
