import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSimulation} from '../src/events.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';
import {pickingOrderReadModel} from '../src/picking-ledger.js';

const args={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70};
const make=(more={})=>{
 const comparison=recoveryComparison({...args,...more});
 const campaign=campaignSnapshot({comparison,campaignId:'M3-11',plannedOrders:200});
 const areas=campaignAreaReadModel({comparison,campaign,campaignId:'M3-11',plannedOrders:200});
 return {comparison,campaign,areas};
};
const sum=(rows,fn)=>rows.reduce((n,x)=>n+fn(x),0);

test('M3-11: each prepared complete order has its own BOM and linked dispatch event',()=>{
 const {comparison,campaign,areas}=make({option:'combined',urgentArrivalDay:2,pickingUnitCapacity:15,transportUnitCapacity:10});
 const p=campaign.pickingLedger;
 assert.equal(campaign.passed,true);
 assert.equal(areas.passed,true);
 assert.equal(areas.pickingLedger,p);
 assert.equal(areas.checks.dailyPicking,true);
 assert.equal(campaign.checks.pickingLedger,true);
 assert.equal(p.stage,'same-day-picking-to-dispatch');
 assert.equal(p.totals.pickedOrders,campaign.picks.length);
 assert.equal(p.totals.shippedOrders,campaign.shipments.length);
 assert.equal(p.totals.pickedSkuUnits,sum(campaign.picks,x=>x.units));
 assert.equal(p.totals.pickedSkuUnits,sum(campaign.shipments,x=>x.units));
 assert.equal(p.totals.awaitingTransportOrders,0);
 assert.equal(p.totals.pendingUnpickedOrders,comparison.recovered.pending);
 assert.equal(p.daily.length,13);
 assert.ok(p.daily.every(d=>d.pickedOrders===d.shippedOrders));
 assert.ok(p.daily.every(d=>d.pickedSkuUnits<=15));
 assert.ok(p.daily.every(d=>d.pickedSkuUnits<=10));
 assert.equal(new Set(campaign.picks.map(x=>x.pickId)).size,campaign.picks.length);
 for(const pick of campaign.picks){
  const shipped=campaign.shipments.find(s=>s.pickId===pick.pickId);
  assert.ok(shipped);
  assert.equal(shipped.orderId,pick.orderId);
  assert.deepEqual(shipped.lines,pick.lines);
  assert.equal(shipped.day,pick.day);
 }
 assert.equal(areas.stages[6].id,'picking');
 assert.equal(areas.stages[6].output,p.totals.pickedOrders);
 assert.equal(areas.stages[6].evidence[0],'pickingLedger.daily');
 assert.match(areas.stages[6].causal,/no hay staging/);
 assert.match(areas.stages[7].causal,/no se modela staging/);
 assert.equal(areas.days.length,p.daily.length);
 assert.ok(areas.days.every(d=>d.pickedOrders===p.daily[d.day].pickedOrders));
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.daily[0])&&Object.isFrozen(p.daily[0].orders));
 assert.throws(()=>{p.daily[0].orders.push({})},TypeError);
});

test('M3-11: picking disabled or transport disabled cannot falsely report prepared orders',()=>{
 for(const limits of [{pickingUnitCapacity:0},{transportUnitCapacity:0},{inventoryAccuracyPercent:0}]){
  const {comparison,campaign,areas}=make(limits);
  assert.equal(comparison.recovered.completed,0);
  assert.equal(campaign.picks.length,0);
  assert.equal(campaign.shipments.length,0);
  assert.equal(campaign.pickingLedger.totals.pickedOrders,0);
  assert.equal(areas.metrics.pickedOrders,0);
  assert.equal(areas.metrics.shippedOrders,0);
  assert.equal(campaign.passed,true);
 }
});

test('M3-11: picking unit cap applies to selected SKU quantities, not order count',()=>{
 const {comparison,campaign}=make({pickingUnitCapacity:3,transportUnitCapacity:40,option:'emergency',urgentArrivalDay:1});
 assert.ok(campaign.picks.length>0);
 assert.ok(campaign.pickingLedger.daily.every(d=>d.pickedSkuUnits<=3));
 assert.ok(comparison.recovered.ledger.every(d=>d.pickEvents.length===d.pickedOrders));
 assert.ok(comparison.recovered.ledger.every(d=>d.pickedUnits===sum(d.pickEvents,x=>x.units)));
 assert.ok(campaign.pickingLedger.daily.every(d=>d.pickedOrders<=d.pickedSkuUnits));
});

test('M3-11: altered pick quantity, order identity, day, or departure reference fails closed',()=>{
 const {comparison,campaign}=make({option:'wait'});
 const r=comparison.recovered;
 const input={replay:r,shipments:campaign.shipments,orders:campaign.orders};
 const day=r.ledger.find(d=>d.pickEvents.length>0);
 assert.ok(day,'scenario must prepare a physical order');
 const mutate=(fn)=>{
  const changed=r.ledger.map(d=>d.day===day.day?fn(d):d);
  return {...r,ledger:changed};
 };
 assert.throws(()=>pickingOrderReadModel({...input,replay:mutate(d=>({...d,pickEvents:d.pickEvents.map((x,i)=>i?x:{...x,units:x.units+1})}))}),/Picking SKU/);
 assert.throws(()=>pickingOrderReadModel({...input,replay:mutate(d=>({...d,pickEvents:d.pickEvents.map((x,i)=>i?x:{...x,orderId:'FORGED'})}))}),/Picking SKU/);
 assert.throws(()=>pickingOrderReadModel({...input,replay:mutate(d=>({...d,pickEvents:d.pickEvents.map((x,i)=>i?x:{...x,day:x.day-1})}))}),/Picking SKU/);
 assert.throws(()=>pickingOrderReadModel({...input,shipments:campaign.shipments.map((x,i)=>i?x:{...x,pickId:'FAKE'})}),/Picking SKU/);
});

test('M3-11: no separate staging inventory is invented; original SKU balance remains unchanged',()=>{
 const {comparison,campaign,areas}=make({option:'reserve',reservePercent:20});
 const stock=campaign.inventoryLedger.totals;
 assert.equal(campaign.picks.length,campaign.shipments.length);
 assert.equal(stock.openingSkuUnits+stock.receivedSkuUnits,stock.shippedSkuUnits+stock.physicalSkuUnits);
 assert.equal(campaign.pickingLedger.totals.awaitingTransportOrders,0);
 assert.ok(areas.assumptions.includes('staging físico quedará para M3-12'));
 assert.ok(campaign.picks.every(x=>x.units>0));
 assert.equal(comparison.recovered.ledger.reduce((n,d)=>n+d.pickedOrders,0),comparison.recovered.completed);
 assert.equal(campaign.dailyEvents.filter(x=>x.type==='picking').length,campaign.picks.length);
});

test('M3-11: deterministic prep read-model, including empty zero-order campaign event core',()=>{
 const a=make({option:'combined',urgentArrivalDay:2});
 const b=make({option:'combined',urgentArrivalDay:2});
 assert.deepEqual(a.campaign.pickingLedger,b.campaign.pickingLedger);
 assert.deepEqual(a.campaign.picks,b.campaign.picks);
 const empty=eventSimulation({orders:0,days:0});
 assert.deepEqual(empty.ledger[0].pickEvents,[]);
 assert.equal(empty.ledger[0].pickedOrders,0);
 assert.equal(empty.ledger[0].pickedUnits,0);
});
