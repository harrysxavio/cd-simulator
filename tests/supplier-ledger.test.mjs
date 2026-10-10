import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {supplierOrderLedger} from '../src/supplier-ledger.js';
import {skuProcurementReconciliation} from '../src/sku-procurement.js';
import {SKU_CATALOG} from '../src/sku.js';

const args={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70};
const build=(extra={})=>{
 const comparison=recoveryComparison({...args,...extra});
 const campaign=campaignSnapshot({comparison,campaignId:'M3-07',plannedOrders:200});
 const model=campaignAreaReadModel({comparison,campaign,campaignId:'M3-07',plannedOrders:200});
 return {comparison,campaign,model};
};
const total=(a,key)=>a.reduce((n,v)=>n+v[key],0);

test('M3-07: complete supplier model agrees with physical receipts and eight-area evidence',()=>{
 const {comparison,campaign,model}=build({option:'combined',urgentArrivalDay:2,receivingUnitCapacity:20,supplierFill:{A:75,B:85,C:95},delayDays:{A:8}});
 const ledger=campaign.supplierLedger,t=ledger.totals;
 const earlier=skuProcurementReconciliation(comparison);
 assert.equal(ledger.passed,true);
 assert.equal(campaign.passed,true);
 assert.equal(model.passed,true);
 assert.equal(model.supplierLedger,ledger);
 assert.equal(model.checks.supplierReconciliation,true);
 assert.equal(t.originalOrderedSkuUnits,earlier.totals.originalOrdered);
 assert.equal(t.originalFulfilledSkuUnits,earlier.totals.originalSupplierFulfilled);
 assert.equal(t.originalShortfallSkuUnits,earlier.totals.originalSupplierShortfall);
 assert.equal(t.urgentOrderedSkuUnits,earlier.totals.urgentOrdered);
 assert.equal(t.warehouseReceivedSkuUnits,earlier.totals.originalReceived+earlier.totals.urgentReceived);
 assert.equal(t.inTransitSkuUnits,earlier.totals.originalInTransit+earlier.totals.urgentInTransit);
 assert.equal(t.awaitingWarehouseReceiptSkuUnits,earlier.totals.waitingReceiving);
 assert.equal(t.arrivedByCutoffSkuUnits,t.warehouseReceivedSkuUnits+t.awaitingWarehouseReceiptSkuUnits);
 assert.equal(t.originalOrderedSkuUnits,t.originalFulfilledSkuUnits+t.originalShortfallSkuUnits);
 assert.equal(ledger.rows.length,campaign.purchaseOrders.length);
 assert.equal(ledger.rows.filter(x=>x.source==='original').length,SKU_CATALOG.length);
 assert.ok(ledger.rows.some(x=>x.source==='urgent'));
 assert.ok(ledger.originalSupplierFillPercent>=0&&ledger.originalSupplierFillPercent<=100);
 assert.ok(Object.isFrozen(ledger)&&Object.isFrozen(ledger.rows)&&Object.isFrozen(ledger.rows[0]));
 assert.throws(()=>{ledger.rows[0].warehouseReceiptIds.push('FORGED')},TypeError);
 assert.equal(model.stages[2].id,'purchasing');
 assert.match(model.stages[2].detail,/Cumplimiento de proveedor/);
 assert.match(model.stages[2].detail,/en cola de Recepción/);
 assert.equal(model.stages[2].evidence[0],'supplierLedger.rows');
 assert.equal(model.stages[3].input,t.arrivedByCutoffSkuUnits);
 assert.equal(model.stages[3].output,t.warehouseReceivedSkuUnits);
});

test('M3-07: future arrival cannot count as warehouse stock or Receiving backlog',()=>{
 const {comparison,campaign,model}=build({days:2,delayDays:{A:8},option:'emergency',urgentArrivalDay:13});
 const ledger=campaign.supplierLedger;
 const a=ledger.rows.find(x=>x.id==='PO-A');
 assert.ok(a.modeledArrivalDay>2);
 assert.equal(a.arrivedByCutoffSkuUnits,0);
 assert.equal(a.receivedAtWarehouseSkuUnits,0);
 assert.equal(a.awaitingWarehouseReceiptSkuUnits,0);
 assert.equal(a.inTransitSkuUnits,a.supplierFulfilledSkuUnits);
 assert.equal(a.extraDelayDays,8);
 assert.ok(ledger.totals.inTransitSkuUnits>0);
 assert.equal(ledger.totals.warehouseReceivedSkuUnits,total(campaign.receipts,'qty'));
 assert.equal(campaign.passed,true);
 assert.equal(model.passed,true);
 const urgent=ledger.rows.filter(x=>x.source==='urgent');
 assert.ok(urgent.length>0);
 assert.ok(urgent.every(p=>p.receivedAtWarehouseSkuUnits===0&&p.inTransitSkuUnits===p.supplierFulfilledSkuUnits));
 assert.equal(comparison.recovered.ledger[0].receivedUrgent.A,0);
});

