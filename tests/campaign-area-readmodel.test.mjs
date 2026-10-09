import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';

const base=()=>campaignSkuContract({
 decisions:{...DEFAULTS,commercial:'under',planning:'partial',purchasing:'reliable'},
 scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,lockUpstream:true},
 policy:'service',plannedSampleOrders:200,campaignId:'AREAS-20'
});
const build=(option='wait',more={})=>{
 const contract=base();
 const comparison=recoveryComparison({...contract.skuInputs,option,...more});
 const campaign=campaignSnapshot({comparison,campaignId:contract.campaignId,plannedOrders:contract.plannedSampleOrders});
 const view=campaignAreaReadModel({comparison,campaign,campaignId:contract.campaignId,plannedOrders:contract.plannedSampleOrders});
 return {contract,comparison,campaign,view};
};
test('M2/M3: all eight departments are projections of same 280-order SKU campaign',()=>{
 const {comparison,campaign,view}=build();
 assert.equal(view.passed,true);
 assert.equal(view.campaignId,'AREAS-20');
 assert.deepEqual(view.stages.map(s=>s.id),['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']);
 assert.equal(view.metrics.actualOrders,280);
 assert.equal(view.metrics.forecastOrders,comparison.forecastOrders);
 assert.deepEqual(view.stages.map(s=>s.scope),['plan','plan','purchase-orders','receipts','quality-release','stock-zones','coupled-shipment','coupled-shipment']);
 assert.equal(view.metrics.originalPurchaseSkuUnits,79);
 assert.equal(view.metrics.shippedOrders,campaign.shipments.length);
 assert.equal(view.metrics.shippedOrders,comparison.recovered.completed);
 assert.equal(view.metrics.pendingOrders,comparison.recovered.pending);
 assert.equal(view.metrics.customerDeliveries,null);
 assert.equal(view.metrics.shippedSkuUnits,Object.values(comparison.recovered.consumed).reduce((a,b)=>a+b,0));
 assert.equal(view.metrics.receivedSkuUnits,campaign.receipts.reduce((n,x)=>n+x.qty,0));
 assert.equal(view.metrics.releasedSkuUnits,campaign.qualityReleases.reduce((n,x)=>n+x.qty,0));
 assert.equal(view.metrics.closingQualitySkuUnits,comparison.recovered.waitingQuality);
 assert.equal(view.metrics.closingReserveSkuUnits,0);
 assert.equal(view.days.length,13);
 assert.equal(view.days.at(-1).remainingOrders,view.metrics.pendingOrders);
 assert.ok(view.stages.every(s=>s.evidence.length&&s.causal&&s.detail&&s.headline));
 assert.ok(Object.values(view.checks).every(Boolean));
 assert.ok(Object.isFrozen(view)&&Object.isFrozen(view.days[0])&&Object.isFrozen(view.stages[0]));
});

test('M2/M3: one internal reserve move changes physical location, not purchasing commitments',()=>{
 const wait=build('wait',{reservePercent:20,urgentArrivalDay:1});
 const move=build('reserve',{reservePercent:20,urgentArrivalDay:1});
 assert.equal(wait.view.metrics.originalPurchaseSkuUnits,move.view.metrics.originalPurchaseSkuUnits);
 assert.equal(wait.view.metrics.openingSkuUnits,move.view.metrics.openingSkuUnits);
 assert.equal(wait.view.metrics.transferSkuUnits,0);
 assert.equal(move.view.metrics.transferSkuUnits,59);
 assert.equal(move.view.metrics.extraPurchaseSkuUnits,0);
 assert.equal(move.view.days.reduce((n,x)=>n+x.movedReserveSkuUnits,0),59);
 assert.deepEqual(move.view.days.map(x=>x.movedReserveSkuUnits),move.comparison.recovered.ledger.map(x=>Object.values(x.movedReserve).reduce((a,b)=>a+b,0)));
 assert.equal(move.view.metrics.openingSkuUnits+move.view.metrics.receivedSkuUnits,move.view.metrics.shippedSkuUnits+move.view.metrics.closingPickFaceSkuUnits+move.view.metrics.closingReserveSkuUnits+move.view.metrics.closingQualitySkuUnits);
 assert.ok(move.view.metrics.shippedOrders>=wait.view.metrics.shippedOrders);
});
test('M2/M3: a late new purchase is not misreported as received or fulfilled',()=>{
 const late=build('emergency',{urgentArrivalDay:13,purchaseCoveragePercent:100});
 const initial=build('wait',{urgentArrivalDay:13});
 assert.ok(late.view.metrics.extraPurchaseSkuUnits>0);
 assert.equal(late.view.metrics.receivedSkuUnits,initial.view.metrics.receivedSkuUnits);
 assert.equal(late.view.metrics.shippedOrders,initial.view.metrics.shippedOrders);
 assert.equal(late.view.metrics.pendingOrders,initial.view.metrics.pendingOrders);
 assert.ok(late.view.stages.find(x=>x.id==='purchasing').detail.includes('compra extraordinaria'));
 assert.equal(late.view.days.reduce((n,d)=>n+d.shippedOrders,0),late.view.metrics.shippedOrders);
});
test('M2/M3: blocked Receiving or Quality cannot be silently counted as pickable or shipped',()=>{
 for(const limits of [{receivingUnitCapacity:0},{qualityReleasePercent:0},{pickingUnitCapacity:0},{transportUnitCapacity:0},{inventoryAccuracyPercent:0}]){
  const {comparison,view}=build('emergency',{urgentArrivalDay:1,...limits});
  assert.equal(view.metrics.receivedSkuUnits,comparison.recovered.ledger.reduce((n,d)=>n+Object.values(d.received).reduce((a,b)=>a+b,0),0));
  assert.equal(view.metrics.closingQualitySkuUnits,comparison.recovered.waitingQuality);
  assert.equal(view.metrics.closingPickFaceSkuUnits+view.metrics.closingReserveSkuUnits+view.metrics.closingQualitySkuUnits+view.metrics.shippedSkuUnits,view.metrics.openingSkuUnits+view.metrics.receivedSkuUnits);
  assert.equal(view.metrics.shippedOrders+view.metrics.pendingOrders,view.metrics.actualOrders);
  assert.equal(view.passed,true);
  if(limits.pickingUnitCapacity===0||limits.transportUnitCapacity===0||limits.inventoryAccuracyPercent===0)assert.equal(view.metrics.shippedOrders,0);
 }
});
test('M2/M3: eight-area read model is deterministic and does not mutate source replay',()=>{
 const c=base();
 const comparison=recoveryComparison({...c.skuInputs,option:'reserve',reservePercent:30,urgentArrivalDay:3});
 const campaign=campaignSnapshot({comparison,campaignId:c.campaignId,plannedOrders:200});
 const original=JSON.stringify(campaign);
 const a=campaignAreaReadModel({comparison,campaign,campaignId:c.campaignId,plannedOrders:200});
 const b=campaignAreaReadModel({comparison,campaign,campaignId:c.campaignId,plannedOrders:200});
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(campaign),original);
 assert.throws(()=>campaignAreaReadModel({comparison,campaign:{...campaign,passed:false},campaignId:c.campaignId,plannedOrders:200}),/sin conciliación/);
 assert.throws(()=>campaignAreaReadModel({comparison,campaign,campaignId:'DIFFERENT',plannedOrders:200}),/no coincide/);
 assert.throws(()=>campaignAreaReadModel({comparison,campaign,campaignId:c.campaignId,plannedOrders:201}),/no coincide/);
});
