import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {urgentPurchaseTraceReadModel} from '../src/recovery-urgent.js';
import {SKU_CATALOG} from '../src/sku.js';

const build=(extra={})=>{
 const comparison=recoveryComparison({
  policy:'service',plannedOrders:200,actualOrders:280,
  plannedForecastPercent:80,planningCoveragePercent:70,
  ...extra
 });
 const campaign=campaignSnapshot({comparison,campaignId:'M5-22',plannedOrders:200});
 return {comparison,campaign,trace:campaign.urgentPurchase};
};
const inputs=({comparison,campaign})=>({
 comparison,purchaseOrders:campaign.purchaseOrders,
 supplierLedger:campaign.supplierLedger,receivingLedger:campaign.receivingLedger,
 qualityLedger:campaign.qualityLedger,receipts:campaign.receipts,
 purchaseCost:campaign.purchaseCost
});
const total=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);

test('M5-22: all urgent SKU POs reconcile to original stock and supplier shortage assumptions',()=>{
 const state=build({
  option:'emergency',urgentArrivalDay:2,purchaseCoveragePercent:50,
  supplierFill:{A:60,B:70,C:80},receivingUnitCapacity:30,
  qualityReleasePercent:40
 });
 const {comparison,campaign,trace}=state;
 assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
 assert.equal(campaign.checks.urgentPurchase,true);
 assert.equal(trace.passed,true);
 assert.equal(trace.scope,'sku-cohort');
 assert.equal(trace.currency,'CLP');
 assert.equal(trace.horizonDays,comparison.recovered.days);
 assert.equal(trace.bySku.length,3);
 assert.equal(trace.daily.length,13);
 assert.deepEqual(trace.bySku.map(x=>x.skuId),['A','B','C']);
 assert.equal(trace.baselineKey,comparison.baselineSnapshot.scenarioKey);
 assert.equal(comparison.originalPurchaseOrders,
  comparison.baselineSnapshot.integrated.originalPurchaseOrders);
 assert.deepEqual(trace.bySku.map(x=>x.committedSkuUnits),
  comparison.urgent.map(x=>x.qty));
 assert.equal(trace.totals.committedSkuUnits,total(trace.bySku,'committedSkuUnits'));
 assert.equal(trace.totals.committedSkuUnits,comparison.urgent.reduce((n,r)=>n+r.qty,0));
 assert.equal(trace.totals.principalCommitmentCLP,comparison.urgentBase);
 assert.equal(trace.totals.principalCommitmentCLP,campaign.purchaseCost.totals.urgentCommitmentCLP);
 assert.equal(trace.totals.surchargeAssumptionCLP,comparison.urgentSurcharge);
 assert.equal(trace.totals.principalPlusSurchargeCLP,
  comparison.urgentBase+comparison.urgentSurcharge);
 assert.equal(trace.totals.modeledDockArrivalsSkuUnits,
  trace.totals.warehouseReceivedSkuUnits+trace.totals.waitingWarehouseAtCutoffSkuUnits);
 assert.equal(trace.totals.committedSkuUnits,
  trace.totals.modeledDockArrivalsSkuUnits+trace.totals.inTransitAtCutoffSkuUnits);
 assert.equal(trace.totals.warehouseReceivedSkuUnits,
  trace.totals.releasedFromQualitySkuUnits+trace.totals.heldAtQualitySkuUnits);
 assert.equal(trace.totals.warehouseReceivedSkuUnits,
  campaign.receipts.filter(r=>r.purchaseOrderId.startsWith('URG-')).reduce((n,r)=>n+r.qty,0));
 assert.ok(trace.bySku.every(s=>s.purchaseOrderId?.startsWith('URG-')
  &&s.modeledDockArrivalDay===2
  &&s.firstWarehouseReceiptDay>=2
  &&s.originalSupplierModeledArrivalDay!==null
  &&s.bankPaymentVerified===false
  &&s.supplierPromiseVerified===false
  &&s.theoreticalDemandSkuUnits>=s.shortageAfterModeledOriginalSupplySkuUnits));
 assert.ok(Object.values(trace.checks).every(Boolean));
 assert.equal(trace.confirmedSupplierShipment,null);
 assert.equal(trace.confirmedPaymentCLP,null);
 assert.equal(trace.actualSupplierETA,null);
 assert.ok(Object.isFrozen(trace)&&Object.isFrozen(trace.totals)&&Object.isFrozen(trace.bySku[0]));
 assert.throws(()=>{trace.bySku[0].committedSkuUnits=999},TypeError);
 assert.deepEqual(urgentPurchaseTraceReadModel(inputs(state)),trace);
});

