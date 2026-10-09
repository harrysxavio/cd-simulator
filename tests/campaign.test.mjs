import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {supplyBridge} from '../src/supply-bridge.js';
import {eventSimulation} from '../src/events.js';

const scenario={policy:'service',plannedOrders:200,actualOrders:260,plannedForecastPercent:80,planningCoveragePercent:75};
function make(options={}){return campaignSnapshot({comparison:recoveryComparison({...scenario,...options}),plannedOrders:200,campaignId:'SIM-001'});}

test('canonical campaign reconstructs orders and movements without duplicating shipments',()=>{
 const c=make({option:'combined',urgentArrivalDay:2});
 assert.equal(c.passed,true,JSON.stringify(c.checks));
 assert.equal(c.orders.length,260);
 assert.equal(c.shipments.length,c.orders.filter(o=>o.status==='shipped').length);
 assert.equal(new Set(c.orders.map(o=>o.id)).size,c.orders.length);
 assert.equal(new Set(c.dailyEvents.map(e=>e.id)).size,c.dailyEvents.length);
 assert.ok(c.shipments.every(x=>x.units===Object.values(x.lines).reduce((sum,v)=>sum+v,0)));
 assert.equal(c.inventory.bySku.every(x=>x.opening+x.received===x.dispatched+x.available+x.held),true);
 assert.equal(c.dailyEvents.filter(e=>e.type==='warehouse_receipt').length,c.receipts.length);
 assert.equal(c.dailyEvents.filter(e=>e.type==='quality_release').length,c.qualityReleases.length);
 assert.equal(c.dailyEvents.filter(e=>e.type==='shipment').length,c.shipments.length);
});

test('canonical read model is deterministic and immutable',()=>{
 const a=make({option:'emergency',supplierFill:{A:75,B:80,C:90}});
 const b=make({option:'emergency',supplierFill:{A:75,B:80,C:90}});
 assert.deepEqual(a,b);
 assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.plan.originalPurchase)&&Object.isFrozen(a.orders[0].lines));
 assert.throws(()=>{a.plan.originalPurchase.A=123456},TypeError);
 assert.throws(()=>{a.shipments.push({})},TypeError);
 assert.equal(a.passed,true);
});

test('frozen original purchasing survives actual demand surprises',()=>{
 const p={policy:'service',plannedOrders:200,plannedForecastPercent:85,planningCoveragePercent:70,option:'wait'};
 const low=campaignSnapshot({comparison:recoveryComparison({...p,actualOrders:140})});
 const high=campaignSnapshot({comparison:recoveryComparison({...p,actualOrders:300})});
 assert.deepEqual(low.plan.originalPurchase,high.plan.originalPurchase);
 assert.deepEqual(low.purchaseOrders.filter(x=>x.source==='original'),high.purchaseOrders.filter(x=>x.source==='original'));
 assert.equal(low.demand.actualOrders,140);
 assert.equal(high.demand.actualOrders,300);
 assert.equal(low.passed,true);
 assert.equal(high.passed,true);
});

test('late urgent supplies cannot enter inventory before arrival or create fictitious shipments',()=>{
 const c=make({option:'emergency',urgentArrivalDay:13});
 assert.equal(c.passed,true);
 assert.ok(c.purchaseOrders.some(p=>p.source==='urgent'&&p.orderedQty>0));
 assert.ok(c.receipts.every(r=>c.purchaseOrders.find(p=>p.id===r.purchaseOrderId).expectedArrivalDay<=r.day));
 assert.ok(c.receipts.every(r=>!r.purchaseOrderId.startsWith('URG-')));
});

test('supplier partial fill, Receiving queue, and Quality held stock reconcile per SKU',()=>{
 for(const options of [
  {option:'combined',supplierFill:{A:60,B:80,C:100},receivingUnitCapacity:10,qualityReleasePercent:50},
  {option:'emergency',receivingUnitCapacity:0},
  {option:'wait',qualityReleasePercent:0},
  {option:'combined',pickingUnitCapacity:0},
  {option:'emergency',days:2,delayDays:{A:8}},
  {option:'wait',actualOrders:1},
  {option:'wait',actualOrders:1000,days:0}
 ]){
  const c=make(options);
  assert.equal(c.passed,true,JSON.stringify({options,checks:c.checks}));
  assert.ok(c.qualityLots.every(l=>l.receivedQty===l.releasedQty+l.heldQty));
  assert.ok(c.inventory.bySku.every(x=>x.available>=0&&x.held>=0));
  assert.ok(c.receipts.every(r=>c.purchaseOrders.some(p=>p.id===r.purchaseOrderId)));
 }
});

test('the bridge and canonical campaign share the same actual order and receipt totals',()=>{
 const args={policy:'service',actualOrders:260,plannedOrders:200,option:'combined',urgentArrivalDay:2,qualityReleasePercent:70,supplierFill:{A:75,B:75,C:75}};
 const b=supplyBridge(args),c=b.campaign;
 assert.equal(c.passed,true);
 assert.equal(c.shipments.length,b.picking.completed);
 assert.equal(c.orders.filter(x=>x.status==='pending').length,b.picking.pending);
 assert.equal(c.inventory.bySku.reduce((sum,x)=>sum+x.received,0),
  b.receipts.reduce((sum,d)=>sum+Object.values(d.received).reduce((a,v)=>a+v,0),0));
 assert.deepEqual(c.plan.originalPurchase,b.purchasing.originalPurchase);
});

test('event core emits empty order detail and no shipments for zero requested orders',()=>{
 const r=eventSimulation({orders:0,days:0});
 assert.equal(r.ordersDetail.length,0);
 assert.equal(r.ledger[0].shipmentEvents.length,0);
 assert.equal(r.completed,0);
});

test('reject malformed campaign IDs and missing discrete event data',()=>{
 const comparison=recoveryComparison(scenario);
 assert.throws(()=>campaignSnapshot({comparison,campaignId:'bad id'}),/Identificador/);
 assert.throws(()=>campaignSnapshot({comparison,plannedOrders:0}),/planificados/);
 assert.throws(()=>campaignSnapshot({comparison:{...comparison,recovered:{...comparison.recovered,ordersDetail:null}}}),/registro de eventos/);
});
