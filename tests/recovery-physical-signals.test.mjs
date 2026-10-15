import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryBaseline} from '../src/recovery-baseline.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {physicalConstraintSignalsReadModel} from '../src/recovery-physical-signals.js';

const common={policy:'service',plannedOrders:200,actualOrders:280,days:5,
 plannedForecastPercent:80,planningCoveragePercent:70};
const make=(changes={},option='wait')=>{
 const i={...common,...changes},base=createRecoveryBaseline(i);
 const comparison=recoveryComparison({...i,option,urgentArrivalDay:2,
  purchaseCoveragePercent:100,baselineSnapshot:base});
 const campaign=campaignSnapshot({comparison,campaignId:'CD-M6-28'});
 assert.equal(campaign.passed,true);
 return {comparison,campaign,signals:physicalConstraintSignalsReadModel({comparison,campaign})};
};
test('M6-28: each area describes physically observed, time-indexed queues, not a causal rank',()=>{
 const {comparison,campaign,signals}=make();
 assert.equal(signals.passed,true);
 assert.equal(signals.scope,'sku-cohort');
 assert.equal(signals.option,'wait');
 assert.deepEqual(signals.signals.map(x=>x.id),
  ['receiving','quality','inventory','picking','transport']);
 assert.equal(signals.daily.length,6);
 assert.equal(signals.dispatchedOrders,campaign.shipments.length);
 assert.equal(signals.pendingOrders,comparison.recovered.pending);
 assert.ok(signals.daily.every(d=>d.ordersRequested===d.shippedToDate+d.pendingOrders));
 assert.ok(signals.daily.every(d=>d.unpickedOrders+d.stagedOrders===d.pendingOrders));
 assert.equal(signals.signals.at(-1).observable,false);
 assert.equal(signals.signals.at(-1).atCut,0);
 assert.equal(signals.bottleneckRootCause,null);
 assert.equal(signals.additionalOrdersAttributedToOneArea,null);
 assert.equal(signals.staffingHoursInferred,null);
 assert.ok(Object.values(signals.checks).every(Boolean));
 assert.ok(Object.isFrozen(signals)&&Object.isFrozen(signals.daily[0])&&Object.isFrozen(signals.signals[0]));
 assert.throws(()=>{signals.daily[0].unpickedOrders=999},TypeError);
});
test('M6-28: a fully blocked physical Receiving queue is identifiable without calling it the root cause',()=>{
 const {signals,comparison}=make({receivingUnitCapacity:0,stock:{A:0,B:0,C:0}},'wait');
 const row=signals.signals.find(x=>x.id==='receiving');
 assert.ok(row.atCut>0);
 assert.equal(row.daysAtConfiguredLimit,row.observedDays);
 assert.equal(signals.dispatchedOrders,0);
 assert.equal(signals.pendingOrders,comparison.recovered.orders);
 assert.ok(signals.daily.some(d=>d.receivingQueueSkuUnits>0&&d.observedLimit.receiving));
 assert.ok(signals.daily.every(d=>d.receivedSkuUnits===0));
 assert.equal(signals.bottleneckRootCause,null);
});
test('M6-28: zero Quality release retains physical SKU but cannot be labeled dispatched',()=>{
 const {signals,comparison}=make({stock:{A:0,B:0,C:0},qualityReleasePercent:0},'wait');
 const quality=signals.signals.find(x=>x.id==='quality');
 assert.ok(quality.atCut>0);
 assert.equal(quality.daysAtConfiguredLimit,quality.observedDays);
 assert.equal(signals.dispatchedOrders,0);
 assert.equal(signals.pendingOrders,comparison.recovered.orders);
 assert.ok(signals.daily.some(x=>x.qualityHeldSkuUnits>0));
});
test('M6-28: non-verifiable inventory is physical stock, never treated as inventory loss',()=>{
 const {signals,comparison}=make({inventoryAccuracyPercent:0},'wait');
 const inv=signals.signals.find(x=>x.id==='inventory');
 assert.ok(inv.peak>0);
 assert.equal(signals.dispatchedOrders,0);
 assert.ok(inv.interpretation.includes('no equivale a merma'));
 assert.equal(comparison.recovered.initial.A>=0,true);
});
test('M6-28: staging creates real picked/unshipped transport queue, while same-day mode cannot separate it',()=>{
 const {signals,comparison}=make({separateTransport:true,transportUnitCapacity:0,
  pickingUnitCapacity:1000,dailyCapacity:280},'wait');
 const transport=signals.signals.find(x=>x.id==='transport');
 assert.equal(transport.observable,true);
 assert.ok(transport.atCut>0);
 assert.equal(transport.daysAtConfiguredLimit,transport.observedDays);
 assert.equal(signals.dispatchedOrders,0);
 assert.equal(signals.pendingOrders,comparison.recovered.orders);
 assert.ok(signals.daily.some(x=>x.pickedOrdersToday>0&&x.stagedOrders>0));
 const {signals:coupled}=make({separateTransport:false,transportUnitCapacity:0},'wait');
 assert.equal(coupled.signals.at(-1).observable,false);
 assert.equal(coupled.signals.at(-1).atCut,0);
 assert.equal(coupled.pendingOrders,280);
});
test('M6-28: concurrent constraints are evidence of overlap, never additive lost orders',()=>{
 const {signals}=make({separateTransport:true,
  receivingUnitCapacity:0,qualityReleasePercent:0,
  stock:{A:1000,B:0,C:0},transportUnitCapacity:0},'wait');
 assert.ok(signals.daysWithConcurrentObservations.length>=1);
 for(const d of signals.daily){
  assert.equal(d.ordersRequested,d.shippedToDate+d.pendingOrders);
  assert.equal(d.pendingOrders,d.unpickedOrders+d.stagedOrders);
 }
 assert.equal(signals.additionalOrdersAttributedToOneArea,null);
});
test('M6-28: rejects damaged source, duplicate shipping, corrupt staging and altered day queue',()=>{
 const {comparison,campaign}=make({separateTransport:true});
 const bad=(patch,physical=campaign)=>assert.throws(()=>physicalConstraintSignalsReadModel({
  comparison:{...comparison,recovered:{...comparison.recovered,...patch}},campaign:physical
 }),/Diagnóstico físico SKU/);
 bad({completed:comparison.recovered.completed+1});
 bad({ordersDetail:[...comparison.recovered.ordersDetail.slice(1),comparison.recovered.ordersDetail[1]]});
 bad({ledger:comparison.recovered.ledger.map((d,i)=>i===0?{...d,backlog:d.backlog+1}:d)});
 bad({ledger:comparison.recovered.ledger.map((d,i)=>i===0?{...d,shipped:d.shipped+1}:d)});
 assert.throws(()=>physicalConstraintSignalsReadModel({comparison,campaign:{...campaign,passed:false}}),/Diagnóstico físico SKU/);
});