test('M5-22: arrival date is dock availability, NOT receipt — zero Receiving capacity blocks all inventory',()=>{
 const {comparison,campaign,trace}=build({
  option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:0
 });
 assert.equal(campaign.passed,true);
 assert.ok(trace.totals.committedSkuUnits>0);
 assert.equal(trace.totals.modeledDockArrivalsSkuUnits,trace.totals.committedSkuUnits);
 assert.equal(trace.totals.warehouseReceivedSkuUnits,0);
 assert.equal(trace.totals.waitingWarehouseAtCutoffSkuUnits,trace.totals.committedSkuUnits);
 assert.equal(trace.totals.releasedFromQualitySkuUnits,0);
 assert.equal(trace.totals.heldAtQualitySkuUnits,0);
 assert.equal(trace.daily[0].arrivedAtDockSkuUnits,0);
 assert.equal(trace.daily[1].arrivedAtDockSkuUnits,trace.totals.committedSkuUnits);
 assert.equal(total(trace.daily,'warehouseReceivedSkuUnits'),0);
 assert.equal(comparison.recovered.completed,comparison.base.completed);
});

test('M5-22: physical receipts can be spread across days by Receiving capacity and Quality remains held',()=>{
 const {campaign,trace}=build({
  option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:3,
  qualityReleasePercent:0,actualOrders:340
 });
 assert.equal(campaign.passed,true);
 assert.ok(trace.totals.warehouseReceivedSkuUnits>0);
 assert.ok(trace.totals.waitingWarehouseAtCutoffSkuUnits>0);
 assert.equal(trace.totals.releasedFromQualitySkuUnits,0);
 assert.equal(trace.totals.heldAtQualitySkuUnits,trace.totals.warehouseReceivedSkuUnits);
 assert.ok(trace.bySku.some(x=>x.firstWarehouseReceiptDay>1));
 assert.ok(trace.daily.some(x=>x.day>1&&x.warehouseReceivedSkuUnits>0));
 assert.ok(trace.bySku.every(x=>x.firstQualityReleaseDay===null));
 assert.ok(campaign.receipts.every(r=>r.day>=campaign.purchaseOrders.find(p=>p.id===r.purchaseOrderId).expectedArrivalDay));
});

test('M5-22: urgent PO beyond campaign horizon is a commitment only, not usable stock or extra sales',()=>{
 const original=build({option:'wait',days:12});
 const late=build({option:'emergency',urgentArrivalDay:13,days:12});
 assert.equal(late.campaign.passed,true);
 assert.ok(late.trace.totals.committedSkuUnits>0);
 assert.equal(late.trace.totals.inTransitAtCutoffSkuUnits,late.trace.totals.committedSkuUnits);
 assert.equal(late.trace.totals.modeledDockArrivalsSkuUnits,0);
 assert.equal(late.trace.totals.warehouseReceivedSkuUnits,0);
 assert.equal(late.trace.totals.releasedFromQualitySkuUnits,0);
 assert.equal(late.trace.totals.waitingWarehouseAtCutoffSkuUnits,0);
 assert.equal(late.trace.daily.reduce((n,d)=>n+d.arrivedAtDockSkuUnits,0),0);
 assert.equal(late.comparison.recovered.completed,original.comparison.recovered.completed);
 assert.deepEqual(late.campaign.shipments,original.campaign.shipments);
 assert.ok(late.trace.totals.principalPlusSurchargeCLP>0);
 assert.equal(late.trace.confirmedSupplierInvoiceCLP,null);
 assert.equal(late.trace.confirmedPaymentCLP,null);
});

test('M5-22: 0% coverage or zero SKU shortage generates no purchase nor invented surcharge',()=>{
 for(const conditions of [
  {option:'emergency',purchaseCoveragePercent:0},
  {option:'combined',purchaseCoveragePercent:0},
  {option:'emergency',actualOrders:1,plannedOrders:200},
  {option:'emergency',stock:{A:10000,B:10000,C:10000}}
 ]){
  const {comparison,campaign,trace}=build(conditions);
  assert.equal(campaign.passed,true,JSON.stringify(conditions));
  assert.equal(trace.totals.committedSkuUnits,0);
  assert.equal(trace.totals.principalPlusSurchargeCLP,0);
  assert.equal(trace.totals.warehouseReceivedSkuUnits,0);
  assert.ok(trace.bySku.every(x=>x.purchaseOrderId===null));
  assert.equal(comparison.urgent.length,0);
  assert.equal(campaign.purchaseOrders.filter(p=>p.source==='urgent').length,0);
 }
});

