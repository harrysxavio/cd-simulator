import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {physicalInventoryReadModel} from '../src/inventory-ledger.js';
import {SKU_CATALOG} from '../src/sku.js';

const input={policy:'service',plannedOrders:200,actualOrders:280,option:'wait',
 plannedForecastPercent:85,planningCoveragePercent:80,separateTransport:true,
 pickingUnitCapacity:12,transportUnitCapacity:0,days:12};
function build(extra={}){
 const comparison=recoveryComparison({...input,...extra});
 const campaign=campaignSnapshot({comparison,campaignId:'STAGING-12B',plannedOrders:200});
 const area=campaignAreaReadModel({comparison,campaign,campaignId:'STAGING-12B',plannedOrders:200});
 return {comparison,campaign,area};
}
const total=(a,k)=>a.reduce((n,v)=>n+v[k],0);

test('M3-12b: canonical campaign preserves picked / staged / shipped as distinct order states',()=>{
 const {comparison,campaign,area}=build();
 assert.equal(comparison.recovered.separateTransport,true);
 assert.equal(campaign.passed,true);assert.equal(area.passed,true);
 assert.equal(campaign.pickingLedger.stage,'independent-staging');
 assert.equal(area.pickingLedger,campaign.pickingLedger);
 assert.equal(area.inventoryLedger,campaign.inventoryLedger);
 assert.equal(campaign.shipments.length,0);
 assert.equal(campaign.orders.filter(x=>x.status==='shipped').length,0);
 assert.ok(campaign.orders.some(x=>x.status==='staged'));
 assert.ok(campaign.picks.length>0);
 assert.equal(campaign.picks.length,campaign.orders.filter(x=>x.status==='staged').length);
 assert.equal(campaign.picks.length,campaign.pickingLedger.totals.pickedOrders);
 assert.equal(area.metrics.stagedOrders,campaign.picks.length);
 assert.equal(area.metrics.shippedOrders,0);
 assert.equal(area.metrics.pendingOrders,comparison.recovered.orders);
 assert.equal(area.metrics.unpickedOrders,comparison.recovered.orders-campaign.picks.length);
 assert.equal(area.metrics.closingStagingSkuUnits,campaign.inventoryLedger.totals.stagingSkuUnits);
 assert.ok(area.metrics.closingStagingSkuUnits>0);
 assert.ok(Object.isFrozen(campaign.inventoryLedger)&&Object.isFrozen(campaign.pickingLedger)&&Object.isFrozen(area));
 assert.ok(campaign.orders.filter(x=>x.status==='staged').every(x=>x.pickedDay!==null&&x.shippedDay===null));
 assert.match(area.stages[5].detail,/STAGING-CD/);
 assert.match(area.stages[6].detail,/esperan Transporte/);
 assert.match(area.stages[7].detail,/preparados esperando camión/);
 assert.match(area.assumptions,/interfaz visible aún no lo activa/);
});

test('M3-12b: per-day SKU balance has physically staged units, no duplicate stock',()=>{
 const {comparison,campaign,area}=build({transportUnitCapacity:4,qualityReleasePercent:60,
  inventoryAccuracyPercent:75,reservePercent:20,option:'reserve'});
 const ledger=campaign.inventoryLedger,tot=ledger.totals;
 assert.equal(ledger.passed,true);assert.equal(campaign.passed,true);assert.equal(area.passed,true);
 assert.ok(campaign.shipments.length>0);
 assert.ok(campaign.orders.some(x=>x.status==='staged'));
 assert.ok(campaign.orders.some(x=>x.status==='shipped'));
 assert.ok(campaign.orders.some(x=>x.pickedDay!==null&&x.shippedDay!==null&&x.shippedDay>x.pickedDay));
 assert.equal(tot.openingSkuUnits+tot.receivedSkuUnits,tot.shippedSkuUnits+tot.physicalSkuUnits);
 assert.equal(tot.physicalSkuUnits,tot.pickFaceSkuUnits+tot.stagingSkuUnits+
  tot.reserveSkuUnits+tot.qualityHeldSkuUnits);
 assert.equal(tot.pickedSkuUnits,tot.shippedSkuUnits+tot.stagingSkuUnits);
 assert.equal(tot.pickFaceSkuUnits,tot.verifiedSkuUnits+tot.unverifiedSkuUnits);
 assert.equal(tot.internalTransfersSkuUnits,total(campaign.reserveTransfers,'qty'));
 assert.equal(campaign.inventory.bySku.reduce((n,x)=>n+x.staged,0),tot.stagingSkuUnits);
 for(const day of ledger.daily){
  assert.equal(day.physicalSkuUnits,day.pickFaceSkuUnits+day.stagingSkuUnits+day.reserveSkuUnits+day.qualityHeldSkuUnits);
  assert.equal(day.stagingSkuUnits,comparison.recovered.ledger[day.day].stagingUnits);
  assert.equal(day.pickedSkuUnits,comparison.recovered.ledger[day.day].pickedUnits);
  assert.equal(day.shippedSkuUnits,comparison.recovered.ledger[day.day].shippedUnits);
  assert.ok(day.bySku.every(s=>s.physicalSkuUnits===s.pickFaceSkuUnits+s.stagingSkuUnits+s.reserveSkuUnits+s.qualityHeldSkuUnits));
  assert.equal(area.days[day.day].closingStagingSkuUnits,day.stagingSkuUnits);
 }
 assert.equal(area.metrics.pickedSkuUnits,tot.pickedSkuUnits);
 assert.equal(area.metrics.shippedSkuUnits,tot.shippedSkuUnits);
 assert.equal(area.metrics.pickedOrders,area.metrics.shippedOrders+area.metrics.stagedOrders);
 assert.equal(campaign.inventoryMovements.filter(x=>x.type==='pickface_to_staging').length,
  campaign.picks.reduce((n,x)=>n+Object.keys(x.lines).length,0));
 assert.equal(campaign.inventoryMovements.filter(x=>x.type==='staging_to_dispatched').length,
  campaign.shipments.reduce((n,x)=>n+Object.keys(x.lines).length,0));
 for(const sku of SKU_CATALOG){
  const x=campaign.inventory.bySku.find(x=>x.skuId===sku.id);
  assert.equal(x.opening+x.received,x.dispatched+x.available+x.staged+x.held+x.reserved);
 }
});

