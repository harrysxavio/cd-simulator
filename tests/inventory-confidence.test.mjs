import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSimulation} from '../src/events.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {skuAudit} from '../src/audit.js';
import {supplyBridge} from '../src/supply-bridge.js';
import {DEFAULTS} from '../src/engine.js';

const sum=values=>Object.values(values).reduce((n,x)=>n+x,0);
const inventory={A:150,B:90,C:55};

test('100% inventory accuracy preserves the existing SKU dispatch behavior',()=>{
 const legacy=eventSimulation({orders:180,days:5,stock:inventory,qualityReleasePercent:80});
 const strict=eventSimulation({orders:180,days:5,stock:inventory,qualityReleasePercent:80,inventoryAccuracyPercent:100});
 assert.equal(legacy.completed,strict.completed);
 assert.deepEqual(legacy.ledger.map(d=>d.shipmentEvents),strict.ledger.map(d=>d.shipmentEvents));
 assert.equal(sum(strict.endingUnverifiedStock),0);
 assert.ok(strict.ledger.every(d=>Object.keys(d.stock).every(id=>d.stock[id]===d.pickableStock[id])));
});

test('0% accuracy blocks picking without destroying physical stock or purchasing receipts',()=>{
 const result=eventSimulation({orders:200,days:8,inventoryAccuracyPercent:0});
 assert.equal(result.completed,0);
 assert.ok(result.ledger.every(d=>sum(d.pickableStock)===0));
 assert.ok(result.ledger.every(d=>Object.keys(d.stock).every(id=>d.unverifiedStock[id]===d.stock[id])));
 assert.ok(result.ledger.some(d=>sum(d.received)>0));
 for(const id of Object.keys(result.initial)){
  const received=result.ledger.reduce((n,d)=>n+d.received[id],0);
  assert.equal(result.initial[id]+received,result.endingStock[id]+result.heldQuality[id]);
 }
});

test('partially verified stock cannot ship unverified units and remains valued at standard cost',()=>{
 const result=eventSimulation({orders:210,stock:inventory,days:12,inventoryAccuracyPercent:70,qualityReleasePercent:50,receivingUnitCapacity:15});
 for(const d of result.ledger){
  assert.ok(Object.keys(d.stock).every(id=>d.stock[id]===d.pickableStock[id]+d.unverifiedStock[id]));
  assert.ok(Object.values(d.unverifiedStock).every(v=>v>=0));
  assert.ok(Object.values(d.pickableStock).every(v=>v>=0));
  assert.ok(Object.values(d.heldQuality).every(v=>v>=0));
  assert.ok(d.shipmentEvents.every(e=>e.units===sum(e.lines)));
 }
 assert.ok(sum(result.endingUnverifiedStock)>0);
 assert.ok(result.completed<result.orders);
 const comparison=recoveryComparison({policy:'balanced',actualOrders:210,option:'combined',inventoryAccuracyPercent:70,qualityReleasePercent:50,receivingUnitCapacity:15});
 const audit=skuAudit({policy:'balanced',actualOrders:210,option:'combined',inventoryAccuracyPercent:70,qualityReleasePercent:50,receivingUnitCapacity:15,comparisonResult:comparison});
 assert.equal(audit.passed,true,JSON.stringify(audit.checks));
 assert.equal(audit.checks.accuracyBalanced,true);
 assert.equal(audit.procurement.checks.accuracyPartition,true);
 assert.equal(audit.stockValue.opening+audit.stockValue.received,audit.stockValue.shipped+audit.stockValue.held+audit.stockValue.closing);
});