test('M5-22: waiting, reserve and overtime never create urgent PO; combined keeps reinforcement separate',()=>{
 for(const option of ['wait','reserve','overtime']){
  const {campaign,trace}=build({option,reservePercent:20,urgentArrivalDay:2});
  assert.equal(campaign.passed,true);
  assert.equal(trace.totals.committedSkuUnits,0);
  assert.equal(trace.totals.principalCommitmentCLP,0);
  assert.equal(trace.totals.surchargeAssumptionCLP,0);
  assert.equal(trace.totals.completedOrdersDeltaAgainstFrozenBaseline,
   campaign.shipments.length-(campaign.demand.actualOrders-campaign.urgentPurchase.totals.completedOrdersDeltaAgainstFrozenBaseline));
 }
 const {comparison,campaign,trace}=build({
  option:'combined',urgentArrivalDay:2,qualityReleasePercent:40
 });
 assert.equal(campaign.passed,true);
 assert.ok(trace.totals.committedSkuUnits>0);
 assert.ok(comparison.operationalCost.totals.chargeableShifts>0);
 assert.equal(trace.totals.principalPlusSurchargeCLP,
  comparison.urgentBase+comparison.urgentSurcharge);
 assert.equal(trace.totals.completedOrdersDeltaAgainstFrozenBaseline,
  comparison.recovered.completed-comparison.base.completed);
 assert.equal(trace.confirmedPaymentCLP,null);
});

test('M5-22: original purchasing plan stays unchanged when lead day and coverage vary',()=>{
 const stable=build({option:'wait'});
 const variants=[
  {option:'emergency',urgentArrivalDay:1,purchaseCoveragePercent:25},
  {option:'emergency',urgentArrivalDay:13,purchaseCoveragePercent:100},
  {option:'combined',urgentArrivalDay:5,purchaseCoveragePercent:75}
 ];
 for(const params of variants){
  const v=build(params);
  assert.deepEqual(v.campaign.plan.originalPurchaseOrders,
   stable.campaign.plan.originalPurchaseOrders);
  assert.equal(v.comparison.baselineKey,stable.comparison.baselineKey);
  for(const p of SKU_CATALOG){
   const row=v.trace.bySku.find(x=>x.skuId===p.id);
   assert.equal(row.originalOpeningSkuUnits,stable.comparison.base.initial[p.id]);
   assert.equal(row.originalSupplierCommittedFulfilledSkuUnits,
    stable.comparison.base.deliveries.find(d=>d.id===p.id).received);
  }
 }
});

test('M5-22: distorted modeled PO, physical receipts, supplier dates or financial surcharge are rejected',()=>{
 const state=build({option:'emergency',urgentArrivalDay:2,
  receivingUnitCapacity:35,qualityReleasePercent:65});
 const good=inputs(state);
 const first=good.purchaseOrders.find(p=>p.source==='urgent');
 assert.ok(first);
 const mutate=(data)=>assert.throws(()=>urgentPurchaseTraceReadModel({...good,...data}),
  /Compra urgente SKU/);
 mutate({purchaseOrders:good.purchaseOrders.map(p=>p.id===first.id?
  {...p,orderedQty:p.orderedQty+1}:p)});
 mutate({purchaseOrders:good.purchaseOrders.map(p=>p.id===first.id?
  {...p,expectedArrivalDay:1}:p)});
 mutate({purchaseOrders:[...good.purchaseOrders,first]});
 mutate({comparison:{...good.comparison,urgentBase:good.comparison.urgentBase+10}});
 mutate({comparison:{...good.comparison,urgentSurcharge:good.comparison.urgentSurcharge+25}});
 mutate({comparison:{...good.comparison,purchaseCoveragePercent:100}});
 mutate({supplierLedger:{...good.supplierLedger,
  rows:good.supplierLedger.rows.map(row=>row.id===first.id?
   {...row,inTransitSkuUnits:row.inTransitSkuUnits+1}:row)}});
 mutate({qualityLedger:{...good.qualityLedger,
  lots:good.qualityLedger.lots.map(lot=>lot.purchaseOrderId===first.id?
   {...lot,heldSkuUnits:lot.heldSkuUnits+1}:lot)}});
 mutate({receipts:[...good.receipts,...good.receipts.filter(r=>r.purchaseOrderId===first.id)]});
});
