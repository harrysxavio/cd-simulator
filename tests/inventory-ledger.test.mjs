import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {physicalInventoryReadModel} from '../src/inventory-ledger.js';

const base={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70};
const build=(extra={})=>{
 const comparison=recoveryComparison({...base,...extra});
 const campaign=campaignSnapshot({comparison,campaignId:'M3-10',plannedOrders:200});
 const area=campaignAreaReadModel({comparison,campaign,campaignId:'M3-10',plannedOrders:200});
 return {comparison,campaign,area};
};
const sum=(items,key)=>items.reduce((n,x)=>n+x[key],0);

test('M3-10: all SKU daily balances reconcile with warehouse events, Quality and physical stock',()=>{
 const {comparison,campaign,area}=build({option:'combined',urgentArrivalDay:2,receivingUnitCapacity:55,qualityReleasePercent:35,reservePercent:20,inventoryAccuracyPercent:80});
 const l=campaign.inventoryLedger,t=l.totals;
 assert.equal(campaign.passed,true);
 assert.equal(area.passed,true);
 assert.equal(area.inventoryLedger,l);
 assert.equal(area.checks.inventoryReconciliation,true);
 assert.equal(l.daily.length,comparison.recovered.days+1);
 assert.equal(t.openingSkuUnits,area.metrics.openingSkuUnits);
 assert.equal(t.receivedSkuUnits,area.metrics.receivedSkuUnits);
 assert.equal(t.qualityHeldSkuUnits,area.metrics.closingQualitySkuUnits);
 assert.equal(t.reserveSkuUnits,area.metrics.closingReserveSkuUnits);
 assert.equal(t.pickFaceSkuUnits,area.metrics.closingPickFaceSkuUnits);
 assert.equal(t.shippedSkuUnits,area.metrics.shippedSkuUnits);
 assert.equal(t.physicalSkuUnits,t.pickFaceSkuUnits+t.reserveSkuUnits+t.qualityHeldSkuUnits);
 assert.equal(t.openingSkuUnits+t.receivedSkuUnits,t.shippedSkuUnits+t.physicalSkuUnits);
 assert.equal(t.verifiedSkuUnits+t.unverifiedSkuUnits,t.pickFaceSkuUnits);
 assert.equal(t.internalTransfersSkuUnits,sum(campaign.reserveTransfers,'qty'));
 assert.equal(t.receivedSkuUnits,sum(campaign.receipts,'qty'));
 assert.equal(t.releasedSkuUnits,sum(campaign.qualityReleases,'qty'));
 assert.ok(l.daily.every(d=>d.bySku.length===3));
 assert.ok(l.daily.every(d=>d.physicalSkuUnits===d.pickFaceSkuUnits+d.reserveSkuUnits+d.qualityHeldSkuUnits));
 assert.ok(l.daily.every(d=>d.pickFaceSkuUnits===d.verifiedSkuUnits+d.unverifiedSkuUnits));
 assert.ok(l.daily.every(d=>d.receivedSkuUnits===campaign.receivingLedger.daily[d.day].receivedSkuUnits));
 assert.ok(l.daily.every(d=>d.qualityHeldSkuUnits===campaign.qualityLedger.daily[d.day].heldSkuUnits));
 assert.ok(l.daily.every(d=>d.bySku.every(s=>s.openingSkuUnits+s.receivedTodaySkuUnits>=0)));
 assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.daily[0])&&Object.isFrozen(l.daily[0].bySku[0]));
 assert.throws(()=>{l.daily[0].bySku[0].physicalSkuUnits=-1},TypeError);
 assert.equal(area.stages[5].evidence[0],'inventoryLedger.daily');
 assert.match(area.stages[5].detail,/también existen físicamente/);
});

test('M3-10: internal reserve transfers conserve SKU stock across two recovery alternatives',()=>{
 const parked=build({option:'wait',reservePercent:30,urgentArrivalDay:2});
 const moved=build({option:'reserve',reservePercent:30,urgentArrivalDay:2});
 const a=parked.campaign.inventoryLedger,b=moved.campaign.inventoryLedger;
 assert.equal(a.totals.openingSkuUnits,b.totals.openingSkuUnits);
 assert.equal(a.totals.receivedSkuUnits,b.totals.receivedSkuUnits);
 assert.equal(a.totals.internalTransfersSkuUnits,0);
 assert.ok(b.totals.internalTransfersSkuUnits>0);
 assert.equal(b.totals.internalTransfersSkuUnits,sum(moved.campaign.reserveTransfers,'qty'));
 assert.ok(b.daily.every(d=>d.bySku.every(s=>s.physicalSkuUnits===s.pickFaceSkuUnits+s.reserveSkuUnits+s.qualityHeldSkuUnits)));
 assert.equal(parked.campaign.passed,true);
 assert.equal(moved.campaign.passed,true);
});

