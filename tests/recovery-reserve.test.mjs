import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {reserveTransferTraceReadModel} from '../src/recovery-reserve.js';
import {SKU_CATALOG} from '../src/sku.js';

// M5-23: deliberately reuse the same source books, never run an extra simulation.
const inputs={policy:'service',plannedOrders:200,actualOrders:280,
 plannedForecastPercent:80,planningCoveragePercent:70,reservePercent:20,days:12};
const state=(overrides={})=>{
 const comparison=recoveryComparison({...inputs,option:'reserve',urgentArrivalDay:2,...overrides});
 const campaign=campaignSnapshot({comparison,campaignId:'M5-23',plannedOrders:200});
 return {comparison,campaign,trace:campaign.reserveTrace};
};
const args=({comparison,campaign})=>({comparison,reserveTransfers:campaign.reserveTransfers,
 inventoryLedger:campaign.inventoryLedger,inventoryValuation:campaign.inventoryValuation,
 purchaseOrders:campaign.purchaseOrders});
const sum=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);

test('M5-23: reserve transfer is a dated stock relocation, not a new PO or expense',()=>{
 const s=state(),{comparison,campaign,trace}=s;
 assert.equal(campaign.passed,true,JSON.stringify(campaign.checks));
 assert.equal(campaign.checks.reserveTrace,true);
 assert.equal(trace.passed,true);
 assert.equal(trace.scope,'sku-cohort');
 assert.equal(trace.baselineKey,comparison.baselineSnapshot.scenarioKey);
 assert.equal(trace.bySku.length,SKU_CATALOG.length);
 assert.equal(trace.daily.length,13);
 assert.equal(trace.totals.openingReserveSkuUnits,59);
 assert.equal(trace.totals.transferredSkuUnits,59);
 assert.equal(trace.totals.remainingReserveSkuUnits,0);
 assert.equal(trace.daily[2].transferredSkuUnits,59);
 assert.ok(trace.daily.every(d=>d.day===2||d.transferredSkuUnits===0));
 assert.deepEqual(trace.bySku.map(r=>r.transferredSkuUnits),[30,18,11]);
 assert.deepEqual(trace.bySku.map(r=>r.effectiveTransferDay),[2,2,2]);
 assert.ok(trace.bySku.every(r=>r.sourceLocation==='RESERVA-CD'
  &&r.targetLocation==='PICK-FACE'&&r.lotId===null
  &&r.lotTraceAvailable===false&&r.movementIds.length===1));
 assert.equal(trace.totals.standardInventoryValueReclassifiedCLP,
  30*1800+18*3200+11*6500);
 assert.equal(trace.totals.standardInventoryValueReclassifiedCLP,
  campaign.inventoryValuation.daily[2].totals.transferredTodayCLP);
 assert.equal(trace.totals.incrementalPurchaseCommittedCLP,0);
 assert.equal(trace.totals.modeledTransferLaborCostCLP,null);
 assert.equal(trace.confirmedBankPaymentCLP,null);
 assert.equal(trace.movementCostStatus,'not-calibrated-not-zero');
 assert.equal(trace.supplierOrderCreated,false);
 assert.equal(campaign.purchaseOrders.filter(p=>p.source==='urgent').length,0);
 assert.equal(comparison.incrementalExpense,0);
 assert.ok(Object.values(trace.checks).every(Boolean));
 assert.ok(Object.isFrozen(trace)&&Object.isFrozen(trace.bySku[0])&&Object.isFrozen(trace.daily[0]));
 assert.throws(()=>{trace.bySku[0].transferredSkuUnits=999},TypeError);
 assert.deepEqual(reserveTransferTraceReadModel(args(s)),trace);
});

test('M5-23: outside horizon has no movement, no fictitious recovery, reserve stays stocked',()=>{
 const {comparison,campaign,trace}=state({urgentArrivalDay:13});
 assert.equal(campaign.passed,true);
 assert.equal(campaign.reserveTransfers.length,0);
 assert.equal(trace.totals.openingReserveSkuUnits,59);
 assert.equal(trace.totals.transferredSkuUnits,0);
 assert.equal(trace.totals.remainingReserveSkuUnits,59);
 assert.ok(trace.daily.every(d=>d.transferredSkuUnits===0&&d.remainingReserveSkuUnits===59));
 assert.deepEqual(trace.bySku.map(r=>r.effectiveTransferDay),[null,null,null]);
 assert.equal(trace.totals.completedOrdersDeltaAgainstFrozenBaseline,0);
 assert.equal(comparison.recovered.completed,comparison.base.completed);
});

