import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {warehouseReceivingReadModel} from '../src/receiving-ledger.js';

const base={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70};
const build=(changes={})=>{
 const comparison=recoveryComparison({...base,...changes});
 const campaign=campaignSnapshot({comparison,campaignId:'M3-08',plannedOrders:200});
 const area=campaignAreaReadModel({comparison,campaign,campaignId:'M3-08',plannedOrders:200});
 return {comparison,campaign,area};
};
const sum=(list,f)=>list.reduce((n,x)=>n+f(x),0);

test('M3-08: Receiving FIFO queue reconciles each supplier arrival to warehouse receipts without phantom inventory',()=>{
 const {comparison,campaign,area}=build({option:'combined',urgentArrivalDay:1,receivingUnitCapacity:20,supplierFill:{A:85,B:95,C:100}});
 const r=campaign.receivingLedger,rows=r.daily;
 assert.ok(r.passed&&area.passed);
 assert.equal(area.receivingLedger,r);
 assert.equal(area.checks.receivingReconciliation,true);
 assert.equal(rows.length,13);
 assert.equal(rows[0].day,0);
 assert.equal(rows[12].day,12);
 assert.equal(r.capacitySkuUnitsPerDay,20);
 assert.equal(r.totals.receivedSkuUnits,campaign.receipts.reduce((n,x)=>n+x.qty,0));
 assert.equal(r.totals.receivedSkuUnits,campaign.supplierLedger.totals.warehouseReceivedSkuUnits);
 assert.equal(r.totals.closingWaitingSkuUnits,comparison.recovered.waitingReceiving);
 assert.equal(r.totals.arrivedSkuUnits,r.totals.receivedSkuUnits+r.totals.closingWaitingSkuUnits);
 assert.equal(r.totals.receivingLots,campaign.receipts.length);
 assert.ok(rows.every(d=>d.receivedSkuUnits<=20&&d.waitingSkuUnits>=0&&d.receivedLots>=0));
 assert.ok(rows.every(d=>d.queue.every(q=>q.remainingSkuUnits>0&&q.waitingDays===d.day-q.arrivalDay)));
 assert.ok(rows.every(d=>d.receivedSkuUnits===sum(campaign.receipts.filter(x=>x.day===d.day),x=>x.qty)));
 assert.ok(rows.some(d=>d.waitingSkuUnits>0));
 assert.ok(r.totals.peakWaitingSkuUnits>=r.totals.closingWaitingSkuUnits);
 assert.ok(r.totals.queueSkuDays>=r.totals.closingWaitingSkuUnits);
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(rows[0])&&Object.isFrozen(rows[0].queue));
 assert.throws(()=>{rows[0].queue.push({})},TypeError);
 assert.equal(area.stages[3].id,'receiving');
 assert.equal(area.stages[3].input,r.totals.arrivedSkuUnits);
 assert.equal(area.stages[3].output,r.totals.receivedSkuUnits);
 assert.match(area.stages[3].detail,/Capacidad 20 SKU\/día/);
 assert.equal(area.stages[3].evidence[0],'receivingLedger.daily');
 assert.ok(area.days.every(d=>d.receivingQueueSkuUnits===rows[d.day].waitingSkuUnits));
 assert.ok(area.days.every(d=>d.dockArrivedSkuUnits===rows[d.day].arrivedSkuUnits));
});

test('M3-08: supplier dock arrivals remain a queue if Receiving capacity is zero',()=>{
 const {comparison,campaign,area}=build({option:'emergency',urgentArrivalDay:1,receivingUnitCapacity:0,qualityReleasePercent:100});
 const r=campaign.receivingLedger,t=r.totals;
 assert.equal(r.capacitySkuUnitsPerDay,0);
 assert.equal(t.receivedSkuUnits,0);
 assert.equal(campaign.receipts.length,0);
 assert.ok(t.arrivedSkuUnits>0);
 assert.equal(t.closingWaitingSkuUnits,t.arrivedSkuUnits);
 assert.equal(area.stages[3].output,0);
 assert.equal(area.stages[3].input,t.arrivedSkuUnits);
 assert.equal(campaign.supplierLedger.totals.warehouseReceivedSkuUnits,0);
 assert.ok(comparison.recovered.ledger.every(d=>d.receivingUsedSkuUnits===0&&d.receiptEvents.length===0));
 assert.equal(campaign.passed,true);
});