test('M3-12b: separate carrier capacity zero retains all shipments, no financial phantom revenue',()=>{
 const {comparison,campaign,area}=build({transportUnitCapacity:0,pickingUnitCapacity:20,option:'combined',urgentArrivalDay:1});
 assert.equal(comparison.recovered.completed,0);
 assert.equal(comparison.recovered.pending,comparison.recovered.orders);
 assert.equal(comparison.incrementalRevenue,0-comparison.base.completed*9000);
 assert.equal(campaign.shipments.length,0);
 assert.ok(campaign.picks.length>0);
 assert.equal(area.stages[7].output,0);
 assert.equal(area.stages[6].output,campaign.picks.length);
 assert.equal(area.checks.physicalConservation,true);
 assert.equal(area.checks.dailyPicking,true);
 assert.equal(campaign.pickingLedger.totals.awaitingTransportOrders,campaign.picks.length);
 assert.ok(comparison.holdingRecovered>=0);
});

test('M3-12b: legacy app and plain campaigns stay coupled and free of staging',()=>{
 const legacy=recoveryComparison({...input,separateTransport:false,transportUnitCapacity:0});
 const campaign=campaignSnapshot({comparison:legacy,campaignId:'STAGING-12B',plannedOrders:200});
 const area=campaignAreaReadModel({comparison:legacy,campaign,campaignId:'STAGING-12B',plannedOrders:200});
 assert.equal(campaign.passed,true);assert.equal(area.passed,true);
 assert.equal(campaign.pickingLedger.stage,'same-day-picking-to-dispatch');
 assert.equal(campaign.stagingAudit,null);
 assert.equal(area.metrics.stagedOrders,0);
 assert.equal(area.metrics.closingStagingSkuUnits,0);
 assert.ok(campaign.inventory.bySku.every(row=>row.staged===0));
 assert.equal(campaign.inventoryLedger.totals.stagingSkuUnits,0);
 assert.equal(campaign.shipments.length,campaign.picks.length);
 assert.equal(legacy.recovered.separateTransport,false);
});

test('M3-12b: forged staging movement or changed stage balance fail closed',()=>{
 const {comparison,campaign}=build({transportUnitCapacity:4});
 const args={replay:comparison.recovered,openingState:campaign.openingState,
  receipts:campaign.receipts,qualityReleases:campaign.qualityReleases,
  reserveTransfers:campaign.reserveTransfers,picks:campaign.picks,shipments:campaign.shipments,
  inventoryMovements:campaign.inventoryMovements,receivingLedger:campaign.receivingLedger,
  qualityLedger:campaign.qualityLedger,campaignId:campaign.campaignId};
 const rows=campaign.inventoryMovements;
 const move=rows.find(x=>x.type==='pickface_to_staging');
 assert.ok(move);
 assert.throws(()=>physicalInventoryReadModel({...args,inventoryMovements:rows.map(x=>x.id===move.id?{...x,qty:x.qty+1}:x)}),/Inventario SKU/);
 assert.throws(()=>physicalInventoryReadModel({...args,inventoryMovements:rows.filter(x=>x.id!==move.id)}),/Inventario SKU/);
 const tamperedDays=comparison.recovered.ledger.map((d,i)=>i!==1?d:{
  ...d,stagingStock:{...d.stagingStock,A:d.stagingStock.A+1}
 });
 assert.throws(()=>physicalInventoryReadModel({...args,replay:{...comparison.recovered,ledger:tamperedDays}}),/Inventario SKU/);
});

test('M3-12b: identical run reconstructs identical canonical source and keeps original POs frozen',()=>{
 const a=build({option:'reserve',reservePercent:20,transportUnitCapacity:4});
 const b=build({option:'reserve',reservePercent:20,transportUnitCapacity:4});
 assert.deepEqual(a.campaign,b.campaign);
 assert.deepEqual(a.area,b.area);
 const normal=recoveryComparison({...input,separateTransport:false,option:'reserve',reservePercent:20,transportUnitCapacity:4});
 assert.deepEqual(a.comparison.originalPurchaseOrders,normal.originalPurchaseOrders);
 assert.deepEqual(a.comparison.planningCommitment,normal.planningCommitment);
});
