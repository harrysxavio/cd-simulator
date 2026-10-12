import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {operationalChainAudit} from '../src/operational-chain-audit.js';
import {SKU_CATALOG} from '../src/sku.js';

const base={
 policy:'service',plannedOrders:200,actualOrders:280,option:'wait',
 plannedForecastPercent:85,planningCoveragePercent:80,
 days:12,pickingUnitCapacity:16,transportUnitCapacity:5,
 qualityReleasePercent:60,receivingUnitCapacity:35
};
const build=(changes={})=>{
 const comparison=recoveryComparison({...base,...changes});
 const campaign=campaignSnapshot({comparison,campaignId:'M3-13A',plannedOrders:200});
 const view=campaignAreaReadModel({comparison,campaign,campaignId:'M3-13A',plannedOrders:200});
 return {comparison,campaign,view};
};
const recreate=({comparison,campaign,view},changes={})=>operationalChainAudit({
 comparison,campaign,stages:changes.stages??view.stages,
 days:changes.days??view.days,metrics:changes.metrics??view.metrics
});

test('M3-13a: eight areas reconcile 13 days, same SKU cohort, supplier and order units',()=>{
 const scenario=build();
 const {campaign,view}=scenario,proof=view.chainAudit;
 assert.equal(proof.passed,true);
 assert.equal(view.checks.chainAudit,true);
 assert.equal(proof.mode,'same-day');
 assert.equal(proof.scope,'sku-cohort');
 assert.equal(proof.horizonDays,12);
 assert.deepEqual(proof.areaIds,['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']);
 assert.equal(proof.days.length,13);
 assert.equal(proof.totals.orders,280);
 assert.equal(proof.totals.shippedOrders,view.metrics.shippedOrders);
 assert.equal(proof.totals.stagedOrders,0);
 assert.ok(proof.days.every(d=>d.stagedOrders===0&&d.stagingSkuUnits===0));
 assert.equal(proof.totals.receivedSkuUnits,campaign.receivingLedger.totals.receivedSkuUnits);
 assert.equal(proof.totals.heldQualitySkuUnits,campaign.qualityLedger.totals.closingHeldSkuUnits);
 assert.equal(proof.totals.openingSkuUnits,campaign.inventoryLedger.totals.openingSkuUnits);
 assert.equal(proof.totals.shippedSkuUnits,campaign.inventoryLedger.totals.shippedSkuUnits);
 assert.ok(proof.days.every(d=>d.unpickedOrders+d.stagedOrders+d.shippedOrders===280));
 assert.ok(proof.days.every(d=>d.onHandSkuUnits===d.pickFaceSkuUnits+d.stagingSkuUnits+d.reserveSkuUnits+d.qualityHeldSkuUnits));
 assert.equal(proof.evidence.picking,'campaign.pickingLedger');
 assert.match(proof.boundary,/no se suman entre sí/);
 assert.match(proof.boundary,/no equivale a entrega al cliente/);
 assert.ok(Object.isFrozen(proof)&&Object.isFrozen(proof.days[0])&&Object.isFrozen(proof.evidence));
 assert.throws(()=>{proof.days[0].shippedOrders=999},TypeError);
});

test('M3-13a: independent staging proves physical picked orders and dated later departure',()=>{
 const scenario=build({separateTransport:true,option:'combined',urgentArrivalDay:1,
  pickingUnitCapacity:18,transportUnitCapacity:4});
 const {campaign,view}=scenario,p=view.chainAudit;
 assert.equal(campaign.passed,true);
 assert.equal(view.passed,true);
 assert.equal(p.mode,'independent-staging');
 assert.ok(p.days.some(d=>d.stagedOrders>0));
 assert.ok(p.days.some(d=>d.stagingSkuUnits>0));
 assert.ok(campaign.orders.some(o=>o.pickedDay!==null&&o.shippedDay!==null&&o.shippedDay>o.pickedDay));
 assert.equal(p.totals.orders,p.totals.unpickedOrders+p.totals.stagedOrders+p.totals.shippedOrders);
 assert.equal(p.totals.stagedOrders,campaign.pickingLedger.totals.awaitingTransportOrders);
 assert.equal(p.totals.stagedSkuUnits,campaign.inventoryLedger.totals.stagingSkuUnits);
 assert.equal(view.metrics.pickedOrders,view.metrics.stagedOrders+view.metrics.shippedOrders);
 assert.ok(p.days.every(d=>d.unpickedOrders+d.stagedOrders+d.shippedOrders===280));
 assert.ok(p.days.every(d=>d.onHandSkuUnits===d.pickFaceSkuUnits+d.stagingSkuUnits+d.reserveSkuUnits+d.qualityHeldSkuUnits));
 assert.deepEqual(recreate(scenario),view.chainAudit);
});