test('M3-08: urgent PO due after the horizon never enters dock arrivals, queue or warehouse',()=>{
 const {comparison,campaign}=build({option:'emergency',urgentArrivalDay:13,days:12});
 const urgent=campaign.supplierLedger.rows.filter(x=>x.source==='urgent');
 assert.ok(urgent.length>0);
 assert.ok(urgent.every(x=>x.inTransitSkuUnits===x.supplierFulfilledSkuUnits));
 assert.ok(campaign.receivingLedger.daily.every(day=>day.queue.every(q=>!q.urgent)));
 assert.ok(campaign.receivingLedger.daily.every(day=>!day.queue.some(q=>q.purchaseOrderId.startsWith('URG-'))));
 assert.ok(comparison.recovered.ledger.every(day=>day.dockArrivals.every(d=>!d.urgent)));
 assert.equal(campaign.receivingLedger.totals.closingWaitingSkuUnits,comparison.recovered.waitingReceiving);
});

test('M3-08: unlimited capacity unloads all arrived goods immediately, Quality may retain units',()=>{
 const {comparison,campaign,area}=build({option:'wait',receivingUnitCapacity:null,qualityReleasePercent:0});
 const r=campaign.receivingLedger;
 assert.equal(r.capacitySkuUnitsPerDay,null);
 assert.ok(r.daily.every(d=>d.waitingSkuUnits===0));
 assert.ok(r.daily.every(d=>d.arrivedSkuUnits===d.receivedSkuUnits));
 assert.equal(r.totals.closingWaitingSkuUnits,0);
 assert.ok(comparison.recovered.waitingQuality>0);
 assert.ok(campaign.qualityLots.some(x=>x.heldQty>0));
 assert.ok(campaign.inventory.bySku.every(x=>x.opening+x.received===x.dispatched+x.held+x.reserved+x.available));
 assert.equal(area.passed,true);
});

test('M3-08: recovered demand and capacity changes do not rewrite original supplier commitments',()=>{
 const a=build({actualOrders:140,option:'wait',receivingUnitCapacity:10});
 const b=build({actualOrders:320,option:'combined',urgentArrivalDay:1,receivingUnitCapacity:100});
 assert.deepEqual(a.campaign.purchaseOrders.filter(p=>p.source==='original'),
  b.campaign.purchaseOrders.filter(p=>p.source==='original'));
 assert.notEqual(a.campaign.receivingLedger.capacitySkuUnitsPerDay,b.campaign.receivingLedger.capacitySkuUnitsPerDay);
 assert.notEqual(a.campaign.receivingLedger.totals.receivedSkuUnits,b.campaign.receivingLedger.totals.receivedSkuUnits);
 assert.equal(a.campaign.passed,true);
 assert.equal(b.campaign.passed,true);
});

test('M3-08: forged receipt quantity/day, queue or duplicate lot cannot bypass receiving audit',()=>{
 const {comparison,campaign}=build({option:'wait',receivingUnitCapacity:10});
 const options={replay:comparison.recovered,supplierLedger:campaign.supplierLedger,receipts:campaign.receipts};
 assert.ok(campaign.receipts.length>0);
 const original=campaign.receipts[0];
 const forged=[{...original,qty:original.qty+1},...campaign.receipts.slice(1)];
 assert.throws(()=>warehouseReceivingReadModel({...options,receipts:forged}),/Recepción física|capacidad|FIFO|recepción/i);
 const modifiedDays=comparison.recovered.ledger.map((day,i)=>i===0?{
  ...day,receivingQueue:[...day.receivingQueue,{purchaseOrderId:'PO-A',skuId:'A',arrivalDay:0,remainingSkuUnits:1,waitingDays:0,urgent:false}]
 }:day);
 assert.throws(()=>warehouseReceivingReadModel({...options,replay:{...comparison.recovered,ledger:modifiedDays}}),/Cola de muelle/);
 const late=comparison.recovered.ledger.map((day,i)=>i===1?{
  ...day,receivingUsedSkuUnits:day.receivingUsedSkuUnits+1
 }:day);
 assert.throws(()=>warehouseReceivingReadModel({...options,replay:{...comparison.recovered,ledger:late}}),/Capacidad de Recepción/);
 assert.throws(()=>warehouseReceivingReadModel({...options,receipts:[...campaign.receipts,original]}),/Ingreso físico|Recepción física/);
});

test('M3-08: null receiving capacity is distinct from zero and no ETA is represented as customer delivery',()=>{
 const unlimited=build({receivingUnitCapacity:null}).campaign.receivingLedger;
 const blocked=build({receivingUnitCapacity:0}).campaign.receivingLedger;
 assert.equal(unlimited.capacitySkuUnitsPerDay,null);
 assert.equal(blocked.capacitySkuUnitsPerDay,0);
 assert.ok(unlimited.totals.receivedSkuUnits>=blocked.totals.receivedSkuUnits);
 assert.match(unlimited.boundary,/lote y orden/);
});