test('M5-23: zero reserve and other interventions yield valid zero transfer accounts',()=>{
 for(const changes of [
  {option:'reserve',reservePercent:0},{option:'wait'},{option:'emergency'},
  {option:'overtime'},{option:'combined'}
 ]){
  const {campaign,trace}=state(changes);
  assert.equal(campaign.passed,true,JSON.stringify(changes));
  assert.equal(trace.totals.transferredSkuUnits,0);
  assert.equal(trace.totals.standardInventoryValueReclassifiedCLP,0);
  assert.equal(trace.daily.length,13);
  assert.equal(trace.totals.openingReserveSkuUnits,changes.reservePercent===0?0:59);
  assert.ok(trace.bySku.every(x=>x.movementIds.length===0));
 }
});

test('M5-23: Quality, accuracy, Receiving and staging cannot create reserve units',()=>{
 for(const extra of [
  {qualityReleasePercent:0,receivingUnitCapacity:0},
  {inventoryAccuracyPercent:45,separateTransport:true,transportUnitCapacity:0},
  {pickingUnitCapacity:0},{transportUnitCapacity:0}
 ]){
  const {campaign,trace}=state(extra);
  assert.equal(campaign.passed,true,JSON.stringify({extra,checks:campaign.checks}));
  assert.equal(trace.totals.transferredSkuUnits,59);
  assert.equal(trace.totals.remainingReserveSkuUnits,0);
  assert.equal(campaign.inventoryLedger.totals.openingSkuUnits+
   campaign.inventoryLedger.totals.receivedSkuUnits,
   campaign.inventoryLedger.totals.shippedSkuUnits+campaign.inventoryLedger.totals.physicalSkuUnits);
  assert.equal(trace.totals.standardInventoryValueReclassifiedCLP,
   sum(trace.bySku,'standardValueReclassifiedCLP'));
 }
});

test('M5-23: rejects phantom movement, wrong date, duplicate SKU and fictitious lot',()=>{
 const s=state(),valid=args(s),base=valid.reserveTransfers;
 for(const corrupt of [
  base.map((r,i)=>i===0?{...r,qty:r.qty+1}:r),
  base.map((r,i)=>i===0?{...r,day:1}:r),
  [...base,base[0]],
  base.map((r,i)=>i===0?{...r,from:'PROVEEDOR'}:r),
  base.map((r,i)=>i===0?{...r,lotId:'LOT-FALSO'}:r),
  base.slice(1)
 ])assert.throws(()=>reserveTransferTraceReadModel({...valid,reserveTransfers:corrupt}),
  /Reserva interna SKU/);
 const counterfeit={...valid.inventoryValuation,
  daily:valid.inventoryValuation.daily.map((d,i)=>i===2
   ?{...d,bySku:d.bySku.map((x,j)=>j===0?{...x,transferredTodayCLP:0}:x)}:d)};
 assert.throws(()=>reserveTransferTraceReadModel({...valid,inventoryValuation:counterfeit}),
  /Reserva interna SKU/);
 const counterfeitInv={...valid.inventoryLedger,
  daily:valid.inventoryLedger.daily.map((d,i)=>i===2
   ?{...d,bySku:d.bySku.map((x,j)=>j===0?{...x,reserveSkuUnits:30}:x)}:d)};
 assert.throws(()=>reserveTransferTraceReadModel({...valid,inventoryLedger:counterfeitInv}),
  /Reserva interna SKU/);
});

test('M5-23: fixed baseline opening and manifest remain untouched',()=>{
 const {comparison,campaign,trace}=state({urgentArrivalDay:5});
 assert.equal(comparison.originalPurchaseOrders,
  comparison.baselineSnapshot.integrated.originalPurchaseOrders);
 assert.deepEqual(comparison.recovered.initial,comparison.base.initial);
 assert.equal(campaign.plan.originalPurchaseOrders.length,3);
 assert.equal(trace.totals.openingReserveSkuUnits,
  Object.values(campaign.openingState.reserveBySku).reduce((n,x)=>n+x,0));
 assert.equal(trace.totals.transferredSkuUnits,
  campaign.inventoryLedger.totals.internalTransfersSkuUnits);
 assert.ok(trace.bySku.every(r=>r.effectiveTransferDay===5));
});