test('M3-10: zero stock verification blocks Picking but DOES NOT remove physical stock',()=>{
 const {comparison,campaign,area}=build({inventoryAccuracyPercent:0,qualityReleasePercent:100,receivingUnitCapacity:500});
 const t=campaign.inventoryLedger.totals;
 assert.equal(area.metrics.shippedOrders,0);
 assert.equal(t.shippedSkuUnits,0);
 assert.equal(t.verifiedSkuUnits,0);
 assert.equal(t.unverifiedSkuUnits,t.pickFaceSkuUnits);
 assert.ok(t.physicalSkuUnits>0);
 assert.equal(t.physicalSkuUnits,t.openingSkuUnits+t.receivedSkuUnits);
 assert.equal(comparison.recovered.pending,comparison.recovered.orders);
 assert.ok(campaign.inventoryLedger.daily.every(d=>d.verifiedSkuUnits===0));
});

test('M3-10: Quality hold cannot be used as inventory before release',()=>{
 const {campaign,area}=build({qualityReleasePercent:0,stock:{A:0,B:0,C:0},option:'emergency',urgentArrivalDay:1});
 const t=campaign.inventoryLedger.totals;
 assert.ok(t.receivedSkuUnits>0);
 assert.equal(t.releasedSkuUnits,0);
 assert.equal(t.shippedSkuUnits,0);
 assert.equal(t.pickFaceSkuUnits,0);
 assert.equal(t.qualityHeldSkuUnits,t.physicalSkuUnits);
 assert.equal(area.metrics.shippedOrders,0);
});

test('M3-10: movement fraud, unbalanced shipments and invented verified stock fail closed',()=>{
 const {comparison,campaign}=build({inventoryAccuracyPercent:80,option:'wait',reservePercent:20});
 const args={replay:comparison.recovered,openingState:campaign.openingState,
  receipts:campaign.receipts,qualityReleases:campaign.qualityReleases,
  reserveTransfers:campaign.reserveTransfers,shipments:campaign.shipments,
  inventoryMovements:campaign.inventoryMovements,receivingLedger:campaign.receivingLedger,
  qualityLedger:campaign.qualityLedger,campaignId:campaign.campaignId};
 const first=campaign.inventoryMovements[0];
 assert.throws(()=>physicalInventoryReadModel({...args,inventoryMovements:[...campaign.inventoryMovements,first]}),/Inventario SKU/);
 const fake=campaign.inventoryMovements.map((x,i)=>i===0?{...x,qty:x.qty+1}:x);
 assert.throws(()=>physicalInventoryReadModel({...args,inventoryMovements:fake}),/movimientos/);
 const remove=campaign.inventoryMovements.slice(1);
 assert.throws(()=>physicalInventoryReadModel({...args,inventoryMovements:remove}),/movimientos/);
 const days=comparison.recovered.ledger.map((d,i)=>i===0?{...d,unverifiedStock:{...d.unverifiedStock,A:d.unverifiedStock.A+1}}:d);
 assert.throws(()=>physicalInventoryReadModel({...args,replay:{...comparison.recovered,ledger:days}}),/saldo diario/);
 const fakeOpening={...campaign.openingState,openingBySku:{...campaign.openingState.openingBySku,A:-1}};
 assert.throws(()=>physicalInventoryReadModel({...args,openingState:fakeOpening}),/apertura/);
 assert.ok(campaign.passed);
});

test('M3-10: inventory identity survives deterministic replay without sharing mutable references',()=>{
 const first=build({option:'reserve',reservePercent:20,urgentArrivalDay:2,inventoryAccuracyPercent:65});
 const second=build({option:'reserve',reservePercent:20,urgentArrivalDay:2,inventoryAccuracyPercent:65});
 assert.deepEqual(first.campaign.inventoryLedger,second.campaign.inventoryLedger);
 assert.deepEqual(first.area.inventoryLedger,second.area.inventoryLedger);
 assert.equal(first.area.inventoryLedger,first.campaign.inventoryLedger);
 assert.equal(second.campaign.inventoryLedger.totals.physicalSkuUnits,second.area.inventoryLedger.totals.physicalSkuUnits);
});