test('commercial and inventory choices change SKU confidence without modifying original purchase commitments',()=>{
 const baseline=campaignSkuContract({decisions:{...DEFAULTS,inventory:'weak'},scenario:{demand:1000,actualDemand:1300,lockUpstream:true}});
 const improved=campaignSkuContract({decisions:{...DEFAULTS,inventory:'count'},scenario:{demand:1000,actualDemand:1300,lockUpstream:true}});
 assert.equal(baseline.skuInputs.inventoryAccuracyPercent,85);
 assert.equal(improved.skuInputs.inventoryAccuracyPercent,99);
 const a=recoveryComparison({...baseline.skuInputs,option:'wait'});
 const b=recoveryComparison({...improved.skuInputs,option:'wait'});
 assert.deepEqual(a.originalPurchase,b.originalPurchase);
 assert.deepEqual(a.recovered.deliveries,b.recovered.deliveries);
 assert.equal(a.recovered.inventoryAccuracyPercent,85);
 assert.equal(b.recovered.inventoryAccuracyPercent,99);
 assert.ok(b.recovered.completed>=a.recovered.completed,'More reliable stock should not reduce completions in this scenario');
});

test('inventory accuracy and reserve from aggregate flow are not silently added to SKU stock',()=>{
 const c=campaignSkuContract({decisions:{...DEFAULTS,inventory:'weak'},actions:{inventory:150},scenario:{demand:1000,actualDemand:1300,lockUpstream:true}});
 assert.equal(c.trace.inventoryAccuracyLinked,true);
 assert.equal(c.trace.inventoryReserveActionNotLinked,true);
 assert.ok(!('extraDeliveries' in c.skuInputs));
 // M2-02 explicitly passes the *physical SKU catalog opening*. The legacy
 // aggregate stock and its reserve action must not add units to this map.
 assert.deepEqual(c.skuInputs.stock,inventory);
 assert.equal(c.openingState.totals.physicalSkuUnits,295);
 assert.equal(c.openingState.totals.reserveSkuUnits,0);
 assert.equal(c.skuInputs.inventoryAccuracyPercent,85);
});

test('the canonical campaign exposes accuracy partitions while retaining a single physical conservation law',()=>{
 const opts={policy:'service',plannedOrders:200,actualOrders:260,inventoryAccuracyPercent:80,option:'combined',urgentArrivalDay:2};
 const comparison=recoveryComparison(opts);
 const snapshot=campaignSnapshot({comparison,plannedOrders:200,campaignId:'AUDIT-INV'});
 const bridge=supplyBridge({...opts,comparisonResult:comparison,campaignId:'AUDIT-INV'});
 assert.equal(snapshot.passed,true,JSON.stringify(snapshot.checks));
 assert.equal(snapshot.inventory.accuracyPercent,80);
 assert.equal(bridge.inventory.accuracyPercent,80);
 assert.deepEqual(snapshot.inventory.closingUnverified,bridge.inventory.unverified);
 assert.deepEqual(snapshot.inventory.closingPickable,bridge.inventory.pickable);
 assert.equal(snapshot.inventory.daily.length,comparison.recovered.days+1);
 for(const row of snapshot.inventory.bySku){
  assert.equal(row.available,row.closingPickable+row.closingUnverified);
  assert.equal(row.opening+row.received,row.dispatched+row.held+row.available);
 }
});

test('invalid inventory accuracy inputs are rejected rather than coerced',()=>{
 for(const value of [-1,101,NaN,Infinity,-Infinity])assert.throws(()=>eventSimulation({inventoryAccuracyPercent:value}),/Exactitud de inventario/);
});

test('quality hold, receiving backlog and inventory confidence remain distinct restrictions',()=>{
 for(const opts of [
  {inventoryAccuracyPercent:0,qualityReleasePercent:100,receivingUnitCapacity:500},
  {inventoryAccuracyPercent:100,qualityReleasePercent:0,receivingUnitCapacity:500},
  {inventoryAccuracyPercent:100,qualityReleasePercent:100,receivingUnitCapacity:0},
  {inventoryAccuracyPercent:75,qualityReleasePercent:65,receivingUnitCapacity:12}
 ]){
  const c=recoveryComparison({policy:'service',actualOrders:260,option:'emergency',...opts});
  const report=campaignSnapshot({comparison:c});
  assert.equal(report.passed,true,JSON.stringify({opts,checks:report.checks}));
  const r=c.recovered;
  assert.equal(r.completed+r.pending,r.orders);
  assert.ok(r.ledger.every(d=>sum(d.stock)===sum(d.pickableStock)+sum(d.unverifiedStock)));
 }
});