test('M3-07: arrived supplier units are not receipts without Receiving capacity',()=>{
 const {campaign,model}=build({option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:0});
 const l=campaign.supplierLedger;
 assert.equal(l.totals.warehouseReceivedSkuUnits,0);
 assert.equal(campaign.receipts.length,0);
 assert.ok(l.totals.arrivedByCutoffSkuUnits>0);
 assert.equal(l.totals.awaitingWarehouseReceiptSkuUnits,l.totals.arrivedByCutoffSkuUnits);
 assert.equal(model.stages[3].output,0);
 assert.equal(model.stages[3].input,l.totals.arrivedByCutoffSkuUnits);
 assert.equal(campaign.passed,true);
});

test('M3-07: late modelled delivery days are distinguished from warehouse receipt delays',()=>{
 const {campaign}=build({option:'wait',delayDays:{A:4,B:0,C:0},receivingUnitCapacity:1});
 const l=campaign.supplierLedger;
 const a=l.rows.find(x=>x.id==='PO-A');
 assert.equal(a.standardLeadDays,SKU_CATALOG.find(x=>x.id==='A').leadDays);
 assert.equal(a.extraDelayDays,4);
 assert.equal(a.modeledArrivalDay,a.standardLeadDays+4);
 assert.ok(a.firstWarehouseReceiptDay===null||a.firstWarehouseReceiptDay>=a.modeledArrivalDay);
 assert.ok(l.totals.originalExtraDelaySkuUnits>=a.supplierFulfilledSkuUnits);
 const b=l.rows.find(x=>x.id==='PO-B');
 assert.equal(b.extraDelayDays,0);
 assert.equal(l.passed,true);
});

test('M3-07: original supplier commitments remain unchanged under surprises and recovery',()=>{
 const baseline=build({actualOrders:140,option:'wait'}).campaign;
 for(const x of [
  {actualOrders:320,option:'wait'},
  {actualOrders:320,option:'combined',urgentArrivalDay:1},
  {actualOrders:120,option:'reserve',reservePercent:20},
  {actualOrders:260,option:'overtime'}
 ]){
  const campaign=build(x).campaign;
  const committed=rows=>rows.filter(p=>p.source==='original').map(p=>({
   id:p.id,skuId:p.skuId,ordered:p.orderedSkuUnits,
   supplierFulfilled:p.supplierFulfilledSkuUnits,supplierShortfall:p.supplierShortfallSkuUnits,
   modeledArrivalDay:p.modeledArrivalDay
  }));
  assert.deepEqual(committed(campaign.supplierLedger.rows),committed(baseline.supplierLedger.rows),
   'Original POs are frozen; their physical warehouse reception may vary under recovery');
  assert.equal(campaign.supplierLedger.totals.originalOrderedSkuUnits,baseline.supplierLedger.totals.originalOrderedSkuUnits);
 }
});

test('M3-07: duplicate PO, forged receipt, early entry or excessive receipts fail closed',()=>{
 const {campaign}=build({option:'emergency',urgentArrivalDay:1});
 const {purchaseOrders,receipts,horizonDays}=campaign;
 const source={purchaseOrders,receipts,horizonDays};
 const original=purchaseOrders[0];
 assert.throws(()=>supplierOrderLedger({...source,purchaseOrders:[...purchaseOrders,original]}),/Orden de proveedor/);
 assert.throws(()=>supplierOrderLedger({...source,purchaseOrders:purchaseOrders.filter(x=>x.id!==original.id)}),/original única/);
 const receipt=receipts[0];
 assert.ok(receipt,'the test scenario needs a physical receipt');
 assert.throws(()=>supplierOrderLedger({...source,receipts:[...receipts,receipt]}),/Recepción SKU/);
 assert.throws(()=>supplierOrderLedger({...source,receipts:[...receipts,{...receipt,id:'FORGED',purchaseOrderId:'FAKE'}]}),/Recepción SKU/);
 assert.throws(()=>supplierOrderLedger({...source,receipts:[...receipts,{...receipt,id:'EARLY',day:0}]}),/Recepción SKU/);
 assert.throws(()=>supplierOrderLedger({...source,receipts:[...receipts,{...receipt,id:'EXTRA',qty:999999}]}),/supera llegada/);
 assert.throws(()=>supplierOrderLedger({...source,purchaseOrders:purchaseOrders.map(x=>x.id===original.id?{...x,supplierFulfilledQty:x.orderedQty+1}:x)}),/Orden de proveedor/);
});