test('M3-13a: blocked trucks do not convert prepared kits into shipments or delivery',()=>{
 const {campaign,view}=build({separateTransport:true,transportUnitCapacity:0,pickingUnitCapacity:22});
 assert.equal(campaign.shipments.length,0);
 assert.ok(campaign.picks.length>0);
 assert.equal(view.chainAudit.totals.shippedOrders,0);
 assert.ok(view.chainAudit.totals.stagedOrders>0);
 assert.equal(view.metrics.customerDeliveries,null);
 assert.equal(view.chainAudit.totals.stagedSkuUnits,view.inventoryLedger.totals.stagingSkuUnits);
 assert.equal(view.checks.physicalConservation,true);
});

test('M3-13a: severely constrained receiving or Quality cannot invent stock downstream',()=>{
 for(const settings of [
  {separateTransport:true,receivingUnitCapacity:0,transportUnitCapacity:4},
  {separateTransport:true,qualityReleasePercent:0,stock:{A:0,B:0,C:0}},
  {separateTransport:true,inventoryAccuracyPercent:0},
  {separateTransport:true,pickingUnitCapacity:0},
  {separateTransport:false,transportUnitCapacity:0}
 ]){
  const {campaign,view}=build(settings);
  const p=view.chainAudit;
  assert.equal(campaign.passed,true);
  assert.equal(view.passed,true);
  assert.ok(p.days.every(d=>d.unpickedOrders+d.stagedOrders+d.shippedOrders===280));
  assert.ok(p.days.every(d=>d.onHandSkuUnits>=0));
  assert.ok(p.days.every(d=>d.stagingSkuUnits>=0));
  assert.equal(p.totals.orders,280);
  if(settings.pickingUnitCapacity===0||settings.inventoryAccuracyPercent===0
    ||settings.qualityReleasePercent===0&&settings.stock){
   assert.equal(p.totals.shippedOrders,0);
   assert.equal(p.totals.stagedOrders,0);
  }
 }
});

test('M3-13a: reject false totals, area duplication and day mismatches rather than render',()=>{
 const scenario=build({separateTransport:true,transportUnitCapacity:3});
 const wrongShipment={...scenario.view.metrics,shippedOrders:scenario.view.metrics.shippedOrders+1};
 assert.throws(()=>recreate(scenario,{metrics:wrongShipment}),/Cadena física SKU/);
 const wrongPhysical={...scenario.view.days[0],closingPhysicalSkuUnits:999};
 assert.throws(()=>recreate(scenario,{days:[wrongPhysical,...scenario.view.days.slice(1)]}),/Cadena física SKU/);
 const wrongQueue={...scenario.view.days[0],awaitingTransportOrders:999};
 assert.throws(()=>recreate(scenario,{days:[wrongQueue,...scenario.view.days.slice(1)]}),/Cadena física SKU/);
 const brokenStage=scenario.view.stages.map((row,i)=>i===7?{...row,output:row.output+1}:row);
 assert.throws(()=>recreate(scenario,{stages:brokenStage}),/Cadena física SKU/);
 const duplicate=[...scenario.view.stages.slice(0,6),scenario.view.stages[6],scenario.view.stages[6]];
 assert.throws(()=>recreate(scenario,{stages:duplicate}),/Cadena física SKU/);
 const fakeUnit={...scenario.view.days[0],pickedSkuUnits:999};
 assert.throws(()=>recreate(scenario,{days:[fakeUnit,...scenario.view.days.slice(1)]}),/Cadena física SKU/);
 const fakeDeliveries={...scenario.view.metrics,customerDeliveries:280};
 assert.throws(()=>recreate(scenario,{metrics:fakeDeliveries}),/Cadena física SKU/);
});

test('M3-13a: generated proof is reproducible and does not combine the aggregate shift',()=>{
 const a=build({separateTransport:true,option:'reserve',reservePercent:20,
  pickingUnitCapacity:18,transportUnitCapacity:5});
 const b=build({separateTransport:true,option:'reserve',reservePercent:20,
  pickingUnitCapacity:18,transportUnitCapacity:5});
 assert.deepEqual(a.view.chainAudit,b.view.chainAudit);
 assert.equal(a.view.chainAudit.scope,'sku-cohort');
 assert.equal(a.view.chainAudit.totals.receivedSkuUnits,
  a.campaign.receipts.reduce((sum,r)=>sum+r.qty,0));
 assert.equal(a.view.chainAudit.days.length,a.comparison.recovered.ledger.length);
 assert.ok(a.view.chainAudit.days.every(d=>Object.keys(d).includes('shippedTodayOrders')));
 assert.ok(SKU_CATALOG.every(s=>a.campaign.inventory.bySku.some(r=>r.skuId===s.id)));
});
